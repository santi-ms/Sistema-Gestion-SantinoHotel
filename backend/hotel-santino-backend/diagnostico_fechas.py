"""
Diagnóstico de cómo guarda las fechas la base. SOLO LECTURA: no escribe nada.

Para qué sirve
--------------
Las columnas de fecha no declaran zona horaria, así que el valor guardado no
dice en qué zona está y el código tiene que asumirlo. Asumir mal corre las
fechas un día entero. Antes de migrar hay que confirmar la convención real con
los datos que hay en producción, no por deducción.

Cómo se corre
-------------
    cd backend/hotel-santino-backend
    export DATABASE_URL="<la URL de Postgres de Railway>"
    python diagnostico_fechas.py

En Railway la URL está en el servicio de Postgres, pestaña "Variables",
como DATABASE_URL o POSTGRES_URL.
"""
import os
import sys
from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine, text

ARGENTINA_TZ = timezone(timedelta(hours=-3))

TABLAS_CON_FECHA = {
    "reserva": ["fecha_checkin", "fecha_checkout"],
    "pedido": ["fecha", "pagado_at"],
    "gastoadicional": ["fecha"],
    "actividad": ["fecha_creacion", "fecha_vencimiento"],
    "stock": ["fecha_actualizacion"],
    "chatsession": ["updated_at"],
    "movimientostock": ["fecha"],
}


def separador(titulo):
    print()
    print("─" * 70)
    print(titulo)
    print("─" * 70)


def main():
    url = os.getenv("DATABASE_URL")
    if not url:
        print("❌ Falta DATABASE_URL.")
        print('   export DATABASE_URL="postgresql://..."')
        sys.exit(1)
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    if not url.startswith("postgresql"):
        print(f"⚠️  DATABASE_URL no apunta a Postgres ({url.split(':')[0]}).")
        print("   Este diagnóstico es sobre la base de producción.")
        sys.exit(1)

    engine = create_engine(url, connect_args={"sslmode": "require"})

    with engine.connect() as con:
        separador("1. Tipo de cada columna de fecha")
        filas = con.execute(text("""
            SELECT table_name, column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND data_type LIKE 'timestamp%'
            ORDER BY table_name, column_name
        """)).fetchall()
        con_zona = 0
        for tabla, columna, tipo in filas:
            marca = "✅ con zona" if "with time zone" in tipo else "⚠️  SIN zona"
            if "with time zone" in tipo:
                con_zona += 1
            print(f"   {marca}   {tabla}.{columna}  ({tipo})")
        print()
        print(f"   {con_zona} de {len(filas)} columnas ya declaran zona horaria.")

        separador("2. Zona horaria del servidor")
        tz_servidor = con.execute(text("SHOW TimeZone")).scalar()
        ahora_utc = con.execute(text("SELECT now() AT TIME ZONE 'UTC'")).scalar()
        ahora_ar = con.execute(
            text("SELECT now() AT TIME ZONE 'America/Argentina/Buenos_Aires'")
        ).scalar()
        print(f"   TimeZone de la sesión : {tz_servidor}")
        print(f"   Ahora en UTC          : {ahora_utc}")
        print(f"   Ahora en Argentina    : {ahora_ar}")

        separador("3. Veredicto: ¿en qué zona está lo guardado?")
        print("   Se compara el pedido más reciente contra el reloj del servidor.")
        print()
        fila = con.execute(text("""
            SELECT id, fecha FROM pedido ORDER BY fecha DESC LIMIT 1
        """)).fetchone()

        if not fila:
            print("   ⚠️  No hay pedidos para comparar.")
        else:
            pedido_id, guardado = fila
            if guardado.tzinfo is not None:
                print(f"   El pedido #{pedido_id} ya vuelve CON zona horaria: {guardado}")
                print("   → La columna ya es timestamptz. No hay ambigüedad.")
            else:
                dif_utc = abs((guardado - ahora_utc).total_seconds())
                dif_ar = abs((guardado - ahora_ar).total_seconds())
                print(f"   Pedido #{pedido_id}")
                print(f"     guardado              : {guardado}")
                print(f"     distancia a 'ahora UTC'      : {dif_utc/3600:8.2f} horas")
                print(f"     distancia a 'ahora Argentina': {dif_ar/3600:8.2f} horas")
                print()
                if dif_utc < dif_ar:
                    print("   ✅ VEREDICTO: lo guardado está en UTC.")
                    print("      La migración debe usar  USING columna AT TIME ZONE 'UTC'")
                else:
                    print("   ✅ VEREDICTO: lo guardado está en hora de Argentina.")
                    print("      La migración debe usar")
                    print("      USING columna AT TIME ZONE 'America/Argentina/Buenos_Aires'")
                print()
                print("   (El veredicto vale si el pedido más reciente es de hoy.")
                print("    Si es viejo, las dos distancias van a ser grandes y")
                print("    conviene cargar un pedido de prueba y volver a correr esto.)")

        separador("4. Últimos 5 pedidos, leídos de las dos formas")
        print("   Comparalos con la hora real a la que se cargaron.")
        print()
        print(f"   {'id':>6}  {'guardado':<20} {'si es UTC':<17} {'si es Argentina':<17}")
        for pid, guardado in con.execute(text("""
            SELECT id, fecha FROM pedido ORDER BY fecha DESC LIMIT 5
        """)).fetchall():
            if guardado.tzinfo is None:
                como_utc = (
                    guardado.replace(tzinfo=timezone.utc)
                    .astimezone(ARGENTINA_TZ)
                    .strftime("%d/%m/%Y %H:%M")
                )
                como_ar = guardado.strftime("%d/%m/%Y %H:%M")
            else:
                como_utc = como_ar = guardado.astimezone(ARGENTINA_TZ).strftime(
                    "%d/%m/%Y %H:%M"
                )
            print(f"   {pid:>6}  {str(guardado):<20} {como_utc:<17} {como_ar:<17}")

        separador("5. Volumen a migrar")
        for tabla in TABLAS_CON_FECHA:
            try:
                n = con.execute(text(f"SELECT COUNT(*) FROM {tabla}")).scalar()
                print(f"   {tabla:<20} {n:>8} filas")
            except Exception:
                print(f"   {tabla:<20} {'(no existe)':>8}")

    print()
    print("Listo. Pasame esta salida y armo la migración con el USING correcto.")
    print("No se escribió nada en la base.")


if __name__ == "__main__":
    main()
