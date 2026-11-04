"use client";
import Link from "next/link";
import { Alerta, Button, Skeleton } from "@opai/ds";
import type { Aviso } from "@/app/_components/campana";
import { ListaAvisos } from "@/app/_components/lista-avisos";

export function BandejaCorta({
  avisos,
  aprobaciones,
  decisiones,
  error,
  onMarcar,
  onLeida,
}: {
  avisos: Aviso[] | null;
  aprobaciones: number | null;
  decisiones: { id: string; resumen: string }[];
  error: boolean;
  onMarcar: () => void;
  onLeida: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="t-label">Notificaciones</p>
        {avisos?.length ? (
          <Button variant="ghost" className="h-11 md:h-9" onClick={onMarcar}>
            Marcar todas
          </Button>
        ) : null}
      </div>
      {error ? <Alerta tono="danger" titulo="No pudimos actualizar la Bandeja" /> : null}
      {avisos === null ? (
        <div className="p-4">
          <Skeleton className="h-20" />
        </div>
      ) : (
        <div className="max-h-96 overflow-y-auto">
          {aprobaciones ? (
            <Link
              href="/configuracion/aprobaciones"
              className="flex min-h-11 items-center px-4 text-accent"
            >
              {aprobaciones} aprobaciones pendientes
            </Link>
          ) : null}
          {decisiones.map((d) => (
            <Link
              key={d.id}
              href={`/configuracion/aprobaciones?id=${d.id}`}
              className="flex min-h-11 items-center px-4 text-fg"
            >
              {d.resumen}
            </Link>
          ))}
          <ListaAvisos avisos={avisos.slice(0, 20)} portal="erp" onLeida={onLeida} />
          {!avisos.length && !aprobaciones ? (
            <p className="p-4 t-body text-fg-muted">Todo al día. No tienes nada pendiente.</p>
          ) : null}
        </div>
      )}
      <Link
        href="/bandeja"
        className="flex min-h-11 items-center border-t border-border px-4 text-accent"
      >
        Ver todo
      </Link>
    </div>
  );
}
