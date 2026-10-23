"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { avisar, Button, Campo, Combobox, InputFecha, Sheet, Switch, Uploader } from "@opai/ds";

import { useHojaUrl, useParametros } from "../maestros/use-url";
import { subirDocumento } from "./subir";
import type { EntidadDocumento, TipoDocumento } from "./tipos";

/** Subir documento (17): archivo, tipo, emisión, vencimiento y visibilidad en portales. */
export function HojaSubir({
  entidad,
  tipos,
  portal = "erp",
}: {
  entidad: EntidadDocumento;
  tipos: TipoDocumento[];
  /** Portal desde el que se sube (Supervisor en terreno). */
  portal?: string;
}) {
  const hoja = useHojaUrl("subir");
  const { valor } = useParametros();
  const router = useRouter();
  const [tipoId, setTipoId] = useState<string | null>(valor("tipo"));
  const [emitido, setEmitido] = useState("");
  const [vence, setVence] = useState("");
  const [portales, setPortales] = useState<string[]>([]);
  const [subidos, setSubidos] = useState(0);
  const [procesando, setProcesando] = useState(0);
  const tipo = tipos.find((t) => t.id === tipoId);
  const reemplaza = valor("reemplaza");
  function cerrar() {
    if (subidos) router.refresh();
    setSubidos(0);
    hoja.cerrar();
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={cerrar}
      titulo={reemplaza ? "Nueva versión" : "Subir documento"}
      acciones={
        <>
          <Button variant="secondary" onClick={cerrar}>
            Cancelar
          </Button>
          <Button
            disabled={procesando > 0 || subidos === 0}
            onClick={() => {
              avisar.exito(
                subidos === 1 ? "Documento guardado" : `${subidos} documentos guardados`,
              );
              cerrar();
            }}
          >
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Uploader
          tipos="PDF, JPG o PNG"
          multiple={!reemplaza}
          procesar={async (archivo, progreso) => {
            setProcesando((n) => n + 1);
            try {
              await subirDocumento(
                entidad,
                archivo,
                {
                  ...(tipoId ? { tipoId } : {}),
                  ...(emitido ? { emitidoEn: emitido } : {}),
                  ...(vence ? { venceEn: vence } : {}),
                  ...(reemplaza ? { reemplazaAId: reemplaza } : {}),
                  visibleEn: portales,
                },
                progreso,
                portal,
              );
              setSubidos((n) => n + 1);
            } finally {
              setProcesando((n) => n - 1);
            }
          }}
        />
        <Campo
          etiqueta="Tipo de documento"
          htmlFor="d-tipo"
          ayuda="Elígelo antes de agregar el archivo."
        >
          <Combobox
            id="d-tipo"
            placeholder="Elegir tipo"
            opciones={tipos.map((t) => ({
              valor: t.id,
              etiqueta: t.nombre,
              ...(t.obligatorio ? { detalle: "Obligatorio" } : {}),
            }))}
            valor={tipoId}
            onCambiar={([v]) => {
              setTipoId(v ?? null);
              const t = tipos.find((x) => x.id === v);
              if (t) setPortales(t.visiblePortalDefault);
            }}
          />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Emisión" htmlFor="d-emision">
            <InputFecha id="d-emision" valor={emitido} onCambiar={setEmitido} />
          </Campo>
          {tipo?.tieneVencimiento !== false ? (
            <Campo etiqueta="Vencimiento" htmlFor="d-vence">
              <InputFecha id="d-vence" valor={vence} onCambiar={setVence} />
            </Campo>
          ) : null}
        </div>
        <fieldset>
          <legend className="t-label mb-1 text-fg">Visible en portal</legend>
          {[
            ["cliente", "Cliente"],
            ["trabajador", "Trabajador"],
          ].map(([id, etiqueta]) => (
            <Switch
              key={id}
              etiqueta={etiqueta ?? ""}
              activo={portales.includes(id ?? "")}
              onCambiar={(on) =>
                setPortales((p) => (on ? [...p, id ?? ""] : p.filter((x) => x !== id)))
              }
            />
          ))}
          <p className="t-caption">Se aplica a los portales cuando estén disponibles.</p>
        </fieldset>
      </div>
    </Sheet>
  );
}
