import { notFound } from "next/navigation";

/**
 * Toda ruta de primer nivel que no existe cae aquí y responde 404 con el shell del ERP
 * (`not-found.tsx` de este segmento). No lee `params`, así que el 404 se decide antes de enviar
 * el HTML y el estado HTTP es 404, no 200.
 */
export default function RutaInexistente() {
  notFound();
}
