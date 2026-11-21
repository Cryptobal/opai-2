import { PaginaTenant } from "../pagina-tenant";
import { CobroContenido } from "./cobro-contenido";

export const metadata = { title: "Cobro de la empresa" };

/**
 * Plataforma → empresa · Cobro (CAR-188, ADR-071): plan base y condición comercial de cada módulo
 * (precio fijo o por unidad con mínimo, inicio del cobro, prueba y descuento), si se factura este mes y por
 * qué, y los cargos listos para facturar de meses anteriores.
 */
export default function Pagina({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PaginaTenant params={params} tab="cobro">
      {(d) => CobroContenido(d)}
    </PaginaTenant>
  );
}