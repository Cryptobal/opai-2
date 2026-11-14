import { agruparNovedades, hoyEnChile } from "./agrupar-novedades";
import { type ItemNovedad, TarjetaNovedad } from "./tarjeta-novedad";

/** Novedades agrupadas en «Hoy», «Esta semana» y «Antes» (CAR-430); al tocar una, queda leída salvo «Ver más». */
export function GruposNovedades({
  items,
  onMarcar,
}: {
  items: ItemNovedad[];
  onMarcar: (id: string) => void;
}) {
  return agruparNovedades(items, hoyEnChile()).map((g) => (
    <section key={g.id} aria-labelledby={`novedades-${g.id}`} className="flex flex-col gap-3">
      <h2 id={`novedades-${g.id}`} className="t-label text-fg-muted">
        {g.titulo}
      </h2>
      <ul className="flex flex-col gap-3">
        {g.items.map((item) => (
          <li
            key={item.id}
            onClickCapture={(e) => {
              // «Ver más» solo despliega: no marca la novedad como leída (CAR-430).
              if (!(e.target instanceof Element && e.target.closest("[data-sin-marcar]")))
                onMarcar(item.id);
            }}
          >
            <TarjetaNovedad item={item} onMarcar={onMarcar} />
          </li>
        ))}
      </ul>
    </section>
  ));
}
