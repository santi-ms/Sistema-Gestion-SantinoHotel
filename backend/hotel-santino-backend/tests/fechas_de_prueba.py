"""
Helper para que los fixtures guarden las fechas como las guarda producción.

Las columnas datetime de los modelos no declaran timezone. Al guardar un
datetime con offset -03:00, Postgres lo convierte a la zona de la sesión (UTC
en Render) y guarda ese valor. SQLite NO hace esa conversión: guarda la hora de
pared tal cual.

Es decir: los dos motores guardan cosas distintas para el mismo input. Un
fixture que escribe `datetime(..., tzinfo=ARGENTINA_TZ)` sobre SQLite NO
representa lo que hay en la base real, y un test así puede pasar con código que
en producción corre las fechas un día entero.

Por eso los fixtures escriben el valor ya convertido a UTC, con esta función.
"""
from datetime import datetime, timezone

from hotel import ARGENTINA_TZ


def momento_argentino(*args) -> datetime:
    """Lo que la base guarda para un instante dado en hora argentina.

    >>> momento_argentino(2026, 9, 13, 21, 27)
    datetime.datetime(2026, 9, 14, 0, 27)
    """
    return (
        datetime(*args, tzinfo=ARGENTINA_TZ)
        .astimezone(timezone.utc)
        .replace(tzinfo=None)
    )
