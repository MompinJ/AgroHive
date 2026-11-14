from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from . import config, servicios
from .modelos import ErrorDatos
from .rutas import clima, cultivos, ndvi, proxima, smap, suelo, terreno

app = FastAPI(
    title="AgroHive API",
    version=config.VERSION_API,
    description="Proxy y cache de NASA POWER, Open-Meteo y elevacion. No simula ni rankea: el motor vive en el navegador.",
)
app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGENES, allow_methods=["GET", "POST"], allow_headers=["*"])
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.include_router(clima.router)
app.include_router(terreno.router)
app.include_router(cultivos.router)
app.include_router(suelo.router)
app.include_router(proxima.router)
app.include_router(ndvi.router)
app.include_router(smap.router)


@app.get("/health", tags=["salud"])
def health():
    return {"status": "ok", "servicio": "agrohive-api", "version": config.VERSION_API, "versionContrato": config.VERSION_CONTRATO, "commit": config.COMMIT}


@app.exception_handler(servicios.SinDatos)
async def sin_datos(_: Request, e: servicios.SinDatos):
    """Ni la fuente principal, ni el respaldo, ni la cache respondieron: 503 con el cuerpo ErrorDatos que declara el OpenAPI."""
    return JSONResponse(status_code=503, content=ErrorDatos(motivo=str(e)).model_dump())
