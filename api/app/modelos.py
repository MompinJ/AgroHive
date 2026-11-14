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


# ---------------------------------------------------------------- suelo (contrato suelo)

class ValorNoEvaluable(BaseModel):
    estado: Literal["NO_EVALUABLE"] = "NO_EVALUABLE"
    motivo: str


class ProfundidadCm(BaseModel):
    desdeCm: float
    hastaCm: float


class FraccionesTextura(BaseModel):
    arena: float = Field(ge=0, le=100)
    limo: float = Field(ge=0, le=100)
    arcilla: float = Field(ge=0, le=100)


class Textura(SinNulos):
    estado: Estado
    etiqueta: Literal["SUPUESTO"] = "SUPUESTO"
    clase: str | None = None
    grupo: Literal["arenoso", "franco", "arcilloso"]
    fraccionesPct: FraccionesTextura | None = None
    fuente: Fuente | None = None


class PhEstimado(SinNulos):
    estado: Literal["EVALUABLE", "EXPLORATORIO", "RESPALDO_HISTORICO"]
    etiqueta: Literal["SUPUESTO"] = "SUPUESTO"
    valor: float = Field(ge=0, le=14)
    fuente: Fuente


class AguaSuelo(BaseModel):
    tawMmPorM: ValorNoEvaluable


class Suelo(SinNulos):
    """Textura y pH estimados con un mapa global. Siempre SUPUESTO: no es una medicion de la parcela."""
    meta: Meta
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]*$")
    etiqueta: Literal["SUPUESTO"] = "SUPUESTO"
    origen: Literal["mapa_global", "selector_manual"]
    aviso: str
    coordenada: LonLat | None = None
    profundidad: ProfundidadCm | None = None
    textura: Textura
    ph: PhEstimado | ValorNoEvaluable
    agua: AguaSuelo | None = None
    advertencias: list[Advertencia] = []


# ---------------------------------------------------------------- proxima temporada (contrato proxima-temporada)

class Rango(BaseModel):
    inferior: float | None
    superior: float | None


class MesAproximado(BaseModel):
    mes: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
    lluviaMm: Rango
    tMediaC: Rango
    climatologiaLluviaMm: float | None = None
    climatologiaTMediaC: float | None = None


class DefinicionBanda(BaseModel):
    percentilInferior: float
    percentilSuperior: float


class ProximaTemporada(BaseModel):
    """Rango aproximado por mes. No hay campo de cifra unica a proposito: no es una prediccion."""
    meta: Meta
    esPrediccion: Literal[False] = False
    estado: Literal["EXPLORATORIO", "ERROR_DATOS", "NO_EVALUABLE"]
    aviso: str
    metodo: Literal["anomalia_estacional", "respaldo_estadistico"]
    coordenada: LonLat
    emitido: date
    horizonteMeses: int = Field(ge=1, le=12)
    climatologia: Periodo | None = None
    banda: DefinicionBanda
    fuentes: list[Fuente] = Field(min_length=1)
    meses: list[MesAproximado]
    advertencias: list[Advertencia] = []
