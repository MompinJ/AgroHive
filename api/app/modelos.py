"""Modelos de respuesta. Reflejan los contratos de contratos/ (solo los edita Mompin); si un campo no coincide, se pide el cambio."""
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, model_serializer

Estado = Literal["EVALUABLE", "NO_EVALUABLE", "EXPLORATORIO", "ERROR_DATOS", "RESPALDO_HISTORICO"]
LonLat = tuple[float, float]


class SinNulos(BaseModel):
    """Los contratos no admiten null en estos campos opcionales: se omiten en vez de enviarse vacios."""

    @model_serializer(mode="wrap")
    def _omitir_nulos(self, manejador):
        return {k: v for k, v in manejador(self).items() if v is not None}


class Meta(SinNulos):
    versionContrato: str
    esEjemplo: bool = False
    generado: datetime | None = None


class Periodo(BaseModel):
    desde: date
    hasta: date


class Fuente(SinNulos):
    nombre: str
    url: str | None = None
    coordenada: LonLat | None = None
    periodo: Periodo | None = None
    unidades: str | None = None
    consultado: date | None = None
    resolucion: str | None = None
    nota: str | None = None


class Advertencia(BaseModel):
    codigo: str = Field(pattern=r"^[A-Z][A-Z0-9_]*$")
    mensaje: str
    severidad: Literal["info", "aviso", "critico"]


class DiaClima(BaseModel):
    fecha: date
    lluviaMm: float | None
    tMaxC: float | None
    tMinC: float | None
    tMediaC: float | None = None
    radiacionMjM2Dia: float | None = None
    humedadRelativaPct: float | None = None
    vientoMS: float | None = None
    et0Mm: float | None = None


class SerieClima(BaseModel):
    """Serie diaria de un periodo, sin elegir escenario. El motor (A2.5) corta los anios de cada escenario."""
    meta: Meta
    estado: Estado
    respaldo: bool
    coordenada: LonLat
    fuente: Fuente
    diario: list[DiaClima]
    advertencias: list[Advertencia] = []


class CeldaEntrada(BaseModel):
    id: str = Field(pattern=r"^c-\d+-\d+$")
    i: int = Field(ge=0)
    j: int = Field(ge=0)
    centro: LonLat


class TerrenoEntrada(BaseModel):
    tamanoCeldaM: float = Field(gt=0)
    celdas: list[CeldaEntrada] = Field(min_length=1, max_length=1600)


class CeldaTerreno(BaseModel):
    id: str
    elevacionM: float | None
    pendientePct: float | None


class Terreno(BaseModel):
    estado: Estado
    fuente: Fuente


class TerrenoRespuesta(BaseModel):
    meta: Meta
    terreno: Terreno
    celdas: list[CeldaTerreno]
    advertencias: list[Advertencia] = []


class ErrorDatos(BaseModel):
    estado: Literal["ERROR_DATOS"] = "ERROR_DATOS"
    motivo: str
