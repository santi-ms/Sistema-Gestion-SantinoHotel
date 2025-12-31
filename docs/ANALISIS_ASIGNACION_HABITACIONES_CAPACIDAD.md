# Análisis: Asignación de Habitaciones por Capacidad

## Resumen Ejecutivo

El sistema **SÍ filtra correctamente por capacidad** cuando se crea una reserva desde `/reservas-web`. El campo `guests` se usa para filtrar habitaciones con `capacidad >= guests`. Sin embargo, hay una **discrepancia** con tus expectativas sobre las habitaciones 5, 8 y 9.

---

## 1. Cómo se Filtra/Selecciona la Habitación en `/reservas-web`

### Flujo del Endpoint

```2221:2260:backend/hotel-santino-backend/hotel.py
@app.post("/reservas-web")
def crear_reserva_desde_web(data: ReservaWeb, db: Session = Depends(obtener_db)):
    try:
        print(f"🌐 Reserva recibida desde página web")
        print(f"📥 Datos recibidos: {data}")
        print(f"💰 Monto seña recibido: {data.montoSeña}")
        print(f"💳 Tipo de pago: {data.tipoPago}")
        
        # Convertir fechas string a datetime
        try:
            fecha_checkin = datetime.strptime(data.checkin, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
            fecha_checkout = datetime.strptime(data.checkout, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
        except ValueError as e:
            print(f"❌ Error en formato de fechas: {e}")
            raise HTTPException(status_code=400, detail=f"Formato de fecha inválido: {e}")
        
        # ✅ VERIFICAR DISPONIBILIDAD INTELIGENTE
        tipo_preferido = data.roomType if data.roomType in ["Estándar", "Confort"] else None
        
        disponibilidad = verificar_disponibilidad(
            checkin=data.checkin,
            checkout=data.checkout,
            huespedes=data.guests,
            tipo_preferido=tipo_preferido,
            db=db
        )
        
        if not disponibilidad["disponible"]:
            return {
                "success": False,
                "error": f"No hay habitaciones disponibles para {data.guests} huéspedes del {data.checkin} al {data.checkout}",
                "alternativas": "Por favor selecciona otras fechas o contacta al hotel"
            }
        
        # Obtener la habitación recomendada
        habitacion_recomendada = disponibilidad["recomendacion"]["habitacion_recomendada"]
        habitacion_id = habitacion_recomendada["id"]
        precio_por_noche = habitacion_recomendada["precio"]
        
        print(f"✅ Habitación asignada automáticamente: {habitacion_recomendada['numero']} ({habitacion_recomendada['tipo']})")
```

**Proceso:**
1. El endpoint recibe `data.guests` (número de huéspedes)
2. Llama a `verificar_disponibilidad()` pasando `huespedes=data.guests`
3. `verificar_disponibilidad()` filtra habitaciones por capacidad
4. Retorna la mejor habitación disponible
5. El endpoint asigna esa habitación a la reserva

---

## 2. Uso del Campo `guests` para Filtrar por Capacidad

### ✅ SÍ se usa para filtrar

El campo `guests` (que se pasa como `huespedes` a la función) **SÍ se usa para filtrar habitaciones por capacidad**:

```2016:2022:backend/hotel-santino-backend/hotel.py
        # ✅ FILTRAR POR CAPACIDAD (>= huéspedes, no solo ==)
        habitaciones_adecuadas = [h for h in todas_habitaciones if h.capacidad >= huespedes]
        print(f"📊 Habitaciones con capacidad >= {huespedes}: {len(habitaciones_adecuadas)}")
        
        # Mostrar detalles para debug
        for hab in habitaciones_adecuadas:
            print(f"   - Hab {hab.numero}: capacidad {hab.capacidad}, tipo {hab.tipo}")
```

**Filtro aplicado:** `capacidad >= huespedes`

Esto significa:
- Si `guests: 3` → Solo se consideran habitaciones con `capacidad >= 3`
- Si `guests: 2` → Solo se consideran habitaciones con `capacidad >= 2`
- Si `guests: 4` → Solo se consideran habitaciones con `capacidad >= 4`

---

## 3. Lógica de Asignación Automática de Habitaciones

### Función `verificar_disponibilidad()`

```1992:2107:backend/hotel-santino-backend/hotel.py
def verificar_disponibilidad(
    checkin: str,
    checkout: str,
    huespedes: int,
    tipo_preferido: str = Query(None, description="Estándar o Confort"),
    db: Session = Depends(obtener_db)
):
    """
    Verifica disponibilidad para fechas y número de huéspedes específicos
    """
    try:
        print(f"🔍 Verificando disponibilidad:")
        print(f"   - Fechas: {checkin} a {checkout}")
        print(f"   - Huéspedes: {huespedes}")
        print(f"   - Tipo preferido: {tipo_preferido}")
        
        # Convertir fechas
        fecha_checkin = datetime.strptime(checkin, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
        fecha_checkout = datetime.strptime(checkout, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
        
        # ✅ OBTENER TODAS LAS HABITACIONES SIN FILTRO DE CAPACIDAD PRIMERO
        todas_habitaciones = db.exec(select(Habitacion)).all()
        print(f"📊 Total habitaciones en BD: {len(todas_habitaciones)}")
        
        # ✅ FILTRAR POR CAPACIDAD (>= huéspedes, no solo ==)
        habitaciones_adecuadas = [h for h in todas_habitaciones if h.capacidad >= huespedes]
        print(f"📊 Habitaciones con capacidad >= {huespedes}: {len(habitaciones_adecuadas)}")
        
        # Mostrar detalles para debug
        for hab in habitaciones_adecuadas:
            print(f"   - Hab {hab.numero}: capacidad {hab.capacidad}, tipo {hab.tipo}")
        
        # ✅ FILTRAR POR TIPO SI SE ESPECIFICA
        if tipo_preferido:
            habitaciones_filtradas = [h for h in habitaciones_adecuadas if h.tipo == tipo_preferido]
            print(f"📊 Después de filtrar por tipo '{tipo_preferido}': {len(habitaciones_filtradas)}")
            habitaciones_adecuadas = habitaciones_filtradas
        
        # ✅ VERIFICAR DISPONIBILIDAD EN FECHAS
        habitaciones_disponibles = []
        
        for habitacion in habitaciones_adecuadas:
            print(f"🔍 Verificando habitación {habitacion.numero}...")
            
            # Buscar reservas que se solapen con las fechas solicitadas
            reservas_solapadas = db.exec(
                select(Reserva).where(
                    Reserva.habitacion_id == habitacion.id,
                    Reserva.fecha_checkin < fecha_checkout,  # Reserva empieza antes del checkout
                    Reserva.fecha_checkout > fecha_checkin   # Reserva termina después del checkin
                )
            ).all()
            
            print(f"   - Reservas encontradas: {len(reservas_solapadas)}")
            for r in reservas_solapadas:
                print(f"     • {r.nombre_huesped}: {r.fecha_checkin.date()} a {r.fecha_checkout.date()}")
            
            # Si no hay reservas solapadas, la habitación está disponible
            if not reservas_solapadas:
                habitaciones_disponibles.append({
                    "id": habitacion.id,
                    "numero": habitacion.numero,
                    "tipo": habitacion.tipo,
                    "capacidad": habitacion.capacidad,
                    "precio": habitacion.precio,
                    "descripcion": habitacion.descripcion
                })
                print(f"   ✅ Habitación {habitacion.numero} DISPONIBLE")
            else:
                print(f"   ❌ Habitación {habitacion.numero} OCUPADA")
        
        print(f"🎯 RESULTADO: {len(habitaciones_disponibles)} habitaciones disponibles")
        
        # Organizar por tipo
        disponibles_por_tipo = {}
        for hab in habitaciones_disponibles:
            tipo = hab["tipo"]
            if tipo not in disponibles_por_tipo:
                disponibles_por_tipo[tipo] = []
            disponibles_por_tipo[tipo].append(hab)
        
        resultado = {
            "disponible": len(habitaciones_disponibles) > 0,
            "habitaciones_libres": len(habitaciones_disponibles),
            "total_habitaciones_adecuadas": len(habitaciones_adecuadas),
            "fechas": {
                "checkin": checkin,
                "checkout": checkout
            },
            "huespedes": huespedes,
            "habitaciones_disponibles": habitaciones_disponibles,
            "disponibles_por_tipo": disponibles_por_tipo,
            "recomendacion": seleccionar_mejor_habitacion(habitaciones_disponibles, huespedes, tipo_preferido),
            # ✅ INFORMACIÓN DE DEBUG
            "debug": {
                "total_habitaciones_bd": len(todas_habitaciones),
                "capacidades_disponibles": [h.capacidad for h in todas_habitaciones],
                "habitaciones_capacidad_suficiente": len(habitaciones_adecuadas),
                "tipo_filtro_aplicado": tipo_preferido
            }
        }
        
        print(f"📤 Enviando respuesta: {resultado['disponible']}")
        return resultado
        
    except Exception as e:
        print(f"💥 Error en verificar_disponibilidad: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            "disponible": False,
            "error": f"Error al verificar disponibilidad: {str(e)}",
            "habitaciones_libres": 0,
            "habitaciones_disponibles": []
        }
```

### Función `seleccionar_mejor_habitacion()`

```2109:2140:backend/hotel-santino-backend/hotel.py
def seleccionar_mejor_habitacion(habitaciones_disponibles, huespedes, tipo_preferido):
    """
    Selecciona la mejor habitación basada en criterios de optimización
    """
    if not habitaciones_disponibles:
        return None
    
    # Filtrar por tipo preferido si se especifica
    if tipo_preferido:
        habitaciones_filtradas = [h for h in habitaciones_disponibles if h["tipo"] == tipo_preferido]
        if habitaciones_filtradas:
            habitaciones_disponibles = habitaciones_filtradas
    
    # Ordenar por criterios de preferencia:
    # 1. Capacidad exacta o lo más cercana posible
    # 2. Precio (menor es mejor)
    # 3. Número de habitación (menor es mejor)
    
    def criterio_seleccion(habitacion):
        diferencia_capacidad = habitacion["capacidad"] - huespedes
        # Penalizar mucho si la capacidad es menor (no debería pasar)
        if diferencia_capacidad < 0:
            diferencia_capacidad = 100
        
        return (diferencia_capacidad, habitacion["precio"], habitacion["numero"])
    
    mejor_habitacion = min(habitaciones_disponibles, key=criterio_seleccion)
    
    return {
        "habitacion_recomendada": mejor_habitacion,
        "razon": f"Mejor opción para {huespedes} huéspedes: capacidad {mejor_habitacion['capacidad']}, precio ${mejor_habitacion['precio']:,}"
    }
```

### Proceso de Selección

1. **Filtro por capacidad**: `capacidad >= huespedes`
2. **Filtro por tipo** (opcional): Si se especifica `roomType`, filtra por ese tipo
3. **Filtro por disponibilidad**: Verifica que no haya reservas solapadas en las fechas
4. **Selección de mejor opción**: Ordena por:
   - Menor diferencia de capacidad (prefiere capacidad exacta)
   - Menor precio
   - Menor número de habitación

---

## 4. Dónde está Definida la Capacidad de Cada Habitación

### Modelo de Datos

```89:95:backend/hotel-santino-backend/hotel.py
class Habitacion(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    numero: int
    tipo: str
    precio: Optional[float] = None
    capacidad: Optional[int] = 2
    descripcion: Optional[str] = None
```

### Configuración de Capacidades

Las capacidades están definidas en el endpoint `/setup-habitaciones`:

```1868:1897:backend/hotel-santino-backend/hotel.py
        # Basada en las reglas de negocio: capacidades según número
        habitaciones_config = [
            # Habitaciones Estándar para 5 personas (1-4)
            {"numero": 1, "tipo": "Estándar", "capacidad": 5, "precio": 90000},
            {"numero": 2, "tipo": "Estándar", "capacidad": 5, "precio": 90000},
            {"numero": 3, "tipo": "Estándar", "capacidad": 5, "precio": 90000},
            {"numero": 4, "tipo": "Estándar", "capacidad": 5, "precio": 90000},
            
            # Habitación Estándar para 3 personas (5)
            {"numero": 5, "tipo": "Estándar", "capacidad": 3, "precio": 80000},
            
            # Habitaciones Estándar para 2 personas (6, 11)
            {"numero": 6, "tipo": "Estándar", "capacidad": 2, "precio": 50000},
            {"numero": 11, "tipo": "Estándar", "capacidad": 2, "precio": 50000},
            
            # Habitación Estándar para 6 personas (7)
            {"numero": 7, "tipo": "Estándar", "capacidad": 6, "precio": 100000},
            
            # Habitaciones Estándar para 3 personas (8, 9)
            {"numero": 8, "tipo": "Estándar", "capacidad": 3, "precio": 65000},
            {"numero": 9, "tipo": "Estándar", "capacidad": 3, "precio": 65000},
            
            # Habitación Estándar para 7 personas (10)
            {"numero": 10, "tipo": "Estándar", "capacidad": 7, "precio": 110000},
            
            # Habitaciones Confort para 4 personas (12-15)
            {"numero": 12, "tipo": "Confort", "capacidad": 4, "precio": 90000},
            {"numero": 13, "tipo": "Confort", "capacidad": 4, "precio": 90000},
            {"numero": 14, "tipo": "Confort", "capacidad": 4, "precio": 90000},
            {"numero": 15, "tipo": "Confort", "capacidad": 4, "precio": 90000},
```

### Tabla de Capacidades Actuales

| Habitación | Tipo | Capacidad | Precio |
|------------|------|-----------|--------|
| 1-4 | Estándar | **5** | $90,000 |
| **5** | Estándar | **3** | $80,000 |
| 6, 11 | Estándar | **2** | $50,000 |
| 7 | Estándar | **6** | $100,000 |
| **8, 9** | Estándar | **3** | $65,000 |
| 10 | Estándar | **7** | $110,000 |
| 12-15 | Confort | **4** | $90,000 |

### ✅ Configuración Correcta

**Habitaciones con capacidad para 3 personas:**
- Habitación **5**: capacidad **3** ✅
- Habitación **8**: capacidad **3** ✅
- Habitación **9**: capacidad **3** ✅

**Comportamiento del sistema para `guests: 3`:**
- El sistema filtrará habitaciones con `capacidad >= 3`:
  - ✅ Hab 5 (capacidad 3)
  - ✅ Hab 8 (capacidad 3)
  - ✅ Hab 9 (capacidad 3)
  - ✅ Hab 1-4 (capacidad 5) - Se incluirían porque 5 >= 3
  - ✅ Hab 7 (capacidad 6) - Se incluiría porque 6 >= 3
  - ✅ Hab 10 (capacidad 7) - Se incluiría porque 7 >= 3
  - ✅ Hab 12-15 (capacidad 4) - Se incluirían porque 4 >= 3

**La función `seleccionar_mejor_habitacion()` prioriza capacidad exacta**, por lo que elegiría Hab 5, 8 o 9 (todas con capacidad 3) antes que habitaciones con mayor capacidad. Entre las de capacidad 3, elegiría la de menor precio (Hab 5: $80,000 vs Hab 8/9: $65,000), pero como el criterio también considera el número de habitación, podría elegir cualquiera de las tres.

---

## 5. Validación de Capacidad Suficiente

### ✅ Validación en `/reservas-web`

La validación está **implícita** en `verificar_disponibilidad()`:
- Solo considera habitaciones con `capacidad >= huespedes`
- Si no hay habitaciones disponibles con capacidad suficiente, retorna `"disponible": false`

### ✅ Validación Explícita en `/reservas-gestion`

El endpoint de gestión interna tiene una validación **explícita** adicional:

```2515:2520:backend/hotel-santino-backend/hotel.py
        # Validar capacidad
        if habitacion.capacidad < data.cantidad_personas:
            raise HTTPException(
                status_code=400, 
                detail=f"La habitación {habitacion.numero} tiene capacidad para {habitacion.capacidad} personas, se solicitaron {data.cantidad_personas}"
            )
```

**Nota:** Esta validación es para cuando se especifica manualmente una habitación. En `/reservas-web`, la habitación se asigna automáticamente, por lo que esta validación no es necesaria (el filtro previo ya garantiza capacidad suficiente).

---

## Análisis de Casos Específicos

### Caso 1: `guests: 3`

**Habitaciones que cumplen `capacidad >= 3`:**
- Hab 5 (capacidad 3) ✅
- Hab 8 (capacidad 3) ✅
- Hab 9 (capacidad 3) ✅
- Hab 1-4 (capacidad 5) ✅
- Hab 7 (capacidad 6) ✅
- Hab 10 (capacidad 7) ✅
- Hab 12-15 (capacidad 4) ✅

**Habitación seleccionada:** Hab 5, 8 o 9 (todas con capacidad exacta 3. El sistema elegirá la de menor precio y número entre estas tres)

### Caso 2: `guests: 2`

**Habitaciones que cumplen `capacidad >= 2`:**
- Hab 6 (capacidad 2) ✅
- Hab 11 (capacidad 2) ✅
- Hab 5, 8, 9 (capacidad 3) ✅
- Hab 12-15 (capacidad 4) ✅
- Hab 1-4 (capacidad 5) ✅
- Hab 7 (capacidad 6) ✅
- Hab 10 (capacidad 7) ✅

**Habitación seleccionada:** Hab 6 o 11 (menor capacidad que cumple, capacidad exacta)

### Caso 3: `guests: 4`

**Habitaciones que cumplen `capacidad >= 4`:**
- Hab 12-15 (capacidad 4) ✅
- Hab 1-4 (capacidad 5) ✅
- Hab 7 (capacidad 6) ✅
- Hab 10 (capacidad 7) ✅

**Habitación seleccionada:** Hab 12-15 (menor capacidad que cumple, capacidad exacta. El sistema elegirá la de menor precio y número entre estas cuatro)

---

## Conclusiones

### ✅ Lo que funciona correctamente:

1. **Filtrado por capacidad**: El sistema filtra correctamente por `capacidad >= guests`
2. **Asignación inteligente**: Prioriza habitaciones con capacidad exacta o la menor posible
3. **Validación implícita**: Si no hay habitaciones con capacidad suficiente, no permite la reserva

### ⚠️ Puntos a considerar:

1. **Filtro >= vs ==**: El sistema usa `>=` (mayor o igual), no `==` (igual). Esto permite asignar habitaciones más grandes si no hay exactas disponibles, lo cual es un comportamiento razonable.

### 🔧 Recomendaciones:

1. **Si quieres filtrar solo por capacidad exacta** (no mayor), modifica la línea 2017:
   ```python
   # Cambiar de:
   habitaciones_adecuadas = [h for h in todas_habitaciones if h.capacidad >= huespedes]
   # A:
   habitaciones_adecuadas = [h for h in todas_habitaciones if h.capacidad == huespedes]
   ```
   **⚠️ Advertencia:** Esto podría dejar sin opciones a los huéspedes si no hay habitaciones con capacidad exacta disponible.

3. **Validación adicional opcional**: Podrías agregar una validación explícita después de la asignación en `/reservas-web` para mayor seguridad:
   ```python
   if habitacion_recomendada["capacidad"] < data.guests:
       raise HTTPException(status_code=400, detail="Error: Habitación asignada no tiene capacidad suficiente")
   ```

---

## Ubicación del Código

- **Endpoint `/reservas-web`**: `backend/hotel-santino-backend/hotel.py` (líneas 2221-2376)
- **Función `verificar_disponibilidad()`**: `backend/hotel-santino-backend/hotel.py` (líneas 1992-2107)
- **Función `seleccionar_mejor_habitacion()`**: `backend/hotel-santino-backend/hotel.py` (líneas 2109-2140)
- **Modelo `Habitacion`**: `backend/hotel-santino-backend/hotel.py` (líneas 89-95)
- **Configuración de capacidades**: `backend/hotel-santino-backend/hotel.py` (líneas 1868-1897)

