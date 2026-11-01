"use client";

import { lazy, Suspense, useId, useRef, useState } from "react";

import { Badge, Button, Empty, Enlace, ParesGrid, SeccionTarjeta, Skeleton } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { ROLES_VINCULO, type VinculoContacto } from "./vinculos-tipos";

const HojaVinculo = lazy(() => import("./hoja-vinculo").then((m) => ({ default: m.HojaVinculo })));
const DesvincularContacto = lazy(() =>
  import("./desvincular-contacto").then((m) => ({ default: m.DesvincularContacto })),
);

type Props = { contactoId: string; vinculos: VinculoContacto[]; gestionar: boolean };

/** Acciones presentes solo con el permiso efectivo calculado en el servidor. */
export function ListaVinculos({ contactoId, vinculos, gestionar }: Props) {
  const [editar, setEditar] = useState<VinculoContacto | "nuevo" | null>(null);
  const [quitar, setQuitar] = useState<VinculoContacto | null>(null);
  const disparador = useRef<HTMLButtonElement | null>(null);
  const idVincular = useId();
  function cerrar() {
    setEditar(null);
    setQuitar(null);
    requestAnimationFrame(() => {
      const origen = disparador.current;
      if (origen?.isConnected) origen.focus();
      else document.getElementById(idVincular)?.focus();
    });
  }
  const nueva = gestionar ? (
    <Button
      id={idVincular}
      className="min-h-11"
      onClick={(e) => {
        disparador.current = e.currentTarget;
        setEditar("nuevo");
      }}
    >
      Vincular a otra cuenta
    </Button>
  ) : null;
  return (
    <SeccionTarjeta titulo="Cuentas" accion={vinculos.length ? nueva : null}>
      {vinculos.length === 0 ? (
        <Empty titulo="Sin cuentas visibles" accion={nueva} />
      ) : (
        <ul className="flex flex-col gap-4" aria-label="Cuentas vinculadas">
          {vinculos.map((v) => (
            <li key={v.id} className="min-w-0 rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Enlace Link={LinkNext} href={`/cuentas/${v.cuentaId}`} className="break-words">
                  {v.cuentaNombre}
                </Enlace>
                {v.esPrincipal ? <Badge punto={false}>Principal en esta cuenta</Badge> : null}
              </div>
              <ParesGrid
                items={[
                  { etiqueta: "Cargo", valor: v.cargo },
                  {
                    etiqueta: "Roles",
                    valor: v.roles.map((r) => ROLES_VINCULO[r] ?? r).join(", ") || "Sin roles",
                  },
                ]}
              />
              {gestionar ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    className="min-h-11"
                    aria-label={`Editar vínculo con ${v.cuentaNombre}`}
                    onClick={(e) => {
                      disparador.current = e.currentTarget;
                      setEditar(v);
                    }}
                  >
                    Editar vínculo
                  </Button>
                  <Button
                    variant="ghost"
                    className="min-h-11"
                    aria-label={`Desvincular de ${v.cuentaNombre}`}
                    onClick={(e) => {
                      disparador.current = e.currentTarget;
                      setQuitar(v);
                    }}
                  >
                    Desvincular
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {gestionar && editar ? (
        <Suspense fallback={<Skeleton className="h-32 w-full" />}>
          <HojaVinculo
            contactoId={contactoId}
            actual={editar === "nuevo" ? null : editar}
            vinculadas={vinculos.map((v) => v.cuentaId)}
            onCerrar={cerrar}
          />
        </Suspense>
      ) : null}
      {gestionar && quitar ? (
        <Suspense fallback={<Skeleton className="h-32 w-full" />}>
          <DesvincularContacto vinculo={quitar} onCerrar={cerrar} />
        </Suspense>
      ) : null}
    </SeccionTarjeta>
  );
}
