"""Modelos de GET /api/ee-uu/cdl y /api/ee-uu/ssurgo (A4.12). Siguen la propuesta api/propuestas-contrato/ee-uu.schema.json hasta que Mompin
la pase a contratos/; la prueba de conformidad valida contra esa propuesta."""
from typing import Literal

from pydantic import BaseModel, Field

from .modelos import Advertencia, Estado, Fuente, LonLat, Meta, SinNulos

CultivoCatalogo = Literal["maiz", "frijol", "calabaza", "chile"]


class AnioCdl(BaseModel):
    anio: int
    codigo: int | None
    categoria: str | None
    cultivoCatalogo: CultivoCatalogo | None
    estado: Estado
    motivo: str | None = None


class Cdl(SinNulos):
    meta: Meta
    estado: Estado
    motivo: str | None = Field(default=None, min_length=1)
    aviso: str = Field(min_length=1)
    coordenada: LonLat
    anioDesde: int
    anioHasta: int
    fuente: Fuente
    limites: list[str] = Field(min_length=1)
    anios: list[AnioCdl]
    advertencias: list[Advertencia] = []


class UnidadSsurgo(BaseModel):
    mukey: str
    nombre: str


class ComponenteSsurgo(SinNulos):
    nombre: str
    porcentaje: float | None = None
    grupoHidrologico: str | None = None


class RangoCm(BaseModel):
    desde: int = Field(ge=0)
    hasta: int = Field(ge=0)


class HorizonteSsurgo(BaseModel):
    nombre: str | None
    profundidadCm: RangoCm
    arenaPct: float | None = Field(ge=0, le=100)
    limoPct: float | None = Field(ge=0, le=100)
    arcillaPct: float | None = Field(ge=0, le=100)
    materiaOrganicaPct: float | None = Field(ge=0, le=100)
    awcCmCm: float | None = Field(ge=0, le=1)


class AguaSsurgo(BaseModel):
    estado: Estado
    tawMm: float | None
    profundidadCubiertaCm: int
    hastaCm: int
    metodo: str


class Ssurgo(SinNulos):
    meta: Meta
    estado: Estado
    motivo: str | None = Field(default=None, min_length=1)
    aviso: str = Field(min_length=1)
    coordenada: LonLat
    fuente: Fuente
    limites: list[str] = Field(min_length=1)
    unidad: UnidadSsurgo | None = None
    componente: ComponenteSsurgo | None = None
    horizontes: list[HorizonteSsurgo]
    agua: AguaSsurgo | None = None
    advertencias: list[Advertencia] = []
