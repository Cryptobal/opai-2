import { PartesFinanzasLista } from "./partes-finanzas-lista";
import type { Pruebas } from "./prueba-info";

/** Las siete partes de Finanzas con su precio de lista y la prueba gratis de cada una (ADR-072). */
export function PartesFinanzas({ pruebas, puede }: { pruebas: Pruebas; puede: boolean }) {
  const partes = pruebas.items.filter((i) => i.id.startsWith("finanzas."));
  if (partes.length === 0) return null;
  return <PartesFinanzasLista pruebas={pruebas} partes={partes} puede={puede} />;
}
