import type { ReactNode } from "react";

import { Alerta, SeccionTarjeta } from "@opai/ds";

/**
 * Estados de una sección de la ficha (CAR-124, export ficha-persona v1 «Secciones»): sin permiso y error ya no
 * dejan la tarjeta en blanco; el vacío invita a agregar el dato si se puede editar.
 */
export function SeccionSinAcceso({ titulo }: { titulo: string }) {
  return (
    <SeccionTarjeta titulo={titulo}>
      <Alerta tono="neutral" titulo="Sin acceso a esta sección">
        Tu rol no puede ver estos datos. Pídele acceso al administrador de tu empresa.
      </Alerta>
    </SeccionTarjeta>
  );
}

export function SeccionError({ titulo, que }: { titulo: string; que: string }) {
  return (
    <SeccionTarjeta titulo={titulo}>
      <Alerta tono="danger" titulo={`No pudimos cargar ${que}`}>
        Recarga la página. Si el problema sigue, avisa a soporte.
      </Alerta>
    </SeccionTarjeta>
  );
}

/** Texto del vacío: qué falta y, si puede editar, con qué botón agregarlo. */
export function VacioSeccion({ texto, accion }: { texto: string; accion?: string | null }) {
  return (
    <p className="t-caption mb-3">
      {texto}
      {accion ? ` Usa «${accion}» para agregarlo.` : ""}
    </p>
  );
}

/** Ancla para los enlaces «Ir a …» del Resumen. */
export function Ancla({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div id={id} className="min-w-0 scroll-mt-24">
      {children}
    </div>
  );
}

/** Algún valor registrado (para decidir el vacío). */
export const conDatos = (...valores: unknown[]) =>
  valores.some((v) => v !== null && v !== undefined && v !== "" && v !== false);
