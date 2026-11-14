"""Modelos de GET /api/smap (A4.8). Forma propuesta, a la espera de un contrato propio en contratos/ (solo lo edita Mompin)."""
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

from .modelos import Advertencia, Fuente, LonLat, Meta, SinNulos


class PaseSmap(SinNulos):
    pase: Literal["AM", "PM"]
    humedadM3M3: float | None = Field(default=None, ge=0, le=1)
    banderaCalidad: int | None = None


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
