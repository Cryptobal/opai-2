"use client";

import { MoreHorizontal } from "lucide-react";
import { lazy, Suspense, useState } from "react";

import { avisar, Button, Dialog, Menu } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

// Diferida: solo se descarga al abrir «Editar empresa» (presupuesto de JS, ADR-037).
const HojaEditarTenant = lazy(() =>
  import("./hoja-editar-tenant").then((m) => ({ default: m.HojaEditarTenant })),
);

const ESTADOS = [
  { estado: "activo", etiqueta: "Activar" },
  { estado: "trial", etiqueta: "Pasar a prueba" },
  { estado: "suspendido", etiqueta: "Suspender" },
];

/** Menú ⋯ de la empresa: editarla (CAR-323) y cambiar su estado; suspender pide confirmación. */
export function AccionesTenant({
  id,
  nombre,
  estado,
  vertical,
  timezone,
}: {
  id: string;
  nombre: string;
  estado: string;
  vertical: string;
  timezone: string;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("platform");
  const [suspender, setSuspender] = useState(false);
  const [editar, setEditar] = useState(false);
  async function fijar(nuevo: string) {
    if (await ejecutar("platform.tenants.set_estado", { tenantId: id, estado: nuevo })) {
      avisar.exito("Estado actualizado");
      setSuspender(false);
    }
  }
  return (
    <>
      <Menu
        etiqueta="Acciones de la empresa"
        disparador={<MoreHorizontal className="size-5" />}
        claseDisparador="border border-border-strong bg-surface md:size-11"
        items={[
          {
            id: "editar",
            etiqueta: "Editar empresa",
            grupo: "Empresa",
            onSelect: () => setEditar(true),
          },
          ...ESTADOS.filter((e) => e.estado !== estado).map((e, i) => ({
            id: e.estado,
            etiqueta: e.etiqueta,
            ...(i === 0 ? { grupo: "Estado" } : {}),
            ...(e.estado === "suspendido" ? { peligro: true } : {}),
            onSelect: () => (e.estado === "suspendido" ? setSuspender(true) : void fijar(e.estado)),
          })),
        ]}
      />
      {editar ? (
        <Suspense fallback={null}>
          <HojaEditarTenant
            tenantId={id}
            actual={{ nombre, vertical, timezone }}
            onCerrar={() => setEditar(false)}
          />
        </Suspense>
      ) : null}
      <Dialog
        abierto={suspender}
        onCerrar={() => setSuspender(false)}
        titulo={`¿Suspender ${nombre}?`}
        descripcion="Sus miembros no podrán entrar ni usar API keys hasta que la reactives."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setSuspender(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pendiente}
              onClick={() => void fijar("suspendido")}
            >
              Suspender
            </Button>
          </>
        }
      >
        {error ? <p className="text-sm font-medium text-danger-fg">{error}</p> : null}
      </Dialog>
    </>
  );
}
