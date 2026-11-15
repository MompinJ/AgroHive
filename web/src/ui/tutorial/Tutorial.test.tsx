import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Esquilote } from './Esquilote';
import { TarjetaTutorial } from './Tutorial';
import { TUTORIALES } from './pasos';

const noop = () => {};
const tarjeta = (paso: number, id: keyof typeof TUTORIALES = 'cultivos') =>
  renderToStaticMarkup(<TarjetaTutorial pasos={TUTORIALES[id]} paso={paso} onSiguiente={noop} onAnterior={noop} onCerrar={noop} />);

describe('tarjeta del tutorial', () => {
  it('muestra a Esquilote, el numero de paso y el texto del paso', () => {
    const html = tarjeta(0);
    expect(html).toContain('Esquilote · paso 1 de 5');
    expect(html).toContain(TUTORIALES.cultivos[0]!.titulo);
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="false"'); // no bloquea la pantalla
    expect(html).toContain('Saltar tutorial');
    expect(html).not.toContain('Anterior'); // en el primer paso no hay a donde volver
  });
  it('en el ultimo paso se puede cerrar y volver', () => {
    const ultimo = TUTORIALES.cultivos.length - 1;
    const html = tarjeta(ultimo);
    expect(html).toContain(`paso ${ultimo + 1} de ${ultimo + 1}`);
    expect(html).toContain('¡Entendido!');
    expect(html).toContain('Anterior');
    expect(html).toContain('>Cerrar<');
    expect(html).not.toContain('Saltar tutorial');
  });
  it('la mascota es decorativa para lectores de pantalla y solo saluda en el primer paso', () => {
    expect(renderToStaticMarkup(<Esquilote />)).toContain('aria-hidden="true"');
    expect(tarjeta(0)).toContain('esquilote-saluda');
    expect(tarjeta(1)).not.toContain('esquilote-saluda');
  });
  it('cada pantalla del flujo se puede renderizar completa', () => {
    for (const id of Object.keys(TUTORIALES) as (keyof typeof TUTORIALES)[]) {
      for (let k = 0; k < TUTORIALES[id].length; k++) expect(tarjeta(k, id)).toContain(TUTORIALES[id][k]!.titulo);
    }
  });
});
