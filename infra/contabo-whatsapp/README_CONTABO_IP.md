# 🚀 Evolution API + n8n en Contabo (Solo IP)

Guía paso a paso para levantar Evolution API y n8n en un VPS Contabo usando solo IP (sin dominio ni HTTPS).

---

## 📋 Requisitos Previos

- VPS Contabo con Ubuntu 22.04
- Acceso SSH al servidor
- IP pública del servidor

---

## 1️⃣ Instalar Docker y Docker Compose

Conectate por SSH y ejecuta estos comandos:

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependencias
sudo apt install -y ca-certificates curl gnupg lsb-release

# Agregar clave GPG oficial de Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Agregar repositorio de Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker Engine y Docker Compose plugin
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verificar instalación
docker --version
docker compose version

# Agregar tu usuario al grupo docker (opcional, para no usar sudo)
sudo usermod -aG docker $USER
# Cerrar y volver a abrir sesión SSH para que tome efecto
```

---

## 2️⃣ Copiar Archivos al Servidor

### Opción A: Si tienes el repo en GitHub

```bash
# Clonar repo en el servidor
git clone TU_REPO_URL
cd HotelGestion2/infra/contabo-whatsapp
```

### Opción B: Subir archivos manualmente

```bash
# En tu máquina local, comprimir la carpeta
cd infra/contabo-whatsapp
tar -czf whatsapp-infra.tar.gz docker-compose.yml .env.example README_CONTABO_IP.md n8n_workflows/

# Subir al servidor con scp
scp whatsapp-infra.tar.gz usuario@IP_DEL_SERVIDOR:/home/usuario/

# En el servidor, descomprimir
tar -xzf whatsapp-infra.tar.gz
cd infra/contabo-whatsapp
```

---

## 3️⃣ Configurar Variables de Entorno

```bash
# Crear .env desde el ejemplo
# Si tienes env.example.txt, renómbralo:
mv env.example.txt .env
# O crea .env manualmente con el contenido de env.example.txt

# Editar .env con tus valores
nano .env
```

**Importante:** Cambia estos valores:

```env
SERVER_IP=123.45.67.89  # Tu IP pública del servidor
BOT_BACKEND_URL=https://hotel-santino-backend-production.up.railway.app
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=tu_password_seguro_aqui
EVOLUTION_API_KEY=tu_clave_secreta_muy_segura
POSTGRES_PASSWORD=tu_password_postgres_seguro
```

**Obtener IP del servidor:**
```bash
curl ifconfig.me
# O
hostname -I | awk '{print $1}'
```

---

## 4️⃣ Levantar Servicios

```bash
# Levantar todos los servicios en background
docker compose up -d

# Verificar que están corriendo
docker compose ps
```

Deberías ver:
- `evolution-api` (puerto 8080)
- `evolution-db` (PostgreSQL)
- `evolution-redis` (Redis)
- `n8n` (puerto 5678)

---

## 5️⃣ Acceder a los Servicios

### Evolution API
```
http://TU_IP:8080
```

Ejemplo: `http://123.45.67.89:8080`

### n8n
```
http://TU_IP:5678
```

Ejemplo: `http://123.45.67.89:5678`

Usarás las credenciales configuradas en `.env`:
- Usuario: `N8N_BASIC_AUTH_USER`
- Password: `N8N_BASIC_AUTH_PASSWORD`

---

## 6️⃣ Configurar Evolution API

1. Accede a `http://TU_IP:8080`
2. Crea una instancia nueva
3. Escanea el código QR con WhatsApp
4. Anota el nombre de la instancia (ej: "hotel-santino")

---

## 7️⃣ Configurar Variables de Entorno en n8n

Antes de importar el workflow, configura las variables de entorno en n8n:

1. Accede a `http://TU_IP:5678`
2. Inicia sesión con tus credenciales
3. Ve a **Settings** → **Variables** (o **Environment Variables**)
4. Agrega estas variables:
   - `BOT_BACKEND_URL`: `https://hotel-santino-backend-production.up.railway.app`
   - `EVOLUTION_INSTANCE_NAME`: El nombre de tu instancia (ej: "hotel-santino")
   - `EVOLUTION_API_KEY`: La misma clave que configuraste en `.env`
   - `SERVER_IP`: Tu IP pública del servidor

## 8️⃣ Importar Workflow de n8n

1. Ve a **Workflows** → **Import from File**
2. Selecciona `n8n_workflows/whatsapp_bridge.json`
3. El workflow ya está configurado para usar las variables de entorno

## 9️⃣ Activar Workflow

1. Haz clic en el workflow importado
2. Haz clic en **Activate** (toggle en la esquina superior derecha)
3. Copia la URL del webhook que aparece debajo del nodo "Webhook - Evolution API"
   - Ejemplo: `http://TU_IP:5678/webhook/evolution-message`

---

## 📝 Comandos Útiles

### Ver logs
```bash
# Todos los servicios
docker compose logs -f

# Solo Evolution API
docker compose logs -f evolution

# Solo n8n
docker compose logs -f n8n
```

### Detener servicios
```bash
docker compose down
```

### Detener y eliminar volúmenes (⚠️ BORRA DATOS)
```bash
docker compose down -v
```

### Reiniciar un servicio
```bash
docker compose restart evolution
docker compose restart n8n
```

### Ver estado
```bash
docker compose ps
```

---

## 🔟 Configurar Webhook en Evolution API

Cuando tengas la instancia creada, conectada y el workflow activado:

### Opción A: Desde la UI de Evolution API
1. Accede a `http://TU_IP:8080`
2. Ve a tu instancia
3. Configura el webhook con:
   - **URL**: `http://TU_IP:5678/webhook/evolution-message`
   - **Events**: `MESSAGES_UPSERT` (o todos los eventos de mensajes)

### Opción B: Desde la API (Recomendado)
```bash
curl -X POST "http://TU_IP:8080/webhook/set/TU_INSTANCE_NAME" \
  -H "apikey: TU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://TU_IP:5678/webhook/evolution-message",
    "webhook_by_events": true,
    "events": ["MESSAGES_UPSERT"]
  }'
```

Reemplaza:
- `TU_IP`: Tu IP del servidor
- `TU_INSTANCE_NAME`: El nombre de tu instancia
- `TU_API_KEY`: La API key de `.env`

---

## 🔍 Endpoints de Evolution API

### Documentación Swagger
```
http://TU_IP:8080/docs
```

### Endpoints principales (según documentación oficial):

**Crear instancia:**
```
POST http://TU_IP:8080/instance/create
```

**Enviar mensaje:**
```
POST http://TU_IP:8080/message/sendText/{instanceName}
Headers: apikey: TU_API_KEY
Body: {
  "number": "5493791234567",
  "text": "Mensaje de prueba"
}
```

**Configurar webhook:**
```
POST http://TU_IP:8080/webhook/set/{instanceName}
Headers: apikey: TU_API_KEY
Body: {
  "url": "http://TU_IP:5678/webhook/evolution-message",
  "webhook_by_events": true,
  "events": ["MESSAGES_UPSERT"]
}
```

**Ver estado de instancia:**
```
GET http://TU_IP:8080/instance/fetchInstances
Headers: apikey: TU_API_KEY
```

---

## 🐛 Solución de Problemas

### Los servicios no arrancan
```bash
# Ver logs de error
docker compose logs

# Verificar que los puertos no estén ocupados
sudo netstat -tulpn | grep -E '8080|5678'

# Reiniciar servicios
docker compose restart
```

### n8n no carga
- Verifica que el puerto 5678 esté abierto en el firewall
- Revisa logs: `docker compose logs n8n`

### Evolution API no responde
- Verifica que el puerto 8080 esté abierto
- Revisa logs: `docker compose logs evolution`
- Verifica que PostgreSQL y Redis estén corriendo: `docker compose ps`

### Abrir puertos en firewall (Ubuntu)
```bash
sudo ufw allow 8080/tcp
sudo ufw allow 5678/tcp
sudo ufw reload
```

---

## 📚 Referencias

- [Evolution API GitHub](https://github.com/EvolutionAPI/evolution-api)
- [n8n Documentation](https://docs.n8n.io/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

---

## ✅ Checklist de Verificación

- [ ] Docker y docker-compose instalados
- [ ] Archivos copiados al servidor
- [ ] `.env` configurado con valores correctos
- [ ] Servicios levantados (`docker compose up -d`)
- [ ] Evolution API accesible en `http://TU_IP:8080`
- [ ] n8n accesible en `http://TU_IP:5678`
- [ ] Instancia de WhatsApp creada en Evolution API
- [ ] QR escaneado y conectado
- [ ] Workflow importado en n8n
- [ ] Variables del workflow configuradas
- [ ] Webhook configurado en Evolution API
- [ ] Prueba de mensaje enviada y recibida

---

**Listo! 🎉** Ahora tienes Evolution API + n8n corriendo y listos para conectar con tu backend.

