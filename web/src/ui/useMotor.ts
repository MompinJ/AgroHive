import { useEffect, useState } from 'react';
import { crearClienteMotor } from '../motor/cliente';

export function useMotor() {
  const [estado, setEstado] = useState('Iniciando motor');
  useEffect(() => {
    let activo = true;
    let cliente: ReturnType<typeof crearClienteMotor> | undefined;
    const temporizador = window.setTimeout(() => {
      if (activo) {
        setEstado('El motor no respondió. Recarga para reintentar.');
        cliente?.terminar();
      }
    }, 10000);
    try {
      cliente = crearClienteMotor();
      void cliente.olvidar().then(() => {
        window.clearTimeout(temporizador);
        if (activo) setEstado('Motor disponible');
      }).catch(() => {
        window.clearTimeout(temporizador);
        if (activo) setEstado('No se pudo iniciar el motor. Recarga para reintentar.');
      });
    } catch {
      window.clearTimeout(temporizador);
      setEstado('No se pudo iniciar el motor. Recarga para reintentar.');
    }
    return () => {
      activo = false;
      window.clearTimeout(temporizador);
      cliente?.terminar();
    };
  }, []);
  return estado;
}
