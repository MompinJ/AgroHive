"""Modelos de GET /api/plagas. Reflejan contratos/plagas.schema.json (0.15.0); la prueba de conformidad lo comprueba."""
from typing import Literal

from pydantic import BaseModel, Field, model_serializer

from .modelos import Advertencia, Estado, Fuente, LonLat, Meta, Periodo, SinNulos

TipoVisual = Literal["chapulin", "gusano", "mosca", "escarabajo", "pulgon"]


class Plaga(BaseModel):
    """Una plaga de la tabla: presencia en la region segun GBIF. `registros` y `ultimoAnio` null siempre se envian; `motivo` se omite vacio."""
    id: str = Field(pattern=r"^[a-z][a-z0-9_]*$")
    nombreComun: str = Field(min_length=1)
    nombreCientifico: str = Field(min_length=1)
    tipoVisual: TipoVisual
    taxonKey: int = Field(ge=1)
    estado: Literal["presente", "sin_registros", "NO_EVALUABLE"]
    motivo: str | None = Field(default=None, min_length=1)
    registros: int | None = Field(ge=0)
    ultimoAnio: int | None = Field(ge=1800)
    cultivos: list[str]
    fuenteHospederos: Fuente

    @model_serializer(mode="wrap")
    def _omitir(self, manejador):
        salida = manejador(self)
        if salida.get("motivo") is None:
            salida.pop("motivo", None)
        return salida


class Plagas(SinNulos):
    """Plagas registradas en la region: evidencia de presencia, no pronostico de dano. No entra al motor ni al ranking."""
    meta: Meta
    estado: Estado
    motivo: str | None = Field(default=None, min_length=1)
    aviso: str = Field(min_length=1)
    coordenada: LonLat
    radioGrados: float = Field(gt=0, le=5)
    periodo: Periodo
    fuente: Fuente
    plagas: list[Plaga]
    advertencias: list[Advertencia] = []
