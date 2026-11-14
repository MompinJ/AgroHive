---
tipo: referencia
audiencia: todas
actualizado: 2026-11-14
fuente: A0.4, configurado por Eduardo con Claude
---

# Servidor (droplet de Eduardo)

URL pública: **https://64-23-143-102.sslip.io** (certificado de Let's Encrypt, vence 2027-02-12, renovación automática de certbot). Prueba: `GET /health` devuelve `{"status":"ok","servicio":"agrohive-api","version":"provisional"}`.

No hay contraseñas ni llaves en este vault ni en el repo. El acceso SSH lo tiene Eduardo; si necesitas desplegar, pídeselo.

## Qué hay en el droplet

| Cosa | Dónde |
| --- | --- |
| Usuario del sistema | `agrohive` (sin shell, sin sudo), carpeta `/opt/agrohive` |
| Clon del repo | `/opt/agrohive/repo` (rama `main`; se actualiza con `git pull` como `agrohive`) |
| Entorno de Python | `/opt/agrohive/venv` (fastapi, uvicorn) |
| Servicio | `agrohive-api.service` (systemd), uvicorn en `127.0.0.1:8010`, solo local |
| App provisional | `/opt/agrohive/stub/app.py`: solo `/health`, hasta que exista el FastAPI real (A1.3) |
| Variables de entorno | `/opt/agrohive/agrohive.env` (opcional, no existe aún; la lee el servicio) |
| nginx | `/etc/nginx/sites-available/agrohive`, enlazado en `sites-enabled`. 80 redirige a 443; 443 hace proxy a `:8010` |
| Certificado | `/etc/letsencrypt/live/agrohive/`, emitido con `certbot certonly --webroot`; la renovación recarga nginx |

Convivencia con `mediworks` (V-16): comparte nginx, certbot y el droplet. Usa `mediworks.mx` y el puerto 3000, con PostgreSQL en `127.0.0.1:5432`. AgroHive no tocó sus archivos; el puerto 8010 estaba libre. Se comprobó que `mediworks.mx` sigue respondiendo 200 después del cambio.

## Cómo se actualiza (para cuando exista `api/`)

1. Mompin integra a `main`.
2. Eduardo, en el droplet: `sudo -u agrohive git -C /opt/agrohive/repo pull`, instala dependencias en el venv y cambia el `ExecStart` del servicio para apuntar a `api/` en lugar de `stub/`. Luego `systemctl restart agrohive-api`.
3. Si el front se sirve desde nginx (opción 2 de `docs/13`), se agrega un `location /` con `root` al server block de AgroHive.

Logs: `journalctl -u agrohive-api`.

## Riesgos del droplet que ya existían (decide Eduardo)

- Acceso por SSH como `root` con contraseña y `ufw` inactivo.
- El puerto 3000 de `mediworks` escucha en todas las interfaces, sin pasar por nginx.
- Hay que cambiar la contraseña de root si se compartió por un chat, y pasar a llaves SSH.
- El certificado de AgroHive se pidió sin correo de contacto, así que Let's Encrypt no avisa si falla la renovación.
- `VERIFICAR` límites de emisión de Let's Encrypt para `sslip.io` (dominio compartido) si hay que volver a emitir.

Registro: V-15, V-16 y V-17 tienen ya evidencia; el equipo las cierra en `docs/11` y `docs/13`.
