import { SinConexion } from "@opai/ds";

import { ResumenSinConexion } from "./resumen";

export const metadata = { title: "Terreno sin conexión" };

/**
 * Arranque en frío de Terreno sin señal (CAR-78 · E1). El HTML de Terreno lleva nombres de personas y por eso
 * NO se precachea (ADR-044 R4); esta página neutra sí: no lleva datos de ninguna empresa ni de personas. Solo
 * lee del propio teléfono cuántos hechos están pendientes, sincronizados o rechazados, sin mostrar éxito que no
 * se pueda comprobar. Ruta pública (fuera del filtro de sesión de `proxy.ts`).
 */
export default function Pagina() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 p-6">
      <SinConexion />
      <ResumenSinConexion />
    </main>
  );
}
