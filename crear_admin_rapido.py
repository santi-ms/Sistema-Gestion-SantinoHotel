#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para crear la cuenta de administrador en el sistema.
Completar las variables antes de ejecutar.
"""
import urllib.request
import json

API_URL = "https://<TU_BACKEND_URL>/registro"  # Reemplazar con la URL de tu backend

datos = {
    "email": "",         # Completar con el email del administrador
    "contrasena": "",    # Completar con una contrasena segura
    "rol": "dueño"
}

if not datos["email"] or not datos["contrasena"]:
    print("Error: completar email y contrasena antes de ejecutar.")
    exit(1)

print("Creando cuenta de administrador...")

try:
    json_data = json.dumps(datos, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=json_data,
        headers={"Content-Type": "application/json; charset=utf-8"}
    )
    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode("utf-8"))
        print("Cuenta creada exitosamente.")
        print(f"Respuesta: {result}")

except urllib.error.HTTPError as e:
    print(f"Error HTTP {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")
