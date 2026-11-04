"use client";

import { useMemo, useState } from "react";

import { Alerta, avisar, Button, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { CamposMover } from "./campos-mover";

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
            <Alerta tono="danger" titulo={errorServidor ? "No pudimos completar la acción. Reintenta; si sigue igual, avisa a un administrador." : error}>
              {errorServidor ? (
                <Button variant="secondary" className="mt-2" onClick={() => void previsualizar()}>
                  Reintentar
                </Button>
              ) : null}
            </Alerta>
          ) : null}
          {avisoPasada}
          <CamposMover
            filas={filas}
            semanas={semanas}
            filaId={filaId}
            semana={semana}
            por={por}
            vista={vista}
            requierePasada={Boolean(vista && requiereConfirmacionPasada(vista.movimientos))}
            confirmarPasada={confirmarPasada}
            on={{
              fila: (v) => { setFilaId(v); setVista(null); },
              semana: (v) => { setSemana(v); setVista(null); setConfirmarPasada(false); },
              por: setPor,
              confirmar: setConfirmarPasada,
            }}
          />
        </div>
      </Sheet>
    </>
  );
}
