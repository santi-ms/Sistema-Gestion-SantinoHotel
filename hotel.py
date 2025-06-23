from fastapi import FastAPI, HTTPException, Depends, status, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Field, Session, select, create_engine, text
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel
import json
from collections import defaultdict

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite todos los orígenes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = "sqlite:///hotel.db"
engine = create_engine(DATABASE_URL, echo=False)

SECRET_KEY = "clave-secreta"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# ─────────── CONFIGURACIÓN DE ZONA HORARIA ───────────
# Zona horaria de Argentina (UTC-3)
ARGENTINA_TZ = timezone(timedelta(hours=-3))

def obtener_fecha_argentina():
    """Obtiene la fecha y hora actual en zona horaria de Argentina"""
    return datetime.now(ARGENTINA_TZ)

def convertir_a_argentina(fecha_utc):
    """Convierte una fecha UTC a zona horaria de Argentina"""
    if fecha_utc.tzinfo is None:
        fecha_utc = fecha_utc.replace(tzinfo=timezone.utc)
    return fecha_utc.astimezone(ARGENTINA_TZ)

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

class Pedido(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    detalle: str  # Almacena JSON con los items
    monto: float
    habitacion_id: Optional[int] = None
    externo: bool = False
    forma_pago: str
    fecha: datetime = Field(default_factory=lambda: obtener_fecha_argentina())

class GastoAdicional(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    habitacion_id: int
    descripcion: str
    monto: float
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
    forma_pago: str

class PedidoRespuesta(BaseModel):
    id: int
    items: List[ItemPedido]
    monto: float
    habitacion_id: Optional[int]
    externo: bool
    forma_pago: str
    fecha: datetime

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
    precio_total: float
    seña: float
    forma_pago: str
    
    # NUEVO: Campo para mascotas
    mascota: bool = False
    observaciones_mascota: Optional[str] = None  # Para notas adicionales sobre la mascota
@app.on_event("startup")
def crear_tablas():
    SQLModel.metadata.create_all(engine)

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
def arreglar_base_datos(db: Session = Depends(obtener_db)):
    try:
        print("🔧 Iniciando reparación de base de datos...")
        
        # Ejecutar comandos SQL directamente para agregar columnas faltantes
        with engine.connect() as connection:
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
            
            connection.commit()
        
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
@app.post("/pedidos")
def registrar_pedido_con_items(pedido: PedidoConItems, db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    monto_total = sum(item.cantidad * item.precio for item in pedido.items)
    items_json = json.dumps([item.dict() for item in pedido.items])
    
    nuevo_pedido = Pedido(
        detalle=items_json,
        monto=monto_total,
        habitacion_id=pedido.habitacion_id,
        externo=pedido.externo,
        forma_pago=pedido.forma_pago,
        fecha=obtener_fecha_argentina()
    )
    
    db.add(nuevo_pedido)
    db.commit()
    db.refresh(nuevo_pedido)
    
    return {"mensaje": "Pedido registrado correctamente", "id": nuevo_pedido.id}

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
        
        resultado.append(PedidoRespuesta(
            id=pedido.id,
            items=items,
            monto=pedido.monto,
            habitacion_id=pedido.habitacion_id,
            externo=pedido.externo,
            forma_pago=pedido.forma_pago,
            fecha=pedido.fecha
        ))
    
    return resultado

@app.get("/pedidos/hoy")
def obtener_pedidos_hoy(db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    # Usar fecha actual de Argentina
    hoy_argentina = obtener_fecha_argentina().date()
    inicio_dia = datetime.combine(hoy_argentina, datetime.min.time()).replace(tzinfo=ARGENTINA_TZ)
    fin_dia = datetime.combine(hoy_argentina, datetime.max.time()).replace(tzinfo=ARGENTINA_TZ)
    
    pedidos = db.exec(
        select(Pedido).where(Pedido.fecha >= inicio_dia, Pedido.fecha <= fin_dia)
    ).all()
    
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
            "fecha": pedido.fecha.isoformat()
        })
    
    return resultado

@app.get("/pedidos-dia", response_model=List[PedidoRespuesta])
def obtener_pedidos_por_dia_con_items(
    fecha: str = Query(...),
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    try:
        fecha_obj = datetime.strptime(fecha, "%Y-%m-%d").replace(tzinfo=ARGENTINA_TZ)
    except:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido")

    pedidos = db.exec(
        select(Pedido).where(Pedido.fecha >= fecha_obj, Pedido.fecha < fecha_obj + timedelta(days=1))
    ).all()
    
    resultado = []
    for pedido in pedidos:
        try:
            items_data = json.loads(pedido.detalle)
            items = [ItemPedido(**item) for item in items_data]
        except:
            items = [ItemPedido(descripcion=pedido.detalle, cantidad=1, precio=pedido.monto)]
        
        resultado.append(PedidoRespuesta(
            id=pedido.id,
            items=items,
            monto=pedido.monto,
            habitacion_id=pedido.habitacion_id,
            externo=pedido.externo,
            forma_pago=pedido.forma_pago,
            fecha=pedido.fecha
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
    pedido.forma_pago = datos.forma_pago

    db.add(pedido)
    db.commit()
    return {"mensaje": "Pedido actualizado correctamente"}

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
        habitacion_id=gasto.habitacion_id,
        descripcion=gasto.descripcion,
        monto=gasto.monto,
        fecha=obtener_fecha_argentina()
    )
    db.add(nuevo_gasto)
    db.commit()
    return {"mensaje": "Gasto adicional registrado"}

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

    gasto.habitacion_id = datos.habitacion_id
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

# ─────────── ENDPOINTS DE RESERVAS ───────────
@app.post("/reservas")
def crear_reserva_simple(data: ReservaEntrada, db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
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

    reservas = db.exec(
        select(Reserva).where(
            Reserva.fecha_checkin <= fecha_obj,
            Reserva.fecha_checkout > fecha_obj
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
    
    db.delete(reserva)
    db.commit()
    return {"mensaje": "Reserva eliminada correctamente"}

# ─────────── ENDPOINTS EXISTENTES DE RESERVAS ───────────
@app.patch("/reservas/{reserva_id}/checkout")
def realizar_checkout(reserva_id: int, db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    reserva = db.get(Reserva, reserva_id)
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    fecha_argentina = obtener_fecha_argentina() - timedelta(days=1)
    reserva.fecha_checkout = datetime.combine(fecha_argentina.date(), datetime.min.time()).replace(tzinfo=ARGENTINA_TZ)

    db.add(reserva)
    db.commit()
    return {"mensaje": "Checkout realizado"}

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
    Configura todas las 15 habitaciones del Complejo Santino con sus precios y capacidades reales
    """
    try:
        # Configuración real de habitaciones del Complejo Santino
        habitaciones_config = [
            # Habitaciones Estándar para 5 personas
            {"numero": 1, "tipo": "Estándar", "capacidad": 5, "precio": 90000},
            {"numero": 2, "tipo": "Estándar", "capacidad": 5, "precio": 90000},
            {"numero": 3, "tipo": "Estándar", "capacidad": 5, "precio": 90000},
            {"numero": 4, "tipo": "Estándar", "capacidad": 5, "precio": 90000},
            
            # Habitación Estándar para 4 personas
            {"numero": 5, "tipo": "Estándar", "capacidad": 4, "precio": 80000},
            
            # Habitaciones Estándar para 1-2 personas (precio para 2 personas, mínimo 1)
            {"numero": 6, "tipo": "Estándar", "capacidad": 2, "precio": 50000},  # $40k para 1 persona, $50k para 2
            {"numero": 11, "tipo": "Estándar", "capacidad": 2, "precio": 50000}, # $40k para 1 persona, $50k para 2
            
            # Habitación Estándar para 6 personas
            {"numero": 7, "tipo": "Estándar", "capacidad": 6, "precio": 100000},
            
            # Habitaciones Estándar para 3 personas
            {"numero": 8, "tipo": "Estándar", "capacidad": 3, "precio": 65000},
            {"numero": 9, "tipo": "Estándar", "capacidad": 3, "precio": 65000},
            
            # Habitación Estándar para 7 personas
            {"numero": 10, "tipo": "Estándar", "capacidad": 7, "precio": 110000},
            
            # Habitaciones Confort para 4 personas
            {"numero": 12, "tipo": "Confort", "capacidad": 4, "precio": 90000},
            {"numero": 13, "tipo": "Confort", "capacidad": 4, "precio": 90000},
            {"numero": 14, "tipo": "Confort", "capacidad": 4, "precio": 90000},
            {"numero": 15, "tipo": "Confort", "capacidad": 4, "precio": 90000},
        ]
        
        for config in habitaciones_config:
            # Buscar si la habitación ya existe
            habitacion_existente = db.exec(
                select(Habitacion).where(Habitacion.numero == config["numero"])
            ).first()
            
            descripcion = f"Habitación {config['tipo']} para {config['capacidad']} personas"
            
            # Agregar info especial para hab. 6 y 11
            if config["numero"] in [6, 11]:
                descripcion += " (1 persona: $40,000 | 2 personas: $50,000)"
            
            if habitacion_existente:
                # Actualizar habitación existente
                habitacion_existente.tipo = config["tipo"]
                habitacion_existente.capacidad = config["capacidad"]
                habitacion_existente.precio = config["precio"]
                habitacion_existente.descripcion = descripcion
                db.add(habitacion_existente)
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
        
        db.commit()
        
        return {
            "success": True,
            "mensaje": "✅ Complejo Santino - 15 habitaciones configuradas correctamente",
            "habitaciones_configuradas": len(habitaciones_config),
            "detalles": {
                "estandar_5_personas": "Hab. 1-4: $90,000",
                "estandar_4_personas": "Hab. 5: $80,000", 
                "estandar_1_2_personas": "Hab. 6,11: $40k-$50k",
                "estandar_6_personas": "Hab. 7: $100,000",
                "estandar_3_personas": "Hab. 8,9: $65,000",
                "estandar_7_personas": "Hab. 10: $110,000",
                "confort_4_personas": "Hab. 12-15: $90,000"
            },
            "nota": "Precios en efectivo/transferencia: descuento de $10,000 en la mayoría"
        }
        
    except Exception as e:
        print(f"Error al configurar habitaciones: {e}")
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
            Reserva.forma_pago.in_(["Seña Pendiente", "Pendiente - Reserva Web"])
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
    todas_reservas = db.exec(select(Reserva)).all()
    
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
                Reserva.fecha_checkout > inicio
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
            Reserva.fecha_checkin < dia_siguiente
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
            Reserva.fecha_checkin <= hoy
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
            Reserva.fecha_checkin <= fecha_fin
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
            Reserva.fecha_checkin <= hoy
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
        
        # Buscar reservas que vencen hoy y aún están activas
        reservas_a_finalizar = db.exec(
            select(Reserva).where(
                Reserva.fecha_checkout <= datetime.combine(fecha_hoy, datetime.min.time()).replace(tzinfo=ARGENTINA_TZ) + timedelta(hours=hora_checkout),
                Reserva.forma_pago.notin_(["Checkout Automático", "checkout_manual", "Cancelado"])
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
                Reserva.forma_pago.notin_(["Checkout Automático", "checkout_manual", "Cancelado"])
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