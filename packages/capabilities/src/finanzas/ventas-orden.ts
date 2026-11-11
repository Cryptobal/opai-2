import { z } from "zod";

/** Orden del libro de ventas (CAR-270). Siempre desempata por id para que el cursor sea estable. */
export const ordenVentasSchema = z
  .enum(["recientes", "antiguas", "mayor_monto", "menor_monto", "tipo"])
  .default("recientes")
  .describe("recientes (por defecto) o antiguas por emisión, mayor_monto o menor_monto por total, tipo por tipo de documento y folio.");

export type OrdenVentas = z.infer<typeof ordenVentasSchema>;

type Campo = "fechaEmision" | "montoTotal" | "tipoDte" | "folio" | "id";
type Dir = "asc" | "desc";

const ORDENES: Record<OrdenVentas, Partial<Record<Campo, Dir>>[]> = {
  recientes: [{ fechaEmision: "desc" }, { id: "desc" }],
  antiguas: [{ fechaEmision: "asc" }, { id: "asc" }],
  mayor_monto: [{ montoTotal: "desc" }, { id: "desc" }],
  menor_monto: [{ montoTotal: "asc" }, { id: "asc" }],
  tipo: [{ tipoDte: "asc" }, { folio: "desc" }, { id: "desc" }],
};

export const ordenVentas = (o: OrdenVentas) => ORDENES[o];
