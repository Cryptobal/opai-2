"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button, cn } from "@opai/ds";

import type { CatalogoReporte } from "./tipos";

export function NavReportesDt({
  catalogo,
  activo,
  params,
}: {
  catalogo: CatalogoReporte[];
  activo: string;
  params: Record<string, string | undefined>;
}) {
  const router = useRouter();
  return (
    <nav className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-2" aria-label="Reportes DT">
      <span className="t-caption px-2 py-1 text-fg-muted">Reportes obligatorios</span>
      {catalogo
        .filter((c) => c.obligatorio)
        .map((c) => (
          <Button
            key={c.id}
            type="button"
            variant="ghost"
            block
            className={cn(
              "h-auto min-h-11 flex-col items-start gap-0.5 px-2 py-1.5 text-left font-normal",
              activo === c.id ? "bg-fill" : "hover:bg-fill/60",
            )}
            onClick={() =>
              router.push(`/asistencia/reportes-dt?${new URLSearchParams({ ...params, tipo: c.id } as Record<string, string>)}`)
            }
          >
            <span className="t-body-sm font-medium">{c.titulo}</span>
            <span className="t-caption text-fg-muted">{c.descripcion}</span>
          </Button>
        ))}
      <span className="t-caption mt-2 border-t border-border px-2 py-1 text-fg-muted">Otros</span>
      <Link href="/verificar/marca" className="t-body-sm px-2 py-2 text-accent hover:underline">
        Verificar marcación por hash
      </Link>
      <Link href="/asistencia/certificacion" className="t-body-sm px-2 py-2 text-accent hover:underline">
        Checklist de certificación
      </Link>
    </nav>
  );
}