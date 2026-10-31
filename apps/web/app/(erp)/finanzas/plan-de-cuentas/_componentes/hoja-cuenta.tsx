"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Select, Sheet, Switch } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import type { Cuenta } from "../../_componentes/tipos";

const TIPOS = [
  { valor: "activo", etiqueta: "Activo" },
  { valor: "pasivo", etiqueta: "Pasivo" },
  { valor: "patrimonio", etiqueta: "Patrimonio" },
  { valor: "ingreso", etiqueta: "Ingreso" },
  { valor: "costo", etiqueta: "Costo directo" },
  { valor: "gasto", etiqueta: "Gasto" },
];
const GRUPOS = [
  { valor: "corriente", etiqueta: "Corriente" },
  { valor: "no_corriente", etiqueta: "No corriente" },
];
const SIN = "__sin__";

/** Nueva cuenta (`?nueva=1`) o edición de una existente (`?editar=<id>`). */
export function HojaCuenta({ cuentas }: { cuentas: Cuenta[] }) {
  const edicion = useHojaUrl("editar");
  const nueva = useHojaUrl("nueva");
  const cuenta = cuentas.find((c) => c.id === edicion.valor);
  const hoja = edicion.abierta ? edicion : nueva;
  return (
    <Formulario key={cuenta?.id ?? "nueva"} cuenta={cuenta} cuentas={cuentas} abierta={hoja.abierta} cerrar={hoja.cerrar} />
  );
}

function Formulario(p: { cuenta: Cuenta | undefined; cuentas: Cuenta[]; abierta: boolean; cerrar: () => void }) {
  const { cuenta } = p;
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [codigo, setCodigo] = useState(cuenta?.codigo ?? "");
  const [nombre, setNombre] = useState(cuenta?.nombre ?? "");
  const [tipo, setTipo] = useState<string>(cuenta?.tipo ?? "gasto");
  const [grupo, setGrupo] = useState<string>(cuenta?.grupo ?? SIN);
  const [padre, setPadre] = useState<string>(cuenta?.padreId ?? SIN);
  const [exige, setExige] = useState(cuenta?.exigeCentroCosto ?? false);
  const [activa, setActiva] = useState(cuenta?.activa ?? true);
  const conGrupo = tipo === "activo" || tipo === "pasivo";

  async function guardar() {
    const comunes = { nombre: nombre.trim(), grupo: conGrupo && grupo !== SIN ? grupo : null, exigeCentroCosto: exige };
    const r = await ejecutar(
      cuenta ? "finanzas.plan.actualizar" : "finanzas.plan.crear",
      cuenta
        ? { id: cuenta.id, ...comunes, activa }
        : { codigo: codigo.trim(), tipo, padreId: padre === SIN ? null : padre, ...comunes },
    );
    if (!r) return;
    avisar.exito(cuenta ? "Cuenta actualizada" : "Cuenta creada");
    p.cerrar();
  }
  return (
    <Sheet
      abierto={p.abierta}
      onCerrar={p.cerrar}
      titulo={cuenta ? "Editar cuenta" : "Nueva cuenta"}
      acciones={
        <>
          <Button variant="secondary" onClick={p.cerrar}>Cancelar</Button>
          <Button disabled={pendiente || nombre.trim().length < 2 || (!cuenta && !codigo.trim())} onClick={() => void guardar()}>
            {pendiente ? "Guardando…" : cuenta ? "Guardar" : "Crear cuenta"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="Código" htmlFor="pc-codigo" ayuda={cuenta ? "El código no se puede cambiar." : "Numérico con puntos, como 6.1.08."}>
          <Input id="pc-codigo" className="t-mono" value={codigo} disabled={!!cuenta} onChange={(e) => setCodigo(e.target.value)} />
        </Campo>
        <Campo etiqueta="Nombre" htmlFor="pc-nombre">
          <Input id="pc-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <Campo etiqueta="Tipo" htmlFor="pc-tipo">
          <Select id="pc-tipo" valor={tipo} onCambiar={setTipo} opciones={TIPOS} disabled={!!cuenta} />
        </Campo>
        {conGrupo ? (
          <Campo etiqueta="Grupo" htmlFor="pc-grupo" ayuda="Los activos y pasivos son corrientes o no corrientes.">
            <Select id="pc-grupo" valor={grupo} onCambiar={setGrupo} placeholder="Elige el grupo" opciones={GRUPOS} />
          </Campo>
        ) : null}
        {cuenta ? null : (
          <Campo etiqueta="Cuenta padre" htmlFor="pc-padre">
            <Select
              id="pc-padre"
              valor={padre}
              onCambiar={setPadre}
              opciones={[{ valor: SIN, etiqueta: "Sin padre" }, ...p.cuentas.filter((c) => c.tipo === tipo).map((c) => ({ valor: c.id, etiqueta: `${c.codigo} · ${c.nombre}` }))]}
            />
          </Campo>
        )}
        <Switch etiqueta="Exige centro de costo" descripcion="Los asientos en esta cuenta deberán indicar la instalación." activo={exige} onCambiar={setExige} />
        {cuenta ? <Switch etiqueta="Activa" descripcion="Una cuenta inactiva no recibe movimientos nuevos." activo={activa} onCambiar={setActiva} /> : null}
      </div>
    </Sheet>
  );
}
