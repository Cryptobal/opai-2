"use client";

import { useState } from "react";

import { avisar, Button, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { CuentaVinculo } from "../../contactos/_componentes/cuenta-vinculo";
import { useHojaUrl } from "@/app/_components/maestros/use-url";
import type { Contacto } from "@/lib/tipos-maestros";

import { CamposContacto, correoMalo, type DatosContacto } from "./campos-contacto";

export { ROL_CONTACTO } from "./campos-contacto";

// Estable entre renders: un arreglo nuevo volvía a buscar cuentas con cada tecla del formulario.
const SIN_VINCULADAS: string[] = [];

/**
 * Nuevo o editar contacto (03): nombres, correo con validación, principal y roles. Sin `cuentaId`
 * (alta directa desde Contactos, CAR-337) se elige la cuenta primero.
 */
export function HojaContacto({
  cuentaId,
  contactos,
  soloDatos = false,
}: {
  cuentaId?: string;
  contactos: Contacto[];
  soloDatos?: boolean;
}) {
  const hoja = useHojaUrl("contacto");
  const actual = contactos.find((k) => k.id === hoja.valor) ?? null;
  if (soloDatos && !actual) return null;
  return hoja.abierta ? (
    <Formulario
      key={hoja.valor ?? "x"}
      cuentaId={cuentaId}
      soloDatos={soloDatos}
      actual={actual}
      principal={contactos.find((k) => k.esPrincipal && k.id !== actual?.id) ?? null}
      onCerrar={hoja.cerrar}
    />
  ) : null;
}

function Formulario({
  cuentaId,
  soloDatos,
  actual,
  principal,
  onCerrar,
}: {
  cuentaId: string | undefined;
  soloDatos: boolean;
  actual: Contacto | null;
  principal: Contacto | null;
  onCerrar: () => void;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [cuenta, setCuenta] = useState(cuentaId ?? "");
  const [d, setD] = useState<DatosContacto>({
    nombres: actual?.nombres ?? "",
    apellidos: actual?.apellidos ?? "",
    email: actual?.email ?? "",
    telefono: actual?.telefono ?? "",
    cargo: actual?.cargo ?? "",
    esPrincipal: actual?.esPrincipal ?? false,
    roles: actual?.roles ?? [],
  });
  const set = <K extends keyof DatosContacto>(k: K, v: DatosContacto[K]) =>
    setD((x) => ({ ...x, [k]: v }));
  async function guardar() {
    const campos = {
      ...(soloDatos ? { nombres: d.nombres, apellidos: d.apellidos } : d),
      email: d.email.trim() || null,
      telefono: d.telefono.trim() || null,
      ...(!soloDatos ? { cargo: d.cargo.trim() || null } : {}),
    };
    const r = await ejecutar(
      actual ? "core.contactos.update" : "core.contactos.create",
      actual ? { id: actual.id, ...campos } : { cuentaId: cuenta, ...campos },
    );
    if (r) {
      avisar.exito(actual ? "Contacto actualizado" : "Contacto creado");
      onCerrar();
    }
  }
  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo={actual ? "Editar contacto" : "Nuevo contacto"}
      telefono="completo"
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            disabled={
              pendiente ||
              !cuenta ||
              !d.nombres.trim() ||
              !d.apellidos.trim() ||
              correoMalo(d.email)
            }
            onClick={() => void guardar()}
          >
            {pendiente ? "Guardando…" : actual ? "Guardar" : "Crear contacto"}
          </Button>
        </>
      }
    >
      {cuentaId === undefined && !actual ? (
        <div className="mb-4">
          <CuentaVinculo
            valor={cuenta}
            onCambiar={setCuenta}
            vinculadas={SIN_VINCULADAS}
            disabled={pendiente}
            ayuda="Busca por nombre, razón social o RUT. El contacto queda en esa cuenta."
          />
        </div>
      ) : null}
      <CamposContacto soloDatos={soloDatos} d={d} set={set} error={error} principal={principal} />
    </Sheet>
  );
}
