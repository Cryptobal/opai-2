import { cn, GRILLA_KPI_HILO, KpiTile } from "@opai/ds";

import { UF_ESCALA } from "@opai/domain";

import { LinkNext } from "@/app/_components/link-next";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { esFalloReal } from "./fallo-bloque";
import { ReintentarBloque } from "./reintentar-bloque";
import { armarIndicadores, type Indicadores, ordenarTarjetas } from "./indicadores-armar";
import { PersonalizarIndicadores } from "./personalizar-diferido";

/** Indicadores del Inicio (CAR-182): solo los que el usuario puede ver, cada uno como enlace a su lista.
 *  Sin permiso (FORBIDDEN) la sección no aparece; un fallo real se dice en una fila, sin tumbar el resto. */
export async function IndicadoresInicio({ personalizar = false }: { personalizar?: boolean }) {
  const r = await ejecutarComoUsuario<Indicadores>("erp", "core.inicio.indicadores", {});
  if (!r.ok) {
    if (!esFalloReal(r.error.code)) return null;
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-fg-muted"
      >
        No pudimos actualizar los indicadores.
        <ReintentarBloque />
      </div>
    );
  }
  const todas = armarIndicadores(r.data, UF_ESCALA);
  // La elección de la empresa solo rige en el diseño nuevo: el clásico y Hilo no cambian.
  const tarjetas = personalizar ? ordenarTarjetas(todas, r.data.orden) : todas;
  if (tarjetas.length === 0) return null;
  const rejilla = (
    <section
      aria-label="Indicadores"
      className={cn("grid grid-cols-2 gap-3 xl:grid-cols-4", GRILLA_KPI_HILO)}
    >
      {tarjetas.map((t) => (
        <LinkNext
          key={t.id}
          href={t.href}
          className="block min-w-0 rounded-lg outline-none transition-opacity duration-150 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:transition-none"
        >
          <KpiTile
            etiqueta={t.etiqueta}
            valor={t.valor}
            {...(t.variacion ? { variacion: t.variacion } : {})}
          />
        </LinkNext>
      ))}
    </section>
  );
  // Diseño nuevo (CAR-335 D3): la empresa elige sus indicadores con «Personalizar».
  if (!personalizar || !r.data.editable) return rejilla;
  return (
    <div className="flex flex-col gap-2">
      <PersonalizarIndicadores
        key={(r.data.elegidos ?? []).join()}
        elegidos={r.data.elegidos ?? []}
      />
      {rejilla}
    </div>
  );
}
