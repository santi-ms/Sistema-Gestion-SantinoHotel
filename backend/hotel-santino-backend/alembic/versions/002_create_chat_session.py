"""Create chat_session table

Revision ID: 002_create_chat_session
Revises: 001_capacidad_not_null
Create Date: 2025-12-12 22:00:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002_create_chat_session'
down_revision: Union[str, None] = '001_capacidad_not_null'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Crea la tabla chat_session para el bot de WhatsApp.
    """
    op.create_table(
        'chatsession',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('phone', sa.String(), nullable=False),
        sa.Column('estado', sa.String(), nullable=False),
        sa.Column('checkin', sa.String(), nullable=True),
        sa.Column('checkout', sa.String(), nullable=True),
        sa.Column('personas', sa.Integer(), nullable=True),
        sa.Column('mascota', sa.Boolean(), nullable=True),
        sa.Column('reserva_id', sa.Integer(), nullable=True),
        sa.Column('bot_pausado', sa.Boolean(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Crear índice único en phone
    op.create_index('ix_chatsession_phone', 'chatsession', ['phone'], unique=True)
    
    # Crear índice en estado (para queries rápidas)
    op.create_index('ix_chatsession_estado', 'chatsession', ['estado'], unique=False)


def downgrade() -> None:
    """
    Elimina la tabla chat_session.
    """
    op.drop_index('ix_chatsession_estado', table_name='chatsession')
    op.drop_index('ix_chatsession_phone', table_name='chatsession')
    op.drop_table('chatsession')

