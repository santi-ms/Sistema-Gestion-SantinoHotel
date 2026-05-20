"""
Script para crear usuarios (dueño o empleado) en la base de datos.
Ejecutar: python crear_usuario.py
"""

import sys
import os
from sqlmodel import Session, select, create_engine
from passlib.context import CryptContext
from hotel import Usuario, Rol

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///hotel.db")
engine = create_engine(DATABASE_URL, echo=False)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def crear_usuario():
    print("🔐 Crear usuario")
    print("-" * 50)

    print("¿Qué rol querés crear?")
    print("  1) dueño")
    print("  2) empleado")
    opcion = input("Opción (1/2): ").strip()
    if opcion == "1":
        rol = Rol.dueño
    elif opcion == "2":
        rol = Rol.empleado
    else:
        print("❌ Opción inválida")
        return

    email = input("📧 Email: ").strip()
    if not email:
        print("❌ El email es obligatorio")
        return

    contraseña = input("🔑 Contraseña: ").strip()
    if not contraseña:
        print("❌ La contraseña es obligatoria")
        return

    with Session(engine) as db:
        existente = db.exec(select(Usuario).where(Usuario.email == email)).first()
        if existente:
            print(f"⚠️  Ya existe un usuario con el email: {email}")
            resp = input("¿Actualizar contraseña y rol? (s/n): ").strip().lower()
            if resp == "s":
                existente.contraseña = pwd_context.hash(contraseña)
                existente.rol = rol
                db.add(existente)
                db.commit()
                print(f"✅ Usuario actualizado  |  email={email}  rol={rol.value}")
            else:
                print("❌ Operación cancelada")
            return

        usuario = Usuario(
            email=email,
            contraseña=pwd_context.hash(contraseña),
            rol=rol,
        )
        db.add(usuario)
        db.commit()
        db.refresh(usuario)

        print("-" * 50)
        print(f"✅ Usuario creado  |  id={usuario.id}  email={email}  rol={rol.value}")


if __name__ == "__main__":
    try:
        crear_usuario()
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
