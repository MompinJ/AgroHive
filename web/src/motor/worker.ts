// Web Worker del motor (doc 13): recibe Peticion y responde Respuesta (protocolo.ts). Sin dependencias de UI.
import { EstadoMotor, type Peticion } from './protocolo';

const estado = new EstadoMotor();
const contexto = self as unknown as { postMessage(m: unknown): void; onmessage: ((ev: MessageEvent<Peticion>) => void) | null };

contexto.onmessage = (ev) => {
  contexto.postMessage(estado.atender(ev.data));
};
