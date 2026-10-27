import { SinConexion } from "@opai/ds";

import { Reintentar } from "./reintentar";

export const metadata = { title: "Sin conexión" };

/**
 * Página sin conexión (ADR-044, Brief 04). El service worker la precachea y la sirve cuando una
 * navegación falla por falta de red; no lleva datos de ningún tenant (§9). Ruta pública (fuera del
 * filtro de sesión de `proxy.ts`) para que esté siempre disponible, con o sin sesión.
 */
export default function Pagina() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center p-6">
      <SinConexion accion={<Reintentar />} />
    </main>
  );
}
