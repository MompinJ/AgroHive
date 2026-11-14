from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from . import config
from .rutas import clima, cultivos, suelo, terreno

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


@app.get("/health", tags=["salud"])
def health():
    return {"status": "ok", "servicio": "agrohive-api", "version": config.VERSION_API}
