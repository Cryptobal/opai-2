import { Badge } from "@opai/ds";

export type Accion = "reutiliza" | "crea" | "sin_contacto";
export type Plan = {
  cuenta: { accion: Accion; nombre: string };
  contacto: { accion: Accion; nombre: string | null };
  negocio: { titulo: string };
};

const ETIQUETA: Record<Accion, string> = {
  reutiliza: "Se reutiliza",
  crea: "Se crea",
  sin_contacto: "Sin contacto",
};
const TONO = { reutiliza: "info", crea: "success", sin_contacto: "neutro" } as const;

/** «Qué pasa al convertir» (diseño 04): qué se reutiliza y qué se crea, en tarjetas apiladas. */
export function PlanConversion({ plan }: { plan: Plan }) {
  const filas: [string, Accion, string | null][] = [
    ["Cuenta", plan.cuenta.accion, plan.cuenta.nombre],
    ["Contacto", plan.contacto.accion, plan.contacto.nombre],
    ["Negocio", "crea", plan.negocio.titulo],
  ];
  return (
    <div className="flex flex-col gap-2" aria-live="polite">
      <p className="t-label">Qué pasa al convertir</p>
      {filas.map(([quien, accion, nombre]) => (
        <div
          key={quien}
          className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
        >
          <div className="min-w-0">
            <p className="t-caption">{quien}</p>
            <p className="truncate">{nombre ?? "—"}</p>
          </div>
          <Badge tono={TONO[accion]} punto={false}>
            {ETIQUETA[accion]}
          </Badge>
        </div>
      ))}
    </div>
  );
}
