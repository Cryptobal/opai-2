"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  CLASES_PLANTILLA,
  ETIQUETA_CLASE_PLANTILLA,
  nivelPlantillaValido,
  type ClasePlantilla,
  type NivelPlantilla,
} from "@opai/domain";
import { avisar, Button, Campo, Dialog, Input, Segmentado, Select } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

/**
 * «Nueva plantilla» del diseño 05: nombre, tipo y firma por defecto; al crearla abre el editor (06)
 * para escribir el texto. Misma capacidad que la API y el MCP (`core.documento_plantillas.create`).
 */
export function NuevaPlantilla() {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [clase, setClase] = useState<ClasePlantilla>("contrato_trabajo");
  const [nivel, setNivel] = useState<NivelPlantilla>("N2");
  const [pendiente, iniciar] = useTransition();
  const valido = nombre.trim().length >= 2 && nivelPlantillaValido(clase, nivel);

  const elegirClase = (c: ClasePlantilla) => {
    setClase(c);
    if (!nivelPlantillaValido(c, nivel)) setNivel("N2");
  };
  const crear = () =>
    iniciar(async () => {
      const r = await ejecutarCapacidad(
        "erp",
        "core.documento_plantillas.create",
        { nombre: nombre.trim(), clase, nivelFirma: nivel },
        false,
        "layout",
        crypto.randomUUID(),
      );
      if (!r.ok) return void avisar.error(r.error.message);
      router.push(`/documentos/plantillas/${(r.data as { id: string }).id}`);
    });

  const nivelOpcion = (n: NivelPlantilla) => ({
    id: n,
    etiqueta: n,
    onClick: () => setNivel(n),
    disabled: !nivelPlantillaValido(clase, n),
  });
  return (
    <>
      <Button onClick={() => setAbierto(true)}>
        <Plus aria-hidden className="size-4" />
        Nueva plantilla
      </Button>
      <Dialog
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo="Nueva plantilla"
        descripcion="Después escribes el texto en el editor."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button disabled={!valido || pendiente} onClick={crear}>
              Crear y editar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Campo etiqueta="Nombre" htmlFor="plantilla-nombre">
            <Input
              id="plantilla-nombre"
              value={nombre}
              maxLength={120}
              placeholder="Contrato indefinido"
              onChange={(ev) => setNombre(ev.target.value)}
            />
          </Campo>
          <Campo etiqueta="Tipo">
            <Select
              aria-label="Tipo"
              valor={clase}
              onCambiar={(v) => elegirClase(v as ClasePlantilla)}
              opciones={CLASES_PLANTILLA.map((c) => ({
                valor: c,
                etiqueta: ETIQUETA_CLASE_PLANTILLA[c],
              }))}
            />
          </Campo>
          <Campo
            etiqueta="Firma por defecto"
            ayuda="Contratos y anexos piden N2 como mínimo. N3 (FEA) está apagada."
          >
            <Segmentado
              etiqueta="Firma por defecto"
              activa={nivel}
              opciones={[nivelOpcion("N1"), nivelOpcion("N2")]}
            />
          </Campo>
        </div>
      </Dialog>
    </>
  );
}
