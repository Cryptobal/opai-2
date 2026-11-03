"use client";

import { useEffect, useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Select, Sheet } from "@opai/ds";

import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { diaSemana, fechaCl } from "./etiquetas";
import type { MesPauta } from "./tipos";

type Sugerencia = {
  personaId: string;
  nombre: string;
  mismaInstalacion: boolean;
  horasSemana: number;
  conflictos: string[];
};

/** P08: asignar reemplazo con sugerencias (`?reemplazo=puestoId_fecha`). */
export function HojaReemplazo({ mes, puedeEditar }: { mes: MesPauta; puedeEditar: boolean }) {
  const hoja = useHojaUrl("reemplazo");
  if (!hoja.abierta || !hoja.valor) return null;
  const [puestoId, fecha] = hoja.valor.split("_");
  const puesto = mes.puestos.find((p) => p.id === puestoId);
  if (!puesto || !fecha) return null;
  return (
    <Formulario
      key={hoja.valor}
      puestoId={puesto.id}
      puestoNombre={puesto.nombre}
      horario={puesto.horario}
      fecha={fecha}
      puedeEditar={puedeEditar}
      onCerrar={hoja.cerrar}
    />
  );
}

function Formulario({
  puestoId,
  puestoNombre,
  horario,
  fecha,
  puedeEditar,
  onCerrar,
}: {
  puestoId: string;
  puestoNombre: string;
  horario: string;
  fecha: string;
  puedeEditar: boolean;
  onCerrar: () => void;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [personaId, setPersonaId] = useState("");
  const [motivo, setMotivo] = useState("");

  useEffect(() => {
    void (async () => {
      const r = await ejecutar<{ sugerencias: Sugerencia[] }>("pauta.reemplazos.sugerir", { puestoId, fecha });
      if (r?.sugerencias.length) {
        setSugerencias(r.sugerencias);
        setPersonaId(r.sugerencias[0]!.personaId);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir la hoja
  }, [puestoId, fecha]);

  const elegida = sugerencias.find((s) => s.personaId === personaId);
  const bloqueada = Boolean(elegida?.conflictos.length);

  async function asignar() {
    const r = await ejecutar<{ variante: "reemplazo" | "refuerzo_extra" | null }>("pauta.reemplazos.asignar", {
      puestoId,
      fecha,
      personaId,
      motivo: motivo.trim(),
    });
    if (r) {
      avisar.exito("Reemplazo asignado");
      if (r.variante === "refuerzo_extra") {
        avisar.info("Quedará como turno extra por aprobar.");
      }
      onCerrar();
    }
  }

  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo={`Asignar reemplazo · ${puestoNombre}`}
      descripcion={`${diaSemana(fecha)} ${fechaCl(fecha)} · ${horario}`}
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cerrar
          </Button>
          {puedeEditar ? (
            <Button
              onClick={() => void asignar()}
              cargando={pendiente}
              disabled={!personaId || motivo.trim().length < 3 || bloqueada}
            >
              Asignar reemplazo
            </Button>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {!puedeEditar ? <p className="t-caption">Solo lectura: tu rol no edita la pauta.</p> : null}
        {sugerencias.length === 0 && !pendiente ? (
          <p className="t-body-sm text-fg-muted">No hay guardias sugeridos para este turno.</p>
        ) : (
          <>
            <Campo etiqueta="Guardia" htmlFor="rep-persona">
              <Select
                id="rep-persona"
                valor={personaId}
                onCambiar={setPersonaId}
                opciones={sugerencias.map((s) => ({ valor: s.personaId, etiqueta: s.nombre }))}
              />
            </Campo>
            {elegida ? (
              <p className="t-caption text-fg-muted">
                {elegida.mismaInstalacion ? "Misma instalación" : "Otra instalación"} ·{" "}
                {elegida.horasSemana.toFixed(1).replace(".", ",")} h en la semana
                {elegida.conflictos.length ? ` · ${elegida.conflictos.join(" · ")}` : ""}
              </p>
            ) : null}
            {bloqueada ? (
              <Alerta tono="danger" titulo="No se puede asignar">
                {elegida?.conflictos.join(" · ")}
              </Alerta>
            ) : null}
            <Campo etiqueta="Motivo" htmlFor="rep-motivo">
              <Input
                id="rep-motivo"
                value={motivo}
                placeholder="Contingencia, licencia del titular…"
                onChange={(e) => setMotivo(e.target.value)}
              />
            </Campo>
            <p className="t-caption text-fg-muted">
              Quedará como turno extra por aprobar.
            </p>
          </>
        )}
      </div>
    </Sheet>
  );
}
