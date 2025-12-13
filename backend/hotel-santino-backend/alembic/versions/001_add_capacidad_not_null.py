"""Add NOT NULL constraint to capacidad and set defaults

Revision ID: 001_capacidad_not_null
Revises: 
Create Date: 2025-12-12 21:45:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_capacidad_not_null'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Migración para asegurar que capacidad sea NOT NULL.
    
    1. Primero actualiza las capacidades NULL usando el mapeo por número
    2. Luego agrega el constraint NOT NULL
    3. Finalmente agrega un CHECK constraint para validar el rango
    """
    
    # Mapeo de número de habitación a capacidad según reglas de negocio
    MAPEO_CAPACIDAD = {
        1: 5, 2: 5, 3: 5, 4: 5,  # Hab. 1-4: capacidad 5
        5: 4,                      # Hab. 5: capacidad 4
        6: 2, 11: 2,               # Hab. 6, 11: capacidad 2
        7: 6,                      # Hab. 7: capacidad 6
        8: 3, 9: 3,                # Hab. 8, 9: capacidad 3
        10: 7,                     # Hab. 10: capacidad 7
        12: 4, 13: 4, 14: 4, 15: 4 # Hab. 12-15: capacidad 4
    }
    
    # Paso 1: Actualizar capacidades NULL usando el mapeo
    for numero, capacidad in MAPEO_CAPACIDAD.items():
        op.execute(f"""
            UPDATE habitacion 
            SET capacidad = {capacidad} 
            WHERE numero = {numero} AND capacidad IS NULL
        """)
    
    # Paso 2: Para cualquier habitación que aún tenga NULL, usar capacidad 2 (default)
    op.execute("""
        UPDATE habitacion 
        SET capacidad = 2 
        WHERE capacidad IS NULL
    """)
    
    # Paso 3: Cambiar la columna para que sea NOT NULL
    # Para PostgreSQL
    op.execute("""
        ALTER TABLE habitacion 
        ALTER COLUMN capacidad SET NOT NULL
    """)
    
    # Paso 4: Agregar CHECK constraint para validar rango (1-7)
    op.execute("""
        ALTER TABLE habitacion 
        ADD CONSTRAINT check_capacidad_range 
        CHECK (capacidad >= 1 AND capacidad <= 7)
    """)


def downgrade() -> None:
    """
    Revertir los cambios de la migración.
    """
    # Eliminar CHECK constraint
    op.execute("""
        ALTER TABLE habitacion 
        DROP CONSTRAINT IF EXISTS check_capacidad_range
    """)
    
    # Permitir NULL nuevamente
    op.execute("""
        ALTER TABLE habitacion 
        ALTER COLUMN capacidad DROP NOT NULL
    """)


