"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Select, Sheet, Switch, Textarea } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";
import type { Cargo } from "@/lib/tipos-maestros";

const CLASES = [
  { valor: "operativo", etiqueta: "Operativo" },
  { valor: "administrativo", etiqueta: "Administrativo" },
];

/** Nuevo cargo o editar sus datos (nombre, clase, descripción y si el sueldo es sensible). */
export function HojaCargo({
  cargo,
  puedeVerSensible,
}: {
  cargo?: Cargo;
  puedeVerSensible: boolean;
}) {
  const hoja = useHojaUrl(cargo ? "editar" : "nuevo");
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [nombre, setNombre] = useState(cargo?.nombre ?? "");
  const [clase, setClase] = useState(cargo?.clase ?? "operativo");
  const [descripcion, setDescripcion] = useState(cargo?.descripcion ?? "");
  const [sensible, setSensible] = useState(cargo?.sueldoSensible ?? false);
  async function guardar() {
    const campos = {
      nombre: nombre.trim(),
      clase,
      descripcion: descripcion.trim() || null,
      ...(sensible !== (cargo?.sueldoSensible ?? false) ? { sueldoSensible: sensible } : {}),
    };
    const r = await ejecutar<{ id: string }>(
      cargo ? "core.cargos.update" : "core.cargos.create",
      cargo ? { id: cargo.id, ...campos } : campos,
    );
    if (!r) return;
    avisar.exito(cargo ? "Cargo actualizado" : "Cargo creado");
    hoja.cerrar();
    if (!cargo) router.push(`/cargos/${r.id}`);
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo={cargo ? "Editar cargo" : "Nuevo cargo"}
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente || nombre.trim().length < 2} onClick={() => void guardar()}>
            {pendiente ? "Guardando…" : cargo ? "Guardar" : "Crear cargo"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="Nombre" htmlFor="cg-nombre">
          <Input
            id="cg-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoFocus
          />
        </Campo>
        <Campo etiqueta="Clase" htmlFor="cg-clase">
          <Select id="cg-clase" valor={clase} onCambiar={setClase} opciones={CLASES} />
        </Campo>
        <Campo etiqueta="Descripción" htmlFor="cg-desc">
          <Textarea
            id="cg-desc"
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
          />
        </Campo>
        {puedeVerSensible ? (
          <Switch
            etiqueta="Sueldo sensible"
            descripcion="Solo quien tiene el permiso de sueldos sensibles (owner y admin) ve los montos"
            activo={sensible}
            onCambiar={setSensible}
          />
        ) : null}
      </div>
    </Sheet>
  );
}
