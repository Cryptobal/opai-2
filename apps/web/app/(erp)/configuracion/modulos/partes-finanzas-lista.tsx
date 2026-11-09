import { Alerta } from "@opai/ds";

import { BotonProbar } from "./boton-probar";
import { type ItemPrueba, PruebaInfo, type Pruebas } from "./prueba-info";

type Props = { pruebas: Pruebas; partes: ItemPrueba[]; puede: boolean };

export function PartesFinanzasLista({ pruebas, partes, puede }: Props) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="t-subheading text-fg">Partes de Finanzas</h3>
      <Alerta
        tono="info"
        titulo="Por ahora, probar una parte abre todo Finanzas durante la prueba."
      />
      <ul className="flex flex-col rounded-lg border border-border bg-surface">
        {partes.map((p) => (
          <li
            key={p.id}
            className="flex flex-col gap-2 border-b border-border px-4 py-3 last:border-b-0 md:flex-row md:items-center md:justify-between"
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="text-base font-medium text-fg">{p.nombre}</span>
              <PruebaInfo item={p} />
              {p.estado === "no_disponible" && p.motivo ? (
                <span className="t-caption">{p.motivo}</span>
              ) : null}
            </span>
            {puede && p.estado === "disponible" ? (
              <BotonProbar
                moduloId={p.id}
                nombre={p.nombre}
                dias={pruebas.dias}
                rutCompleto={pruebas.rutCompleto}
              />
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
