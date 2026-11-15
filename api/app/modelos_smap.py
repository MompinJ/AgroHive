"""Modelos de GET /api/smap (A4.8). Forma propuesta, a la espera de un contrato propio en contratos/ (solo lo edita Mompin)."""
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

from .modelos import Advertencia, Fuente, LonLat, Meta, SinNulos


def clasificar_calidad(bandera: int | None) -> Literal["alta", "baja", "desconocida"]:
    """Interpreta retrieval_qual_flag (contrato smap 0.12.0): alta si vale 0 u 8; baja si el bit 0 esta en 1; desconocida si no hay bandera o vale otra cosa.
    Fuente: guia de usuario de SMAP L3 V009 (O'Neill et al., 2023, doi:10.5067/4XXOGX0OOW1S), Tabla 6 y p. 14: 'a retrieval_qual_flag value of either 0 or 8
    indicates high-quality retrievals' (8 porque un fallo del estado congelado/descongelado no afecta la humedad); bit 0 en 1 = calidad no recomendada."""
    if bandera is None:
        return "desconocida"
    if bandera in (0, 8):
        return "alta"
    if bandera & 1:
        return "baja"
    return "desconocida"


class PaseSmap(SinNulos):
    pase: Literal["AM", "PM"]
    humedadM3M3: float | None = Field(default=None, ge=0, le=1)
    banderaCalidad: int | None = None
    calidad: Literal["alta", "baja", "desconocida"] | None = None


class DiaSmap(SinNulos):
    fecha: date
    estado: Literal["EVALUABLE", "NO_EVALUABLE", "ERROR_DATOS"]
    motivo: str | None = None
    granulo: str | None = None
    pases: list[PaseSmap] = []
    humedadM3M3: float | None = Field(default=None, ge=0, le=1)  # media de los pases con dato; None si ninguno


class ProfundidadSmap(BaseModel):
    desde: float = Field(ge=0)
    hasta: float = Field(gt=0)


class ProductoSmap(SinNulos):
    nombre: str
    resolucionKm: Literal[36, 9]
    profundidadCm: ProfundidadSmap | None = None
    unidad: Literal["m3/m3"] | None = None


class CeldaSmap(BaseModel):
    fila: int
    columna: int
    centro: LonLat


class Smap(SinNulos):
    """Humedad del suelo superficial de SMAP en la celda de 36 km del punto. Contraste: nunca es una medicion de la parcela."""
    meta: Meta
    estado: Literal["EVALUABLE", "NO_EVALUABLE"]
    etiqueta: Literal["SUPUESTO"]
    aviso: str
    coordenada: LonLat
    producto: ProductoSmap | None = None
    celda: CeldaSmap | None = None
    fuente: Fuente
    dias: list[DiaSmap]
    advertencias: list[Advertencia] = []
