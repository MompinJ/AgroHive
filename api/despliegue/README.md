# api/despliegue/

Configuracion del droplet (A0.4 y A4.7), para poder rehacerla. Sin secretos.

| Archivo | Va en el droplet como |
| --- | --- |
| `agrohive.nginx.conf` | `/etc/nginx/sites-available/agrohive` (enlazado en `sites-enabled`) |
| `agrohive-proxy.conf` | `/etc/nginx/agrohive-proxy.conf` |
| `actualizar-servidor.sh` | se corre **en el droplet**, como root: actualiza API y front a `origin/main` con un solo comando y verifica. Probado de punta a punta el 14/11 noche: dejo `main` en `23f8a53`, API activa y front publicado |
| `desplegar-front.sh` | se corre en tu maquina: construye `web/` y sube `dist/` a `/var/www/agrohive-web` |

El servicio de la API (`agrohive-api.service`, uvicorn en `127.0.0.1:8010`) y el certificado estan descritos en `AgroVault/Compartido/Servidor.md`.

Antes de cambiar nginx: respaldar el archivo, probar con `nginx -t` y recargar solo si pasa. El bloque comparte nginx con `mediworks`: no editar el suyo.
