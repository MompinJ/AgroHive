import { describe, expect, it } from 'vitest';
import { navegar, TUTORIALES, tutorialDeRuta, type IdTutorial } from './pasos';

describe('tutorial de Esquilote', () => {
  it('cada pantalla del flujo tiene tutorial y el inicio no', () => {
    expect(tutorialDeRuta('/terreno')).toBe('terreno');
    expect(tutorialDeRuta('/laboratorio')).toBe('cultivos');
    expect(tutorialDeRuta('/escenarios')).toBe('escenarios');
    expect(tutorialDeRuta('/comparacion')).toBe('comparacion');
    expect(tutorialDeRuta('/')).toBeNull();
    expect(tutorialDeRuta('/metodo')).toBeNull();
    expect(tutorialDeRuta('/nada')).toBeNull();
  });
  it('todos los pasos tienen titulo y texto, y ninguno promete cosechas o ingresos', () => {
    for (const [id, pasos] of Object.entries(TUTORIALES)) {
      expect(pasos.length, id).toBeGreaterThanOrEqual(3);
      for (const p of pasos) {
        expect(p.titulo.trim().length, `${id}: titulo`).toBeGreaterThan(0);
        expect(p.texto.trim().length, `${id}: ${p.titulo}`).toBeGreaterThan(20);
        expect(`${p.titulo} ${p.texto}`).not.toMatch(/(garantiza|asegura|aumentar[aá]s?|ganar[aá]s?) .*(cosecha|ingreso|ganancia)/i);
      }
    }
  });
  it('avanza, retrocede sin pasar del primero y termina despues del ultimo', () => {
    const id: IdTutorial = 'cultivos';
    const total = TUTORIALES[id].length;
    let e = navegar({ id, paso: 0 }, 'anterior');
    expect(e).toEqual({ id, paso: 0 });
    for (let k = 1; k < total; k++) { e = navegar(e!, 'siguiente'); expect(e).toEqual({ id, paso: k }); }
    expect(navegar(e!, 'siguiente')).toBeNull();
    expect(navegar({ id, paso: 2 }, 'cerrar')).toBeNull();
    expect(navegar({ id, paso: 2 }, 'anterior')).toEqual({ id, paso: 1 });
  });
  it('los selectores a resaltar son cadenas de clase simples', () => {
    for (const pasos of Object.values(TUTORIALES)) for (const p of pasos) if (p.destacar) expect(p.destacar).toMatch(/^\.[a-z][a-z0-9-]*$/);
  });
});
