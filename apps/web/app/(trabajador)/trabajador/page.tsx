import { Shell } from "@/app/_components/shell";

export default function Pagina() {
  return (
    <Shell portal="trabajador" titulo="Portal Trabajador">
      <div className="rounded-lg border border-border bg-surface p-6">
        <p className="text-sm uppercase tracking-wide text-fg-muted">Portal Trabajador</p>
        <p className="mt-2 text-base text-fg-muted">Se construye en los siguientes briefs.</p>
      </div>
    </Shell>
  );
}
