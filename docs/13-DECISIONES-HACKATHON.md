# 13 · Decisiones del hackathon (14/11/2026)

Estas decisiones se tomaron al iniciar el evento y **prevalecen** sobre las propuestas de 03, 08 y 09. Lo que no se menciona aquí sigue como está en esos documentos.

## Decididas `[DECIDIDO]`

| Tema | Decisión | Reemplaza a |
| --- | --- | --- |
| Estado del evento | El hackathon **ya inició oficialmente**: se puede escribir código | Regla de "no código antes del inicio" en 00, 02, 09, 12 |
| Motor de simulación | **TypeScript en el navegador**, dentro de un **Web Worker** | "Navegador o servidor" `[EN EVENTO]` en 08 |
| Backend | **Python + FastAPI**: proxy y caché de APIs, cliente de datos, extras de Earthdata | Alternativas de 08 |
| Tipos compartidos | El backend publica OpenAPI; de ahí se genera el cliente TypeScript (`openapi-typescript`) | — |
| Polígono libre | **Entra al MVP** (dibujar la parcela y autogenerar la cuadrícula) | F1 "dibujo libre" `[EN EVENTO]` en 03 |
| Servidor | Droplet de DigitalOcean de **Eduardo Oropeza** (Ubuntu 24.04, 2 vCPU, 4 GB RAM, 50 GB, región SFO3). Eduardo lo configura | Despliegue Vercel/Render en 08 |
| Dominio | **No se compra dominio** | — |
| Repositorio | Git con ramas: `main`, `balam`, `Mompin`, `Mafer`, `Eduardo` | "Ramas por integrante" en 08, ahora con nombres |
| Documentación | Vive en el repo (`docs/`); Drive queda como respaldo del historial | Drive como fuente en 00 |
| Cronograma | Se mide en **esfuerzo de IA**, no en horas (ver 14) | Opciones A y B de 09 |

## Consecuencias técnicas

- **El Web Worker ayuda con el cálculo** (motor, percentiles, series de 20 años). No acelera la red ni el render 3D, que sigue en el hilo principal.
- Muchas peticiones a varias APIs: la caché y la cola con reintentos viven en el backend, no en el navegador.
- Con polígono libre el backend en vivo es obligatorio (clima y elevación dependen de la coordenada dibujada). Se mantiene además un **paquete de datos precargado** de la parcela demo para que la demo no dependa de la red.
- Los datasets de Earthdata (SMAP, GPM, MODIS) con `earthaccess` son viables solo en Python: es la razón principal de elegir FastAPI.

## Servidor sin dominio `[PROPUESTA]`

Sin dominio, un front en HTTPS no puede llamar a un backend en HTTP (bloqueo por *mixed content*). Opciones, de mejor a peor:

1. **`sslip.io`**: el nombre `64-23-143-102.sslip.io` resuelve a la IP del droplet y permite emitir certificado Let's Encrypt con nginx + Certbot. Sin comprar nada.
2. **Servir también el front desde el droplet** (nginx): mismo origen, sin mixed content ni CORS.
3. **Túnel** (Cloudflare Tunnel o Tailscale Funnel) si hay problemas con puertos.

Eduardo decide; recomendación: opción 1 para la API y opción 2 como respaldo de la demo.

Reglas para el servidor compartido: AgroHive va en su propio `server` block de nginx, usuario, puerto y servicio `systemd`; **no tocar** la configuración del proyecto `mediworks` que ya vive ahí. Abrir 80 y 443 en el firewall del droplet.

## Pendientes derivados `[VERIFICAR]`

| ID | Qué | Quién |
| --- | --- | --- |
| V-15 | Confirmar acceso SSH, usuario y firewall del droplet | Eduardo |
| V-16 | Qué servicios y puertos ya usa `mediworks` | Eduardo |
| V-17 | Elegir hostname (`sslip.io` u otro) y emitir certificado | Eduardo |
| V-18 | Asignación de roles R1 a R4 por nombre | Equipo |
| V-19 | Cultivos iniciales, ranking A o B, pintura por bloques (siguen `[EN EVENTO]`) | Equipo |
