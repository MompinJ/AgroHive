"""Modelos de GET /api/ndvi. Reflejan contratos/ndvi.schema.json (solo lo edita Mompin); la prueba de conformidad lo comprueba."""
from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, model_serializer

from .modelos import Advertencia, Estado, Fuente, LonLat, Meta, Periodo, SinNulos

Limite = Literal["PIXEL_MAYOR_QUE_PARCELA", "NO_MUESTRA_CULTIVO_DEL_USUARIO", "NO_ENTRA_AL_RANKING"]


class ProductoNdvi(SinNulos):
    nombre: Literal["MOD13Q1"] = "MOD13Q1"
    banda: str = Field(min_length=1)
    pixelM: Literal[250] = 250
    compuestoDias: Literal[16] = 16
    escala: float = Field(gt=0)


class DatoNdvi(BaseModel):
    """Un compuesto de 16 dias. `ndvi` null (sin dato) siempre se envia; `motivo` y `calidad` se omiten si estan vacios."""
    fecha: date
    ndvi: float | None = Field(ge=-1, le=1)
    estado: Estado
    motivo: str | None = Field(default=None, min_length=1)
    calidad: int | None = None

    @model_serializer(mode="wrap")
    def _omitir(self, manejador):
        salida = manejador(self)
        for clave in ("motivo", "calidad"):
            if salida.get(clave) is None:
                salida.pop(clave, None)
        return salida


class Ndvi(SinNulos):
    """NDVI de MODIS en un punto: EVIDENCIA de los anios de escenario, no entra al ranking."""
    meta: Meta
    estado: Estado
    motivo: str | None = Field(default=None, min_length=1)
    aviso: str = Field(min_length=1)
    coordenada: LonLat
    periodo: Periodo
    producto: ProductoNdvi
    fuente: Fuente
    limites: list[Limite] = Field(min_length=3)
    serie: list[DatoNdvi]
    advertencias: list[Advertencia] = []
