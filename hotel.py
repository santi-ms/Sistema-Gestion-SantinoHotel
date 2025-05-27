from fastapi import FastAPI, HTTPException, Depends, status, Query
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import SQLModel, Field, Session, select, create_engine
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel
import json
from collections import defaultdict

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://hotel-santino-frontend.vercel.app"],
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

# ─────────── MODELOS ───────────
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
    fecha: datetime = Field(default_factory=datetime.utcnow)

class GastoAdicional(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    habitacion_id: int
    descripcion: str
    monto: float
    fecha: datetime = Field(default_factory=datetime.utcnow)

# ─────────── NUEVOS MODELOS PARA ITEMS MÚLTIPLES ───────────
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

@app.on_event("startup")
def crear_tablas():
    SQLModel.metadata.create_all(engine)

# ─────────── UTILIDADES ───────────
def obtener_db():
    with Session(engine) as session:
        yield session

def crear_token(datos: dict):
    to_encode = datos.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verificar_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

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

# ─────────── ENDPOINTS DE PEDIDOS ACTUALIZADOS ───────────
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
        fecha=datetime.utcnow()
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

@app.get("/pedidos/hoy", response_model=List[PedidoRespuesta])
def obtener_pedidos_hoy(db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    hoy = datetime.utcnow().date()
    inicio_dia = datetime.combine(hoy, datetime.min.time())
    fin_dia = datetime.combine(hoy, datetime.max.time())
    
    pedidos = db.exec(
        select(Pedido).where(Pedido.fecha >= inicio_dia, Pedido.fecha <= fin_dia)
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

@app.get("/pedidos-dia", response_model=List[PedidoRespuesta])
def obtener_pedidos_por_dia_con_items(
    fecha: str = Query(...),
    db: Session = Depends(obtener_db),
    token: dict = Depends(verificar_token)
):
    try:
        fecha_obj = datetime.strptime(fecha, "%Y-%m-%d")
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
    db.add(gasto)
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
        fecha_obj = datetime.strptime(fecha, "%Y-%m-%d")
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
class ReservaEntrada(BaseModel):
    habitacion_id: int
    nombre_huesped: str
    precio: float
    seña: float = 0
    forma_pago: str = "pendiente"
    fecha_checkin: datetime
    fecha_checkout: datetime

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

@app.get("/reservas")
def obtener_todas_las_reservas(db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    reservas = db.exec(select(Reserva)).all()
    return reservas

@app.get("/reservas/dia")
def obtener_reservas_por_dia(fecha: str, db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    try:
        fecha_obj = datetime.strptime(fecha, "%Y-%m-%d")
    except:
        raise HTTPException(status_code=400, detail="Formato de fecha inválido")

    reservas = db.exec(
        select(Reserva).where(
            Reserva.fecha_checkin <= fecha_obj,
            Reserva.fecha_checkout > fecha_obj
        )
    ).all()
    return reservas

@app.patch("/reservas/{reserva_id}/checkout")
def realizar_checkout(reserva_id: int, db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    reserva = db.get(Reserva, reserva_id)
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    nueva_fecha = datetime.utcnow() - timedelta(days=1)
    reserva.fecha_checkout = datetime.combine(nueva_fecha.date(), datetime.min.time())

    db.add(reserva)
    db.commit()
    return {"mensaje": "Checkout realizado"}

class ActualizarPagoEntrada(BaseModel):
    forma_pago: str

@app.patch("/reservas/{reserva_id}/pago")
def actualizar_forma_pago(reserva_id: int, data: ActualizarPagoEntrada, db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    reserva = db.get(Reserva, reserva_id)
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    reserva.forma_pago = data.forma_pago
    db.add(reserva)
    db.commit()
    return {"mensaje": "Forma de pago actualizada"}

# ─────────── ENDPOINT DE RESUMEN ───────────
@app.get("/resumen-dia")
def resumen_del_dia(fecha: str, db: Session = Depends(obtener_db), token: dict = Depends(verificar_token)):
    try:
        fecha_obj = datetime.strptime(fecha, "%Y-%m-%d")
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
    hoy = datetime.utcnow()
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
    fecha_fin = datetime.utcnow()
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
    hoy = datetime.utcnow()
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
    return {
        "mensaje": "API del Hotel Santino funcionando correctamente",
        "version": "2.0",
        "fecha": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        "endpoints_principales": [
            "/login",
            "/pedidos",
            "/pedidos/hoy",
            "/habitaciones",
            "/clientes",
            "/reservas",
            "/gastos",
            "/analytics/dashboard"
        ]
    }