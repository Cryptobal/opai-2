"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { cn } from "@opai/ds";

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
      <span className="t-caption px-2 py-1 text-muted">Reportes obligatorios</span>
      {catalogo
        .filter((c) => c.obligatorio)
        .map((c) => (
          <button
            key={c.id}
            type="button"
            className={cn(
              "flex min-h-11 w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left",
              activo === c.id ? "bg-fill" : "hover:bg-fill/60",
            )}
            onClick={() =>
              router.push(`/asistencia/reportes-dt?${new URLSearchParams({ ...params, tipo: c.id } as Record<string, string>)}`)
            }
          >
            <span className="t-body-sm font-medium">{c.titulo}</span>
            <span className="t-caption text-muted">{c.descripcion}</span>
          </button>
        ))}
      <span className="t-caption mt-2 border-t border-border px-2 py-1 text-muted">Otros</span>
      <Link href="/verificar/marca" className="t-body-sm px-2 py-2 text-accent hover:underline">
        Verificar marcación por hash
      </Link>
      <Link href="/asistencia/certificacion" className="t-body-sm px-2 py-2 text-accent hover:underline">
        Checklist de certificación
      </Link>
    </nav>
  );
}