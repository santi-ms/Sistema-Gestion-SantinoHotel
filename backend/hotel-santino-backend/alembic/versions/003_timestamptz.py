"""Fechas con zona horaria explícita (timestamp -> timestamptz)

Revision ID: 003_timestamptz
Revises: 002_create_chat_session
Create Date: 2026-09-13 22:00:00

Por qué
-------
Las columnas de fecha eran `timestamp without time zone`: guardaban un
instante sin decir en qué zona estaba medido. El código tenía que asumirlo, y
una asunción equivocada corre las fechas un día entero — un pedido cargado a
las 21:30 aparecía al día siguiente y desaparecía del listado de hoy.

Con `timestamptz` el dato deja de ser ambiguo: Postgres guarda el instante y
devuelve un datetime con zona horaria. No queda nada que adivinar, ni acá ni
en una consulta de psql ni en cualquier herramienta que lea la base después.

Sobre el USING
--------------
`ALTER ... TYPE timestamptz` sin `USING` interpreta los valores existentes en
la zona de la SESIÓN, que puede variar. Se pasa `AT TIME ZONE 'UTC'` explícito
para no depender de eso: los valores guardados están en UTC (verificado con
diagnostico_fechas.py contra la base real antes de aplicar esta migración).

Si el diagnóstico hubiera dado que están en hora argentina, habría que cambiar
ZONA_DE_ORIGEN por 'America/Argentina/Buenos_Aires'. Aplicar esto con la zona
equivocada corre todos los datos 3 horas.
"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '003_timestamptz'
down_revision: Union[str, None] = '002_create_chat_session'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Zona en la que están medidos los valores que hoy hay guardados.
ZONA_DE_ORIGEN = 'UTC'

COLUMNAS = [
    ('reserva', 'fecha_checkin'),
    ('reserva', 'fecha_checkout'),
    ('pedido', 'fecha'),
    ('pedido', 'pagado_at'),
    ('gastoadicional', 'fecha'),
    ('actividad', 'fecha_creacion'),
    ('actividad', 'fecha_vencimiento'),
    ('stock', 'fecha_actualizacion'),
    ('chatsession', 'updated_at'),
    ('movimientostock', 'fecha'),
]


def _existe(tabla: str, columna: str) -> bool:
    """La base se fue armando con ALTER TABLE sueltos, así que no todas las
    columnas existen necesariamente en todos los ambientes."""
    resultado = op.get_bind().exec_driver_sql(
        """
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s AND column_name = %s
        """,
        (tabla, columna),
    )
    return resultado.first() is not None


def upgrade() -> None:
    for tabla, columna in COLUMNAS:
        if not _existe(tabla, columna):
            print(f"⏭️  {tabla}.{columna} no existe, se omite")
            continue
        op.execute(
            f'ALTER TABLE {tabla} '
            f'ALTER COLUMN {columna} TYPE timestamptz '
            f"USING {columna} AT TIME ZONE '{ZONA_DE_ORIGEN}'"
        )
        print(f"✅ {tabla}.{columna} -> timestamptz")


def downgrade() -> None:
    """Vuelve a timestamp sin zona, dejando los valores en UTC (como estaban)."""
    for tabla, columna in COLUMNAS:
        if not _existe(tabla, columna):
            continue
        op.execute(
            f'ALTER TABLE {tabla} '
            f'ALTER COLUMN {columna} TYPE timestamp '
            f"USING {columna} AT TIME ZONE '{ZONA_DE_ORIGEN}'"
        )
