// Mini marca de problema en la seccion de un cultivo: una por grupo de celdas de la misma planta, no una por celda.
// El texto (cuantas celdas y de que tipo) va en el titulo y en la etiqueta para lectores de pantalla.
import { NOMBRE_GRAVEDAD, textoProblema, type ProblemaCultivo } from './problemas';

export function MarcaProblema({ problema, nombre }: { problema: ProblemaCultivo; nombre: string }) {
  const texto = textoProblema(problema, nombre);
  return <span className={`marca-problema marca-${problema.gravedad}`} role="img" aria-label={`${NOMBRE_GRAVEDAD[problema.gravedad]}. ${texto}`} title={texto}>
    <span aria-hidden="true">!</span>
  </span>;
}
