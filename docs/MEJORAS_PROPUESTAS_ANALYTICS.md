# 📊 Mejoras Propuestas para Analytics

## 🔍 Análisis del Estado Actual

### ⚠️ Problemas Identificados en el Código Actual

#### 1. **Cálculo Incorrecto de Tasa de Ocupación** 🔴 CRÍTICO

**Ubicación:** `backend/hotel-santino-backend/hotel.py:3107`

**Problema:**
```python
dias_ocupados = sum((r.fecha_checkout - r.fecha_checkin).days for r in reservas_mes)
```

**Issues:**
- Solo cuenta reservas que **iniciaron** en el mes, pero no considera reservas que **continuaron** desde meses anteriores
- Si una reserva comenzó en enero y termina en febrero, febrero no cuenta esos días
- El cálculo debería considerar todas las noches ocupadas en el período, no solo las reservas que iniciaron

**Solución propuesta:**
```python
# Contar todas las noches ocupadas en el período, no solo reservas que iniciaron
dias_ocupados = 0
for reserva in reservas_mes:
    # Calcular días dentro del período
    inicio_reserva = max(reserva.fecha_checkin, inicio_mes)
    fin_reserva = min(reserva.fecha_checkout, hoy)
    dias_ocupados += (fin_reserva - inicio_reserva).days

# También considerar reservas que comenzaron antes pero continúan en el mes
reservas_continuas = db.exec(
    select(Reserva).where(
        Reserva.fecha_checkin < inicio_mes,
        Reserva.fecha_checkout >= inicio_mes,
        Reserva.fecha_checkout <= hoy,
        Reserva.estado != "cancelada"
    )
).all()

for reserva in reservas_continuas:
    inicio_reserva = inicio_mes
    fin_reserva = min(reserva.fecha_checkout, hoy)
    dias_ocupados += (fin_reserva - inicio_reserva).days
```

---

#### 2. **Falta Validación de Fechas en Endpoints** 🟡 MEDIO

**Problema:** Los endpoints no validan que `fecha_inicio <= fecha_fin`.

**Solución:** Agregar validación:
```python
if fecha_inicio_dt > fecha_fin_dt:
    raise HTTPException(status_code=400, detail="fecha_inicio debe ser anterior a fecha_fin")
```

---

#### 3. **Cálculo de Ingresos por Día Usa Solo fecha_checkin** 🟡 MEDIO

**Ubicación:** `backend/hotel-santino-backend/hotel.py:3151`

**Problema:**
```python
for reserva in reservas:
    fecha_str = reserva.fecha_checkin.strftime("%Y-%m-%d")
    ingresos_diarios[fecha_str]["reservas"] += reserva.total_estadia
```

**Issue:** Los ingresos se asignan al día de check-in, pero deberían distribuirse por cada noche de estadía, o al menos considerar cuándo se pagó realmente.

**Nota:** Esto puede ser intencional (ingresos reconocidos al check-in), pero debería documentarse.

---

#### 4. **Falta Manejo de Reservas Completadas** 🟢 BAJO

**Problema:** El dashboard no diferencia entre reservas activas y completadas en algunas métricas.

**Solución:** Agregar desglose:
```python
"reservas_activas": len([r for r in reservas_mes if r.estado == "activa"]),
"reservas_completadas": len([r for r in reservas_mes if r.estado == "completada"]),
```

---

#### 5. **Performance: Consultas Sin Índices** 🟡 MEDIO

**Problema:** Las consultas filtran por `fecha_checkin`, `estado`, pero pueden no tener índices optimizados.

**Solución:** Agregar índices en la base de datos:
```sql
CREATE INDEX idx_reserva_fecha_checkin ON reserva(fecha_checkin);
CREATE INDEX idx_reserva_estado ON reserva(estado);
CREATE INDEX idx_reserva_fecha_checkin_estado ON reserva(fecha_checkin, estado);
```

---

## 🔍 Análisis del Estado Actual

### Endpoints Existentes:
1. `GET /analytics/dashboard` - Dashboard principal del mes actual
2. `GET /analytics/ingresos-por-dia` - Ingresos diarios (últimos N días)
3. `GET /analytics/formas-pago` - Análisis de formas de pago del mes
4. `GET /analytics/detalle-diario` - Detalle día por día
5. `GET /ocupacion-estadisticas` - Estadísticas de ocupación
6. `GET /estadisticas/senas` - Estadísticas de señas
7. `GET /resumen-dia` - Resumen financiero del día

---

## 🚀 Mejoras Propuestas

### 1. **Comparación con Períodos Anteriores** ⭐ ALTA PRIORIDAD

**Problema actual:** No hay comparación con meses anteriores para ver tendencias.

**Solución:**
- Agregar comparación mes actual vs mes anterior
- Mostrar porcentaje de cambio (↑/↓)
- Comparar: ingresos, reservas, ocupación, beneficio neto

**Endpoint propuesto:**
```python
@app.get("/analytics/comparacion")
def comparacion_periodos(
    periodo: str = Query("mes", description="mes, semana, año"),
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    # Comparar período actual vs anterior
    # Retornar: valores actuales, valores anteriores, % cambio
```

**Ejemplo de respuesta:**
```json
{
  "periodo_actual": "Febrero 2025",
  "periodo_anterior": "Enero 2025",
  "ingresos": {
    "actual": 2250000,
    "anterior": 2000000,
    "cambio": 12.5,
    "tendencia": "↑"
  },
  "reservas": {
    "actual": 25,
    "anterior": 20,
    "cambio": 25.0,
    "tendencia": "↑"
  }
}
```

---

### 2. **Estadísticas por Tipo de Habitación** ⭐ ALTA PRIORIDAD

**Problema actual:** No se desglosa ingresos/ocupación por tipo de habitación.

**Solución:**
- Agregar estadísticas separadas para Estándar vs Confort
- Mostrar ocupación por tipo
- Ingresos por tipo de habitación

**Endpoint propuesto:**
```python
@app.get("/analytics/por-tipo-habitacion")
def estadisticas_por_tipo_habitacion(
    fecha_inicio: str = Query(...),
    fecha_fin: str = Query(...),
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    # Estadísticas por tipo: Estándar, Confort
    # Retornar: ocupación, ingresos, reservas por tipo
```

---

### 3. **Estadísticas por Capacidad de Habitación** ⭐ MEDIA PRIORIDAD

**Problema actual:** No se analiza qué capacidades son más demandadas.

**Solución:**
- Mostrar reservas por capacidad (2, 3, 4, 5, 6, 7 personas)
- Tasa de ocupación por capacidad
- Ingresos por capacidad

**Endpoint propuesto:**
```python
@app.get("/analytics/por-capacidad")
def estadisticas_por_capacidad(
    fecha_inicio: str = Query(...),
    fecha_fin: str = Query(...),
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    # Agrupar por capacidad de habitación
    # Retornar: estadísticas por capacidad
```

---

### 4. **Análisis de Temporada Alta/Baja** ⭐ MEDIA PRIORIDAD

**Problema actual:** No se identifica cuándo hay más demanda.

**Solución:**
- Identificar días de la semana con más reservas
- Meses con mayor ocupación
- Promedio de estadía por temporada

**Endpoint propuesto:**
```python
@app.get("/analytics/temporadas")
def analisis_temporadas(
    año: int = Query(...),
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    # Análisis por día de semana, mes, temporada
    # Retornar: días más ocupados, meses pico, etc.
```

---

### 5. **Métricas de Reservas Web vs Gestión** ⭐ MEDIA PRIORIDAD

**Problema actual:** No se diferencia el origen de las reservas.

**Solución:**
- Comparar reservas desde web vs sistema de gestión
- Tasa de conversión de reservas web
- Ingresos por origen

**Mejora en endpoint existente:**
```python
# Agregar al dashboard:
"reservas_por_origen": {
    "web": 10,
    "gestion": 15,
    "whatsapp": 5
},
"ingresos_por_origen": {
    "web": 900000,
    "gestion": 1350000,
    "whatsapp": 450000
}
```

---

### 6. **Análisis de Cancelaciones** ⭐ MEDIA PRIORIDAD

**Problema actual:** No se analiza el impacto de las cancelaciones.

**Solución:**
- Tasa de cancelación
- Ingresos perdidos por cancelaciones
- Razones de cancelación (si se agrega campo)

**Endpoint propuesto:**
```python
@app.get("/analytics/cancelaciones")
def analisis_cancelaciones(
    fecha_inicio: str = Query(...),
    fecha_fin: str = Query(...),
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    # Análisis de reservas canceladas
    # Retornar: tasa cancelación, ingresos perdidos, tendencia
```

---

### 7. **Promedio de Estadía y Precio por Noche** ⭐ BAJA PRIORIDAD

**Problema actual:** No se calculan promedios útiles.

**Solución:**
- Promedio de días de estadía
- Precio promedio por noche
- Comparación con precios base

**Mejora en dashboard:**
```python
"promedios": {
    "estadia_promedio": 2.5,  # días
    "precio_por_noche_promedio": 85000,
    "precio_base_promedio": 80000,
    "diferencia": 5000  # margen adicional
}
```

---

### 8. **Análisis de Mascotas** ⭐ BAJA PRIORIDAD

**Problema actual:** No se analiza el impacto de las mascotas.

**Solución:**
- Porcentaje de reservas con mascotas
- Ingresos adicionales por mascotas
- Tasa de ocupación de habitaciones con mascotas

---

### 9. **Filtros de Fecha Mejorados** ⭐ ALTA PRIORIDAD

**Problema actual:** Algunos endpoints solo permiten mes actual.

**Solución:**
- Permitir seleccionar cualquier mes/año
- Rango de fechas personalizado
- Comparación entre rangos

**Mejora en `/analytics/dashboard`:**
```python
@app.get("/analytics/dashboard")
def dashboard_analytics(
    mes: Optional[int] = Query(None),
    año: Optional[int] = Query(None),
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    # Si no se especifica, usar mes actual
    # Si se especifica, usar ese mes/año
```

---

### 10. **Exportación de Reportes Mejorada** ⭐ MEDIA PRIORIDAD

**Problema actual:** Solo hay exportación básica a CSV.

**Solución:**
- Exportar a PDF
- Reportes pre-formateados (diario, semanal, mensual)
- Incluir gráficos en el reporte

---

### 11. **Métricas de Performance de Habitaciones** ⭐ MEDIA PRIORIDAD

**Problema actual:** No se identifica qué habitaciones generan más ingresos.

**Solución:**
- Ranking de habitaciones por ingresos
- Tasa de ocupación por habitación
- Habitaciones más/menos rentables

**Endpoint propuesto:**
```python
@app.get("/analytics/habitaciones-performance")
def performance_habitaciones(
    fecha_inicio: str = Query(...),
    fecha_fin: str = Query(...),
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    # Ranking de habitaciones
    # Retornar: ingresos, ocupación, reservas por habitación
```

---

### 12. **Análisis de Formas de Pago Más Detallado** ⭐ BAJA PRIORIDAD

**Problema actual:** Solo muestra totales, no tendencias.

**Solución:**
- Evolución de formas de pago en el tiempo
- Preferencias por temporada
- Comparación mes a mes

---

### 13. **Dashboard con KPIs Clave** ⭐ ALTA PRIORIDAD

**Problema actual:** Las métricas están dispersas.

**Solución:**
- Agregar KPIs importantes:
  - RevPAR (Revenue Per Available Room)
  - ADR (Average Daily Rate)
  - Tasa de ocupación objetivo vs real
  - Margen de beneficio por habitación

**Cálculos propuestos:**
```python
# RevPAR = Ingresos totales / (Habitaciones totales × Días del período)
revpar = ingresos_reservas / (total_habitaciones * dias_periodo)

# ADR = Ingresos totales / Noches ocupadas
noches_ocupadas = sum((r.fecha_checkout - r.fecha_checkin).days for r in reservas)
adr = ingresos_reservas / noches_ocupadas if noches_ocupadas > 0 else 0
```

---

### 14. **Alertas y Notificaciones** ⭐ BAJA PRIORIDAD

**Problema actual:** No hay alertas automáticas.

**Solución:**
- Alertas cuando la ocupación baja del 50%
- Alertas cuando hay muchas cancelaciones
- Notificaciones de hitos (ej: mejor día del mes)

---

### 15. **Gráficos Adicionales en Frontend** ⭐ MEDIA PRIORIDAD

**Problema actual:** Solo hay gráficos básicos.

**Solución:**
- Gráfico de ocupación por día de la semana
- Heatmap de ocupación (calendario)
- Gráfico de tendencias (línea de tiempo)
- Comparación lado a lado (actual vs anterior)

---

## 🎯 Priorización Recomendada

### Fase 1 (Implementar Primero):
1. ✅ Comparación con períodos anteriores
2. ✅ Filtros de fecha mejorados (mes/año seleccionable)
3. ✅ Dashboard con KPIs clave (RevPAR, ADR)
4. ✅ Estadísticas por tipo de habitación

### Fase 2 (Segunda Ola):
5. Estadísticas por capacidad
6. Análisis de temporadas
7. Métricas de performance de habitaciones
8. Reservas por origen

### Fase 3 (Mejoras Adicionales):
9. Análisis de cancelaciones
10. Promedios de estadía
11. Exportación mejorada
12. Gráficos adicionales

---

## 📝 Notas Técnicas

### Consideraciones:
- Todas las consultas deben excluir reservas canceladas (`estado != "cancelada"`)
- Usar timezone de Argentina en todas las fechas
- Optimizar consultas para grandes volúmenes de datos
- Cachear resultados cuando sea posible

### Mejoras de Performance:
- Agregar índices en BD para `fecha_checkin`, `estado`, `habitacion_id`
- Considerar materializar vistas para reportes frecuentes
- Paginación en endpoints que retornan muchos datos

