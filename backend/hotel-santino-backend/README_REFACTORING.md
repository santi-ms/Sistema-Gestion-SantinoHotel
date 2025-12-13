# Refactorización del Endpoint `/api/disponibilidad-inteligente`

## Resumen

Se realizó una refactorización completa del endpoint `/api/disponibilidad-inteligente` para eliminar parches y crear una arquitectura limpia, robusta y testeada.

## Estructura de la Arquitectura

```
backend/hotel-santino-backend/
├── app/
│   ├── repositories/
│   │   └── availability_repo.py    # ÚNICO lugar con SQL crudo
│   └── services/
│       └── availability_service.py  # Lógica de negocio reutilizable
├── tests/
│   ├── test_availability_service.py # Tests unitarios del service
│   └── test_availability_repo.py    # Tests del repositorio
└── alembic/
    └── versions/
        └── 001_add_capacidad_not_null.py  # Migración para capacidad NOT NULL
```

## Componentes

### 1. Repository (`app/repositories/availability_repo.py`)

**Responsabilidad única**: Encapsular todas las queries SQL relacionadas con disponibilidad.

**Funciones expuestas**:
- `list_rooms_with_capacity(session, min_capacity)` → Lista habitaciones con capacidad >= min_capacity
- `list_available_rooms(session, checkin, checkout, min_capacity, blocking_states)` → Lista habitaciones disponibles
- `count_overlapping_reservations(session, habitacion_id, checkin, checkout, blocking_states)` → Cuenta reservas solapadas

**Características**:
- Usa `text()` y parámetros bind para prevenir SQL injection
- Compatible con SQLite y PostgreSQL
- Solo queries SQL, sin lógica de negocio

### 2. Service (`app/services/availability_service.py`)

**Responsabilidad**: Contener toda la lógica de negocio reutilizable.

**Funciones expuestas**:
- `get_available_rooms(session, checkin, checkout, personas)` → Obtiene habitaciones disponibles
- `pick_best_room(rooms, personas)` → Selecciona la mejor habitación (menor capacidad que cumpla)
- `calculate_pricing(habitacion, noches, mascota)` → Calcula precios con breakdown completo
- `calculate_nights(checkin, checkout)` → Calcula número de noches

**Características**:
- Fuente de verdad para reglas de negocio
- Reutilizable por otros endpoints
- Independiente del framework (FastAPI)

### 3. Endpoint Refactorizado (`hotel.py`)

**Responsabilidad**: Validar input, llamar service, devolver response.

**Características**:
- Código limpio y fácil de leer
- Usa logging en lugar de prints
- Manejo de errores robusto
- Misma funcionalidad que antes

### 4. Migraciones (Alembic)

**Migración `001_add_capacidad_not_null`**:
- Actualiza capacidades NULL usando mapeo por número de habitación
- Agrega constraint NOT NULL a `capacidad`
- Agrega CHECK constraint: `capacidad >= 1 AND capacidad <= 7`

**Para ejecutar migraciones**:
```bash
# Crear nueva migración
alembic revision --autogenerate -m "descripción"

# Aplicar migraciones
alembic upgrade head

# Revertir última migración
alembic downgrade -1
```

### 5. Setup Habitaciones Mejorado (`/setup-habitaciones`)

**Características**:
- **Idempotente**: Seguro de ejecutar múltiples veces
- **Repara datos**: Actualiza capacidades/precios NULL o incorrectos
- **Resumen detallado**: Devuelve creadas, actualizadas, intactas
- **Mapeo correcto**: Usa las reglas de negocio definidas

**Reglas de negocio**:
- Hab. 1-4: capacidad 5, precio $90,000
- Hab. 5: capacidad 4, precio $80,000
- Hab. 6, 11: capacidad 2, precio $50,000
- Hab. 7: capacidad 6, precio $100,000
- Hab. 8, 9: capacidad 3, precio $65,000
- Hab. 10: capacidad 7, precio $110,000
- Hab. 12-15: capacidad 4, precio $90,000

### 6. Tests (pytest)

**Tests unitarios del service**:
- `test_pick_best_room_capacidad_exacta`: Elige habitación con capacidad exacta
- `test_pick_best_room_capacidad_mayor`: Elige menor capacidad que cumpla
- `test_calculate_pricing_sin_mascota`: Calcula precio sin mascota
- `test_calculate_pricing_con_mascota`: Calcula precio con mascota (+$7000/noche)

**Tests del repositorio**:
- `test_solapamiento_reserva_10_12_consulta_12_14_disponible`: No hay solapamiento
- `test_solapamiento_reserva_10_12_consulta_11_13_no_disponible`: Hay solapamiento

**Para ejecutar tests**:
```bash
pytest tests/
```

## Reglas de Negocio Implementadas

### Solapamiento de Fechas
- Una reserva bloquea si: `r.checkin < checkout_solicitado AND r.checkout > checkin_solicitado`
- Estados bloqueantes: `PENDIENTE_SEÑA`, `CONFIRMADA`, `Seña Pendiente`, `Seña Recibida`
- Estados que NO bloquean: `CANCELADA`, `VENCIDA` (si existen)

### Selección de Habitación
1. Filtrar por `capacidad >= personas`
2. Excluir ocupadas por reservas solapadas en estados bloqueantes
3. Ordenar por: capacidad ASC, precio ASC, numero ASC
4. Elegir la primera (mejor opción)

### Precios
- Precio por noche: según capacidad de la habitación (desde la BD)
- Extra mascota: $7,000 por noche si `mascota=true`

## Próximos Pasos

1. **Ejecutar migración en producción**:
   ```bash
   alembic upgrade head
   ```

2. **Ejecutar setup-habitaciones** (idempotente, seguro):
   ```bash
   POST /setup-habitaciones
   ```

3. **Ejecutar tests**:
   ```bash
   pytest tests/
   ```

## Beneficios de la Refactorización

✅ **Código limpio**: Separación de responsabilidades (Repository/Service/Endpoint)  
✅ **Reutilizable**: Service puede usarse por otros endpoints  
✅ **Testeable**: Tests unitarios sin necesidad de servidor  
✅ **Mantenible**: SQL encapsulado en un solo lugar  
✅ **Robusto**: Migraciones para asegurar integridad de datos  
✅ **Idempotente**: Setup-habitaciones seguro de ejecutar múltiples veces  
✅ **Sin parches**: Arquitectura profesional desde cero


