"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { VERTICALES } from "@opai/domain";
import { Alerta, avisar, Button, Campo, Input, Select, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { nombreVertical } from "../../_componentes/formato";

type Datos = { nombre: string; vertical: string; timezone: string };
const ETIQUETAS: Record<keyof Datos, string> = {
  nombre: "Nombre",
  vertical: "Rubro",
  timezone: "Zona horaria",
};
const legible = (k: keyof Datos, v: string) => (k === "vertical" ? nombreVertical(v) : v);

/**
 * Editar empresa (CAR-323, `platform.tenants.update`): nombre, rubro y zona horaria. Primero muestra
 * qué cambia (vista previa, sin guardar) y después confirma. La razón social y el RUT siguen en
 * «Datos tributarios»; el slug no se cambia porque va en las API keys y en los enlaces.
 */
export function HojaEditarTenant(props: { tenantId: string; actual: Datos; onCerrar: () => void }) {
  const { tenantId, actual, onCerrar } = props;
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("platform");
  const [datos, setDatos] = useState<Datos>(actual);
  const [revisado, setRevisado] = useState(false);
  const cambios = (Object.keys(datos) as (keyof Datos)[]).filter(
    (k) => datos[k].trim() !== actual[k],
  );
  const input = { tenantId, ...Object.fromEntries(cambios.map((k) => [k, datos[k].trim()])) };
  const set = (k: keyof Datos, v: string) => {
    setRevisado(false);
    setDatos((d) => ({ ...d, [k]: v }));
  };

  async function revisar() {
    if (await ejecutar("platform.tenants.update", input, true, "ninguna")) setRevisado(true);
  }
  async function guardar() {
    if (!(await ejecutar("platform.tenants.update", input))) return;
    avisar.exito("Empresa actualizada");
    router.refresh();
    onCerrar();
  }

  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo="Editar empresa"
      descripcion="La razón social y el RUT se cambian en «Datos tributarios»."
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          {revisado ? (
            <Button disabled={pendiente} onClick={() => void guardar()}>
              {pendiente ? "Guardando…" : "Confirmar cambios"}
            </Button>
          ) : (
            <Button disabled={pendiente || !cambios.length} onClick={() => void revisar()}>
              Revisar cambios
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo
          etiqueta="Nombre"
          htmlFor="emp-nombre"
          ayuda="El nombre con que la empresa aparece en OPAI."
        >
          <Input
            id="emp-nombre"
            value={datos.nombre}
            onChange={(e) => set("nombre", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Rubro" htmlFor="emp-vertical">
          <Select
            id="emp-vertical"
            aria-label="Rubro"
            valor={datos.vertical}
            onCambiar={(v) => set("vertical", v)}
            opciones={VERTICALES.map((v) => ({ valor: v, etiqueta: nombreVertical(v) }))}
          />
        </Campo>
        <Campo etiqueta="Zona horaria" htmlFor="emp-zona" ayuda="Por ejemplo America/Santiago.">
          <Input
            id="emp-zona"
            value={datos.timezone}
            onChange={(e) => set("timezone", e.target.value)}
          />
        </Campo>
        {revisado ? (
          <Alerta tono="info" titulo="Revisa antes de confirmar">
            <ul className="t-body-sm flex flex-col gap-1">
              {cambios.map((k) => (
                <li key={k}>
                  {ETIQUETAS[k]}: {legible(k, actual[k])} →{" "}
                  <strong>{legible(k, datos[k].trim())}</strong>
                </li>
              ))}
            </ul>
          </Alerta>
        ) : null}
      </div>
    </Sheet>
  );
}
