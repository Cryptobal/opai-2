"use client";

import { useMemo, useState } from "react";

import { Alerta, avisar, Button, Input, SeccionTarjeta } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { DESTINATARIOS_BASE, pasoVacio } from "./cadena-opciones";
import { FilaPasoCadena } from "./fila-paso-cadena";
import type { CadenaCentral, PasoCadena } from "./tipos-cadena";

export function EditorCadenas({
  cadenas,
  plantilla,
  usuarios,
}: {
  cadenas: CadenaCentral[];
  plantilla: CadenaCentral;
  usuarios: { userId: string; nombre: string }[];
}) {
  const empresa = cadenas.find((c) => !c.instalacionId && !c.severidad && c.activa) ?? null;
  const base = empresa ?? { ...plantilla, id: null, activa: true };
  const [pasos, setPasos] = useState<PasoCadena[]>(base.pasos.map((p) => ({ ...p, activo: p.activo ?? true })));
  const [plazo, setPlazo] = useState(String(base.plazoAtencionMin));
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const opcionesDest = useMemo(
    () => [...DESTINATARIOS_BASE.map((d) => ({ valor: d.valor, etiqueta: d.etiqueta })), ...usuarios.map((u) => ({ valor: u.userId, etiqueta: u.nombre }))],
    [usuarios],
  );

  const mover = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= pasos.length) return;
    const next = [...pasos];
    const [p] = next.splice(i, 1);
    next.splice(j, 0, p!);
    setPasos(next);
  };

  const guardar = async () => {
    if (await ejecutar("central.cadenas.guardar", { instalacionId: null, severidad: null, pasos, plazoAtencionMin: Number(plazo), activa: true }))
      avisar.exito("Cadena de la empresa guardada");
  };

  const restaurar = async () => {
    if (!empresa?.id) {
      setPasos(plantilla.pasos.map((p) => ({ ...p, activo: true })));
      setPlazo(String(plantilla.plazoAtencionMin));
      return;
    }
    if (await ejecutar("central.cadenas.eliminar", { id: empresa.id })) {
      avisar.exito("Vuelve a regir la plantilla por defecto");
      setPasos(plantilla.pasos.map((p) => ({ ...p, activo: true })));
      setPlazo(String(plantilla.plazoAtencionMin));
    }
  };

  return (
    <SeccionTarjeta titulo="Cadena de la empresa" sinRelleno>
      <p className="t-caption px-4 pt-3">
        Pasos en orden. El último activo debe ser una persona interna. Fuera de la franja nocturna, el agente escala con turno o respaldo.
      </p>
      {error ? <Alerta tono="danger" titulo={error} className="mx-4 mt-3" /> : null}
      <ul className="flex flex-col">
        {pasos.map((p, i) => (
          <FilaPasoCadena
            key={i}
            paso={p}
            indice={i}
            total={pasos.length}
            pendiente={pendiente}
            opcionesDest={opcionesDest}
            onCambiar={(paso) => setPasos(pasos.map((x, k) => (k === i ? paso : x)))}
            onMover={(delta) => mover(i, delta)}
          />
        ))}
      </ul>
      <div className="flex flex-wrap gap-2 p-4">
        <Button variant="secondary" disabled={pendiente || pasos.length >= 6} onClick={() => setPasos([...pasos, pasoVacio()])}>
          Agregar paso
        </Button>
        <div className="flex items-center gap-2">
          <label className="t-caption">Plazo «me hago cargo» (min)</label>
          <Input className="w-24" type="number" min={5} max={1440} value={plazo} onChange={(e) => setPlazo(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-border p-4">
        <Button disabled={pendiente} onClick={() => void guardar()}>
          Guardar cadena
        </Button>
        <Button variant="ghost" disabled={pendiente || !empresa} onClick={() => void restaurar()}>
          Usar plantilla por defecto
        </Button>
      </div>
    </SeccionTarjeta>
  );
}