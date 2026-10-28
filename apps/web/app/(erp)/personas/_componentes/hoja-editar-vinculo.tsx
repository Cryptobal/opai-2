"use client";
import { useState } from "react";
import { Alerta, avisar, Button, Campo, InputFecha, Sheet } from "@opai/ds";
import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";
import type { Vinculo } from "@/lib/tipos-sueldo";
import { CamposDestinoVinculo, type OpcionesDestino } from "./campos-destino-vinculo";
import { PreviewVinculo, type PreviewVinculo as Vista } from "./preview-vinculo";

export function HojaEditarVinculo({ actual, ...opciones }: OpcionesDestino & { actual: Vinculo }) {
  const hoja = useHojaUrl("editar-vinculo");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [v, setV] = useState({
    instalacionId: actual.instalacionId ?? "",
    puestoId: actual.puestoId ?? "",
    horasSemanales: String(actual.horasSemanales ?? ""),
    distribucion: actual.distribucion ?? "",
  });
  const [inicio, setInicio] = useState(actual.inicio);
  const [vista, setVista] = useState<Vista | null>(null);
  const sinCambios =
    inicio === actual.inicio &&
    v.instalacionId === (actual.instalacionId ?? "") &&
    v.puestoId === (actual.puestoId ?? "") &&
    Number(v.horasSemanales) === actual.horasSemanales &&
    v.distribucion.trim() === actual.distribucion;
  const invalido =
    !inicio ||
    !v.instalacionId ||
    !/^\d+$/.test(v.horasSemanales) ||
    Number(v.horasSemanales) < 1 ||
    Number(v.horasSemanales) > 168 ||
    !v.distribucion.trim();
  const input = {
    id: actual.id,
    inicio,
    ...(actual.updatedAt ? { versionEsperada: actual.updatedAt } : {}),
    ...v,
    puestoId: v.puestoId || null,
    horasSemanales: Number(v.horasSemanales),
  };
  async function revisar() {
    const valido = await ejecutar("core.vinculos.update", input, true);
    if (!valido) return;
    setVista(
      await ejecutar<Vista>("core.vinculos.previsualizar", {
        personaId: actual.personaId,
        instalacionId: v.instalacionId,
        puestoId: v.puestoId || null,
      }),
    );
  }
  async function guardar() {
    if (!(await ejecutar("core.vinculos.update", input))) return;
    avisar.exito("Vínculo actualizado");
    hoja.cerrar();
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Editar vínculo"
      acciones={
        <>
          <Button variant="secondary" disabled={pendiente} onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button
            disabled={pendiente || invalido || sinCambios}
            onClick={() => void (vista ? guardar() : revisar())}
          >
            {pendiente ? "Procesando…" : vista ? "Guardar cambio" : "Revisar cambio"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4" aria-busy={pendiente}>
        {error ? (
          <Alerta tono="danger" titulo="No se pudo guardar">
            {error} Revisa los datos e intenta nuevamente.
          </Alerta>
        ) : null}
        <fieldset disabled={pendiente} className="flex flex-col gap-4">
          <Campo etiqueta="Desde (inicio del vínculo)" htmlFor="editar-v-inicio">
            <InputFecha
              id="editar-v-inicio"
              valor={inicio}
              onCambiar={(fecha) => {
                setInicio(fecha);
                setVista(null);
              }}
            />
          </Campo>
          <CamposDestinoVinculo
            {...opciones}
            v={v}
            onCambiar={(nuevo) => {
              setV(nuevo);
              setVista(null);
            }}
          />
        </fieldset>
        {vista ? <PreviewVinculo vista={vista} /> : null}
      </div>
    </Sheet>
  );
}
