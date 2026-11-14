import { agruparNovedades, hoyEnChile } from "./agrupar-novedades";
import { type ItemNovedad, TarjetaNovedad } from "./tarjeta-novedad";

/** Novedades agrupadas en «Hoy», «Esta semana» y «Antes» (CAR-430); al tocar una, queda leída. */
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
          <li key={item.id} onClickCapture={() => onMarcar(item.id)}>
            <TarjetaNovedad item={item} onMarcar={onMarcar} />
          </li>
        ))}
      </ul>
    </section>
  ));
}
