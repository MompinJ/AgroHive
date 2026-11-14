# api/despliegue/

Configuracion del droplet (A0.4 y A4.7), para poder rehacerla. Sin secretos.

| Archivo | Va en el droplet como |
| --- | --- |
| `agrohive.nginx.conf` | `/etc/nginx/sites-available/agrohive` (enlazado en `sites-enabled`) |
| `agrohive-proxy.conf` | `/etc/nginx/agrohive-proxy.conf` |
| `desplegar-front.sh` | se corre en tu maquina: construye `web/` y sube `dist/` a `/var/www/agrohive-web` |

El servicio de la API (`agrohive-api.service`, uvicorn en `127.0.0.1:8010`) y el certificado estan descritos en `AgroVault/Compartido/Servidor.md`.

Antes de cambiar nginx: respaldar el archivo, probar con `nginx -t` y recargar solo si pasa. El bloque comparte nginx con `mediworks`: no editar el suyo.
