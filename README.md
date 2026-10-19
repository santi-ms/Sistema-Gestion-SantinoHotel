# Hotel Santino — Sistema de Gestión Hotelera

Sistema web integral para la gestión de alojamientos turísticos: reservas, pedidos, stock, gastos y finanzas en un solo lugar.

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS |
| Backend | Python FastAPI |
| Base de datos | PostgreSQL |
| Deploy Backend | Railway |
| Deploy Frontend | Vercel |
| Auth | JWT con roles (dueño / empleado) |

---

## Funcionalidades

### Panel del Dueño
- **Dashboard** con resumen del día: ingresos, egresos y balance
- **Analytics** con gráficos de ocupación e ingresos históricos
- Gestión completa de habitaciones y precios dinámicos
- **Calculadora de cambio** con cotización oficial USD y BRL en tiempo real
- Registro y consulta de gastos operativos
- Exportación de pedidos a CSV

### Panel del Empleado
- Registro de reservas con check-in / check-out
- Pedidos de restobar con impresión de ticket térmico
- Control de stock con alertas
- Gestión de actividades y clientes

### General
- Autenticación con roles diferenciados (dueño / empleado)
- Diseño responsive — funciona en celular, tablet y PC
- Interfaz moderna tipo SaaS

---

## Estructura del Proyecto

```
hotel-santino/
├── backend/
│   └── hotel-santino-backend/   # FastAPI + PostgreSQL
│       ├── hotel.py              # API principal
│       └── alembic/              # Migraciones de base de datos
├── frontend/
│   └── hotel-frontend/          # React + Vite
│       └── src/
│           ├── components/       # Componentes reutilizables
│           ├── hooks/            # Custom hooks (auth, debounce)
│           ├── utils/            # Utilidades (moneda, fechas)
│           └── lib/              # Axios instance con interceptors
└── infra/                        # Infraestructura (Docker, n8n)
```

---

## Variables de Entorno

### Backend
```env
DATABASE_URL=postgresql://user:password@host:port/dbname
SECRET_KEY=tu-clave-secreta-jwt
ANTHROPIC_API_KEY=tu-clave-de-api-anthropic
# Opcional: modelo con visión y salidas estructuradas
ANTHROPIC_RECEIPT_MODEL=claude-sonnet-4-6
```

### Frontend
```env
VITE_API_URL=https://tu-backend.railway.app
```

### Escanear gastos con una foto

En Gastos, elegir una foto JPG, PNG o WebP (hasta 10 MB), pulsar **Escanear con IA**,
revisar la propuesta y pulsar **Usar estos datos**. Luego corregir lo necesario y
confirmar con **Registrar gasto**. El escaneo no crea un gasto automáticamente.
El gasto usa la fecha actual, igual que la carga manual. El monto se completa
sólo cuando la moneda se identifica como ARS; para otras monedas se carga
manualmente el equivalente en pesos. La forma de pago queda sin especificar si
no aparece en el comprobante.

Configurar `ANTHROPIC_API_KEY` únicamente en el backend (nunca en variables `VITE_`)
e instalar las dependencias de `requirements.txt`. Sin esa clave, la carga manual
sigue disponible y el escáner informa que falta configuración. Cada escaneo usa
la API de Anthropic y requiere una cuenta con saldo o facturación habilitada.
La foto se envía a Anthropic Claude; la aplicación no guarda el archivo
como adjunto ni conserva una copia. La lectura usa Messages API con imágenes y
[salidas estructuradas](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).

---

## Instalación Local

### Backend
```bash
cd backend/hotel-santino-backend
python -m venv venv
source venv/bin/activate   # En Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn hotel:app --reload
```

### Frontend
```bash
cd frontend/hotel-frontend
npm install
npm run dev
```

---

## Crear primer usuario administrador

Editar `crear_dueno.py` con tu email y contraseña, luego ejecutar:

```bash
python crear_dueno.py
```

---

## Licencia

Uso privado. Sistema desarrollado para Hotel Santino, Santo Tomé, Corrientes, Argentina.
