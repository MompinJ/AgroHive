import bajio from './assets/lugares/bajio-guanajuato.jpg';
import sorriso from './assets/lugares/mato-grosso-sorriso.jpg';
import kenia from './assets/lugares/uasin-gishu-kenia.jpg';
import punjab from './assets/lugares/punjab-ludhiana.jpg';
import palencia from './assets/lugares/tierra-de-campos-palencia.jpg';
import iowa from './assets/lugares/iowa-story.jpg';
import creditos from './assets/lugares/creditos.json';

const imagenes: Record<string, { src: string; alt: string }> = {
  'bajio-guanajuato': { src: bajio, alt: 'Campos y cerro Culiacán vistos desde Jaral del Progreso, Guanajuato.' },
  'mato-grosso-sorriso': { src: sorriso, alt: 'Vista de la ciudad de Sorriso, Mato Grosso.' },
  'uasin-gishu-kenia': { src: kenia, alt: 'Campos de Uasin Gishu con la colina Sergoit al fondo.' },
  'punjab-ludhiana': { src: punjab, alt: 'Vista de Ludhiana, Punjab, al atardecer.' },
  'tierra-de-campos-palencia': { src: palencia, alt: 'Paisaje y castillo de Belmonte de Campos, Palencia.' },
  'iowa-story': { src: iowa, alt: 'Campos agrícolas del condado de Story, Iowa.' },
};

export const fotosEjemplos = creditos.map((credito) => ({ ...credito, ...imagenes[credito.id]! }));
export const fotoPorEjemplo = Object.fromEntries(fotosEjemplos.map((foto) => [foto.id, foto]));
