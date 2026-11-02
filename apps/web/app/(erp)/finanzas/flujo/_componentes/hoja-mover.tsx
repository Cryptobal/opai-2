"use client";

import { useMemo, useState } from "react";

import { Alerta, avisar, Button, Campo, Checkbox, Input, Select, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { clp } from "./datos";

export function HojaMover({
  filas,
  semanas,
  semanasPasadas,
  horizonte,
}: {
  filas: { id: string; etiqueta: string }[];
  semanas: string[];
  semanasPasadas: string[];
  horizonte: number;
}) {
  const [abierta, setAbierta] = useState(false);
  const { ejecutar, pendiente, error, codigo, limpiarError } = useCapacidad("erp");
  const [filaId, setFilaId] = useState(filas[0]?.id ?? "");
  const [semana, setSemana] = useState(semanas[0] ?? "");
  const [por, setPor] = useState("1");
  const [confirmarPasada, setConfirmarPasada] = useState(false);
  const [vista, setVista] = useState<{ movimientos: { desde: string; hasta: string; monto: number }[] } | null>(
    null,
  );
  const opcionesSemana = semanas.length ? semanas : [];
  const pasadasSet = useMemo(() => new Set(semanasPasadas), [semanasPasadas]);

  function abrir() {
    setSemana(semanas[0] ?? "");
    setVista(null);
    setConfirmarPasada(false);
    setAbierta(true);
  }

  const entrada = () => ({
    filaId,
    semanas: [semana],
    por: Number(por),
    ...(confirmarPasada ? { confirmarSemanaPasada: true as const } : {}),
  });

  const requiereConfirmacionPasada = (movs: { desde: string; hasta: string }[]) =>
    movs.some((m) => pasadasSet.has(m.desde) || pasadasSet.has(m.hasta));

  async function previsualizar() {
    limpiarError();
    const r = (await ejecutar("finanzas.celdas.mover", entrada(), true)) as {
      movimientos: { desde: string; hasta: string; monto: number }[];
    } | null;
    if (r) setVista(r);
  }

  async function aplicar() {
    if (vista && requiereConfirmacionPasada(vista.movimientos) && !confirmarPasada) {
      avisar.error("Confirma mover a una semana pasada antes de aplicar.");
      return;
    }
    const r = await ejecutar("finanzas.celdas.mover", entrada());
    if (!r) return;
    avisar.exito("Celdas reprogramadas");
    setAbierta(false);
  }

  const errorServidor = codigo === "INTERNAL";
  const avisoPasada =
    vista && requiereConfirmacionPasada(vista.movimientos) ? (
      <Alerta tono="warning" titulo="Semana pasada">
        El movimiento no queda respaldado por la cartola importada. Confirma antes de aplicar.
      </Alerta>
    ) : null;

  return (
    <>
      <Button variant="secondary" onClick={abrir}>
        Reprogramar…
      </Button>
      <Sheet
        abierto={abierta}
        onCerrar={() => setAbierta(false)}
        titulo="Reprogramar"
        descripcion={`Mueve la cifra planificada ± N semanas (horizonte ${horizonte} semanas).`}
        acciones={
          <>
            <Button variant="secondary" onClick={() => setAbierta(false)}>
              Cancelar
            </Button>
            {vista ? (
              <Button disabled={pendiente} onClick={() => void aplicar()}>
                Aplicar
              </Button>
            ) : (
              <Button disabled={pendiente || !filaId || !semana} onClick={() => void previsualizar()}>
                Ver vista previa
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {error ? (
            <Alerta tono="danger" titulo={errorServidor ? "Error del servidor" : error}>
              {errorServidor ? (
                <Button variant="secondary" className="mt-2" onClick={() => void previsualizar()}>
                  Reintentar
                </Button>
              ) : null}
            </Alerta>
          ) : null}
          {avisoPasada}
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
                setConfirmarPasada(false);
              }}
              opciones={opcionesSemana.map((s) => ({ valor: s, etiqueta: s }))}
            />
          </Campo>
          <Campo etiqueta="Semanas a mover" htmlFor="mv-por">
            <Input id="mv-por" value={por} onChange={(e) => setPor(e.target.value)} inputMode="numeric" />
          </Campo>
          {vista && requiereConfirmacionPasada(vista.movimientos) ? (
            <Checkbox
              marcado={confirmarPasada}
              onCambiar={setConfirmarPasada}
              etiqueta="Confirmo mover a una semana pasada"
            />
          ) : null}
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
