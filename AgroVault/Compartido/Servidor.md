---
tipo: referencia
audiencia: todas
actualizado: 2026-11-14
fuente: A0.4, configurado por Eduardo con Claude
---

# Servidor (droplet de Eduardo)

URL pública: **https://64-23-143-102.sslip.io** (certificado de Let's Encrypt, vence 2027-02-12, renovación automática de certbot). Prueba: `GET /health` devuelve `{"status":"ok","servicio":"agrohive-api","version":"0.1.0","versionContrato":"0.12.2","commit":"23f8a53"}` (consultado el 14/11 a las 18:04). Desde A1.3 el servicio corre la API real de `api/` (clima, elevación, suelo, cultivos).

No hay contraseñas ni llaves en este vault ni en el repo. El acceso SSH lo tiene Eduardo; si necesitas desplegar, pídeselo.

## Qué hay en el droplet

| Cosa | Dónde |
| --- | --- |
| Usuario del sistema | `agrohive` (sin shell, sin sudo), carpeta `/opt/agrohive` |
| Clon del repo | `/opt/agrohive/repo`, rama `main`. El último despliegue anotado en `docs/01` es el commit `23f8a53` (`/health` con `versionContrato` 0.12.2). Lo que entre a `main` después no está en el droplet hasta que Eduardo despliegue |
| Entorno de Python | `/opt/agrohive/venv` (fastapi, uvicorn) |
| Servicio | `agrohive-api.service` (systemd), uvicorn en `127.0.0.1:8010`, solo local |
| App | `ExecStart` apunta a `app.main:app` con `WorkingDirectory=/opt/agrohive/repo/api`. El `stub/app.py` provisional ya no se usa |
| Caché de datos | `/opt/agrohive/cache` (clima, tiles y suelo; se puede borrar sin riesgo) |
| Variables de entorno | `/opt/agrohive/agrohive.env` (`AGROHIVE_CACHE_DIR`, `AGROHIVE_CATALOGOS_DIR`, `AGROHIVE_CORS_ORIGINS`; sin secretos) |
| nginx | `/etc/nginx/sites-available/agrohive`, enlazado en `sites-enabled`. 80 redirige a 443. En 443: `/api/`, `/health`, `/docs` y `/openapi.json` van a la API (`:8010`); el resto sirve el front desde `/var/www/agrohive-web`. Copia de la configuración en `api/despliegue/` |
| Certificado | `/etc/letsencrypt/live/agrohive/`, emitido con `certbot certonly --webroot`; la renovación recarga nginx |

Convivencia con `mediworks` (V-16): comparte nginx, certbot y el droplet. Usa `mediworks.mx` y el puerto 3000, con PostgreSQL en `127.0.0.1:5432`. AgroHive no tocó sus archivos; el puerto 8010 estaba libre. Se comprobó que `mediworks.mx` sigue respondiendo 200 después del cambio.

## Cómo se actualiza

1. Lo que entra a `main` en GitHub no llega solo al servidor: Eduardo lo despliega.
2. En el droplet: `sudo -u agrohive git -C /opt/agrohive/repo pull`, luego `sudo -u agrohive /opt/agrohive/venv/bin/pip install -r /opt/agrohive/repo/api/requirements.txt` y `systemctl restart agrohive-api`.
3. El atajo en el droplet, como root, es `bash /opt/agrohive/repo/api/despliegue/actualizar-servidor.sh`: deja API y front en `origin/main`. El 14/11 noche dejo `23f8a53` y publico el front. Tambien se puede subir solo el front con `SERVIDOR=root@64.23.143.102 sh api/despliegue/desplegar-front.sh`. Una sola sesión despliega, y lo anuncia antes por el buzón. No hace falta `EARTHDATA_TOKEN` para el resto de la API; sin él, `/api/smap` responde 503.
4. Comprobar `https://64-23-143-102.sslip.io/health` (trae `commit` y `versionContrato`: ahi se ve que version corre), `/api/cultivos` y `https://mediworks.mx/` (debe seguir en 200).

Logs: `journalctl -u agrohive-api`.

## Riesgos del droplet que ya existían (decide Eduardo)

- Acceso por SSH como `root` con contraseña y `ufw` inactivo.
- El puerto 3000 de `mediworks` escucha en todas las interfaces, sin pasar por nginx.
- Hay que cambiar la contraseña de root si se compartió por un chat, y pasar a llaves SSH.
- El certificado de AgroHive se pidió sin correo de contacto, así que Let's Encrypt no avisa si falla la renovación.
- `VERIFICAR` límites de emisión de Let's Encrypt para `sslip.io` (dominio compartido) si hay que volver a emitir.

Registro: V-15, V-16 y V-17 están cerradas en `docs/13`.
