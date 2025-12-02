"""
Script para crear usuario dueño en la base de datos
Ejecutar: python crear_usuario_dueño.py
"""

import sys
import os
from sqlmodel import Session, select, create_engine
from passlib.context import CryptContext
from hotel import Usuario, Rol

# Configuración
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///hotel.db")
engine = create_engine(DATABASE_URL, echo=False)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def crear_usuario_dueño():
    """Crea un usuario dueño en la base de datos"""
    
    print("🔐 Creando usuario dueño...")
    print("-" * 50)
    
    # Solicitar datos
    email = input("📧 Email del dueño: ").strip()
    if not email:
        print("❌ El email es obligatorio")
        return
    
    contraseña = input("🔑 Contraseña: ").strip()
    if not contraseña:
        print("❌ La contraseña es obligatoria")
        return
    
    # Verificar si el usuario ya existe
    with Session(engine) as db:
        usuario_existente = db.exec(select(Usuario).where(Usuario.email == email)).first()
        if usuario_existente:
            print(f"⚠️  Ya existe un usuario con el email: {email}")
            respuesta = input("¿Deseas actualizar la contraseña? (s/n): ").strip().lower()
            if respuesta == 's':
                usuario_existente.contraseña = pwd_context.hash(contraseña)
                usuario_existente.rol = Rol.dueño
                db.add(usuario_existente)
                db.commit()
                print("✅ Usuario actualizado correctamente")
                print(f"   Email: {email}")
                print(f"   Rol: dueño")
            else:
                print("❌ Operación cancelada")
            return
        
        # Crear nuevo usuario
        hashed = pwd_context.hash(contraseña)
        usuario = Usuario(
            email=email,
            contraseña=hashed,
            rol=Rol.dueño
        )
        db.add(usuario)
        db.commit()
        db.refresh(usuario)
        
        print("✅ Usuario dueño creado exitosamente!")
        print("-" * 50)
        print(f"📧 Email: {email}")
        print(f"👑 Rol: dueño")
        print(f"🆔 ID: {usuario.id}")
        print("-" * 50)
        print("\n💡 Ahora puedes iniciar sesión con estas credenciales")
        print("   El dueño puede ver todas las estadísticas y gestionar todo el sistema")

if __name__ == "__main__":
    try:
        crear_usuario_dueño()
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

