import { type ReactNode, Suspense } from "react";

import { Loading } from "@opai/ds";

/** Suspense del portal: solo se ve en la carga inicial y con retraso de 150 ms; al navegar se conserva la página anterior
 * (el esqueleto de una navegación lenta lo pone el shell, ver `EstadoEnlace`). */
export function CargaPortal({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Loading diferido variante="lista" className="p-4 md:p-6" />}>
      {children}
    </Suspense>
  );
}
