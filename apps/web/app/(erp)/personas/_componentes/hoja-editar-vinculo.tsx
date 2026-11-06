"use client";
import { useState } from "react";
import { Alerta, avisar, Button, Sheet } from "@opai/ds";
import { useHojaUrl } from "@/app/_components/maestros/use-url";
import { useCapacidad } from "@/app/_components/use-capacidad";
import type { Vinculo } from "@/lib/tipos-sueldo";
import type { OpcionesDestino } from "./campos-destino-vinculo";
import { CamposVinculo, conTermino, type DatosVinculo, vinculoInvalido } from "./campos-vinculo";
import { PreviewVinculo, type PreviewVinculo as Vista } from "./preview-vinculo";

type Props = OpcionesDestino & {
  actual: Vinculo;
  cargos: readonly { valor: string; etiqueta: string }[];
};

export function HojaEditarVinculo({ actual, cargos, ...opciones }: Props) {
  const hoja = useHojaUrl("editar-vinculo");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [v, setV] = useState<DatosVinculo>({
    instalacionId: actual.instalacionId ?? "",
    puestoId: actual.puestoId ?? "",
    horasSemanales: String(actual.horasSemanales ?? ""),
    distribucion: actual.distribucion ?? "",
    cargoId: actual.cargoId,
    tipo: actual.tipo,
    inicio: actual.inicio,
    termino: actual.termino ?? "",
  });
  const [vista, setVista] = useState<Vista | null>(null);
  const termino = conTermino(v.tipo) ? v.termino : "";
  const sinCambios =
    v.inicio === actual.inicio &&
    v.cargoId === actual.cargoId &&
    v.tipo === actual.tipo &&
    termino === (actual.termino ?? "") &&
    v.instalacionId === (actual.instalacionId ?? "") &&
    v.puestoId === (actual.puestoId ?? "") &&
    Number(v.horasSemanales) === actual.horasSemanales &&
    v.distribucion.trim() === actual.distribucion;
  const invalido = vinculoInvalido(v);
  const input = {
    id: actual.id,
    ...(actual.updatedAt ? { versionEsperada: actual.updatedAt } : {}),
    // Solo si cambió: un cargo ya desactivado no se puede reenviar (core.vinculos.update lo rechaza).
    ...(v.cargoId !== actual.cargoId ? { cargoId: v.cargoId } : {}),
    tipo: v.tipo,
    inicio: v.inicio,
    termino: termino || null,
    instalacionId: v.instalacionId,
    puestoId: v.puestoId || null,
    horasSemanales: Number(v.horasSemanales),
    distribucion: v.distribucion.trim(),
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
      titulo="Cambiar cargo, contrato, instalación o jornada"
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
        <fieldset disabled={pendiente}>
          <CamposVinculo
            {...opciones}
            cargos={cargos}
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
