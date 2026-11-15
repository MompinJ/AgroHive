"""Modelos de respuesta. Reflejan los contratos de contratos/ (solo los edita Mompin); si un campo no coincide, se pide el cambio."""
from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_serializer

Estado = Literal["EVALUABLE", "NO_EVALUABLE", "EXPLORATORIO", "ERROR_DATOS", "RESPALDO_HISTORICO"]
LonLat = tuple[float, float]


class SinNulos(BaseModel):
    """Los contratos no admiten null en estos campos opcionales: se omiten en vez de enviarse vacios."""

    @model_serializer(mode="wrap")
    def _omitir_nulos(self, manejador):
        return {k: v for k, v in manejador(self).items() if v is not None}


class Meta(SinNulos):
    versionContrato: str
    esEjemplo: bool
    generado: datetime | None = None


class Periodo(BaseModel):
    desde: date
    hasta: date


class Fuente(SinNulos):
    nombre: str
    url: str | None = None
    coordenada: LonLat | None = None
    periodo: Periodo | None = None
    cita: str | None = None
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
    humedadRaizFraccionSat: float | None = Field(default=None, ge=0, le=1)


class HumedadSuelo(SinNulos):
    """De donde sale humedadRaizFraccionSat y para que se usa (V-06)."""
    variable: Literal["GWETROOT"]
    definicion: str
    profundidadCm: float | None = Field(default=None, gt=0)
    fuente: "Fuente"
    uso: list[Literal["condicion_inicial", "comparacion"]] = Field(min_length=1)


class DiaLluviaSatelital(BaseModel):
    """Un dia de IMERG. `lluviaMm` null = sin dato (relleno de POWER); el campo siempre se envia."""
    fecha: date
    lluviaMm: float | None = Field(ge=0)


class LluviaSatelital(SinNulos):
    """Lluvia GPM IMERG via POWER: EVIDENCIA, no entra al balance ni a la eleccion de escenarios (contrato clima-escenario, 0.10.0)."""
    variable: Literal["IMERG_PRECTOT"]
    estandarHora: Literal["UTC"]
    fuente: "Fuente"
    dias: list[DiaLluviaSatelital]


class SerieClima(SinNulos):
    """Serie diaria de un periodo, sin elegir escenario. El motor (A2.5) corta los anios de cada escenario."""
    meta: Meta
    estado: Estado
    respaldo: bool
    coordenada: LonLat
    fuente: Fuente
    diario: list[DiaClima]
    humedadSuelo: HumedadSuelo | None = None
    lluviaSatelital: LluviaSatelital | None = None
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


ClaseTextura = Literal["arena", "arena_franca", "franco_arenoso", "franco", "franco_limoso", "limo", "franco_arcillo_arenoso", "franco_arcilloso", "franco_arcillo_limoso", "arcillo_arenoso", "arcillo_limoso", "arcilla"]


class Textura(SinNulos):
    estado: Estado
    etiqueta: Literal["SUPUESTO"]
    clase: ClaseTextura | None = None
    grupo: Literal["arenoso", "franco", "arcilloso"]
    fraccionesPct: FraccionesTextura | None = None
    fuente: Fuente | None = None


class PhEstimado(SinNulos):
    estado: Literal["EVALUABLE", "EXPLORATORIO", "RESPALDO_HISTORICO"]
    etiqueta: Literal["SUPUESTO"]
    valor: float = Field(ge=0, le=14)
    fuente: Fuente


class ValorEvaluable(SinNulos):
    estado: Literal["EVALUABLE"] = "EVALUABLE"
    valor: float
    unidad: str
    fuente: Fuente
    etiqueta: Literal["FUENTE", "SUPUESTO", "USUARIO"] | None = None


class EntradasPedotransferencia(BaseModel):
    """Entradas de Saxton y Rawls (2006) y de que estimacion salen; cada una con su fuente."""
    estimacionId: str = Field(min_length=1)
    arenaPct: "ValorEvaluable | ValorNoEvaluable"
    arcillaPct: "ValorEvaluable | ValorNoEvaluable"
    materiaOrganicaPct: "ValorEvaluable | ValorNoEvaluable"


class MetodoTaw(SinNulos):
    metodo: Literal["tabla_fao56", "pedotransferencia_saxton_rawls_2006"]
    fuente: Fuente
    etiqueta: Literal["SUPUESTO"] | None = None  # obligatoria en el contrato si el metodo es la pedotransferencia
    entradas: EntradasPedotransferencia | None = None


class RetencionAgua(BaseModel):
    """Contenidos de agua (m3/m3); sirven para pasar la humedad de POWER (fraccion de saturacion) a fraccion de TAW."""
    thetaSatM3M3: "ValorEvaluable | ValorNoEvaluable"
    thetaFcM3M3: "ValorEvaluable | ValorNoEvaluable"
    thetaWpM3M3: "ValorEvaluable | ValorNoEvaluable"


class AguaSuelo(SinNulos):
    tawMmPorM: ValorEvaluable | ValorNoEvaluable
    metodoTaw: MetodoTaw | None = None  # obligatorio en el contrato si el TAW es EVALUABLE
    retencion: RetencionAgua | None = None


class TexturaEstimada(BaseModel):
    clase: ClaseTextura | None
    fraccionesPct: FraccionesTextura


class EstimacionSuelo(SinNulos):
    """Lo que devolvio un servicio de suelo para la coordenada (para comparar ISRIC y OpenLandMap, V-23)."""
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]*$")
    servicio: Literal["isric_soilgrids_wcs", "openlandmap"]
    estado: Estado
    fuente: Fuente
    profundidad: ProfundidadCm | None = None
    textura: TexturaEstimada
    ph: float | None = Field(ge=0, le=14)
    carbonoOrganicoGKg: float | None = Field(default=None, ge=0)
    motivo: str | None = None


class Suelo(SinNulos):
    """Textura y pH estimados con un mapa global. Siempre SUPUESTO: no es una medicion de la parcela."""
    meta: Meta
    id: str = Field(pattern=r"^[a-z0-9][a-z0-9-]*$")
    etiqueta: Literal["SUPUESTO"]
    origen: Literal["mapa_global", "selector_manual"]
    aviso: str
    coordenada: LonLat | None = None
    profundidad: ProfundidadCm | None = None
    textura: Textura
    ph: PhEstimado | ValorNoEvaluable
    estimaciones: list[EstimacionSuelo] | None = None
    estimacionUsada: str | None = None
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


class CultivoCatalogo(BaseModel):
    """Un cultivo de contratos/cultivo.schema.json. Pasa tal cual (lo valida el contrato en las pruebas); se declara el campo
    nuevo de 0.16.0 para que quede en OpenAPI y en el cliente generado."""
    model_config = ConfigDict(extra="allow")
    # 0.16.0: nombre comun en ingles, opcional (catalogos viejos sin el campo siguen siendo validos; sin el, se omite).
    nombreComunEn: str | None = Field(default=None, min_length=1)


class CatalogoCultivos(BaseModel):
    """Catalogo de datos/catalogos/cultivos.json (A1.5). Cada cultivo cumple contratos/cultivo.schema.json; sin catalogo, 503 (H-B8)."""
    model_config = ConfigDict(extra="allow")  # meta y versionCatalogo del archivo pasan tal cual
    cultivos: list[CultivoCatalogo]
