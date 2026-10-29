"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";

import { Alerta, avisar, Badge, Button, Skeleton } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";
import { fechaHora } from "@/lib/formato";

import { type ModuloCatalogo, nombrePermiso } from "./_permisos/etiquetas";
import { DialogoExcepcion } from "./dialogo-excepcion";

export type Excepcion = {
  permiso: string;
  conceder: boolean;
  motivo: string | null;
  fijadoPor: { id: string; nombre: string } | null;
  fijadoEn: Date;
};

type Props = {
  membershipId: string;
  nombre: string;
  /** null = cargando; Error = no se pudo cargar. */
  excepciones: Excepcion[] | null | Error;
  onRecargar: () => void;
  gestiona: boolean;
  esOwner: boolean;
  catalogo: readonly ModuloCatalogo[];
  concedibles: readonly string[];
};

/** «Excepciones de este usuario» (A4 §3): concedidas o denegadas sobre su rol; denegar gana. */
export function ExcepcionesUsuario(p: Props) {
  const [agregar, setAgregar] = useState(false);
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quitar devuelve `null` también cuando sale bien: se lee el resultado completo, no solo los datos.
  async function quitar(permiso: string) {
    setPendiente(true);
    const r = await ejecutarCapacidad("erp", "core.excepciones.set", {
      membershipId: p.membershipId,
      permiso,
      efecto: "ninguna",
    });
    setPendiente(false);
    setError(r.ok ? null : r.error.message);
    if (r.ok) {
      avisar.exito("Excepción quitada");
      p.onRecargar();
    }
  }

  const lista = p.excepciones;
  return (
    <section aria-labelledby="exc-titulo" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 id="exc-titulo" className="t-label text-fg">
          Excepciones de este usuario
        </h3>
        {p.gestiona && !p.esOwner ? (
          <Button variant="secondary" onClick={() => setAgregar(true)}>
            <Plus className="size-4" aria-hidden />
            Agregar excepción
          </Button>
        ) : null}
      </div>
      <p className="t-caption">
        {p.esOwner
          ? "Un owner tiene acceso total: no lleva excepciones."
          : "Si una excepción deniega algo que el rol concede, gana la denegación."}
      </p>
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      {lista === null ? (
        <Skeleton className="h-16 w-full" />
      ) : lista instanceof Error ? (
        <Alerta
          tono="danger"
          titulo="No pudimos cargar las excepciones"
          accion={
            <Button variant="secondary" onClick={p.onRecargar}>
              Reintentar
            </Button>
          }
        />
      ) : lista.length === 0 ? (
        <p className="text-sm text-fg-muted">
          Sin excepciones. {p.nombre} tiene exactamente los permisos de su rol.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {lista.map((e) => (
            <li key={e.permiso} className="flex items-start gap-2 py-2">
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-1.5 text-md text-fg">
                  {nombrePermiso(e.permiso)}
                  <Badge tono={e.conceder ? "success" : "danger"}>
                    {e.conceder ? "Concedido" : "Denegado"}
                  </Badge>
                </span>
                {e.motivo ? <span className="text-sm text-fg-muted">«{e.motivo}»</span> : null}
                <span className="t-caption">
                  {e.fijadoPor ? `${e.fijadoPor.nombre} · ` : ""}
                  {fechaHora(e.fijadoEn)}
                </span>
              </span>
              {p.gestiona ? (
                <Button
                  variant="ghost"
                  disabled={pendiente}
                  aria-label={`Quitar ${nombrePermiso(e.permiso)}`}
                  onClick={() => quitar(e.permiso)}
                >
                  <X className="size-4" aria-hidden />
                  Quitar
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {p.gestiona ? (
        <DialogoExcepcion
          abierto={agregar}
          onCerrar={() => setAgregar(false)}
          membershipId={p.membershipId}
          catalogo={p.catalogo}
          concedibles={p.concedibles}
          onGuardada={p.onRecargar}
        />
      ) : null}
    </section>
  );
}
