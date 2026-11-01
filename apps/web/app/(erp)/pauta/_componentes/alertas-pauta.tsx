"use client";

import { useEffect, useState } from "react";

import { Alerta, Button, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { fechaCl } from "./etiquetas";

type AlertaPauta = {
  personaId: string;
  nombre: string;
  tipo: "semanal" | "mensual" | "descanso";
  mensaje: string;
  horas?: number;
  limite?: number;
};

/** P09: alertas de horas legales de la instalación (`?alertas=1`). */
export function AlertasPauta({ instalacionId, semana }: { instalacionId: string; semana: string }) {
  const hoja = useHojaUrl("alertas");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [alertas, setAlertas] = useState<AlertaPauta[]>([]);
  const [semanaDesde, setSemanaDesde] = useState<string | null>(null);

  useEffect(() => {
    if (!hoja.abierta) return;
    let cancel = false;
    void (async () => {
      const r = await ejecutar<{ semanaDesde: string; alertas: AlertaPauta[] }>("pauta.alertas.listar", {
        instalacionId,
        semana,
      });
      if (r && !cancel) {
        setSemanaDesde(r.semanaDesde);
        setAlertas(r.alertas);
      }
    })();
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recargar al abrir
  }, [hoja.abierta, instalacionId, semana]);

  if (!hoja.abierta) return null;

  return (
    <Sheet
      abierto
      onCerrar={hoja.cerrar}
      titulo="Alertas de horas"
      descripcion={
        semanaDesde ? `Semana desde el ${fechaCl(semanaDesde)} · ${alertas.length} alertas` : "Cargando…"
      }
      acciones={
        <Button variant="secondary" onClick={hoja.cerrar}>
          Cerrar
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {pendiente && alertas.length === 0 ? (
          <p className="t-caption text-fg-muted">Consultando turnos programados…</p>
        ) : null}
        {!pendiente && alertas.length === 0 ? (
          <p className="t-body-sm text-fg-muted">No hay alertas de horas legales en esta semana.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {alertas.map((a) => (
              <li key={`${a.personaId}-${a.tipo}-${a.mensaje}`}>
                <Alerta tono="warning" titulo={a.nombre}>
                  {a.mensaje}
                </Alerta>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Sheet>
  );
}
