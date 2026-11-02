"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Select, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { clp } from "./datos";

export function HojaMover({
  filas,
  semanas,
}: {
  filas: { id: string; etiqueta: string }[];
  semanas: string[];
}) {
  const [abierta, setAbierta] = useState(false);
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [filaId, setFilaId] = useState(filas[0]?.id ?? "");
  const [semana, setSemana] = useState(semanas[0] ?? "");
  const [por, setPor] = useState("1");
  const [vista, setVista] = useState<{ movimientos: { desde: string; hasta: string; monto: number }[] } | null>(
    null,
  );

  const entrada = () => ({
    filaId,
    semanas: [semana],
    por: Number(por),
  });

  async function previsualizar() {
    setVista(await ejecutar("finanzas.celdas.mover", entrada(), true));
  }

  async function aplicar() {
    const r = await ejecutar("finanzas.celdas.mover", entrada());
    if (!r) return;
    avisar.exito("Celdas reprogramadas");
    setAbierta(false);
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setAbierta(true)}>
        Reprogramar…
      </Button>
      <Sheet
        abierto={abierta}
        onCerrar={() => setAbierta(false)}
        titulo="Reprogramar"
        descripcion="Mueve la cifra planificada ± N semanas con vista previa del saldo."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setAbierta(false)}>Cancelar</Button>
            {vista ? (
              <Button disabled={pendiente} onClick={() => void aplicar()}>Aplicar</Button>
            ) : (
              <Button disabled={pendiente || !filaId || !semana} onClick={() => void previsualizar()}>
                Ver vista previa
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error ? <Alerta tono="danger" titulo={error} /> : null}
          <Campo etiqueta="Fila" htmlFor="mv-fila">
            <Select
              id="mv-fila"
              valor={filaId}
              onCambiar={(v) => {
                setFilaId(v);
                setVista(null);
              }}
              opciones={filas.map((f) => ({ valor: f.id, etiqueta: f.etiqueta }))}
            />
          </Campo>
          <Campo etiqueta="Semana origen" htmlFor="mv-sem">
            <Select
              id="mv-sem"
              valor={semana}
              onCambiar={(v) => {
                setSemana(v);
                setVista(null);
              }}
              opciones={semanas.map((s) => ({ valor: s, etiqueta: s }))}
            />
          </Campo>
          <Campo etiqueta="Semanas a mover" htmlFor="mv-por">
            <Input id="mv-por" value={por} onChange={(e) => setPor(e.target.value)} inputMode="numeric" />
          </Campo>
          {vista?.movimientos.length ? (
            <ul className="text-sm text-fg-muted">
              {vista.movimientos.map((m) => (
                <li key={`${m.desde}-${m.hasta}`}>
                  {m.desde} → {m.hasta}: {clp(m.monto)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Sheet>
    </>
  );
}
