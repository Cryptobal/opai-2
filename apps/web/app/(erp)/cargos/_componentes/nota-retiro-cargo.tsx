import { Alerta } from "@opai/ds";

/** Nota fija en la ficha del cargo (Brief 07b): los montos viven en instalación, puesto o persona. */
export function NotaRetiroCargo() {
  return (
    <Alerta
      tono="info"
      titulo="Los sueldos se definen en instalación, puesto o persona. Las estructuras antiguas de cargo quedan en solo lectura."
    />
  );
}
