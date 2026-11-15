import bajio from './assets/lugares/bajio-guanajuato.jpg';
import sorriso from './assets/lugares/mato-grosso-sorriso.jpg';
import kenia from './assets/lugares/uasin-gishu-kenia.jpg';
import punjab from './assets/lugares/punjab-ludhiana.jpg';
import palencia from './assets/lugares/tierra-de-campos-palencia.jpg';
import iowa from './assets/lugares/iowa-story.jpg';
import creditos from './assets/lugares/creditos.json';
import type { ClaveTexto } from './i18n/diccionarios';

const imagenes: Record<string, { src: string; altClave: ClaveTexto }> = {
  'bajio-guanajuato': { src: bajio, altClave: 'terreno.fotoBajio' },
  'mato-grosso-sorriso': { src: sorriso, altClave: 'terreno.fotoSorriso' },
  'uasin-gishu-kenia': { src: kenia, altClave: 'terreno.fotoKenia' },
  'punjab-ludhiana': { src: punjab, altClave: 'terreno.fotoPunjab' },
  'tierra-de-campos-palencia': { src: palencia, altClave: 'terreno.fotoPalencia' },
  'iowa-story': { src: iowa, altClave: 'terreno.fotoIowa' },
};

export const fotosEjemplos = creditos.map((credito) => ({ ...credito, ...imagenes[credito.id]! }));
export const fotoPorEjemplo = Object.fromEntries(fotosEjemplos.map((foto) => [foto.id, foto]));
