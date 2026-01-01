from fastapi import FastAPI, HTTPException, Depends, status, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Field, Session, select, create_engine, text
from sqlalchemy import func
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel
import json
from collections import defaultdict
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite todos los orígenes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1) Toma la URL de Postgres que pusiste en las variables de Railway.
# 2) Si la variable no existe (por ejemplo, corriendo local), sigue usando SQLite.
# NOTA: En Railway, DATABASE_URL se configura automáticamente al agregar PostgreSQL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///hotel.db")

# 3) Railway obliga a usar SSL en Postgres, así que le pasamos sslmode=require
engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"sslmode": "require"} if DATABASE_URL.startswith("postgres") else {}
)


# SECRET_KEY: En producción, usar variable de entorno. En desarrollo local, usar valor por defecto.
# IMPORTANTE: Cambiar en producción por seguridad
SECRET_KEY = os.getenv("SECRET_KEY", "clave-secreta-desarrollo-local-cambiar-en-produccion")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# ─────────── CONFIGURACIÓN DE ZONA HORARIA ───────────
# Zona horaria de Argentina (UTC-3)
ARGENTINA_TZ = timezone(timedelta(hours=-3))

def obtener_fecha_argentina():
    """Obtiene la fecha y hora actual en zona horaria de Argentina"""
    # Usar UTC como base y convertir a Argentina para evitar problemas cuando el servidor está en otra zona horaria
    ahora_utc = datetime.now(timezone.utc)
    return ahora_utc.astimezone(ARGENTINA_TZ)

def convertir_a_argentina(fecha_utc):
    """Convierte una fecha UTC a zona horaria de Argentina"""
    if fecha_utc.tzinfo is None:
        fecha_utc = fecha_utc.replace(tzinfo=timezone.utc)
    return fecha_utc.astimezone(ARGENTINA_TZ)

def normalizar_fecha_argentina(fecha):
    """Asegura que una fecha tenga timezone de Argentina"""
    if fecha is None:
        return None
    if fecha.tzinfo is None:
        # Si no tiene timezone, PostgreSQL probablemente lo guardó como UTC
        # Asumir UTC y convertir a Argentina
        fecha_utc = fecha.replace(tzinfo=timezone.utc)
        return fecha_utc.astimezone(ARGENTINA_TZ)
    elif fecha.tzinfo != ARGENTINA_TZ:
        # Si tiene otro timezone, convertir a Argentina
        return fecha.astimezone(ARGENTINA_TZ)
    return fecha

# ─────────── MODELOS ACTUALIZADOS ───────────
class Rol(str, Enum):
    dueño = "dueño"
    empleado = "empleado"

class Usuario(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str
    contraseña: str
    rol: Rol

class Habitacion(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    numero: int
    tipo: str
    precio: Optional[float] = None
    capacidad: Optional[int] = 2
    descripcion: Optional[str] = None

class Cliente(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre: str
    dni: str
    celular: str
    patente: Optional[str] = None

class Reserva(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    cliente_id: int
    habitacion_id: int
    fecha_checkin: datetime
    fecha_checkout: datetime
    seña: float
    total_estadia: float
    forma_pago: str
    nombre_huesped: Optional[str] = None
    origen: Optional[str] = None  # "whatsapp", "web", "gestion", etc.
    estado: str = "activa"  # "activa", "completada", "cancelada"

class Pedido(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    detalle: str  # Almacena JSON con los items
    monto: float
    habitacion_id: Optional[int] = None
    externo: bool = False
    forma_pago: Optional[str] = None  # Se define al cobrar (si está pendiente puede ser None)
    estado: str = "PENDIENTE"  # PENDIENTE | PAGADO | CANCELADO
    pagado_at: Optional[datetime] = None
    fecha: datetime = Field(default_factory=lambda: obtener_fecha_argentina())

class GastoAdicional(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    habitacion_id: Optional[int] = None  # Opcional: solo si el gasto es específico de una habitación
    descripcion: str
    monto: float
    fecha: datetime

class Actividad(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    titulo: str
    descripcion: Optional[str] = None
    estado: str = "pendiente"  # pendiente, en_progreso, completada
    prioridad: str = "media"  # baja, media, alta
    fecha_creacion: datetime = Field(default_factory=lambda: obtener_fecha_argentina())
    fecha_vencimiento: Optional[datetime] = None
    creado_por: int  # ID del usuario que creó la actividad
    asignado_a: Optional[int] = None  # ID del usuario asignado (opcional)

class Stock(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    nombre_producto: str  # Nombre del producto (ej: "Coca Cola 350ml")
    categoria: str  # "bebidas" o "comidas"
    cantidad: int = 0  # Cantidad en stock
    cantidad_minima: int = 0  # Cantidad mínima antes de alertar
    fecha_actualizacion: datetime = Field(default_factory=lambda: obtener_fecha_argentina())

class ChatSession(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    phone: str = Field(unique=True, index=True)  # Número de WhatsApp (wa_id)
    estado: str = Field(default="INICIO")  # Estados del chatbot
    checkin: Optional[str] = None  # Fecha checkin en formato YYYY-MM-DD
    checkout: Optional[str] = None  # Fecha checkout en formato YYYY-MM-DD
    personas: Optional[int] = None
    mascota: Optional[bool] = None
    reserva_id: Optional[int] = None  # ID de reserva si se crea
    bot_pausado: bool = Field(default=False)
    updated_at: datetime = Field(default_factory=lambda: obtener_fecha_argentina())

class MovimientoStock(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    stock_id: int  # ID del producto
    tipo: str  # "entrada", "salida", "ajuste", "venta"
    cantidad_anterior: int
    cantidad_nueva: int
    diferencia: int  # Positivo para entradas, negativo para salidas
    motivo: Optional[str] = None  # Motivo del movimiento
    usuario_id: Optional[int] = None  # ID del usuario que hizo el movimiento
    fecha: datetime = Field(default_factory=lambda: obtener_fecha_argentina())

# ─────────── MODELOS PARA ITEMS MÚLTIPLES ───────────
class ItemPedido(BaseModel):
    descripcion: str
    cantidad: int
    precio: float

class PedidoConItems(BaseModel):
    items: List[ItemPedido]
    habitacion_id: Optional[int] = None
    externo: bool = False
    # Si el pedido se guarda como pendiente, forma_pago puede ser None/"" y estado se setea a PENDIENTE
    forma_pago: Optional[str] = None
    estado: Optional[str] = None  # PENDIENTE | PAGADO

class PedidoRespuesta(BaseModel):
    id: int
    items: List[ItemPedido]
    monto: float
    habitacion_id: Optional[int]
    externo: bool
    forma_pago: Optional[str] = None
    estado: Optional[str] = None
    pagado_at: Optional[datetime] = None
    fecha: datetime

class PedidoCobrarEntrada(BaseModel):
    forma_pago: str  # efectivo | tarjeta | transferencia | etc.

# ─────────── MODELOS PARA RESERVAS ───────────
class ReservaEntrada(BaseModel):
    habitacion_id: int
    nombre_huesped: str
    precio: float
    seña: float = 0
    forma_pago: str = "pendiente"
    fecha_checkin: datetime
    fecha_checkout: datetime

class ReservaActualizar(BaseModel):
    habitacion_id: Optional[int] = None
    nombre_huesped: Optional[str] = None
    precio: Optional[float] = None
    seña: Optional[float] = None
    forma_pago: Optional[str] = None
    fecha_checkin: Optional[datetime] = None
    fecha_checkout: Optional[datetime] = None

class ActualizarPagoEntrada(BaseModel):
    forma_pago: str

# ─────────── MODELO PARA RESERVAS WEB (ACTUALIZADO) ───────────
class ReservaWeb(BaseModel):
    firstName: str
    lastName: str
    email: str
    phone: str
    checkin: str  # formato: "2025-01-15"
    checkout: str # formato: "2025-01-16"
    roomType: str
    guests: int
    requests: Optional[str] = None
    pet: bool = False
    # NUEVOS CAMPOS PARA MANEJAR LA SEÑA
    tipoPago: Optional[str] = "transferencia"  # Tipo de pago desde el frontend
    montoSeña: Optional[float] = None  # Monto de la seña calculado en el frontend

# ─────────── MODELO PARA SISTEMA DE GESTIÓN ───────────
class ReservaGestion(BaseModel):
    # Datos del cliente
    nombre_completo: str
    dni: str
    celular: str
    patente: Optional[str] = None
    cantidad_personas: int
    
    # Datos de la reserva
    habitacion_id: int
    fecha_ingreso: str  # formato: "dd/mm/aaaa"
    fecha_egreso: str   # formato: "dd/mm/aaaa"
    precio_total: float  # Mantenemos para compatibilidad
    seña: float
    forma_pago: str
    
    # Nuevos campos opcionales para dos precios
    precio_lista: Optional[float] = None  # Precio de lista
    precio_efectivo: Optional[float] = None  # Precio con descuento en efectivo
    
    # NUEVO: Campo para mascotas
    mascota: bool = False
    observaciones_mascota: Optional[str] = None  # Para notas adicionales sobre la mascota

# ─────────── MODELOS PARA ENDPOINTS DE WHATSAPP BOT ───────────
class DisponibilidadInteligenteEntrada(BaseModel):
    checkin: str  # formato: "YYYY-MM-DD"
    checkout: str  # formato: "YYYY-MM-DD"
    personas: int
    mascota: bool = False

class ReservaBotEntrada(BaseModel):
    nombre_completo: str
    dni: str
    celular: str
    patente: Optional[str] = None
    cantidad_personas: int
    habitacion_id: int
    fecha_ingreso: str  # formato: "YYYY-MM-DD"
    fecha_egreso: str   # formato: "YYYY-MM-DD"
    mascota: bool = False
    observaciones_mascota: Optional[str] = None

# ─────────── SCHEMAS PARA BOT DE WHATSAPP ───────────
class BotMessageIn(BaseModel):
    from_field: str = Field(alias="from")  # Número de WhatsApp
    text: str

class BotMessageOut(BaseModel):
    reply: Optional[str] = None
    action: Optional[str] = None  # Acción opcional (ej: "PAUSADO", "PEDIR_CHECKIN")

@app.on_event("startup")
def crear_tablas():
    """
    Crea las tablas si no existen.
    IMPORTANTE: create_all() solo crea tablas nuevas, NO las elimina ni recrea.
    Si una tabla ya existe, NO se modifica.
    """
    # Verificar estado de la base de datos antes de crear tablas
    try:
        with engine.connect() as connection:
            # Intentar contar reservas existentes
            try:
                result = connection.execute(text("SELECT COUNT(*) FROM reserva"))
                count = result.scalar()
                print(f"📊 [Startup] Reservas existentes en BD: {count}")
            except Exception as e:
                print(f"ℹ️ [Startup] Tabla reserva no existe aún o error: {e}")
            
            # Verificar y agregar columna 'origen' si falta (crítica para funcionamiento)
            try:
                if DATABASE_URL.startswith("postgres"):
                    # PostgreSQL: verificar si existe la columna
                    check_query = text("""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = 'reserva' AND column_name = 'origen'
                    """)
                    result = connection.execute(check_query)
                    exists = result.fetchone() is not None
                    
                    if not exists:
                        print("⚠️ [Startup] Columna 'origen' no existe, agregándola...")
                        connection.execute(text("ALTER TABLE reserva ADD COLUMN origen TEXT"))
                        connection.commit()
                        print("✅ [Startup] Columna 'origen' agregada correctamente")
                    else:
                        print("✅ [Startup] Columna 'origen' ya existe")
                else:
                    # SQLite: intentar agregar (fallará si ya existe)
                    try:
                        connection.execute(text("ALTER TABLE reserva ADD COLUMN origen TEXT"))
                        connection.commit()
                        print("✅ [Startup] Columna 'origen' agregada correctamente (SQLite)")
                    except Exception as e:
                        if "duplicate column" not in str(e).lower():
                            raise
                        print("✅ [Startup] Columna 'origen' ya existe")
            except Exception as e:
                print(f"⚠️ [Startup] Error verificando/agregando columna 'origen': {e}")
            
            # Verificar y agregar columna 'estado' si falta
            try:
                if DATABASE_URL.startswith("postgres"):
                    # PostgreSQL: verificar si existe la columna
                    check_query = text("""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = 'reserva' AND column_name = 'estado'
                    """)
                    result = connection.execute(check_query)
                    exists = result.fetchone() is not None
                    
                    if not exists:
                        print("⚠️ [Startup] Columna 'estado' no existe, agregándola...")
                        connection.execute(text("ALTER TABLE reserva ADD COLUMN estado TEXT DEFAULT 'activa'"))
                        # Actualizar reservas existentes sin estado
                        connection.execute(text("UPDATE reserva SET estado = 'activa' WHERE estado IS NULL"))
                        connection.commit()
                        print("✅ [Startup] Columna 'estado' agregada correctamente")
                    else:
                        print("✅ [Startup] Columna 'estado' ya existe")
                else:
                    # SQLite: intentar agregar (fallará si ya existe)
                    try:
                        connection.execute(text("ALTER TABLE reserva ADD COLUMN estado TEXT DEFAULT 'activa'"))
                        # Actualizar reservas existentes sin estado
                        connection.execute(text("UPDATE reserva SET estado = 'activa' WHERE estado IS NULL"))
                        connection.commit()
                        print("✅ [Startup] Columna 'estado' agregada correctamente (SQLite)")
                    except Exception as e:
                        if "duplicate column" not in str(e).lower():
                            raise
                        print("✅ [Startup] Columna 'estado' ya existe")
            except Exception as e:
                print(f"⚠️ [Startup] Error verificando/agregando columna 'estado': {e}")
    except Exception as e:
        print(f"⚠️ [Startup] Error verificando BD: {e}")
    
    # Crear tablas solo si no existen (create_all es seguro, no elimina datos)
    SQLModel.metadata.create_all(engine)
    print("✅ [Startup] Tablas verificadas/creadas")

# ─────────── UTILIDADES ───────────
def obtener_db():
    with Session(engine) as session:
        yield session

def crear_token(datos: dict):
    to_encode = datos.copy()
    expire = obtener_fecha_argentina() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire.timestamp()})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verificar_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

# ─────────── ENDPOINT PARA ARREGLAR LA BASE DE DATOS ───────────
@app.post("/fix-database")
def arreglar_base_datos(db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    try:
        print("🔧 Iniciando reparación de base de datos...")
        
        # Ejecutar comandos SQL directamente para agregar columnas faltantes
        with engine.connect() as connection:
            # Verificar si la tabla reserva existe y contar registros ANTES de modificar
            try:
                result = connection.execute(text("SELECT COUNT(*) FROM reserva"))
                count_before = result.scalar()
                print(f"📊 Reservas existentes ANTES de la migración: {count_before}")
            except Exception as e:
                print(f"⚠️ Error al contar reservas: {e}")
                count_before = 0
            
            try:
                # Agregar columna descripcion si no existe
                connection.execute(text("ALTER TABLE habitacion ADD COLUMN descripcion TEXT"))
                print("✅ Columna 'descripcion' agregada a tabla habitacion")
            except Exception as e:
                print(f"⚠️ Columna 'descripcion': {e}")
            
            try:
                # Agregar columna capacidad si no existe  
                connection.execute(text("ALTER TABLE habitacion ADD COLUMN capacidad INTEGER DEFAULT 2"))
                print("✅ Columna 'capacidad' agregada a tabla habitacion")
            except Exception as e:
                print(f"⚠️ Columna 'capacidad': {e}")
                
            try:
                # Agregar columna precio si no existe
                connection.execute(text("ALTER TABLE habitacion ADD COLUMN precio REAL"))
                print("✅ Columna 'precio' agregada a tabla habitacion")
            except Exception as e:
                print(f"⚠️ Columna 'precio': {e}")
            
            # ✅ AGREGAR COLUMNAS NUEVAS A RESERVA DE FORMA SEGURA
            try:
                # Verificar cuántas reservas hay antes
                result = connection.execute(text("SELECT COUNT(*) FROM reserva"))
                count_before = result.scalar()
                print(f"📊 Reservas existentes: {count_before}")
            except Exception as e:
                print(f"⚠️ Error al contar reservas: {e}")
            
            try:
                # Agregar columna precio_lista si no existe (PostgreSQL usa REAL, SQLite también)
                if DATABASE_URL.startswith("postgres"):
                    connection.execute(text("ALTER TABLE reserva ADD COLUMN IF NOT EXISTS precio_lista REAL"))
                else:
                    connection.execute(text("ALTER TABLE reserva ADD COLUMN precio_lista REAL"))
                print("✅ Columna 'precio_lista' agregada a tabla reserva")
            except Exception as e:
                # Si la columna ya existe, ignorar el error
                if "already exists" not in str(e).lower() and "duplicate column" not in str(e).lower():
                    print(f"⚠️ Columna 'precio_lista': {e}")
                else:
                    print("ℹ️ Columna 'precio_lista' ya existe")
            
            try:
                # Agregar columna precio_efectivo si no existe
                if DATABASE_URL.startswith("postgres"):
                    connection.execute(text("ALTER TABLE reserva ADD COLUMN IF NOT EXISTS precio_efectivo REAL"))
                else:
                    connection.execute(text("ALTER TABLE reserva ADD COLUMN precio_efectivo REAL"))
                print("✅ Columna 'precio_efectivo' agregada a tabla reserva")
            except Exception as e:
                # Si la columna ya existe, ignorar el error
                if "already exists" not in str(e).lower() and "duplicate column" not in str(e).lower():
                    print(f"⚠️ Columna 'precio_efectivo': {e}")
                else:
                    print("ℹ️ Columna 'precio_efectivo' ya existe")
            
            try:
                # Agregar columna origen si no existe (para tracking de origen: whatsapp, web, gestion)
                if DATABASE_URL.startswith("postgres"):
                    # Para PostgreSQL, verificar primero si existe
                    try:
                        check_result = connection.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='reserva' AND column_name='origen'"))
                        exists = check_result.fetchone() is not None
                        if not exists:
                            connection.execute(text("ALTER TABLE reserva ADD COLUMN origen TEXT"))
                            connection.commit()
                            print("✅ Columna 'origen' agregada a tabla reserva (PostgreSQL)")
                        else:
                            print("ℹ️ Columna 'origen' ya existe en PostgreSQL")
                    except Exception as e:
                        print(f"⚠️ Error verificando/existiendo columna 'origen' en PostgreSQL: {e}")
                        # Intentar agregar de todas formas
                        try:
                            connection.execute(text("ALTER TABLE reserva ADD COLUMN origen TEXT"))
                            connection.commit()
                            print("✅ Columna 'origen' agregada a tabla reserva (PostgreSQL - sin verificación)")
                        except Exception as e2:
                            if "already exists" not in str(e2).lower() and "duplicate column" not in str(e2).lower():
                                print(f"⚠️ Error al agregar columna 'origen': {e2}")
                else:
                    # Para SQLite
                    connection.execute(text("ALTER TABLE reserva ADD COLUMN origen TEXT"))
                    connection.commit()
                    print("✅ Columna 'origen' agregada a tabla reserva (SQLite)")
            except Exception as e:
                # Si la columna ya existe, ignorar el error
                if "already exists" not in str(e).lower() and "duplicate column" not in str(e).lower() and "already" not in str(e).lower():
                    print(f"⚠️ Columna 'origen': {e}")
                else:
                    print("ℹ️ Columna 'origen' ya existe")
            
            # Verificar que las reservas siguen ahí después
            try:
                result = connection.execute(text("SELECT COUNT(*) FROM reserva"))
                count_after = result.scalar()
                print(f"📊 Reservas existentes DESPUÉS: {count_after}")
                if count_before != count_after:
                    print(f"⚠️⚠️⚠️ ADVERTENCIA: El número de reservas cambió de {count_before} a {count_after}")
            except Exception as e:
                print(f"⚠️ Error al contar reservas después: {e}")
            
            connection.commit()

            # ✅ AGREGAR COLUMNAS NUEVAS A PEDIDO (estado, pagado_at)
            try:
                if DATABASE_URL.startswith("postgres"):
                    connection.execute(text("ALTER TABLE pedido ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'PENDIENTE'"))
                    connection.execute(text("ALTER TABLE pedido ADD COLUMN IF NOT EXISTS pagado_at TIMESTAMP"))
                    connection.commit()
                    print("✅ Columnas 'estado' y 'pagado_at' agregadas a tabla pedido (PostgreSQL)")
                else:
                    try:
                        connection.execute(text("ALTER TABLE pedido ADD COLUMN estado TEXT DEFAULT 'PENDIENTE'"))
                        print("✅ Columna 'estado' agregada a tabla pedido (SQLite)")
                    except Exception as e:
                        print(f"ℹ️ Columna 'estado': {e}")

                    try:
                        connection.execute(text("ALTER TABLE pedido ADD COLUMN pagado_at DATETIME"))
                        print("✅ Columna 'pagado_at' agregada a tabla pedido (SQLite)")
                    except Exception as e:
                        print(f"ℹ️ Columna 'pagado_at': {e}")
                    connection.commit()
            except Exception as e:
                print(f"⚠️ Error agregando columnas en pedido: {e}")
        
        # Crear habitaciones de ejemplo si no existen
        habitacion_estandar = db.exec(select(Habitacion).where(Habitacion.tipo == "Estándar")).first()
        if not habitacion_estandar:
            hab_estandar = Habitacion(
                numero=1,
                tipo="Estándar", 
                precio=50000,
                capacidad=2,
                descripcion="Habitación estándar con todas las comodidades"
            )
            db.add(hab_estandar)
            print("✅ Habitación Estándar creada")
            
        habitacion_confort = db.exec(select(Habitacion).where(Habitacion.tipo == "Confort")).first()
        if not habitacion_confort:
            hab_confort = Habitacion(
                numero=2,
                tipo="Confort",
                precio=70000, 
                capacidad=2,
                descripcion="Habitación confort con servicios adicionales"
            )
            db.add(hab_confort)
            print("✅ Habitación Confort creada")
            
        db.commit()
        
        return {
            "success": True,
            "mensaje": "Base de datos reparada exitosamente",
            "habitaciones_creadas": ["Estándar", "Confort"]
        }
        
    except Exception as e:
        print(f"💥 Error al reparar base de datos: {str(e)}")
        return {
            "success": False,
            "error": f"Error al reparar base de datos: {str(e)}"
        }

# ─────────── ENDPOINTS DE AUTENTICACIÓN ───────────
class UsuarioRegistro(BaseModel):
    email: str
    contraseña: str
    rol: Rol

@app.post("/registro")
def registrar_usuario(data: UsuarioRegistro, db: Session = Depends(obtener_db)):
    hashed = pwd_context.hash(data.contraseña)
    usuario = Usuario(email=data.email, contraseña=hashed, rol=data.rol)
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return {"mensaje": "Usuario registrado"}

@app.post("/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(obtener_db)):
    usuario = db.exec(select(Usuario).where(Usuario.email == form_data.username)).first()
    if not usuario or not pwd_context.verify(form_data.password, usuario.contraseña):
        raise HTTPException(status_code=400, detail="Credenciales incorrectas")
    token = crear_token({"sub": usuario.email, "rol": usuario.rol})
    return {"access_token": token, "token_type": "bearer"}

# ─────────── ENDPOINTS DE HABITACIONES ───────────
class HabitacionEntrada(BaseModel):
    numero: int
    tipo: str
    precio: Optional[float] = None
    capacidad: Optional[int] = 2
    descripcion: Optional[str] = None

@app.post("/habitaciones")
def agregar_habitacion(data: HabitacionEntrada, db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    hab = Habitacion(
        numero=data.numero, 
        tipo=data.tipo,
        precio=data.precio,
        capacidad=data.capacidad,
        descripcion=data.descripcion
    )
    db.add(hab)
    db.commit()
    return {"mensaje": "Habitación agregada"}

@app.get("/habitaciones")
def obtener_habitaciones(db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    habitaciones = db.exec(select(Habitacion)).all()
    return habitaciones

@app.put("/habitaciones/{habitacion_id}")
def actualizar_habitacion(
    habitacion_id: int,
    data: HabitacionEntrada,
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    habitacion = db.get(Habitacion, habitacion_id)
    if not habitacion:
        raise HTTPException(status_code=404, detail="Habitación no encontrada")
    
    habitacion.numero = data.numero
    habitacion.tipo = data.tipo
    habitacion.precio = data.precio
    habitacion.capacidad = data.capacidad
    habitacion.descripcion = data.descripcion
    
    db.add(habitacion)
    db.commit()
    return {"mensaje": "Habitación actualizada"}

@app.delete("/habitaciones/{habitacion_id}")
def eliminar_habitacion(
    habitacion_id: int,
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    habitacion = db.get(Habitacion, habitacion_id)
    if not habitacion:
        raise HTTPException(status_code=404, detail="Habitación no encontrada")
    
    db.delete(habitacion)
    db.commit()
    return {"mensaje": "Habitación eliminada"}

# ─────────── ENDPOINTS DE CLIENTES ───────────
@app.post("/clientes")
def crear_cliente(cliente: Cliente, db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    cliente_existente = db.exec(select(Cliente).where(Cliente.dni == cliente.dni)).first()
    if cliente_existente:
        raise HTTPException(status_code=400, detail="Ya existe un cliente con ese DNI")
    
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return {"mensaje": "Cliente registrado correctamente"}

@app.get("/clientes")
def obtener_clientes(db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    clientes = db.exec(select(Cliente)).all()
    return clientes

@app.put("/clientes/{cliente_id}")
def actualizar_cliente(
    cliente_id: int,
    data: Cliente,
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    cliente = db.get(Cliente, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    cliente_existente = db.exec(
        select(Cliente).where(Cliente.dni == data.dni, Cliente.id != cliente_id)
    ).first()
    if cliente_existente:
        raise HTTPException(status_code=400, detail="Ya existe un cliente con ese DNI")
    
    cliente.nombre = data.nombre
    cliente.dni = data.dni
    cliente.celular = data.celular
    cliente.patente = data.patente
    
    db.add(cliente)
    db.commit()
    return {"mensaje": "Cliente actualizado"}

@app.delete("/clientes/{cliente_id}")
def eliminar_cliente(
    cliente_id: int,
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    cliente = db.get(Cliente, cliente_id)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    db.delete(cliente)
    db.commit()
    return {"mensaje": "Cliente eliminado"}

# ─────────── ENDPOINTS DE PEDIDOS ───────────
# Función auxiliar para descontar stock cuando se registra un pedido
def descontar_stock_de_pedido(items: List[ItemPedido], db: Session, pedido_id: Optional[int] = None):
    """Descuenta el stock cuando se registra un pedido con bebidas.
    Solo descuenta si hay una coincidencia clara y exacta con productos en stock.
    Si el producto no está en stock (ej: comidas), no se descuenta nada.
    """
    for item in items:
        # Obtener todos los productos de bebidas
        todos_stock = db.exec(
            select(Stock).where(Stock.categoria == "bebidas")
        ).all()
        
        # Buscar coincidencia (solo exacta o muy específica para evitar falsos positivos)
        stock = None
        descripcion_limpia = item.descripcion.strip().lower()
        
        # Estrategia de búsqueda más estricta:
        # 1. Coincidencia exacta (case-insensitive) - PRIORITARIA
        # 2. Coincidencia donde el nombre del stock está completamente contenido en la descripción
        #    (ej: descripción "Coca Cola 350ml" contiene "Coca Cola 350ml" del stock)
        # 3. NO hacer matching parcial flexible para evitar descontar comidas u otros productos
        
        for s in todos_stock:
            nombre_lower = s.nombre_producto.strip().lower()
            
            # Coincidencia exacta (case-insensitive) - MÁS SEGURA
            if nombre_lower == descripcion_limpia:
                stock = s
                break
            
            # Coincidencia donde el nombre del stock está completamente contenido en la descripción
            # Esto permite casos como "Coca Cola 350ml" en descripción "Coca Cola 350ml - Fría"
            # Pero requiere que el nombre completo del stock esté presente
            if nombre_lower in descripcion_limpia:
                # Verificar que no sea una coincidencia accidental muy corta
                # (ej: evitar que "Coca" coincida con "Coca Cola")
                if len(nombre_lower) >= 5:  # Solo nombres de al menos 5 caracteres
                    stock = s
                    break
        
        # Solo descontar si encontramos una coincidencia clara
        if stock:
            # Descontar la cantidad vendida
            cantidad_anterior = stock.cantidad
            nueva_cantidad = stock.cantidad - item.cantidad
            if nueva_cantidad < 0:
                nueva_cantidad = 0  # No permitir stock negativo
            
            stock.cantidad = nueva_cantidad
            stock.fecha_actualizacion = obtener_fecha_argentina()
            db.add(stock)
            db.commit()
            
            # Registrar movimiento de venta
            motivo_venta = f"Venta desde pedido #{pedido_id}: {item.descripcion} x{item.cantidad}" if pedido_id else f"Venta: {item.descripcion} x{item.cantidad}"
            registrar_movimiento_stock(
                stock_id=stock.id,
                tipo="venta",
                cantidad_anterior=cantidad_anterior,
                cantidad_nueva=nueva_cantidad,
                motivo=motivo_venta,
                usuario_id=None,  # Se puede obtener del token si es necesario
                db=db
            )
        # Si no hay coincidencia, no se descuenta nada (comidas u otros productos no en stock)
    
    db.commit()

@app.post("/pedidos")
def registrar_pedido_con_items(pedido: PedidoConItems, db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    monto_total = sum(item.cantidad * item.precio for item in pedido.items)
    items_json = json.dumps([item.dict() for item in pedido.items])

    estado_inicial = (pedido.estado or "").strip().upper() if pedido.estado else None
    if estado_inicial not in (None, "", "PENDIENTE", "PAGADO"):
        raise HTTPException(status_code=400, detail="Estado inválido. Use PENDIENTE o PAGADO")
    if estado_inicial in (None, ""):
        # Si no se envía estado, inferir por forma_pago
        estado_inicial = "PAGADO" if (pedido.forma_pago and str(pedido.forma_pago).strip()) else "PENDIENTE"
    if estado_inicial == "PAGADO" and not (pedido.forma_pago and str(pedido.forma_pago).strip()):
        raise HTTPException(status_code=400, detail="Para estado PAGADO debe indicar forma_pago")
    
    nuevo_pedido = Pedido(
        detalle=items_json,
        monto=monto_total,
        habitacion_id=pedido.habitacion_id,
        externo=pedido.externo,
        forma_pago=(pedido.forma_pago.strip() if pedido.forma_pago else None),
        estado=estado_inicial,
        pagado_at=(obtener_fecha_argentina() if estado_inicial == "PAGADO" else None),
        fecha=obtener_fecha_argentina()
    )
    
    db.add(nuevo_pedido)
    db.commit()
    db.refresh(nuevo_pedido)
    
    # Descontar stock automáticamente para bebidas
    try:
        descontar_stock_de_pedido(pedido.items, db, pedido_id=nuevo_pedido.id)
    except Exception as e:
        print(f"Error al descontar stock: {e}")
        # No fallar el pedido si hay error en el stock
    
    # Normalizar fecha a zona horaria de Argentina antes de serializar
    fecha_normalizada = normalizar_fecha_argentina(nuevo_pedido.fecha)
    
    return {
        "mensaje": "Pedido registrado correctamente",
        "id": nuevo_pedido.id,
        "estado": nuevo_pedido.estado,
        "forma_pago": nuevo_pedido.forma_pago,
        "fecha": fecha_normalizada.isoformat() if fecha_normalizada else nuevo_pedido.fecha.isoformat()
    }

@app.get("/pedidos", response_model=List[PedidoRespuesta])
def obtener_todos_los_pedidos_con_items(db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    pedidos = db.exec(select(Pedido)).all()
    
    resultado = []
    for pedido in pedidos:
        try:
            items_data = json.loads(pedido.detalle)
            items = [ItemPedido(**item) for item in items_data]
        except:
            items = [ItemPedido(descripcion=pedido.detalle, cantidad=1, precio=pedido.monto)]
        
        # Normalizar fecha a timezone de Argentina
        fecha_normalizada = normalizar_fecha_argentina(pedido.fecha)
        
        resultado.append(PedidoRespuesta(
            id=pedido.id,
            items=items,
            monto=pedido.monto,
            habitacion_id=pedido.habitacion_id,
            externo=pedido.externo,
            forma_pago=pedido.forma_pago,
            estado=getattr(pedido, "estado", None),
            pagado_at=getattr(pedido, "pagado_at", None),
            fecha=fecha_normalizada
        ))
    
    return resultado

@app.get("/pedidos/hoy")
def obtener_pedidos_hoy(db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    # Obtener todos los pedidos y filtrar en Python normalizando fechas
    # Esto asegura que la comparación se haga con timezone correcto
    todos_pedidos = db.exec(select(Pedido)).all()
    hoy_argentina_date = obtener_fecha_argentina().date()
    
    # Filtrar pedidos que corresponden al día actual
    pedidos = []
    for pedido in todos_pedidos:
        fecha_normalizada = normalizar_fecha_argentina(pedido.fecha)
        if fecha_normalizada and fecha_normalizada.date() == hoy_argentina_date:
            pedidos.append(pedido)
    
    resultado = []
    for pedido in pedidos:
        try:
            items_data = json.loads(pedido.detalle)
            items = [{"descripcion": item["descripcion"], "cantidad": item["cantidad"], "precio": item["precio"]} for item in items_data]
        except:
            items = [{"descripcion": pedido.detalle, "cantidad": 1, "precio": pedido.monto}]
        
        resultado.append({
            "id": pedido.id,
            "items": items,
            "monto": pedido.monto,
            "habitacion_id": pedido.habitacion_id,
            "externo": pedido.externo,
            "forma_pago": pedido.forma_pago,
            "estado": getattr(pedido, "estado", None),
            "pagado_at": getattr(pedido, "pagado_at", None).isoformat() if getattr(pedido, "pagado_at", None) else None,
            "fecha": normalizar_fecha_argentina(pedido.fecha).isoformat() if normalizar_fecha_argentina(pedido.fecha) else pedido.fecha.isoformat()
        })
    
    return resultado

@app.get("/pedidos-dia", response_model=List[PedidoRespuesta])
def obtener_pedidos_por_dia_con_items(
    fecha: str = Query(...),
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    try:
        fecha_solicitada = datetime.strptime(fecha, "%Y-%m-%d").date()
    except:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido")
    
    # Obtener todos los pedidos y filtrar en Python normalizando fechas
    # Esto asegura que la comparación se haga con timezone correcto
    todos_pedidos = db.exec(select(Pedido)).all()
    
    # Filtrar pedidos que corresponden a la fecha solicitada
    pedidos = []
    for pedido in todos_pedidos:
        fecha_normalizada = normalizar_fecha_argentina(pedido.fecha)
        if fecha_normalizada and fecha_normalizada.date() == fecha_solicitada:
            pedidos.append(pedido)
    
    resultado = []
    for pedido in pedidos:
        try:
            items_data = json.loads(pedido.detalle)
            items = [ItemPedido(**item) for item in items_data]
        except:
            items = [ItemPedido(descripcion=pedido.detalle, cantidad=1, precio=pedido.monto)]
        
        # Normalizar fecha a timezone de Argentina
        fecha_normalizada = normalizar_fecha_argentina(pedido.fecha)
        
        resultado.append(PedidoRespuesta(
            id=pedido.id,
            items=items,
            monto=pedido.monto,
            habitacion_id=pedido.habitacion_id,
            externo=pedido.externo,
            forma_pago=pedido.forma_pago,
            estado=getattr(pedido, "estado", None),
            pagado_at=getattr(pedido, "pagado_at", None),
            fecha=fecha_normalizada
        ))
    
    return resultado

@app.put("/pedidos/{pedido_id}")
def actualizar_pedido_con_items(
    pedido_id: int,
    datos: PedidoConItems,
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    pedido = db.get(Pedido, pedido_id)
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    monto_total = sum(item.cantidad * item.precio for item in datos.items)
    items_json = json.dumps([item.dict() for item in datos.items])

    pedido.detalle = items_json
    pedido.monto = monto_total
    pedido.habitacion_id = datos.habitacion_id
    pedido.externo = datos.externo
    # Si viene forma_pago, actualizamos. Si no viene, mantenemos lo existente.
    if datos.forma_pago is not None:
        pedido.forma_pago = datos.forma_pago.strip() if str(datos.forma_pago).strip() else None
    # Estado: si viene explícito, validar y setear; si no, conservar.
    if datos.estado is not None:
        estado = str(datos.estado).strip().upper()
        if estado not in ("PENDIENTE", "PAGADO", "CANCELADO"):
            raise HTTPException(status_code=400, detail="Estado inválido. Use PENDIENTE, PAGADO o CANCELADO")
        pedido.estado = estado
        if estado == "PAGADO" and pedido.pagado_at is None:
            pedido.pagado_at = obtener_fecha_argentina()
        if estado != "PAGADO":
            pedido.pagado_at = None

    db.add(pedido)
    db.commit()
    return {"mensaje": "Pedido actualizado correctamente"}


@app.patch("/pedidos/{pedido_id}/pagar")
def pagar_pedido(
    pedido_id: int,
    data: PedidoCobrarEntrada,
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    pedido = db.get(Pedido, pedido_id)
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")

    if not data.forma_pago or not data.forma_pago.strip():
        raise HTTPException(status_code=400, detail="Debe indicar forma_pago")

    pedido.forma_pago = data.forma_pago.strip()
    pedido.estado = "PAGADO"
    pedido.pagado_at = obtener_fecha_argentina()

    db.add(pedido)
    db.commit()
    db.refresh(pedido)
    return {
        "mensaje": "Pedido marcado como pagado",
        "id": pedido.id,
        "estado": pedido.estado,
        "forma_pago": pedido.forma_pago,
        "pagado_at": pedido.pagado_at
    }

@app.delete("/pedidos/{pedido_id}")
def eliminar_pedido_actualizado(
    pedido_id: int,
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    pedido = db.get(Pedido, pedido_id)
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    
    db.delete(pedido)
    db.commit()
    return {"mensaje": "Pedido eliminado correctamente"}

# ─────────── ENDPOINTS DE GASTOS ───────────
@app.post("/gastos")
def registrar_gasto(gasto: GastoAdicional, db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    # Asegurar que use fecha de Argentina
    nuevo_gasto = GastoAdicional(
        habitacion_id=gasto.habitacion_id if gasto.habitacion_id else None,
        descripcion=gasto.descripcion,
        monto=gasto.monto,
        fecha=obtener_fecha_argentina()
    )
    db.add(nuevo_gasto)
    db.commit()
    return {"mensaje": "Gasto registrado correctamente"}

@app.get("/gastos")
def obtener_todos_los_gastos(db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    gastos = db.exec(select(GastoAdicional)).all()
    return gastos

@app.get("/gastos-dia")
def obtener_gastos_por_dia(
    fecha: str = Query(...),
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    try:
        fecha_obj = datetime.strptime(fecha, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
    except:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido")

    gastos = db.exec(
        select(GastoAdicional).where(GastoAdicional.fecha >= fecha_obj, GastoAdicional.fecha < fecha_obj + timedelta(days=1))
    ).all()
    return gastos

@app.put("/gastos/{gasto_id}")
def actualizar_gasto(
    gasto_id: int,
    datos: GastoAdicional,
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    gasto = db.get(GastoAdicional, gasto_id)
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")

    gasto.habitacion_id = datos.habitacion_id if datos.habitacion_id else None
    gasto.descripcion = datos.descripcion
    gasto.monto = datos.monto

    db.add(gasto)
    db.commit()
    return {"mensaje": "Gasto actualizado correctamente"}

@app.delete("/gastos/{gasto_id}")
def eliminar_gasto(
    gasto_id: int,
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    gasto = db.get(GastoAdicional, gasto_id)
    if not gasto:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")
    
    db.delete(gasto)
    db.commit()
    return {"mensaje": "Gasto eliminado"}

# ─────────── ENDPOINTS DE ACTIVIDADES ───────────
class ActividadEntrada(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    prioridad: str = "media"  # baja, media, alta
    fecha_vencimiento: Optional[str] = None  # formato: "YYYY-MM-DD" o "YYYY-MM-DD HH:MM"
    asignado_a: Optional[int] = None

class ActividadActualizar(BaseModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    estado: Optional[str] = None  # pendiente, en_progreso, completada
    prioridad: Optional[str] = None  # baja, media, alta
    fecha_vencimiento: Optional[str] = None
    asignado_a: Optional[int] = None

@app.post("/actividades")
def crear_actividad(
    data: ActividadEntrada,
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    # Obtener el usuario actual desde el token
    usuario_actual = db.exec(select(Usuario).where(Usuario.email == token["sub"])).first()
    if not usuario_actual:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # Parsear fecha de vencimiento si se proporciona
    fecha_vencimiento = None
    if data.fecha_vencimiento:
        try:
            # Intentar formato con hora
            try:
                fecha_vencimiento = datetime.strptime(data.fecha_vencimiento, "%Y-%m-%d %H:%M").replace(tzinfo=ARGENTINA_TZ)
            except:
                # Si falla, intentar solo fecha
                fecha_vencimiento = datetime.strptime(data.fecha_vencimiento, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de fecha inválido. Use YYYY-MM-DD o YYYY-MM-DD HH:MM")
    
    actividad = Actividad(
        titulo=data.titulo,
        descripcion=data.descripcion,
        prioridad=data.prioridad,
        fecha_vencimiento=fecha_vencimiento,
        creado_por=usuario_actual.id,
        asignado_a=data.asignado_a
    )
    
    db.add(actividad)
    db.commit()
    db.refresh(actividad)
    return {"mensaje": "Actividad creada correctamente", "actividad": actividad}

@app.get("/actividades")
def obtener_actividades(
    estado: Optional[str] = Query(None, description="Filtrar por estado: pendiente, en_progreso, completada"),
    prioridad: Optional[str] = Query(None, description="Filtrar por prioridad: baja, media, alta"),
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    query = select(Actividad)
    
    # Filtrar por estado si se proporciona
    if estado:
        query = query.where(Actividad.estado == estado)
    
    # Filtrar por prioridad si se proporciona
    if prioridad:
        query = query.where(Actividad.prioridad == prioridad)
    
    actividades = db.exec(query.order_by(Actividad.fecha_creacion.desc())).all()
    return actividades

@app.get("/actividades/{actividad_id}")
def obtener_actividad(
    actividad_id: int,
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    actividad = db.get(Actividad, actividad_id)
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    return actividad

@app.put("/actividades/{actividad_id}")
def actualizar_actividad(
    actividad_id: int,
    data: ActividadActualizar,
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    actividad = db.get(Actividad, actividad_id)
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    
    # Actualizar campos si se proporcionan
    if data.titulo is not None:
        actividad.titulo = data.titulo
    if data.descripcion is not None:
        actividad.descripcion = data.descripcion
    if data.estado is not None:
        actividad.estado = data.estado
    if data.prioridad is not None:
        actividad.prioridad = data.prioridad
    if data.asignado_a is not None:
        actividad.asignado_a = data.asignado_a
    if data.fecha_vencimiento is not None:
        if data.fecha_vencimiento == "":
            actividad.fecha_vencimiento = None
        else:
            try:
                try:
                    actividad.fecha_vencimiento = datetime.strptime(data.fecha_vencimiento, "%Y-%m-%d %H:%M").replace(tzinfo=ARGENTINA_TZ)
                except:
                    actividad.fecha_vencimiento = datetime.strptime(data.fecha_vencimiento, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
            except ValueError:
                raise HTTPException(status_code=400, detail="Formato de fecha inválido")
    
    db.add(actividad)
    db.commit()
    db.refresh(actividad)
    return {"mensaje": "Actividad actualizada correctamente", "actividad": actividad}

@app.delete("/actividades/{actividad_id}")
def eliminar_actividad(
    actividad_id: int,
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    actividad = db.get(Actividad, actividad_id)
    if not actividad:
        raise HTTPException(status_code=404, detail="Actividad no encontrada")
    
    db.delete(actividad)
    db.commit()
    return {"mensaje": "Actividad eliminada correctamente"}

# ─────────── ENDPOINTS DE STOCK ───────────
def registrar_movimiento_stock(
    stock_id: int,
    tipo: str,  # "entrada", "salida", "ajuste", "venta"
    cantidad_anterior: int,
    cantidad_nueva: int,
    motivo: Optional[str] = None,
    usuario_id: Optional[int] = None,
    db: Session = None
):
    """Registra un movimiento en el historial de stock"""
    movimiento = MovimientoStock(
        stock_id=stock_id,
        tipo=tipo,
        cantidad_anterior=cantidad_anterior,
        cantidad_nueva=cantidad_nueva,
        diferencia=cantidad_nueva - cantidad_anterior,
        motivo=motivo,
        usuario_id=usuario_id
    )
    db.add(movimiento)
    db.commit()

class StockEntrada(BaseModel):
    nombre_producto: str
    categoria: str  # "bebidas" o "comidas"
    cantidad: int
    cantidad_minima: int = 0

class StockActualizar(BaseModel):
    nombre_producto: Optional[str] = None
    categoria: Optional[str] = None
    cantidad: Optional[int] = None
    cantidad_minima: Optional[int] = None
    motivo: Optional[str] = None  # Motivo del ajuste

@app.post("/stock")
def crear_actualizar_stock(
    data: StockEntrada,
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    # Obtener usuario actual
    usuario_actual = db.exec(select(Usuario).where(Usuario.email == token["sub"])).first()
    usuario_id = usuario_actual.id if usuario_actual else None
    
    # Buscar si ya existe stock para este producto
    stock_existente = db.exec(
        select(Stock).where(Stock.nombre_producto == data.nombre_producto)
    ).first()
    
    if stock_existente:
        # Actualizar stock existente
        cantidad_anterior = stock_existente.cantidad
        stock_existente.cantidad = data.cantidad
        stock_existente.cantidad_minima = data.cantidad_minima
        stock_existente.fecha_actualizacion = obtener_fecha_argentina()
        db.add(stock_existente)
        db.commit()
        db.refresh(stock_existente)
        
        # Registrar movimiento
        if cantidad_anterior != data.cantidad:
            registrar_movimiento_stock(
                stock_id=stock_existente.id,
                tipo="ajuste",
                cantidad_anterior=cantidad_anterior,
                cantidad_nueva=data.cantidad,
                motivo="Actualización manual de stock",
                usuario_id=usuario_id,
                db=db
            )
        
        return {"mensaje": "Stock actualizado correctamente", "stock": stock_existente}
    else:
        # Crear nuevo stock
        nuevo_stock = Stock(
            nombre_producto=data.nombre_producto,
            categoria=data.categoria,
            cantidad=data.cantidad,
            cantidad_minima=data.cantidad_minima
        )
        db.add(nuevo_stock)
        db.commit()
        db.refresh(nuevo_stock)
        
        # Registrar movimiento inicial
        registrar_movimiento_stock(
            stock_id=nuevo_stock.id,
            tipo="entrada",
            cantidad_anterior=0,
            cantidad_nueva=data.cantidad,
            motivo="Creación inicial de stock",
            usuario_id=usuario_id,
            db=db
        )
        
        return {"mensaje": "Stock creado correctamente", "stock": nuevo_stock}

@app.get("/stock")
def obtener_stock(
    categoria: Optional[str] = Query(None, description="Filtrar por categoría: bebidas, comidas"),
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    query = select(Stock)
    
    if categoria:
        query = query.where(Stock.categoria == categoria)
    
    stock = db.exec(query.order_by(Stock.nombre_producto)).all()
    return stock

@app.get("/stock/{stock_id}")
def obtener_stock_por_id(
    stock_id: int,
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    stock = db.get(Stock, stock_id)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock no encontrado")
    return stock

@app.put("/stock/{stock_id}")
def actualizar_stock(
    stock_id: int,
    data: StockActualizar,
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    # Obtener usuario actual
    usuario_actual = db.exec(select(Usuario).where(Usuario.email == token["sub"])).first()
    usuario_id = usuario_actual.id if usuario_actual else None
    
    stock = db.get(Stock, stock_id)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock no encontrado")
    
    cantidad_anterior = stock.cantidad
    nombre_anterior = stock.nombre_producto
    categoria_anterior = stock.categoria
    
    if data.nombre_producto is not None:
        stock.nombre_producto = data.nombre_producto.strip()
    if data.categoria is not None:
        stock.categoria = data.categoria.strip()
    if data.cantidad is not None:
        stock.cantidad = data.cantidad
    if data.cantidad_minima is not None:
        stock.cantidad_minima = data.cantidad_minima
    
    stock.fecha_actualizacion = obtener_fecha_argentina()
    db.add(stock)
    db.commit()
    db.refresh(stock)
    
    # Registrar movimiento si cambió cantidad o si se editó nombre/categoría
    cambio_cantidad = data.cantidad is not None and cantidad_anterior != data.cantidad
    cambio_identidad = (data.nombre_producto is not None and nombre_anterior != stock.nombre_producto) or (
        data.categoria is not None and categoria_anterior != stock.categoria
    )

    if cambio_cantidad or cambio_identidad:
        partes = []
        if cambio_identidad:
            if nombre_anterior != stock.nombre_producto:
                partes.append(f"Renombre: '{nombre_anterior}' → '{stock.nombre_producto}'")
            if categoria_anterior != stock.categoria:
                partes.append(f"Categoría: '{categoria_anterior}' → '{stock.categoria}'")
        if cambio_cantidad:
            partes.append(f"Cantidad: {cantidad_anterior} → {stock.cantidad}")

        motivo = data.motivo or " | ".join(partes) or "Edición manual de stock"
        registrar_movimiento_stock(
            stock_id=stock_id,
            tipo="ajuste",
            cantidad_anterior=cantidad_anterior,
            cantidad_nueva=stock.cantidad,
            motivo=motivo,
            usuario_id=usuario_id,
            db=db
        )
    
    return {"mensaje": "Stock actualizado correctamente", "stock": stock}

@app.delete("/stock/{stock_id}")
def eliminar_stock(
    stock_id: int,
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    stock = db.get(Stock, stock_id)
    if not stock:
        raise HTTPException(status_code=404, detail="Stock no encontrado")
    
    db.delete(stock)
    db.commit()
    return {"mensaje": "Stock eliminado correctamente"}

@app.get("/stock/{stock_id}/historial")
def obtener_historial_stock(
    stock_id: int,
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    """Obtiene el historial de movimientos de un producto específico"""
    movimientos = db.exec(
        select(MovimientoStock)
        .where(MovimientoStock.stock_id == stock_id)
        .order_by(MovimientoStock.fecha.desc())
    ).all()
    return movimientos

@app.get("/stock/historial/todos")
def obtener_todo_el_historial(
    limite: Optional[int] = Query(50, description="Límite de resultados"),
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    """Obtiene todo el historial de movimientos de stock"""
    movimientos = db.exec(
        select(MovimientoStock)
        .order_by(MovimientoStock.fecha.desc())
        .limit(limite)
    ).all()
    
    # Enriquecer con información del producto
    resultado = []
    for mov in movimientos:
        stock = db.get(Stock, mov.stock_id)
        resultado.append({
            "id": mov.id,
            "stock_id": mov.stock_id,
            "nombre_producto": stock.nombre_producto if stock else "Producto eliminado",
            "categoria": stock.categoria if stock else None,
            "tipo": mov.tipo,
            "cantidad_anterior": mov.cantidad_anterior,
            "cantidad_nueva": mov.cantidad_nueva,
            "diferencia": mov.diferencia,
            "motivo": mov.motivo,
            "fecha": mov.fecha
        })
    
    return resultado

@app.get("/stock/estadisticas")
def obtener_estadisticas_stock(
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    """Obtiene estadísticas del stock para el dashboard"""
    todos_stock = db.exec(select(Stock)).all()
    
    # Calcular estadísticas
    total_productos = len(todos_stock)
    productos_agotados = [s for s in todos_stock if s.cantidad <= 0]
    productos_bajo_minimo = [s for s in todos_stock if s.cantidad > 0 and s.cantidad <= s.cantidad_minima and s.cantidad_minima > 0]
    productos_en_stock = [s for s in todos_stock if s.cantidad > 0]
    
    # Productos más vendidos (últimos 30 días)
    fecha_limite = obtener_fecha_argentina() - timedelta(days=30)
    movimientos_ventas = db.exec(
        select(MovimientoStock)
        .where(
            MovimientoStock.tipo == "venta",
            MovimientoStock.fecha >= fecha_limite
        )
    ).all()
    
    # Agrupar por producto
    ventas_por_producto = defaultdict(int)
    for mov in movimientos_ventas:
        ventas_por_producto[mov.stock_id] += abs(mov.diferencia)
    
    # Obtener top 5 productos más vendidos
    top_ventas = sorted(ventas_por_producto.items(), key=lambda x: x[1], reverse=True)[:5]
    productos_mas_vendidos = []
    for stock_id, cantidad_vendida in top_ventas:
        stock = db.get(Stock, stock_id)
        if stock:
            productos_mas_vendidos.append({
                "nombre_producto": stock.nombre_producto,
                "cantidad_vendida": cantidad_vendida,
                "stock_actual": stock.cantidad
            })
    
    # Estadísticas por categoría
    bebidas = [s for s in todos_stock if s.categoria == "bebidas"]
    comidas = [s for s in todos_stock if s.categoria == "comidas"]
    
    return {
        "resumen": {
            "total_productos": total_productos,
            "productos_en_stock": len(productos_en_stock),
            "productos_agotados": len(productos_agotados),
            "productos_bajo_minimo": len(productos_bajo_minimo)
        },
        "productos_agotados": [
            {
                "id": s.id,
                "nombre_producto": s.nombre_producto,
                "categoria": s.categoria
            }
            for s in productos_agotados
        ],
        "productos_bajo_minimo": [
            {
                "id": s.id,
                "nombre_producto": s.nombre_producto,
                "categoria": s.categoria,
                "cantidad": s.cantidad,
                "cantidad_minima": s.cantidad_minima
            }
            for s in productos_bajo_minimo
        ],
        "productos_mas_vendidos": productos_mas_vendidos,
        "por_categoria": {
            "bebidas": {
                "total": len(bebidas),
                "en_stock": len([s for s in bebidas if s.cantidad > 0]),
                "agotados": len([s for s in bebidas if s.cantidad <= 0])
            },
            "comidas": {
                "total": len(comidas),
                "en_stock": len([s for s in comidas if s.cantidad > 0]),
                "agotados": len([s for s in comidas if s.cantidad <= 0])
            }
        }
    }

# ─────────── ENDPOINTS DE RESERVAS ───────────
@app.post("/reservas")
def crear_reserva_simple(data: ReservaEntrada, db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    # ✅ VALIDAR DISPONIBILIDAD DE LA HABITACIÓN ANTES DE CREAR LA RESERVA
    reservas_solapadas = db.exec(
        select(Reserva).where(
            Reserva.habitacion_id == data.habitacion_id,
            Reserva.fecha_checkin < data.fecha_checkout,  # Reserva empieza antes del checkout
            Reserva.fecha_checkout > data.fecha_checkin,  # Reserva termina después del checkin
            Reserva.estado != "cancelada"  # Excluir reservas canceladas
        )
    ).all()
    
    if reservas_solapadas:
        # Obtener información de la habitación para el mensaje
        habitacion = db.get(Habitacion, data.habitacion_id)
        numero_hab = habitacion.numero if habitacion else data.habitacion_id
        
        # Construir mensaje con detalles de las reservas conflictivas
        conflictos = []
        for r in reservas_solapadas:
            conflictos.append(f"Reserva #{r.id} ({r.nombre_huesped or 'Sin nombre'}) del {r.fecha_checkin.date()} al {r.fecha_checkout.date()}")
        
        mensaje_error = f"❌ La habitación #{numero_hab} ya está ocupada en esas fechas. Conflictos: {'; '.join(conflictos)}"
        raise HTTPException(status_code=400, detail=mensaje_error)
    
    reserva = Reserva(
        habitacion_id=data.habitacion_id,
        fecha_checkin=data.fecha_checkin,
        fecha_checkout=data.fecha_checkout,
        total_estadia=data.precio,
        seña=data.seña,
        forma_pago=data.forma_pago,
        nombre_huesped=data.nombre_huesped,
        cliente_id=0,
    )
    db.add(reserva)
    db.commit()
    return {"mensaje": "Reserva registrada"}

# ─────────── ENDPOINT PARA RESERVAS DESDE SISTEMA DE GESTIÓN ───────────
@app.post("/reservas-gestion")
def crear_reserva_desde_gestion(data: ReservaGestion, db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    try:
        print(f"📥 Datos recibidos del sistema de gestión: {data}")
        
        # Convertir fechas formato dd/mm/aaaa a datetime
        fecha_checkin = datetime.strptime(data.fecha_ingreso, "%d/%m/%Y").replace(tzinfo=ARGENTINA_TZ)
        fecha_checkout = datetime.strptime(data.fecha_egreso, "%d/%m/%Y").replace(tzinfo=ARGENTINA_TZ)
        
        # ✅ VALIDAR DISPONIBILIDAD DE LA HABITACIÓN ANTES DE CREAR LA RESERVA
        reservas_solapadas = db.exec(
            select(Reserva).where(
                Reserva.habitacion_id == data.habitacion_id,
                Reserva.fecha_checkin < fecha_checkout,  # Reserva empieza antes del checkout
                Reserva.fecha_checkout > fecha_checkin,  # Reserva termina después del checkin
                Reserva.estado != "cancelada"  # Excluir reservas canceladas
            )
        ).all()
        
        if reservas_solapadas:
            # Obtener información de la habitación para el mensaje
            habitacion = db.get(Habitacion, data.habitacion_id)
            numero_hab = habitacion.numero if habitacion else data.habitacion_id
            
            # Construir mensaje con detalles de las reservas conflictivas
            conflictos = []
            for r in reservas_solapadas:
                conflictos.append(f"Reserva #{r.id} ({r.nombre_huesped or 'Sin nombre'}) del {r.fecha_checkin.date()} al {r.fecha_checkout.date()}")
            
            mensaje_error = f"❌ La habitación #{numero_hab} ya está ocupada en esas fechas. Conflictos: {'; '.join(conflictos)}"
            print(f"⚠️ {mensaje_error}")
            raise HTTPException(status_code=400, detail=mensaje_error)
        
        # Verificar si el cliente ya existe
        cliente_existente = db.exec(select(Cliente).where(Cliente.dni == data.dni)).first()
        if cliente_existente:
            cliente = cliente_existente
            # Actualizar datos del cliente si es necesario
            cliente.nombre = data.nombre_completo
            cliente.celular = data.celular
            cliente.patente = data.patente
            db.add(cliente)
            db.commit()
            print(f"✅ Cliente existente actualizado: {cliente.nombre}")
        else:
            # Crear nuevo cliente
            cliente = Cliente(
                nombre=data.nombre_completo,
                dni=data.dni,
                celular=data.celular,
                patente=data.patente
            )
            db.add(cliente)
            db.commit()
            db.refresh(cliente)
            print(f"✅ Nuevo cliente creado: {cliente.nombre}")
        
        # Preparar observaciones/requests
        observaciones = []
        if data.mascota:
            observaciones.append("🐾 Viaja con mascota pequeña")
            if data.observaciones_mascota:
                observaciones.append(f"Detalles mascota: {data.observaciones_mascota}")
        
        observaciones_texto = " | ".join(observaciones) if observaciones else None
        
        # Crear reserva
        reserva = Reserva(
            cliente_id=cliente.id,
            habitacion_id=data.habitacion_id,
            fecha_checkin=fecha_checkin,
            fecha_checkout=fecha_checkout,
            seña=data.seña,
            total_estadia=data.precio_total,
            forma_pago=data.forma_pago,
            nombre_huesped=data.nombre_completo
        )
        db.add(reserva)
        db.commit()
        db.refresh(reserva)
        
        mascota_msg = " (con mascota)" if data.mascota else ""
        print(f"🎉 Reserva creada desde sistema de gestión - ID: {reserva.id}{mascota_msg}")
        
        return {
            "mensaje": f"Reserva registrada desde sistema de gestión{mascota_msg}",
            "reserva_id": reserva.id,
            "cliente_id": cliente.id,
            "mascota": data.mascota,
            "precio_total": data.precio_total
        }
        
    except Exception as e:
        print(f"💥 Error al procesar reserva desde gestión: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Error al procesar reserva: {str(e)}")

@app.get("/reservas")
def obtener_todas_las_reservas(db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    reservas = db.exec(select(Reserva)).all()
    return reservas

@app.get("/reservas/dia")
def obtener_reservas_por_dia(fecha: str, db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    try:
        fecha_obj = datetime.strptime(fecha, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
    except:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido")

    # ✅ Filtrar reservas activas y completadas (excluir canceladas)
    reservas = db.exec(
        select(Reserva).where(
            Reserva.fecha_checkin <= fecha_obj,
            Reserva.fecha_checkout > fecha_obj,
            Reserva.estado != "cancelada"  # Excluir reservas canceladas
        )
    ).all()
    return reservas

# ─────────── ENDPOINT PARA EDITAR RESERVA COMPLETA ───────────
@app.put("/reservas/{reserva_id}")
def actualizar_reserva_completa(
    reserva_id: int,
    data: ReservaActualizar,
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    reserva = db.get(Reserva, reserva_id)
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    # Determinar habitación y fechas finales (pueden cambiar)
    habitacion_id_final = data.habitacion_id if data.habitacion_id is not None else reserva.habitacion_id
    fecha_checkin_final = data.fecha_checkin if data.fecha_checkin is not None else reserva.fecha_checkin
    fecha_checkout_final = data.fecha_checkout if data.fecha_checkout is not None else reserva.fecha_checkout
    
    # ✅ VALIDAR DISPONIBILIDAD si cambió habitación o fechas (excluyendo la reserva actual)
    reservas_solapadas = db.exec(
        select(Reserva).where(
            Reserva.id != reserva_id,  # Excluir la reserva que estamos editando
            Reserva.habitacion_id == habitacion_id_final,
            Reserva.fecha_checkin < fecha_checkout_final,
            Reserva.fecha_checkout > fecha_checkin_final,
            Reserva.estado != "cancelada"  # Excluir reservas canceladas
        )
    ).all()
    
    if reservas_solapadas:
        habitacion = db.get(Habitacion, habitacion_id_final)
        numero_hab = habitacion.numero if habitacion else habitacion_id_final
        
        conflictos = []
        for r in reservas_solapadas:
            conflictos.append(f"Reserva #{r.id} ({r.nombre_huesped or 'Sin nombre'}) del {r.fecha_checkin.date()} al {r.fecha_checkout.date()}")
        
        mensaje_error = f"❌ La habitación #{numero_hab} ya está ocupada en esas fechas. Conflictos: {'; '.join(conflictos)}"
        raise HTTPException(status_code=400, detail=mensaje_error)
    
    # Actualizar solo los campos que se enviaron
    if data.habitacion_id is not None:
        # Verificar que la habitación existe
        habitacion = db.get(Habitacion, data.habitacion_id)
        if not habitacion:
            raise HTTPException(status_code=400, detail="Habitación no encontrada")
        reserva.habitacion_id = data.habitacion_id
    
    if data.nombre_huesped is not None:
        reserva.nombre_huesped = data.nombre_huesped
    
    if data.precio is not None:
        reserva.total_estadia = data.precio
    
    if data.seña is not None:
        reserva.seña = data.seña
    
    if data.forma_pago is not None:
        reserva.forma_pago = data.forma_pago
    
    if data.fecha_checkin is not None:
        reserva.fecha_checkin = data.fecha_checkin
    
    if data.fecha_checkout is not None:
        reserva.fecha_checkout = data.fecha_checkout
    
    db.add(reserva)
    db.commit()
    return {"mensaje": "Reserva actualizada correctamente"}

# ─────────── ENDPOINT PARA ELIMINAR RESERVA ───────────
@app.delete("/reservas/{reserva_id}")
def eliminar_reserva(
    reserva_id: int,
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    reserva = db.get(Reserva, reserva_id)
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    # Verificar si el usuario tiene permisos (opcional - solo dueños pueden eliminar)
    usuario_rol = token.get("rol")
    if usuario_rol != "dueño":
        raise HTTPException(
            status_code=403, 
            detail="Solo el dueño puede eliminar reservas"
        )
    
    # ✅ Marcar como cancelada en lugar de eliminar (para mantener historial)
    reserva.estado = "cancelada"
    db.add(reserva)
    db.commit()
    return {"mensaje": "Reserva cancelada correctamente", "estado": "cancelada"}

# ─────────── ENDPOINTS EXISTENTES DE RESERVAS ───────────
@app.patch("/reservas/{reserva_id}/checkout")
def realizar_checkout(reserva_id: int, db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    reserva = db.get(Reserva, reserva_id)
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    fecha_argentina = obtener_fecha_argentina() - timedelta(days=1)
    reserva.fecha_checkout = datetime.combine(fecha_argentina.date(), datetime.min.time()).replace(tzinfo=ARGENTINA_TZ)
    # ✅ Marcar reserva como completada
    reserva.estado = "completada"

    db.add(reserva)
    db.commit()
    return {"mensaje": "Checkout realizado", "estado": "completada"}

@app.patch("/reservas/{reserva_id}/pago")
def actualizar_forma_pago(reserva_id: int, data: ActualizarPagoEntrada, db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    reserva = db.get(Reserva, reserva_id)
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    reserva.forma_pago = data.forma_pago
    db.add(reserva)
    db.commit()
    return {"mensaje": "Forma de pago actualizada"}

@app.patch("/reservas/{reserva_id}/actualizar-sena")
def actualizar_estado_sena(
    reserva_id: int, 
    estado: str = Query(..., description="'Seña Recibida' o 'Seña Pendiente'"),
    db: Session = Depends(obtener_db), 
    token: dict = Depends(verificar_token)
):
    """
    Actualiza el estado de la seña de una reserva
    """
    reserva = db.get(Reserva, reserva_id)
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    # Validar estados permitidos
    estados_permitidos = ["Seña Recibida", "Seña Pendiente", "Pagado Completo", "Cancelado"]
    if estado not in estados_permitidos:
        raise HTTPException(
            status_code=400, 
            detail=f"Estado inválido. Estados permitidos: {', '.join(estados_permitidos)}"
        )
    
    estado_anterior = reserva.forma_pago
    reserva.forma_pago = estado
    
    db.add(reserva)
    db.commit()
    
    print(f"📋 Reserva {reserva_id}: Estado actualizado de '{estado_anterior}' a '{estado}'")
    
    return {
        "mensaje": f"Estado de seña actualizado correctamente",
        "reserva_id": reserva_id,
        "estado_anterior": estado_anterior,
        "estado_nuevo": estado,
        "seña": reserva.seña,
        "total": reserva.total_estadia
    }

@app.post("/setup-habitaciones")
def configurar_habitaciones_completas(db: Session = Depends(obtener_db)):
    """
    Configura todas las 15 habitaciones del Complejo Santino (idempotente).
    
    - Crea habitaciones faltantes (1..15)
    - Actualiza capacidad si está NULL o incorrecta
    - Actualiza precio si está NULL o incorrecto
    - No duplica por número
    - Seguro de ejecutar múltiples veces
    
    Returns:
        Resumen: creadas, actualizadas, intactas
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        # Configuración real de habitaciones del Complejo Santino
        # Basada en las reglas de negocio: capacidades según número
        habitaciones_config = [
            # Habitaciones Estándar para 5 personas (1-4)
            {"numero": 1, "tipo": "Estándar", "capacidad": 5, "precio": 110000},
            {"numero": 2, "tipo": "Estándar", "capacidad": 5, "precio": 110000},
            {"numero": 3, "tipo": "Estándar", "capacidad": 5, "precio": 110000},
            {"numero": 4, "tipo": "Estándar", "capacidad": 5, "precio": 110000},
            
            # Habitación Estándar para 3 personas (5)
            {"numero": 5, "tipo": "Estándar", "capacidad": 3, "precio": 85000},
            
            # Habitaciones Estándar para 2 personas (6, 11)
            {"numero": 6, "tipo": "Estándar", "capacidad": 2, "precio": 70000},
            {"numero": 11, "tipo": "Estándar", "capacidad": 2, "precio": 70000},
            
            # Habitación Estándar para 6 personas (7)
            {"numero": 7, "tipo": "Estándar", "capacidad": 6, "precio": 125000},
            
            # Habitaciones Estándar para 3 personas (8, 9)
            {"numero": 8, "tipo": "Estándar", "capacidad": 3, "precio": 85000},
            {"numero": 9, "tipo": "Estándar", "capacidad": 3, "precio": 85000},
            
            # Habitación Estándar para 7 personas (10)
            {"numero": 10, "tipo": "Estándar", "capacidad": 7, "precio": 140000},
            
            # Habitaciones Confort para 4 personas (12-15)
            {"numero": 12, "tipo": "Confort", "capacidad": 4, "precio": 100000},
            {"numero": 13, "tipo": "Confort", "capacidad": 4, "precio": 100000},
            {"numero": 14, "tipo": "Confort", "capacidad": 4, "precio": 100000},
            {"numero": 15, "tipo": "Confort", "capacidad": 4, "precio": 100000},
        ]
        
        creadas = []
        actualizadas = []
        intactas = []
        
        for config in habitaciones_config:
            # Buscar habitación existente por número (único)
            habitacion_existente = db.exec(
                select(Habitacion).where(Habitacion.numero == config["numero"])
            ).first()
            
            descripcion = f"Habitación {config['tipo']} para {config['capacidad']} personas"
            
            # Info especial para hab. 6 y 11
            if config["numero"] in [6, 11]:
                descripcion += " (1 persona: $40,000 | 2 personas: $50,000)"
            
            if habitacion_existente:
                # Verificar si necesita actualización
                necesita_actualizacion = False
                
                # Actualizar capacidad si es NULL o incorrecta
                if habitacion_existente.capacidad is None or habitacion_existente.capacidad != config["capacidad"]:
                    habitacion_existente.capacidad = config["capacidad"]
                    necesita_actualizacion = True
                
                # Actualizar precio si es NULL o incorrecto
                if habitacion_existente.precio is None or habitacion_existente.precio != config["precio"]:
                    habitacion_existente.precio = config["precio"]
                    necesita_actualizacion = True
                
                # Actualizar tipo si es diferente
                if habitacion_existente.tipo != config["tipo"]:
                    habitacion_existente.tipo = config["tipo"]
                    necesita_actualizacion = True
                
                # Actualizar descripción siempre (puede haber cambiado)
                habitacion_existente.descripcion = descripcion
                
                if necesita_actualizacion:
                    db.add(habitacion_existente)
                    actualizadas.append(config["numero"])
                    logger.info(f"Habitación {config['numero']} actualizada: capacidad={config['capacidad']}, precio={config['precio']}")
                else:
                    intactas.append(config["numero"])
            else:
                # Crear nueva habitación
                nueva_habitacion = Habitacion(
                    numero=config["numero"],
                    tipo=config["tipo"],
                    capacidad=config["capacidad"],
                    precio=config["precio"],
                    descripcion=descripcion
                )
                db.add(nueva_habitacion)
                creadas.append(config["numero"])
                logger.info(f"Habitación {config['numero']} creada: capacidad={config['capacidad']}, precio={config['precio']}")
        
        db.commit()
        logger.info(f"Setup habitaciones completado: {len(creadas)} creadas, {len(actualizadas)} actualizadas, {len(intactas)} intactas")
        
        return {
            "success": True,
            "mensaje": f"✅ Complejo Santino - 15 habitaciones configuradas correctamente",
            "resumen": {
                "creadas": len(creadas),
                "actualizadas": len(actualizadas),
                "intactas": len(intactas),
                "total": len(habitaciones_config)
            },
            "detalle": {
                "creadas": creadas,
                "actualizadas": actualizadas,
                "intactas": intactas
            },
            "detalles": {
                "estandar_5_personas": "Hab. 1-4: $110,000 (capacidad 5)",
                "estandar_3_personas": "Hab. 5,8,9: $85,000 (capacidad 3)", 
                "estandar_2_personas": "Hab. 6,11: $70,000 (capacidad 2)",
                "estandar_6_personas": "Hab. 7: $125,000 (capacidad 6)",
                "estandar_7_personas": "Hab. 10: $140,000 (capacidad 7)",
                "confort_4_personas": "Hab. 12-15: $100,000 (capacidad 4)"
            }
        }
        
    except Exception as e:
        logger.error(f"Error al configurar habitaciones: {e}", exc_info=True)
        return {"success": False, "error": str(e)}

# 2. ENDPOINT PARA VERIFICAR DISPONIBILIDAD
# ✅ FUNCIÓN CORREGIDA - Reemplazar en el backend
@app.get("/verificar-disponibilidad")
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
            
            # Buscar reservas que se solapen con las fechas solicitadas (excluir canceladas)
            reservas_solapadas = db.exec(
                select(Reserva).where(
                    Reserva.habitacion_id == habitacion.id,
                    Reserva.fecha_checkin < fecha_checkout,  # Reserva empieza antes del checkout
                    Reserva.fecha_checkout > fecha_checkin,  # Reserva termina después del checkin
                    Reserva.estado != "cancelada"  # Excluir reservas canceladas
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


@app.get("/reservas/senas-pendientes")
def obtener_reservas_senas_pendientes(db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    """
    Obtiene todas las reservas con seña pendiente
    """
    reservas_pendientes = db.exec(
        select(Reserva).where(
            Reserva.forma_pago.in_(["Seña Pendiente", "Pendiente - Reserva Web"]),
            Reserva.estado != "cancelada"  # Excluir reservas canceladas
        )
    ).all()
    
    resultado = []
    for reserva in reservas_pendientes:
        # Obtener datos del cliente
        cliente = db.get(Cliente, reserva.cliente_id)
        # Obtener datos de la habitación
        habitacion = db.get(Habitacion, reserva.habitacion_id)
        
        resultado.append({
            "reserva_id": reserva.id,
            "cliente": {
                "nombre": cliente.nombre if cliente else "Cliente no encontrado",
                "dni": cliente.dni if cliente else "N/A",
                "celular": cliente.celular if cliente else "N/A"
            },
            "habitacion": {
                "numero": habitacion.numero if habitacion else "N/A",
                "tipo": habitacion.tipo if habitacion else "N/A"
            },
            "fecha_checkin": reserva.fecha_checkin.strftime("%Y-%m-%d"),
            "fecha_checkout": reserva.fecha_checkout.strftime("%Y-%m-%d"),
            "seña": reserva.seña,
            "total_estadia": reserva.total_estadia,
            "estado": reserva.forma_pago,
            "dias_restantes": (reserva.fecha_checkin - obtener_fecha_argentina()).days
        })
    
    return {
        "total_pendientes": len(resultado),
        "monto_total_pendiente": sum(r["seña"] for r in resultado),
        "reservas": resultado
    }

@app.get("/estadisticas/senas")
def estadisticas_senas(db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    """
    Obtiene estadísticas sobre el estado de las señas
    """
    todas_reservas = db.exec(
        select(Reserva).where(Reserva.estado != "cancelada")  # Excluir reservas canceladas
    ).all()
    
    estadisticas = {
        "total_reservas": len(todas_reservas),
        "senas_pendientes": 0,
        "senas_recibidas": 0,
        "pagado_completo": 0,
        "otros_estados": 0,
        "monto_pendiente": 0,
        "monto_recibido": 0
    }
    
    for reserva in todas_reservas:
        estado = reserva.forma_pago.lower()
        
        if "pendiente" in estado:
            estadisticas["senas_pendientes"] += 1
            estadisticas["monto_pendiente"] += reserva.seña
        elif "recibida" in estado:
            estadisticas["senas_recibidas"] += 1
            estadisticas["monto_recibido"] += reserva.seña
        elif "pagado" in estado or "completo" in estado:
            estadisticas["pagado_completo"] += 1
            estadisticas["monto_recibido"] += reserva.total_estadia
        else:
            estadisticas["otros_estados"] += 1
    
    return estadisticas

# ─────────── ENDPOINT PÚBLICO PARA RESERVAS WEB (CORREGIDO) ───────────
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
        
        # Crear cliente automáticamente
        nombre_completo = f"{data.firstName} {data.lastName}"
        
        # Verificar si el cliente ya existe por teléfono o email
        cliente_existente = db.exec(
            select(Cliente).where(
                (Cliente.celular == data.phone) | 
                (Cliente.nombre == nombre_completo)
            )
        ).first()
        
        if cliente_existente:
            cliente = cliente_existente
            print(f"✅ Cliente existente encontrado: {cliente.nombre}")
        else:
            # Crear nuevo cliente con DNI único basado en teléfono
            dni_web = f"WEB-{data.phone[-8:]}"
            cliente = Cliente(
                nombre=nombre_completo,
                dni=dni_web,
                celular=data.phone,
                patente=None
            )
            db.add(cliente)
            db.commit()
            db.refresh(cliente)
            print(f"✅ Nuevo cliente creado: {cliente.nombre} (DNI: {dni_web})")
        
        # Calcular precio total
        noches = (fecha_checkout - fecha_checkin).days
        if noches <= 0:
            noches = 1  # Mínimo una noche
            
        precio_total = precio_por_noche * noches
        
        # Agregar costo de mascota
        if data.pet:
            precio_total += 7000
            print(f"🐾 Costo de mascota agregado: +$7.000")
        
        # ✅ PROCESAR SEÑA Y TIPO DE PAGO CORRECTAMENTE
        # Usar el monto de seña enviado desde el frontend (50% calculado)
        monto_sena = data.montoSeña if data.montoSeña is not None else (precio_total * 0.5)
        
        # Establecer estado según el tipo de pago
        if data.tipoPago == "transferencia":
            estado_pago = "Seña Pendiente"
        else:
            estado_pago = "Pendiente - Reserva Web"
        
        print(f"💰 Seña calculada: ${monto_sena:,.0f}")
        print(f"📋 Estado de pago: {estado_pago}")
        
        # Crear reserva con seña y estado correctos
        reserva = Reserva(
            cliente_id=cliente.id,
            habitacion_id=habitacion_id,
            fecha_checkin=fecha_checkin,
            fecha_checkout=fecha_checkout,
            seña=monto_sena,  # ✅ AHORA GUARDA LA SEÑA CORRECTAMENTE
            total_estadia=precio_total,
            forma_pago=estado_pago,  # ✅ ESTABLECE EL ESTADO CORRECTO
            nombre_huesped=nombre_completo
        )
        db.add(reserva)
        db.commit()
        db.refresh(reserva)
        
        # Número de confirmación
        numero_confirmacion = f"CS{reserva.id:08d}"
        
        print(f"🎉 Reserva web creada exitosamente:")
        print(f"   - ID: {reserva.id}")
        print(f"   - Cliente: {nombre_completo}")
        print(f"   - Habitación: {habitacion_recomendada['numero']} ({habitacion_recomendada['tipo']})")
        print(f"   - Capacidad: {habitacion_recomendada['capacidad']} personas")
        print(f"   - Fechas: {data.checkin} a {data.checkout} ({noches} noches)")
        print(f"   - Precio total: ${precio_total:,}")
        print(f"   - Seña: ${monto_sena:,}")
        print(f"   - Estado: {estado_pago}")
        print(f"   - Confirmación: {numero_confirmacion}")
        
        return {
            "success": True,
            "mensaje": "Reserva confirmada y habitación asignada automáticamente",
            "confirmacion": numero_confirmacion,
            "habitacion_asignada": {
                "numero": habitacion_recomendada["numero"],
                "tipo": habitacion_recomendada["tipo"],
                "capacidad": habitacion_recomendada["capacidad"]
            },
            "precio_total": precio_total,
            "precio_por_noche": precio_por_noche,
            "seña_requerida": monto_sena,  # ✅ DEVUELVE EL MONTO DE SEÑA
            "estado_pago": estado_pago,  # ✅ DEVUELVE EL ESTADO
            "noches": noches,
            "checkin": data.checkin,
            "checkout": data.checkout,
            "huespedes": data.guests,
            "cliente": nombre_completo,
            "reserva_id": reserva.id,
            "cliente_id": cliente.id,
            "mascota": data.pet,
            "tipo_pago": data.tipoPago
        }
        
    except HTTPException:
        # Re-lanzar HTTPExceptions
        raise
    except Exception as e:
        print(f"💥 Error completo al procesar reserva web: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            "success": False, 
            "error": f"Error interno del servidor: {str(e)}"
        }

# ─────────── ENDPOINTS PARA WHATSAPP BOT ───────────
@app.post("/api/disponibilidad-inteligente")
def disponibilidad_inteligente(data: DisponibilidadInteligenteEntrada, db: Session = Depends(obtener_db)):
    """
    Endpoint inteligente para verificar disponibilidad y encontrar la mejor habitación.
    
    Usa el service de disponibilidad que encapsula toda la lógica de negocio.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Verificando disponibilidad: checkin={data.checkin}, checkout={data.checkout}, personas={data.personas}, mascota={data.mascota}")
        
        # Convertir fechas
        fecha_checkin = datetime.strptime(data.checkin, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
        fecha_checkout = datetime.strptime(data.checkout, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
        
        # Validar fechas
        if fecha_checkout <= fecha_checkin:
            raise HTTPException(status_code=400, detail="La fecha de egreso debe ser posterior a la fecha de ingreso")
        
        # Importar service (aquí para evitar imports circulares)
        from app.services.availability_service import (
            get_available_rooms,
            pick_best_room,
            calculate_pricing,
            calculate_nights
        )
        
        # Obtener habitaciones disponibles usando el service
        habitaciones_disponibles = get_available_rooms(
            session=db,
            checkin=fecha_checkin,
            checkout=fecha_checkout,
            personas=data.personas
        )
        
        logger.info(f"Habitaciones candidatas encontradas: {len(habitaciones_disponibles)}")
        
        # Seleccionar la mejor habitación
        mejor_habitacion = pick_best_room(habitaciones_disponibles, data.personas)
        
        if not mejor_habitacion:
            logger.warning(f"No hay habitaciones disponibles para {data.personas} personas en fechas {data.checkin} a {data.checkout}")
            return {
                "disponible": False,
                "mensaje": f"No hay habitaciones disponibles para {data.personas} personas en las fechas solicitadas",
                "habitacion_seleccionada": None,
                "precios": None,
                "extras": None
            }
        
        logger.info(f"Mejor habitación seleccionada: Hab {mejor_habitacion.numero} (capacidad={mejor_habitacion.capacidad})")
        
        # Calcular noches
        noches = calculate_nights(fecha_checkin, fecha_checkout)
        
        # Calcular precios usando el service
        precios = calculate_pricing(
            habitacion=mejor_habitacion,
            noches=noches,
            mascota=data.mascota
        )
        
        # Preparar extras
        extras = None
        if data.mascota:
            extras = {
                "mascota": {
                    "incluida": True,
                    "precio_por_noche": 7000,
                    "total": precios["extra_mascota"]
                }
            }
        
        logger.info(f"Disponibilidad verificada: Hab {mejor_habitacion.numero} disponible, precio_total={precios['precio_total']}")
        
        return {
            "disponible": True,
            "mensaje": f"Habitación {mejor_habitacion.numero} disponible",
            "habitacion_seleccionada": {
                "id": mejor_habitacion.id,
                "numero": mejor_habitacion.numero,
                "tipo": mejor_habitacion.tipo,
                "capacidad": mejor_habitacion.capacidad,
                "descripcion": mejor_habitacion.descripcion
            },
            "precios": precios,
            "extras": extras,
            "fechas": {
                "checkin": data.checkin,
                "checkout": data.checkout
            }
        }
        
    except ValueError as e:
        logger.error(f"Error de formato de fecha: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Formato de fecha inválido: {str(e)}")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en disponibilidad-inteligente: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al verificar disponibilidad: {str(e)}")

@app.post("/api/reservas/bot")
def crear_reserva_bot(data: ReservaBotEntrada, db: Session = Depends(obtener_db)):
    """
    Crea una reserva desde WhatsApp Bot.
    Estado inicial: PENDIENTE_SEÑA
    Valida disponibilidad antes de crear.
    Calcula total y seña (50%).
    """
    try:
        print(f"🤖 [WhatsApp Bot] Creando reserva:")
        print(f"   - Cliente: {data.nombre_completo}")
        print(f"   - DNI: {data.dni}")
        print(f"   - Habitación: {data.habitacion_id}")
        print(f"   - Fechas: {data.fecha_ingreso} a {data.fecha_egreso}")
        print(f"   - Mascota: {data.mascota}")
        
        # Convertir fechas
        fecha_checkin = datetime.strptime(data.fecha_ingreso, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
        fecha_checkout = datetime.strptime(data.fecha_egreso, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
        
        # Validar fechas
        if fecha_checkout <= fecha_checkin:
            raise HTTPException(status_code=400, detail="La fecha de egreso debe ser posterior a la fecha de ingreso")
        
        # Verificar que la habitación exista
        habitacion = db.get(Habitacion, data.habitacion_id)
        if not habitacion:
            raise HTTPException(status_code=404, detail=f"Habitación {data.habitacion_id} no encontrada")
        
        # Validar capacidad
        if habitacion.capacidad < data.cantidad_personas:
            raise HTTPException(
                status_code=400, 
                detail=f"La habitación {habitacion.numero} tiene capacidad para {habitacion.capacidad} personas, se solicitaron {data.cantidad_personas}"
            )
        
        # ✅ VALIDAR DISPONIBILIDAD - Verificar que la habitación siga libre
        # Usar SQL directo para evitar problemas con columna 'origen' que puede no existir
        query_sql = text("""
            SELECT id FROM reserva 
            WHERE habitacion_id = :habitacion_id 
            AND fecha_checkin < :fecha_checkout 
            AND fecha_checkout > :fecha_checkin
        """)
        result = db.execute(
            query_sql,
            {
                "habitacion_id": data.habitacion_id,
                "fecha_checkout": fecha_checkout,
                "fecha_checkin": fecha_checkin
            }
        )
        reservas_solapadas = result.fetchall()
        
        if reservas_solapadas:
            raise HTTPException(
                status_code=409, 
                detail=f"La habitación {habitacion.numero} ya está ocupada en las fechas solicitadas"
            )
        
        # Verificar o crear cliente
        cliente_existente = db.exec(select(Cliente).where(Cliente.dni == data.dni)).first()
        if cliente_existente:
            cliente = cliente_existente
            # Actualizar datos del cliente
            cliente.nombre = data.nombre_completo
            cliente.celular = data.celular
            if data.patente:
                cliente.patente = data.patente
            db.add(cliente)
            db.commit()
            print(f"✅ Cliente existente actualizado: {cliente.nombre}")
        else:
            cliente = Cliente(
                nombre=data.nombre_completo,
                dni=data.dni,
                celular=data.celular,
                patente=data.patente
            )
            db.add(cliente)
            db.commit()
            db.refresh(cliente)
            print(f"✅ Nuevo cliente creado: {cliente.nombre}")
        
        # Calcular noches
        noches = (fecha_checkout - fecha_checkin).days
        if noches <= 0:
            noches = 1
        
        # Calcular precios
        precio_por_noche = habitacion.precio if habitacion.precio else 0
        precio_base = precio_por_noche * noches
        extra_mascota = 7000 * noches if data.mascota else 0
        precio_total = precio_base + extra_mascota
        
        # Calcular seña (50% del total)
        seña = precio_total * 0.5
        
        # Preparar observaciones si hay mascota
        observaciones = []
        if data.mascota:
            observaciones.append("🐾 Viaja con mascota pequeña")
            if data.observaciones_mascota:
                observaciones.append(f"Detalles mascota: {data.observaciones_mascota}")
        observaciones_texto = " | ".join(observaciones) if observaciones else None
        
        # Crear reserva con estado PENDIENTE_SEÑA
        reserva = Reserva(
            cliente_id=cliente.id,
            habitacion_id=data.habitacion_id,
            fecha_checkin=fecha_checkin,
            fecha_checkout=fecha_checkout,
            seña=seña,
            total_estadia=precio_total,
            forma_pago="PENDIENTE_SEÑA",  # Estado inicial: pendiente de seña
            nombre_huesped=data.nombre_completo + (f" ({observaciones_texto})" if observaciones_texto else ""),
            origen="whatsapp"  # Marcar origen
        )
        db.add(reserva)
        db.commit()
        db.refresh(reserva)
        
        print(f"🎉 Reserva creada desde WhatsApp Bot - ID: {reserva.id}")
        print(f"   - Total: ${precio_total:,.0f}")
        print(f"   - Seña requerida: ${seña:,.0f}")
        
        return {
            "success": True,
            "mensaje": "Reserva creada exitosamente. Pendiente de seña del 50%.",
            "reserva_id": reserva.id,
            "cliente": {
                "id": cliente.id,
                "nombre": cliente.nombre,
                "dni": cliente.dni,
                "celular": cliente.celular
            },
            "habitacion": {
                "id": habitacion.id,
                "numero": habitacion.numero,
                "tipo": habitacion.tipo,
                "capacidad": habitacion.capacidad
            },
            "fechas": {
                "checkin": data.fecha_ingreso,
                "checkout": data.fecha_egreso,
                "noches": noches
            },
            "precios": {
                "precio_por_noche": precio_por_noche,
                "precio_base": precio_base,
                "extra_mascota": extra_mascota,
                "precio_total": precio_total,
                "seña_requerida": seña
            },
            "estado": "PENDIENTE_SEÑA",
            "origen": "whatsapp",
            "mascota": data.mascota
        }
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Formato de fecha inválido: {str(e)}")
    except Exception as e:
        print(f"💥 Error al crear reserva desde bot: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error al crear reserva: {str(e)}")

# ─────────── ENDPOINT PARA BOT DE WHATSAPP ───────────
@app.post("/api/bot/handle-message", response_model=BotMessageOut)
def handle_bot_message(
    data: BotMessageIn,
    db: Session = Depends(obtener_db)
):
    """
    Endpoint único para manejar mensajes del bot de WhatsApp.
    
    Recibe mensajes desde n8n/Evolution API y devuelve la respuesta a enviar.
    Mantiene el estado de la conversación por número de teléfono.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        phone = data.from_field
        texto = data.text.strip()
        
        logger.info(f"📱 Mensaje recibido de {phone}: '{texto}'")
        
        # Buscar o crear sesión
        chat_session = db.exec(
            select(ChatSession).where(ChatSession.phone == phone)
        ).first()
        
        if not chat_session:
            chat_session = ChatSession(
                phone=phone,
                estado="INICIO",
                bot_pausado=False
            )
            db.add(chat_session)
            db.commit()
            db.refresh(chat_session)
            logger.info(f"✅ Nueva sesión creada para {phone}")
        else:
            logger.info(f"📋 Sesión existente para {phone}, estado: {chat_session.estado}")
        
        estado_anterior = chat_session.estado
        
        # Si está pausado o derivado a humano, no responder
        if chat_session.bot_pausado or chat_session.estado == "DERIVADO_A_HUMANO":
            logger.info(f"🔇 Bot pausado o derivado a humano para {phone}, no respondiendo")
            return BotMessageOut(reply=None, action="PAUSADO")
        
        # Importar service
        from app.services.bot_service import (
            procesar_mensaje,
            generar_respuesta_confirmacion_reserva,
            ESTADO_INICIO,
            ESTADO_ESPERANDO_CHECKIN,
            ESTADO_MOSTRANDO_DISPONIBILIDAD,
            ESTADO_ESPERANDO_CONFIRMACION,
            ESTADO_DERIVADO_A_HUMANO
        )
        
        # Procesar mensaje
        reply, nuevo_estado, datos_adicionales = procesar_mensaje(chat_session, texto)
        
        # Aplicar cambios según datos adicionales
        if datos_adicionales.get("reset_campos"):
            chat_session.checkin = None
            chat_session.checkout = None
            chat_session.personas = None
            chat_session.mascota = None
            chat_session.reserva_id = None
            chat_session.bot_pausado = False
        
        if datos_adicionales.get("reset_fechas"):
            chat_session.checkin = None
            chat_session.checkout = None
        
        if datos_adicionales.get("limpiar_reserva_id"):
            chat_session.reserva_id = None
        
        if datos_adicionales.get("pausar_bot"):
            chat_session.bot_pausado = True
        
        # Actualizar campos si vienen en datos_adicionales
        if "checkin" in datos_adicionales:
            chat_session.checkin = datos_adicionales["checkin"]
        if "checkout" in datos_adicionales:
            chat_session.checkout = datos_adicionales["checkout"]
        if "personas" in datos_adicionales:
            chat_session.personas = datos_adicionales["personas"]
        if "mascota" in datos_adicionales:
            chat_session.mascota = datos_adicionales["mascota"]
        
        chat_session.estado = nuevo_estado
        chat_session.updated_at = obtener_fecha_argentina()
        
        # Si necesita consultar disponibilidad
        if datos_adicionales.get("necesita_disponibilidad"):
            if chat_session.checkin and chat_session.checkout and chat_session.personas is not None and chat_session.mascota is not None:
                # Llamar endpoint interno de disponibilidad
                from app.services.availability_service import (
                    get_available_rooms,
                    pick_best_room,
                    calculate_pricing,
                    calculate_nights
                )
                
                fecha_checkin = datetime.strptime(chat_session.checkin, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
                fecha_checkout = datetime.strptime(chat_session.checkout, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
                
                habitaciones = get_available_rooms(
                    session=db,
                    checkin=fecha_checkin,
                    checkout=fecha_checkout,
                    personas=chat_session.personas
                )
                
                mejor_habitacion = pick_best_room(habitaciones, chat_session.personas)
                
                if mejor_habitacion:
                    noches = calculate_nights(fecha_checkin, fecha_checkout)
                    precios = calculate_pricing(
                        habitacion=mejor_habitacion,
                        noches=noches,
                        mascota=chat_session.mascota
                    )
                    
                    disponibilidad_data = {
                        "disponible": True,
                        "habitacion_seleccionada": {
                            "id": mejor_habitacion.id,
                            "numero": mejor_habitacion.numero,
                            "tipo": mejor_habitacion.tipo,
                            "capacidad": mejor_habitacion.capacidad
                        },
                        "precios": precios
                    }
                    
                    # Reprocesar con datos de disponibilidad
                    reply, nuevo_estado, datos_adicionales = procesar_mensaje(
                        chat_session,
                        texto,
                        disponibilidad_data
                    )
                    
                    if "habitacion_id" in datos_adicionales:
                        # Guardar habitacion_id temporalmente - lo usaremos cuando se confirme
                        pass
                    
                    chat_session.estado = nuevo_estado
                else:
                    disponibilidad_data = {
                        "disponible": False,
                        "mensaje": "No hay habitaciones disponibles para las fechas solicitadas"
                    }
                    
                    reply, nuevo_estado, datos_adicionales = procesar_mensaje(
                        chat_session,
                        texto,
                        disponibilidad_data
                    )
                    chat_session.estado = nuevo_estado
                    if datos_adicionales.get("reset_fechas"):
                        chat_session.checkin = None
                        chat_session.checkout = None
        
        # Si necesita crear reserva
        if datos_adicionales.get("confirmar_reserva"):
            if chat_session.checkin and chat_session.checkout and chat_session.personas and chat_session.mascota is not None:
                # Necesitamos habitacion_id - reconsultamos disponibilidad si no lo tenemos
                habitacion_id = datos_adicionales.get("habitacion_id")
                
                if not habitacion_id:
                    fecha_checkin = datetime.strptime(chat_session.checkin, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
                    fecha_checkout = datetime.strptime(chat_session.checkout, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
                    
                    from app.services.availability_service import get_available_rooms, pick_best_room
                    habitaciones = get_available_rooms(
                        session=db,
                        checkin=fecha_checkin,
                        checkout=fecha_checkout,
                        personas=chat_session.personas
                    )
                    mejor_habitacion = pick_best_room(habitaciones, chat_session.personas)
                    if mejor_habitacion:
                        habitacion_id = mejor_habitacion.id
                
                if habitacion_id:
                    # Crear reserva usando lógica similar a crear_reserva_bot
                    # Por ahora usamos datos mínimos - en producción el bot debería pedir nombre/dni
                    nombre_temp = f"Cliente WhatsApp {phone[-4:]}"
                    dni_temp = f"WA-{phone[-8:]}"
                    
                    # Crear o buscar cliente
                    cliente_existente = db.exec(select(Cliente).where(Cliente.dni == dni_temp)).first()
                    if cliente_existente:
                        cliente = cliente_existente
                    else:
                        cliente = Cliente(
                            nombre=nombre_temp,
                            dni=dni_temp,
                            celular=phone,
                            patente=None
                        )
                        db.add(cliente)
                        db.commit()
                        db.refresh(cliente)
                    
                    # Crear reserva
                    fecha_checkin = datetime.strptime(chat_session.checkin, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
                    fecha_checkout = datetime.strptime(chat_session.checkout, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
                    
                    from app.services.availability_service import calculate_nights, calculate_pricing
                    
                    habitacion = db.get(Habitacion, habitacion_id)
                    if habitacion:
                        noches = calculate_nights(fecha_checkin, fecha_checkout)
                        precios = calculate_pricing(habitacion, noches, chat_session.mascota)
                        seña = precios["precio_total"] * 0.5
                        
                        nueva_reserva = Reserva(
                            cliente_id=cliente.id,
                            habitacion_id=habitacion_id,
                            fecha_checkin=fecha_checkin,
                            fecha_checkout=fecha_checkout,
                            seña=seña,
                            total_estadia=precios["precio_total"],
                            forma_pago="PENDIENTE_SEÑA",
                            nombre_huesped=nombre_temp,
                            origen="whatsapp"
                        )
                        db.add(nueva_reserva)
                        db.commit()
                        db.refresh(nueva_reserva)
                        
                        chat_session.reserva_id = nueva_reserva.id
                        chat_session.estado = ESTADO_DERIVADO_A_HUMANO
                        
                        reply = generar_respuesta_confirmacion_reserva(nueva_reserva.id, seña)
                        logger.info(f"✅ Reserva creada: {nueva_reserva.id} para {phone}")
        
        # Guardar cambios
        db.add(chat_session)
        db.commit()
        
        logger.info(f"📤 Estado {estado_anterior} → {nuevo_estado} para {phone}")
        logger.info(f"💬 Reply: {reply[:50] if reply else 'None'}...")
        
        return BotMessageOut(reply=reply, action=None)
        
    except Exception as e:
        logger.error(f"💥 Error en handle_bot_message: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error al procesar mensaje: {str(e)}")

# 4. ENDPOINT PARA OBTENER ESTADÍSTICAS DE OCUPACIÓN
@app.get("/ocupacion-estadisticas")
def obtener_estadisticas_ocupacion(
    fecha_inicio: str,
    fecha_fin: str,
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    """
    Obtiene estadísticas detalladas de ocupación para un rango de fechas
    """
    try:
        inicio = datetime.strptime(fecha_inicio, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
        fin = datetime.strptime(fecha_fin, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
        
        # Obtener todas las habitaciones
        todas_habitaciones = db.exec(select(Habitacion)).all()
        total_habitaciones = len(todas_habitaciones)
        
        # Obtener reservas en el rango
        reservas = db.exec(
            select(Reserva).where(
                Reserva.fecha_checkin < fin,
                Reserva.fecha_checkout > inicio,
                Reserva.estado != "cancelada"  # Excluir reservas canceladas
            )
        ).all()
        
        # Calcular días totales
        dias_total = (fin - inicio).days
        
        # Estadísticas por tipo
        stats_por_tipo = {}
        for habitacion in todas_habitaciones:
            tipo = habitacion.tipo
            if tipo not in stats_por_tipo:
                stats_por_tipo[tipo] = {
                    "total_habitaciones": 0,
                    "capacidad_total": 0,
                    "habitaciones": []
                }
            
            stats_por_tipo[tipo]["total_habitaciones"] += 1
            stats_por_tipo[tipo]["capacidad_total"] += habitacion.capacidad
            stats_por_tipo[tipo]["habitaciones"].append({
                "numero": habitacion.numero,
                "capacidad": habitacion.capacidad,
                "precio": habitacion.precio
            })
        
        # Calcular ocupación
        habitaciones_ocupadas = set(r.habitacion_id for r in reservas)
        tasa_ocupacion = (len(habitaciones_ocupadas) / total_habitaciones * 100) if total_habitaciones > 0 else 0
        
        return {
            "periodo": {
                "inicio": fecha_inicio,
                "fin": fecha_fin,
                "dias": dias_total
            },
            "resumen": {
                "total_habitaciones": total_habitaciones,
                "habitaciones_ocupadas": len(habitaciones_ocupadas),
                "habitaciones_libres": total_habitaciones - len(habitaciones_ocupadas),
                "tasa_ocupacion": round(tasa_ocupacion, 2)
            },
            "por_tipo": stats_por_tipo,
            "reservas_activas": len(reservas)
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al calcular estadísticas: {str(e)}")

# ─────────── ENDPOINT DE RESUMEN ───────────
@app.get("/resumen-dia")
def resumen_del_dia(fecha: str, db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    try:
        fecha_obj = datetime.strptime(fecha, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
    except:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido")

    dia_siguiente = fecha_obj + timedelta(days=1)

    ingresos_reservas = db.exec(
        select(Reserva.total_estadia).where(
            Reserva.fecha_checkin >= fecha_obj,
            Reserva.fecha_checkin < dia_siguiente,
            Reserva.estado != "cancelada"  # Excluir reservas canceladas
        )
    ).all()
    total_reservas = sum(ingresos_reservas)

    ingresos_pedidos = db.exec(
        select(Pedido.monto).where(
            Pedido.fecha >= fecha_obj,
            Pedido.fecha < dia_siguiente
        )
    ).all()
    total_pedidos = sum(ingresos_pedidos)

    gastos = db.exec(
        select(GastoAdicional.monto).where(
            GastoAdicional.fecha >= fecha_obj,
            GastoAdicional.fecha < dia_siguiente
        )
    ).all()
    total_gastos = sum(gastos)

    return {
        "total_reservas": total_reservas,
        "total_pedidos": total_pedidos,
        "total_gastos": total_gastos,
        "balance": total_reservas + total_pedidos - total_gastos
    }

# ─────────── ENDPOINTS DE ANALYTICS ───────────
@app.get("/analytics/dashboard")
def dashboard_analytics(db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    hoy = obtener_fecha_argentina()
    inicio_mes = hoy.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    reservas_mes = db.exec(
        select(Reserva).where(
            Reserva.fecha_checkin >= inicio_mes,
            Reserva.fecha_checkin <= hoy,
            Reserva.estado != "cancelada"  # Excluir reservas canceladas
        )
    ).all()
    
    pedidos_mes = db.exec(
        select(Pedido).where(
            Pedido.fecha >= inicio_mes,
            Pedido.fecha <= hoy
        )
    ).all()
    
    gastos_mes = db.exec(
        select(GastoAdicional).where(
            GastoAdicional.fecha >= inicio_mes,
            GastoAdicional.fecha <= hoy
        )
    ).all()
    
    total_habitaciones = db.exec(select(Habitacion)).all()
    
    ingresos_reservas = sum(r.total_estadia for r in reservas_mes)
    ingresos_pedidos = sum(p.monto for p in pedidos_mes)
    total_gastos = sum(g.monto for g in gastos_mes)
    total_ingresos = ingresos_reservas + ingresos_pedidos
    beneficio_neto = total_ingresos - total_gastos
    
    dias_mes = (hoy - inicio_mes).days + 1
    ocupacion_total_posible = len(total_habitaciones) * dias_mes
    dias_ocupados = sum((r.fecha_checkout - r.fecha_checkin).days for r in reservas_mes)
    tasa_ocupacion = (dias_ocupados / ocupacion_total_posible * 100) if ocupacion_total_posible > 0 else 0
    
    return {
        "periodo": f"{inicio_mes.strftime('%B %Y')}",
        "total_reservas": len(reservas_mes),
        "total_pedidos": len(pedidos_mes),
        "total_gastos_count": len(gastos_mes),
        "ingresos_reservas": ingresos_reservas,
        "ingresos_pedidos": ingresos_pedidos,
        "total_ingresos": total_ingresos,
        "total_gastos_monto": total_gastos,
        "beneficio_neto": beneficio_neto,
        "tasa_ocupacion": round(tasa_ocupacion, 2),
        "habitaciones_disponibles": len(total_habitaciones)
    }

@app.get("/analytics/ingresos-por-dia")
def ingresos_por_dia(
    dias: int = Query(30, description="Número de días hacia atrás"),
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    fecha_fin = obtener_fecha_argentina()
    fecha_inicio = fecha_fin - timedelta(days=dias)
    
    reservas = db.exec(
        select(Reserva).where(
            Reserva.fecha_checkin >= fecha_inicio,
            Reserva.fecha_checkin <= fecha_fin,
            Reserva.estado != "cancelada"  # Excluir reservas canceladas
        )
    ).all()
    
    pedidos = db.exec(
        select(Pedido).where(
            Pedido.fecha >= fecha_inicio,
            Pedido.fecha <= fecha_fin
        )
    ).all()
    
    ingresos_diarios = defaultdict(lambda: {"reservas": 0, "pedidos": 0, "total": 0})
    
    for reserva in reservas:
        fecha_str = reserva.fecha_checkin.strftime("%Y-%m-%d")
        ingresos_diarios[fecha_str]["reservas"] += reserva.total_estadia
        ingresos_diarios[fecha_str]["total"] += reserva.total_estadia
    
    for pedido in pedidos:
        fecha_str = pedido.fecha.strftime("%Y-%m-%d")
        ingresos_diarios[fecha_str]["pedidos"] += pedido.monto
        ingresos_diarios[fecha_str]["total"] += pedido.monto
    
    resultado = []
    fecha_actual = fecha_inicio
    while fecha_actual <= fecha_fin:
        fecha_str = fecha_actual.strftime("%Y-%m-%d")
        datos = ingresos_diarios[fecha_str]
        resultado.append({
            "fecha": fecha_str,
            "reservas": datos["reservas"],
            "pedidos": datos["pedidos"],
            "total": datos["total"]
        })
        fecha_actual += timedelta(days=1)
    
    return resultado

@app.get("/analytics/formas-pago")
def analisis_formas_pago(db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    hoy = obtener_fecha_argentina()
    inicio_mes = hoy.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    reservas = db.exec(
        select(Reserva).where(
            Reserva.fecha_checkin >= inicio_mes,
            Reserva.fecha_checkin <= hoy,
            Reserva.estado != "cancelada"  # Excluir reservas canceladas
        )
    ).all()
    
    pedidos = db.exec(
        select(Pedido).where(
            Pedido.fecha >= inicio_mes,
            Pedido.fecha <= hoy
        )
    ).all()
    
    formas_pago = defaultdict(lambda: {"cantidad": 0, "monto": 0})
    
    for reserva in reservas:
        forma = reserva.forma_pago or "No especificado"
        formas_pago[forma]["cantidad"] += 1
        formas_pago[forma]["monto"] += reserva.total_estadia
    
    for pedido in pedidos:
        forma = pedido.forma_pago or "No especificado"
        formas_pago[forma]["cantidad"] += 1
        formas_pago[forma]["monto"] += pedido.monto
    
    resultado = []
    for forma, datos in formas_pago.items():
        resultado.append({
            "forma_pago": forma,
            "cantidad": datos["cantidad"],
            "monto": datos["monto"]
        })
    
    return sorted(resultado, key=lambda x: x["monto"], reverse=True)

@app.get("/analytics/detalle-diario")
def detalle_diario_analytics(
    fecha_inicio: str = Query(..., description="Fecha inicio (YYYY-MM-DD)"),
    fecha_fin: str = Query(..., description="Fecha fin (YYYY-MM-DD)"),
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    """
    Devuelve información detallada día por día de reservas y pedidos.
    Incluye: dinero de reservas, habitaciones ocupadas, formas de pago, y lo mismo para pedidos.
    """
    try:
        # Parsear fechas
        fecha_inicio_dt = datetime.strptime(fecha_inicio, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
        fecha_fin_dt = datetime.strptime(fecha_fin, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
        fecha_fin_dt = fecha_fin_dt.replace(hour=23, minute=59, second=59)
        
        # Obtener reservas en el rango (excluir canceladas)
        reservas = db.exec(
            select(Reserva).where(
                Reserva.fecha_checkin >= fecha_inicio_dt,
                Reserva.fecha_checkin <= fecha_fin_dt,
                Reserva.estado != "cancelada"  # Excluir reservas canceladas
            )
        ).all()
        
        # Obtener pedidos en el rango
        pedidos = db.exec(
            select(Pedido).where(
                Pedido.fecha >= fecha_inicio_dt,
                Pedido.fecha <= fecha_fin_dt
            )
        ).all()
        
        # Estructura para almacenar datos por día
        datos_por_dia = defaultdict(lambda: {
            "fecha": "",
            "reservas": {
                "monto_total": 0,
                "cantidad": 0,
                "habitaciones_ocupadas": set(),  # Usar set para evitar duplicados
                "formas_pago": defaultdict(float)  # forma_pago -> monto
            },
            "pedidos": {
                "monto_total": 0,
                "cantidad": 0,
                "formas_pago": defaultdict(float)  # forma_pago -> monto
            }
        })
        
        # Procesar reservas
        for reserva in reservas:
            fecha_str = reserva.fecha_checkin.strftime("%Y-%m-%d")
            datos_por_dia[fecha_str]["fecha"] = fecha_str
            
            # Monto total de reservas
            datos_por_dia[fecha_str]["reservas"]["monto_total"] += reserva.total_estadia
            datos_por_dia[fecha_str]["reservas"]["cantidad"] += 1
            
            # Habitaciones ocupadas (agregar todas las habitaciones de las reservas de ese día)
            if reserva.habitacion_id:
                datos_por_dia[fecha_str]["reservas"]["habitaciones_ocupadas"].add(reserva.habitacion_id)
            
            # Formas de pago
            forma_pago = reserva.forma_pago or "No especificado"
            datos_por_dia[fecha_str]["reservas"]["formas_pago"][forma_pago] += reserva.total_estadia
        
        # Procesar pedidos
        for pedido in pedidos:
            # Normalizar fecha a zona horaria de Argentina y extraer solo la fecha (sin hora)
            fecha_normalizada = normalizar_fecha_argentina(pedido.fecha)
            if fecha_normalizada:
                # Extraer la fecha en formato YYYY-MM-DD usando la fecha normalizada
                fecha_str = fecha_normalizada.strftime("%Y-%m-%d")
            else:
                # Fallback: si no se puede normalizar, usar la fecha directamente
                # pero asegurarse de que esté en zona horaria de Argentina
                if pedido.fecha.tzinfo is None:
                    # Si no tiene timezone, asumir que está en UTC y convertir
                    fecha_utc = pedido.fecha.replace(tzinfo=timezone.utc)
                    fecha_argentina = fecha_utc.astimezone(ARGENTINA_TZ)
                elif pedido.fecha.tzinfo != ARGENTINA_TZ:
                    # Si tiene otro timezone, convertir a Argentina
                    fecha_argentina = pedido.fecha.astimezone(ARGENTINA_TZ)
                else:
                    # Ya está en zona horaria de Argentina
                    fecha_argentina = pedido.fecha
                fecha_str = fecha_argentina.strftime("%Y-%m-%d")
            
            datos_por_dia[fecha_str]["fecha"] = fecha_str
            
            # Solo contar pedidos pagados
            if pedido.estado == "PAGADO":
                datos_por_dia[fecha_str]["pedidos"]["monto_total"] += pedido.monto
                datos_por_dia[fecha_str]["pedidos"]["cantidad"] += 1
                
                # Formas de pago
                forma_pago = pedido.forma_pago or "No especificado"
                datos_por_dia[fecha_str]["pedidos"]["formas_pago"][forma_pago] += pedido.monto
        
        # Convertir a lista y formatear
        resultado = []
        fecha_actual = fecha_inicio_dt
        while fecha_actual <= fecha_fin_dt:
            fecha_str = fecha_actual.strftime("%Y-%m-%d")
            datos = datos_por_dia[fecha_str]
            
            # Convertir set de habitaciones a lista y contar
            habitaciones_ocupadas_list = list(datos["reservas"]["habitaciones_ocupadas"])
            
            # Convertir defaultdict de formas de pago a lista
            formas_pago_reservas = [
                {"forma_pago": forma, "monto": monto}
                for forma, monto in datos["reservas"]["formas_pago"].items()
            ]
            formas_pago_pedidos = [
                {"forma_pago": forma, "monto": monto}
                for forma, monto in datos["pedidos"]["formas_pago"].items()
            ]
            
            resultado.append({
                "fecha": fecha_str,
                "reservas": {
                    "monto_total": datos["reservas"]["monto_total"],
                    "cantidad": datos["reservas"]["cantidad"],
                    "habitaciones_ocupadas": len(habitaciones_ocupadas_list),
                    "habitaciones_ids": habitaciones_ocupadas_list,
                    "formas_pago": sorted(formas_pago_reservas, key=lambda x: x["monto"], reverse=True)
                },
                "pedidos": {
                    "monto_total": datos["pedidos"]["monto_total"],
                    "cantidad": datos["pedidos"]["cantidad"],
                    "formas_pago": sorted(formas_pago_pedidos, key=lambda x: x["monto"], reverse=True)
                },
                "total_dia": datos["reservas"]["monto_total"] + datos["pedidos"]["monto_total"]
            })
            
            fecha_actual += timedelta(days=1)
        
        return {
            "fecha_inicio": fecha_inicio,
            "fecha_fin": fecha_fin,
            "dias": resultado,
            "resumen": {
                "total_reservas": sum(d["reservas"]["cantidad"] for d in resultado),
                "total_pedidos": sum(d["pedidos"]["cantidad"] for d in resultado),
                "total_ingresos_reservas": sum(d["reservas"]["monto_total"] for d in resultado),
                "total_ingresos_pedidos": sum(d["pedidos"]["monto_total"] for d in resultado),
                "total_ingresos": sum(d["total_dia"] for d in resultado)
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Formato de fecha inválido: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al procesar datos: {str(e)}")

# ─────────── ENDPOINT ROOT ───────────
@app.get("/")
def root():
    fecha_argentina = obtener_fecha_argentina()
    return {
        "mensaje": "API del Hotel Santino funcionando correctamente",
        "version": "3.0",
        "fecha": fecha_argentina.strftime("%Y-%m-%d %H:%M:%S"),
        "zona_horaria": "Argentina (UTC-3)",
        "status": "Conectado ✅",
        "endpoints_principales": [
            "/login",
            "/pedidos",
            "/pedidos/hoy",
            "/habitaciones",
            "/clientes",
            "/reservas",
            "/reservas-web (público)",
            "/reservas-gestion",
            "/gastos",
            "/analytics/dashboard",
            "/fix-database"
        ],
        "nuevos_endpoints": [
            "POST /reservas-web - Reservas desde página web (público)",
            "POST /reservas-gestion - Reservas desde sistema de gestión",
            "POST /fix-database - Reparar base de datos",
            "PUT /reservas/{id} - Editar reserva completa",
            "DELETE /reservas/{id} - Eliminar reserva (solo dueño)"
        ]
    }

# ─────────── ENDPOINT TEMPORAL PARA DEBUGGING ───────────
@app.post("/test-registrar-pedido")
def test_registrar_pedido_simple(db: Session = Depends(obtener_db)):
    try:
        # Test simple sin autenticación usando fecha de Argentina
        items_test = [{"descripcion": "Test Item", "cantidad": 1, "precio": 1000}]
        items_json = json.dumps(items_test)
        
        nuevo_pedido = Pedido(
            detalle=items_json,
            monto=1000,
            habitacion_id=None,
            externo=False,
            forma_pago="test",
            fecha=obtener_fecha_argentina()
        )
        
        db.add(nuevo_pedido)
        db.commit()
        db.refresh(nuevo_pedido)
        
        return {
            "status": "success", 
            "mensaje": "Pedido de prueba creado",
            "id": nuevo_pedido.id,
            "fecha_argentina": nuevo_pedido.fecha.strftime("%Y-%m-%d %H:%M:%S")
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}

# ─────────── ENDPOINT DE ESTADO Y ESTADÍSTICAS ───────────
@app.get("/status")
def obtener_estado_sistema(db: Session = Depends(obtener_db)):
    try:
        # Contar elementos en la base de datos
        total_usuarios = len(db.exec(select(Usuario)).all())
        total_habitaciones = len(db.exec(select(Habitacion)).all())
        total_clientes = len(db.exec(select(Cliente)).all())
        total_reservas = len(db.exec(select(Reserva)).all())
        total_pedidos = len(db.exec(select(Pedido)).all())
        total_gastos = len(db.exec(select(GastoAdicional)).all())
        
        # Última reserva
        ultima_reserva = db.exec(select(Reserva).order_by(Reserva.id.desc())).first()
        
        return {
            "sistema": "Hotel Santino API",
            "version": "3.0",
            "status": "✅ Funcionando correctamente",
            "fecha": obtener_fecha_argentina().strftime("%Y-%m-%d %H:%M:%S"),
            "base_datos": {
                "usuarios": total_usuarios,
                "habitaciones": total_habitaciones,
                "clientes": total_clientes,
                "reservas": total_reservas,
                "pedidos": total_pedidos,
                "gastos": total_gastos
            },
            "ultima_reserva": {
                "id": ultima_reserva.id if ultima_reserva else None,
                "cliente": ultima_reserva.nombre_huesped if ultima_reserva else None,
                "fecha": ultima_reserva.fecha_checkin.strftime("%Y-%m-%d") if ultima_reserva else None
            } if ultima_reserva else None
        }
    except Exception as e:
        return {
            "sistema": "Hotel Santino API",
            "status": "❌ Error en base de datos",
            "error": str(e)
        }

# ✅ ENDPOINT PARA DEBUG - Agregar temporalmente al backend
@app.get("/debug/habitaciones")
def debug_habitaciones(db: Session = Depends(obtener_db)):
    """
    Endpoint temporal para verificar la configuración de habitaciones
    """
    habitaciones = db.exec(select(Habitacion)).all()
    
    resultado = []
    for hab in habitaciones:
        resultado.append({
            "id": hab.id,
            "numero": hab.numero,
            "tipo": hab.tipo,
            "capacidad": hab.capacidad,
            "precio": hab.precio,
            "descripcion": hab.descripcion
        })
    
    # Agrupar por capacidad
    por_capacidad = {}
    for hab in resultado:
        cap = hab["capacidad"]
        if cap not in por_capacidad:
            por_capacidad[cap] = []
        por_capacidad[cap].append(hab["numero"])
    
    return {
        "total_habitaciones": len(resultado),
        "habitaciones_detalle": resultado,
        "agrupadas_por_capacidad": por_capacidad,
        "resumen": {
            "capacidad_1-2": len([h for h in resultado if h["capacidad"] <= 2]),
            "capacidad_3": len([h for h in resultado if h["capacidad"] == 3]),
            "capacidad_4": len([h for h in resultado if h["capacidad"] == 4]),
            "capacidad_5+": len([h for h in resultado if h["capacidad"] >= 5])
        }
    }

# ===============================================
# SISTEMA DE CHECK-OUT AUTOMÁTICO SIMPLIFICADO
# Compatible con Railway - Sin scheduler automático
# ===============================================

# 1. AGREGAR ESTOS ENDPOINTS AL FINAL DE TU ARCHIVO hotel.py
# (después de la línea 1750)

@app.post("/checkout-automatico")
def ejecutar_checkout_manual(db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    """
    Ejecuta manualmente el check-out automático para liberar habitaciones
    """
    try:
        fecha_hoy = obtener_fecha_argentina().date()
        hora_checkout = 10  # 10:00 AM
        
        print(f"🏨 Ejecutando check-out automático para el {fecha_hoy}")
        
        # Buscar reservas que vencen hoy y aún están activas (excluir canceladas)
        reservas_a_finalizar = db.exec(
            select(Reserva).where(
                Reserva.fecha_checkout <= datetime.combine(fecha_hoy, datetime.min.time()).replace(tzinfo=ARGENTINA_TZ) + timedelta(hours=hora_checkout),
                Reserva.forma_pago.notin_(["Checkout Automático", "checkout_manual", "Cancelado"]),
                Reserva.estado != "cancelada"  # Excluir reservas canceladas
            )
        ).all()
        
        habitaciones_liberadas = []
        reservas_procesadas = []
        
        for reserva in reservas_a_finalizar:
            try:
                # Obtener datos de la habitación y cliente
                habitacion = db.get(Habitacion, reserva.habitacion_id)
                cliente = db.get(Cliente, reserva.cliente_id)
                
                # Marcar como check-out automático
                reserva.forma_pago = "Checkout Automático"
                reserva.fecha_checkout = datetime.combine(fecha_hoy, datetime.min.time()).replace(tzinfo=ARGENTINA_TZ) + timedelta(hours=hora_checkout)
                
                db.add(reserva)
                
                habitacion_info = {
                    "reserva_id": reserva.id,
                    "habitacion_numero": habitacion.numero if habitacion else "N/A",
                    "habitacion_tipo": habitacion.tipo if habitacion else "N/A",
                    "cliente_nombre": cliente.nombre if cliente else reserva.nombre_huesped,
                    "fecha_checkout_original": reserva.fecha_checkout.strftime("%Y-%m-%d"),
                    "precio_total": reserva.total_estadia
                }
                
                habitaciones_liberadas.append(habitacion_info)
                reservas_procesadas.append(reserva.id)
                
                print(f"✅ Check-out automático: Habitación {habitacion.numero if habitacion else reserva.habitacion_id}")
                
            except Exception as e:
                print(f"❌ Error procesando reserva {reserva.id}: {str(e)}")
                continue
        
        # Guardar cambios
        db.commit()
        
        return {
            "success": True,
            "mensaje": "Check-out automático ejecutado correctamente",
            "fecha_ejecucion": fecha_hoy.strftime("%Y-%m-%d"),
            "hora_ejecucion": obtener_fecha_argentina().strftime("%H:%M:%S"),
            "total_habitaciones_liberadas": len(habitaciones_liberadas),
            "habitaciones_liberadas": habitaciones_liberadas,
            "reservas_procesadas": reservas_procesadas,
            "estado": "completado" if habitaciones_liberadas else "sin_checkouts_pendientes"
        }
        
    except Exception as e:
        print(f"💥 Error en check-out automático: {str(e)}")
        return {
            "success": False,
            "error": f"Error al ejecutar check-out automático: {str(e)}"
        }

@app.get("/checkout-automatico/proximos")
def obtener_proximos_checkouts(
    dias: int = Query(3, description="Días hacia adelante"),
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    """
    Obtiene las reservas que vencen en los próximos días
    """
    try:
        fecha_hoy = obtener_fecha_argentina().date()
        fecha_limite = fecha_hoy + timedelta(days=dias)
        
        proximas_reservas = db.exec(
            select(Reserva).where(
                Reserva.fecha_checkout >= datetime.combine(fecha_hoy, datetime.min.time()).replace(tzinfo=ARGENTINA_TZ),
                Reserva.fecha_checkout <= datetime.combine(fecha_limite, datetime.max.time()).replace(tzinfo=ARGENTINA_TZ),
                Reserva.forma_pago.notin_(["Checkout Automático", "checkout_manual", "Cancelado"]),
                Reserva.estado != "cancelada"  # Excluir reservas canceladas
            )
        ).all()
        
        proximos_checkouts = []
        for reserva in proximas_reservas:
            habitacion = db.get(Habitacion, reserva.habitacion_id)
            cliente = db.get(Cliente, reserva.cliente_id)
            
            dias_restantes = (reserva.fecha_checkout.date() - fecha_hoy).days
            
            proximos_checkouts.append({
                "reserva_id": reserva.id,
                "fecha_checkout": reserva.fecha_checkout.strftime("%Y-%m-%d"),
                "dias_restantes": dias_restantes,
                "habitacion_numero": habitacion.numero if habitacion else "N/A",
                "habitacion_tipo": habitacion.tipo if habitacion else "N/A",
                "cliente_nombre": cliente.nombre if cliente else reserva.nombre_huesped,
                "precio_total": reserva.total_estadia,
                "seña": reserva.seña,
                "forma_pago": reserva.forma_pago,
                "es_hoy": dias_restantes == 0,
                "es_urgente": dias_restantes <= 1
            })
        
        # Ordenar por fecha de checkout
        proximos_checkouts.sort(key=lambda x: x["fecha_checkout"])
        
        return {
            "success": True,
            "total_proximos_checkouts": len(proximos_checkouts),
            "checkouts_hoy": len([c for c in proximos_checkouts if c["es_hoy"]]),
            "checkouts_mañana": len([c for c in proximos_checkouts if c["dias_restantes"] == 1]),
            "periodo": f"Próximos {dias} días",
            "proximos_checkouts": proximos_checkouts
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Error al obtener próximos checkouts: {str(e)}"
        }

@app.get("/checkout-automatico/historial")
def obtener_historial_checkout_automatico(
    dias: int = Query(7, description="Días hacia atrás"),
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    """
    Obtiene el historial de check-outs automáticos
    """
    try:
        fecha_inicio = obtener_fecha_argentina() - timedelta(days=dias)
        
        checkouts_automaticos = db.exec(
            select(Reserva).where(
                Reserva.forma_pago == "Checkout Automático",
                Reserva.fecha_checkout >= fecha_inicio
            )
        ).all()
        
        historial = []
        for reserva in checkouts_automaticos:
            habitacion = db.get(Habitacion, reserva.habitacion_id)
            cliente = db.get(Cliente, reserva.cliente_id)
            
            historial.append({
                "reserva_id": reserva.id,
                "fecha_checkout": reserva.fecha_checkout.strftime("%Y-%m-%d %H:%M"),
                "habitacion_numero": habitacion.numero if habitacion else "N/A",
                "habitacion_tipo": habitacion.tipo if habitacion else "N/A",
                "cliente_nombre": cliente.nombre if cliente else reserva.nombre_huesped,
                "precio_total": reserva.total_estadia,
                "seña": reserva.seña
            })
        
        return {
            "success": True,
            "total_checkouts_automaticos": len(historial),
            "periodo": f"Últimos {dias} días",
            "historial": historial
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Error al obtener historial: {str(e)}"
        }

@app.get("/status-checkout")
def obtener_estado_checkout_automatico(db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    """
    Obtiene el estado del sistema de check-out automático
    """
    try:
        # Contar reservas por estado
        total_reservas_activas = len(db.exec(
            select(Reserva).where(
                Reserva.forma_pago.notin_(["Checkout Automático", "Cancelado"])
            )
        ).all())
        
        checkouts_hoy = len(db.exec(
            select(Reserva).where(
                Reserva.fecha_checkout <= datetime.combine(obtener_fecha_argentina().date(), datetime.max.time()).replace(tzinfo=ARGENTINA_TZ),
                Reserva.forma_pago.notin_(["Checkout Automático", "Cancelado"])
            )
        ).all())
        
        checkouts_automaticos_total = len(db.exec(
            select(Reserva).where(Reserva.forma_pago == "Checkout Automático")
        ).all())
        
        return {
            "success": True,
            "sistema_checkout": {
                "estado": "✅ Manual (sin scheduler automático)",
                "modo": "Ejecución manual solamente",
                "timezone": "Argentina (UTC-3)"
            },
            "estadisticas": {
                "reservas_activas": total_reservas_activas,
                "checkouts_pendientes_hoy": checkouts_hoy,
                "total_checkouts_automaticos": checkouts_automaticos_total
            },
            "instrucciones": {
                "ejecutar_manualmente": "POST /checkout-automatico",
                "ver_proximos": "GET /checkout-automatico/proximos",
                "ver_historial": "GET /checkout-automatico/historial"
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Error al obtener estado: {str(e)}"
        }

print("✅ Sistema de Check-out Manual configurado correctamente")
print("📋 Endpoints disponibles:")
print("   - POST /checkout-automatico (ejecutar manualmente)")
print("   - GET /checkout-automatico/historial (ver historial)")
print("   - GET /checkout-automatico/proximos (próximos checkouts)")
print("   - GET /status-checkout (estado del sistema)")