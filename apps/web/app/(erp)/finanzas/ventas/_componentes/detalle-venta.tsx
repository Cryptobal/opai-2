import { notFound } from "next/navigation";

import type { cargarFichaVenta } from "./ficha-datos";
import { FichaVenta } from "./ficha-venta";

/** Panel derecho: espera la ficha dentro de su propio Suspense, así la lista no se vuelve a esperar. */
export async function DetalleVenta({ datos, editar }: { datos: ReturnType<typeof cargarFichaVenta>; editar: boolean }) {
  const d = await datos;
  if (d.state === "ready" && !d.venta) notFound();
  return <FichaVenta state={d.state} venta={d.venta} envios={d.envios} editar={editar} />;
}
