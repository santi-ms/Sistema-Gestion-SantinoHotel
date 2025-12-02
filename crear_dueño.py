"""
Script para crear usuario dueño directamente en Railway
Ejecutar: python crear_dueño.py
"""

import requests
import json

# URL del backend en Railway
API_URL = "https://hotel-santino-backend-production.up.railway.app"

def crear_usuario_dueño():
    """Crea un usuario dueño usando el endpoint /registro"""
    
    print("👑 Crear Usuario Dueño - Hotel Santino")
    print("=" * 50)
    
    # Solicitar datos
    email = input("📧 Email del dueño: ").strip()
    if not email:
        print("❌ El email es obligatorio")
        return
    
    contraseña = input("🔑 Contraseña: ").strip()
    if not contraseña:
        print("❌ La contraseña es obligatoria")
        return
    
    confirmar = input("🔑 Confirmar contraseña: ").strip()
    if contraseña != confirmar:
        print("❌ Las contraseñas no coinciden")
        return
    
    # Datos para enviar
    datos = {
        "email": email,
        "contraseña": contraseña,
        "rol": "dueño"
    }
    
    print("\n⏳ Creando usuario...")
    
    try:
        response = requests.post(
            f"{API_URL}/registro",
            json=datos,
            headers={"Content-Type": "application/json"}
        )
        
        if response.status_code == 200:
            print("\n✅ ¡Usuario dueño creado exitosamente!")
            print("=" * 50)
            print(f"📧 Email: {email}")
            print(f"👑 Rol: dueño")
            print("=" * 50)
            print("\n💡 Ahora puedes iniciar sesión en el frontend con estas credenciales")
            print("   El dueño tiene acceso completo a:")
            print("   - Panel del dueño con resumen del día")
            print("   - Analytics y estadísticas completas")
            print("   - Ver todas las reservas y pedidos")
            print("   - Gestionar habitaciones y clientes")
            print("   - Eliminar reservas (solo dueño)")
        else:
            error_data = response.json() if response.headers.get('content-type') == 'application/json' else response.text
            print(f"\n❌ Error al crear usuario: {response.status_code}")
            print(f"   Detalle: {error_data}")
            
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Error de conexión: {e}")
        print("   Verifica que el backend esté funcionando en Railway")

if __name__ == "__main__":
    crear_usuario_dueño()

