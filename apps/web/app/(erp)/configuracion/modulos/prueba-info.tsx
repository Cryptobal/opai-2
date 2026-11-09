import { Badge } from "@opai/ds";

export type ItemPrueba = {
  id: string;
  nombre: string;
  textoPrecio: string | null;
  estado: "disponible" | "en_prueba" | "vencida" | "no_disponible";
  hasta: string | null;
  diasRestantes: number | null;
  motivo: string | null;
};

export type Pruebas = { dias: number; rutCompleto: boolean; items: ItemPrueba[] };

/** Precio de lista y estado de la prueba gratis de un módulo o parte (CAR-222). */
export function PruebaInfo({ item }: { item: ItemPrueba }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="t-caption">
        {item.textoPrecio ? `Precio de lista: ${item.textoPrecio}` : "Precio a convenir con OPAI"}
      </p>
      {item.estado === "en_prueba" ? (
        <Badge tono="info">
          Prueba gratis: {item.diasRestantes === 1 ? "último día" : `${item.diasRestantes} días`}
        </Badge>
      ) : item.estado === "vencida" ? (
        <Badge tono="warning">Prueba terminada: pídele a OPAI que la extienda</Badge>
      ) : null}
    </div>
  );
}
