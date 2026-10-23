import { Shell } from "@/app/_components/shell";

export default function Inicio() {
  return (
    <Shell portal="erp" titulo="Inicio">
      <div className="rounded-lg border border-border bg-surface p-6">
        <p className="text-sm uppercase tracking-wide text-fg-muted">OPAI 2.0</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">Fundación</h2>
        <p className="mt-2 max-w-prose text-base text-fg-muted">
          Monorepo, base de datos con aislamiento por tenant, registro de capacidades y sistema de diseño
          provisional. Los módulos de negocio llegan en los siguientes briefs.
        </p>
      </div>
    </Shell>
  );
}
