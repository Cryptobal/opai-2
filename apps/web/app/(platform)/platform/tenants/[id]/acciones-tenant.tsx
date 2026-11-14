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
        items={itemsMenu(
          estado,
          () => setEditar(true),
          () => setSuspender(true),
          (e) => void fijar(e),
        )}
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
      <DialogoSuspender
        abierto={suspender}
        nombre={nombre}
        pendiente={pendiente}
        error={error}
        onCerrar={() => setSuspender(false)}
        onConfirmar={() => void fijar("suspendido")}
      />
    </>
  );
}

function DialogoSuspender(p: {
  abierto: boolean;
  nombre: string;
  pendiente: boolean;
  error: string | null;
  onCerrar: () => void;
  onConfirmar: () => void;
}) {
  return (
    <Dialog
      abierto={p.abierto}
      onCerrar={p.onCerrar}
      titulo={`¿Suspender ${p.nombre}?`}
      descripcion="Sus miembros no podrán entrar ni usar API keys hasta que la reactives."
      acciones={
        <>
          <Button variant="secondary" onClick={p.onCerrar}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={p.pendiente} onClick={p.onConfirmar}>
            Suspender
          </Button>
        </>
      }
    >
      {p.error ? <p className="text-sm font-medium text-danger-fg">{p.error}</p> : null}
    </Dialog>
  );
}

function itemsMenu(
  estado: string,
  onEditar: () => void,
  onSuspender: () => void,
  onFijar: (estado: string) => void,
) {
  return [
    { id: "editar", etiqueta: "Editar empresa", grupo: "Empresa", onSelect: onEditar },
    ...ESTADOS.filter((e) => e.estado !== estado).map((e, i) => ({
      id: e.estado,
      etiqueta: e.etiqueta,
      ...(i === 0 ? { grupo: "Estado" } : {}),
      ...(e.estado === "suspendido" ? { peligro: true } : {}),
      onSelect: () => (e.estado === "suspendido" ? onSuspender() : onFijar(e.estado)),
    })),
  ];
}
