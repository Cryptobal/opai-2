"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import { totalPuestos, type TramoBorrador, validarBorrador } from "@/lib/esquema-borrador";

import { FilaTramoEsquema } from "./fila-tramo-esquema";
import type { CicloTurno, EsquemaCobertura } from "./esquemas-tipos";

let contador = 0;
const clave = () => `t${++contador}`;
const tramoNuevo = (): TramoBorrador => ({
  clave: clave(),
  nombre: "",
  patronId: "",
  horaInicio: "08:00",
  horaFin: "20:00",
  diasSemana: [1, 2, 3, 4, 5, 6, 7],
  posiciones: 1,
});

/** Hoja para crear o editar un esquema de cobertura (`cpq.esquemas_cobertura.guardar`). */
export function HojaEsquema({
  esquema,
  esquemas,
  ciclos,
  onCerrar,
}: {
  esquema?: EsquemaCobertura;
  esquemas: readonly EsquemaCobertura[];
  ciclos: readonly CicloTurno[];
  onCerrar: () => void;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [nombre, setNombre] = useState(esquema?.nombre ?? "");
  const [tramos, setTramos] = useState<TramoBorrador[]>(
    esquema ? esquema.tramos.map((t) => ({ ...t, clave: clave() })) : [tramoNuevo()],
  );
  const [intento, setIntento] = useState(false);
  const { ok, errores } = validarBorrador(nombre, tramos, {
    nombresUsados: esquemas.filter((e) => e.id !== esquema?.id).map((e) => e.nombre),
    ciclosVigentes: ciclos.map((c) => c.id),
  });
  const cambiar = (k: string, c: Partial<TramoBorrador>) => setTramos((ts) => ts.map((t) => (t.clave === k ? { ...t, ...c } : t)));

  async function guardar() {
    setIntento(true);
    if (!ok) return;
    const r = await ejecutar("cpq.esquemas_cobertura.guardar", {
      ...(esquema ? { id: esquema.id } : {}),
      nombre: nombre.trim(),
      descripcion: esquema?.descripcion ?? null,
      activo: esquema?.activo ?? true,
      tramos: tramos.map(({ clave: _c, ...t }) => ({ ...t, nombre: t.nombre.trim() })),
    });
    if (r != null) {
      avisar.exito(esquema ? "Esquema guardado" : "Esquema creado");
      onCerrar();
    }
  }

  return (
    <Sheet
      abierto
      titulo={esquema ? "Editar esquema" : "Nuevo esquema de cobertura"}
      onCerrar={onCerrar}
      acciones={
        <>
          <Button type="button" variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="button" disabled={pendiente || (intento && !ok)} onClick={() => void guardar()}>
            {pendiente ? "Guardando…" : "Guardar esquema"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Campo
          etiqueta="Nombre del esquema"
          htmlFor="esq-nombre"
          ayuda="Único en la empresa, p. ej. «24/7»."
          {...(intento && errores.nombre ? { error: errores.nombre } : {})}
        >
          <Input id="esq-nombre" value={nombre} aria-invalid={(intento && Boolean(errores.nombre)) || undefined} onChange={(e) => setNombre(e.target.value)} />
        </Campo>
        <div className="flex items-center justify-between">
          <h3 className="t-label">Tramos</h3>
          <span className="t-caption text-fg-muted tabular-nums">Total: {totalPuestos(tramos)} puestos</span>
        </div>
        {tramos.map((t, i) => (
          <FilaTramoEsquema
            key={t.clave}
            tramo={t}
            ciclos={ciclos}
            errores={intento ? errores.tramos[i] : undefined}
            puedeQuitar={tramos.length > 1}
            onCambiar={(c) => cambiar(t.clave, c)}
            onQuitar={() => setTramos((ts) => ts.filter((x) => x.clave !== t.clave))}
          />
        ))}
        {intento && errores.general ? <Alerta tono="danger" titulo={errores.general} /> : null}
        <Button type="button" variant="secondary" onClick={() => setTramos((ts) => [...ts, tramoNuevo()])}>
          Agregar tramo
        </Button>
        {error ? <Alerta tono="danger" titulo={error} /> : null}
      </div>
    </Sheet>
  );
}
