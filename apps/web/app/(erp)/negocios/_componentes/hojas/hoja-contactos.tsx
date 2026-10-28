"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Checkbox, Select, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import type { CuentaDetalle } from "@/lib/tipos-maestros";

import type { NegocioDetalle } from "../datos";
import { opcionesDe, ROL_CONTACTO } from "../etiquetas";
import { useHojaNegocio } from "./use-hoja";

type Fila = { contactoId: string; rol: string; esPrincipal: boolean };
type Props = { n: NegocioDetalle; cuenta: CuentaDetalle };

/** Contactos del negocio: los de su cuenta, con su rol en este negocio y cuál es el principal (R16). */
export function HojaContactos({ n, cuenta }: Props) {
  const hoja = useHojaNegocio("contactos");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [filas, setFilas] = useState<Fila[]>(() =>
    n.contactos.map((c) => ({ contactoId: c.contactoId, rol: c.rol, esPrincipal: c.esPrincipal })),
  );
  const [nuevo, setNuevo] = useState("");
  const nombre = (id: string) =>
    cuenta.contactos.find((c) => c.id === id)?.nombre ??
    n.contactos.find((c) => c.contactoId === id)?.nombre ??
    "";
  const libres = cuenta.contactos.filter((c) => !filas.some((f) => f.contactoId === c.id));
  const cambiar = (id: string, cambio: Partial<Fila>) =>
    setFilas((fs) =>
      fs.map((f) =>
        f.contactoId === id
          ? { ...f, ...cambio }
          : cambio.esPrincipal
            ? { ...f, esPrincipal: false }
            : f,
      ),
    );
  async function guardar() {
    const r = await ejecutar("comercial.negocios.set_contactos", {
      negocioId: n.id,
      contactos: filas,
    });
    if (!r) return;
    avisar.exito("Contactos guardados");
    hoja.cerrar();
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Contactos del negocio"
      descripcion="El rol aplica solo a este negocio."
      telefono="completo"
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente} onClick={() => void guardar()}>
            {pendiente ? "Guardando…" : "Guardar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {filas.map((f) => (
          <div
            key={f.contactoId}
            className="flex flex-col gap-2 rounded-md border border-border p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{nombre(f.contactoId)}</span>
              <Button
                variant="ghost"
                onClick={() => setFilas((fs) => fs.filter((x) => x.contactoId !== f.contactoId))}
              >
                Quitar
              </Button>
            </div>
            <Select
              aria-label={`Rol de ${nombre(f.contactoId)}`}
              valor={f.rol}
              onCambiar={(rol) => cambiar(f.contactoId, { rol })}
              opciones={opcionesDe(ROL_CONTACTO)}
            />
            <Checkbox
              marcado={f.esPrincipal}
              onCambiar={(esPrincipal) => cambiar(f.contactoId, { esPrincipal })}
              etiqueta="Contacto principal del negocio"
            />
          </div>
        ))}
        {!filas.length ? <p className="t-caption">Sin contactos en el negocio.</p> : null}
        {libres.length ? (
          <Campo etiqueta="Agregar contacto" htmlFor="neg-contacto">
            <Select
              id="neg-contacto"
              valor={nuevo || undefined}
              placeholder="Elige un contacto de la cuenta"
              opciones={libres.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
              onCambiar={(id) => {
                setFilas((fs) => [
                  ...fs,
                  { contactoId: id, rol: "decisor", esPrincipal: !fs.length },
                ]);
                setNuevo("");
              }}
            />
          </Campo>
        ) : (
          <p className="t-caption">Los contactos se crean en la ficha de la cuenta.</p>
        )}
      </div>
    </Sheet>
  );
}
