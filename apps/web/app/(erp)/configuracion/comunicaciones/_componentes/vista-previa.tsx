"use client";

import { useEffect, useState } from "react";

import { Alerta, Badge, Skeleton } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

type Previa = { asunto: string; texto: string; html: string };
type Props = { evento: string; canal: string; asunto: string; cuerpo: string; remitente: string };

/** Vista previa (31): el correo con datos de ejemplo y la marca de la empresa (HTML aislado). */
export function VistaPrevia({ evento, canal, asunto, cuerpo, remitente }: Props) {
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let vigente = true;
    const t = setTimeout(() => {
      void ejecutarCapacidad("erp", "core.plantillas.preview", {
        evento,
        canal,
        asunto,
        cuerpo,
      }).then((r) => {
        if (!vigente) return;
        setError(r.ok ? null : r.error.message);
        if (r.ok) setPrevia(r.data as Previa);
      });
    }, 400);
    return () => {
      vigente = false;
      clearTimeout(t);
    };
  }, [evento, canal, asunto, cuerpo]);
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-md font-semibold text-fg">Vista previa</h3>
        <Badge punto={false}>Datos y colores de ejemplo</Badge>
      </div>
      {error ? <Alerta tono="warning" titulo={error} /> : null}
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-4 py-2.5 text-sm text-fg-muted">
          <p className="truncate">De: {remitente}</p>
          <p className="truncate">
            Asunto: <strong className="font-semibold text-fg">{previa?.asunto ?? "…"}</strong>
          </p>
        </div>
        {previa ? (
          <iframe
            title="Vista previa del correo"
            srcDoc={previa.html}
            sandbox=""
            className="h-[440px] w-full bg-surface"
          />
        ) : (
          <Skeleton className="m-4 h-[400px]" />
        )}
      </div>
    </section>
  );
}
