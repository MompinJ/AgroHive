"""Modelos de GET /api/ndvi (A4.11). Siguen contratos/ndvi.schema.json (solo lo edita Mompin)."""
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, model_serializer

from .modelos import Advertencia, Estado, Fuente, LonLat, Meta, Periodo, SinNulos

Limite = Literal["PIXEL_MAYOR_QUE_PARCELA", "NO_MUESTRA_CULTIVO_DEL_USUARIO", "NO_ENTRA_AL_RANKING"]


class ProductoNdvi(SinNulos):
    nombre: Literal["MOD13Q1"]
    version: str | None = None
    banda: str
    pixelM: Literal[250]
    compuestoDias: Literal[16]
    escala: float = Field(gt=0)


class DatoNdvi(BaseModel):
    """Un compuesto de 16 dias. 'ndvi' va siempre (null sin dato, nunca 0); motivo y calidad solo si existen."""
    fecha: date
    ndvi: float | None = Field(ge=-1, le=1)
    estado: Estado
    motivo: str | None = None
    calidad: int | None = None

    @model_serializer(mode="wrap")
    def _omitir_nulos_salvo_ndvi(self, manejador):
        return {k: v for k, v in manejador(self).items() if v is not None or k == "ndvi"}


class Ndvi(SinNulos):
    """NDVI de MODIS en el pixel del punto. Evidencia de los anios de escenario: no entra al ranking ni al balance."""
    meta: Meta
    estado: Estado
    motivo: str | None = None
    aviso: str
    coordenada: LonLat
    periodo: Periodo
    producto: ProductoNdvi
    fuente: Fuente
    limites: list[Limite]
    serie: list[DatoNdvi]
    advertencias: list[Advertencia] = []
