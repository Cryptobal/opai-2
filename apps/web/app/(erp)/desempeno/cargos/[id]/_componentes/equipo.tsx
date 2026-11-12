import { Badge, BarraProgreso } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { type ResultadoCargo, tonoPuntaje } from "../../../_componentes/datos";

type Carga = { ok: true; data: ResultadoCargo } | { ok: false; error?: { code: string } };

const TONO_BARRA = { success: "accent", warning: "warning", danger: "danger" } as const;

/** Personas del cargo que quien consulta puede ver, con su puntaje del mes (0 a 120). */
export function Equipo({ resultado }: { resultado: Carga }) {
  if (!resultado.ok) {
    return (
      <p className="t-body-sm text-fg-muted">
        {resultado.error?.code === "FORBIDDEN"
          ? "No tienes permiso para ver los resultados de este cargo."
          : "No pudimos cargar los resultados. Reintenta en un momento."}
      </p>
    );
  }
  const { vigenteDesde, siguiente } = resultado.data;
  // Mejor puntaje primero; quien no tiene datos queda al final.
  const personas = [...resultado.data.personas].sort((a, b) => (b.puntaje ?? -1) - (a.puntaje ?? -1));
  if (personas.length === 0) {
    return (
      <p className="t-body-sm text-fg-muted">
        {vigenteDesde
          ? "No hay personas de este cargo que puedas ver."
          : "Cuando el cargo tenga scorecard, aquí verás el resultado de cada persona."}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <ul className="overflow-hidden rounded-lg border border-border bg-surface">
        {personas.map((p) => {
          const tono = tonoPuntaje(p.puntaje);
          return (
            <li key={p.personaId} className="border-b border-border last:border-b-0">
              <LinkNext
                href={`/desempeno/personas/${p.personaId}`}
                className="flex min-h-11 items-center justify-between gap-3 px-4 py-3 hover:bg-fill"
              >
                <span className="flex min-w-0 flex-1 flex-col gap-2">
                  <span className="truncate text-base font-medium text-fg">
                    {p.nombres} {p.apellidos}
                  </span>
                  {p.puntaje !== null && tono !== "neutro" ? (
                    <BarraProgreso
                      valor={p.puntaje / 120}
                      etiqueta={`Puntaje de ${p.nombres} ${p.apellidos}`}
                      tono={TONO_BARRA[tono as keyof typeof TONO_BARRA]}
                    />
                  ) : null}
                </span>
                <Badge tono={tono}>
                  {p.puntaje === null ? "Sin datos" : `${Math.round(p.puntaje)} pts`}
                </Badge>
              </LinkNext>
            </li>
          );
        })}
      </ul>
      {siguiente ? <p className="t-caption">Se muestran las primeras 200 personas.</p> : null}
    </div>
  );
}
