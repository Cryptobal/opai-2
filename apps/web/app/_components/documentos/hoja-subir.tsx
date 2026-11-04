"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { avisar, Button, Sheet, Uploader } from "@opai/ds";

import { useHojaUrl, useParametros } from "../maestros/use-url";
import { CampoVincular, type OpcionesVincular, textoDestino } from "./campo-vincular";
import { CamposDocumento } from "./campos-documento";
import { CampoVisibilidad } from "./campo-visibilidad";
import { subirDocumento } from "./subir";
import { CAPA_DE_ENTIDAD, type EntidadDocumento, type TipoDocumento } from "./tipos";
import { useDestino } from "./use-destino";

/** Subir documento (17): archivo, tipo, emisión, vencimiento y visibilidad en portales. */
export function HojaSubir({
  entidad,
  tipos,
  portal = "erp",
  destino,
  vincular,
}: {
  entidad: EntidadDocumento;
  tipos: TipoDocumento[];
  /** Portal desde el que se sube (Supervisor en terreno). */
  portal?: string;
  /** A qué se vincula el documento, cuando la hoja no está dentro de la ficha de la entidad. */
  destino?: string;
  /**
   * Explorador: ofrece «Vincular a» (empresa, cuenta, instalación o persona) y, con `tipos` de
   * todas las capas, muestra solo los de la capa elegida. Sin esto la hoja sube a `entidad`.
   */
  vincular?: OpcionesVincular;
}) {
  const hoja = useHojaUrl("subir");
  const { valor } = useParametros();
  const router = useRouter();
  const {
    vinculo,
    setVinculo,
    reiniciar,
    visibles,
    destino: destinoSubida,
  } = useDestino(entidad, tipos, vincular);
  const [tipoId, setTipoId] = useState<string | null>(() => {
    const v = valor("tipo");
    return v && visibles.some((t) => t.id === v) ? v : null;
  });
  const [emitido, setEmitido] = useState("");
  const [vence, setVence] = useState("");
  const [portales, setPortales] = useState<string[]>([]);
  const [subidos, setSubidos] = useState(0);
  const [procesando, setProcesando] = useState(0);
  const reemplaza = valor("reemplaza");
  function cerrar() {
    if (subidos) router.refresh();
    setSubidos(0);
    if (vincular) {
      // La hoja queda montada: sin esto reabre con la entidad y el tipo de la vez anterior.
      reiniciar();
      setTipoId(null);
      setPortales([]);
    }
    hoja.cerrar();
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={cerrar}
      titulo={reemplaza ? "Nueva versión" : "Subir documento"}
      {...(vincular
        ? { descripcion: textoDestino(vinculo, vincular.etiquetas) }
        : destino
          ? { descripcion: destino }
          : {})}
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
        {vincular ? (
          <CampoVincular
            vinculo={vinculo}
            opciones={vincular}
            bloqueado={procesando > 0 || subidos > 0}
            onCambiar={(v) => {
              setVinculo(v);
              // Los tipos son de la capa de la entidad: un tipo de otra capa ya no se ofrece.
              const capa = CAPA_DE_ENTIDAD[v.tipo];
              if (!tipos.some((t) => t.id === tipoId && t.capa === capa)) {
                setTipoId(null);
                setPortales([]);
              }
            }}
          />
        ) : null}
        <Uploader
          disabled={!destinoSubida}
          tipos="PDF, JPG o PNG"
          multiple={!reemplaza}
          procesar={async (archivo, progreso) => {
            if (!destinoSubida) return;
            setProcesando((n) => n + 1);
            try {
              await subirDocumento(
                destinoSubida,
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
        <CamposDocumento
          visibles={visibles}
          tipoId={tipoId}
          onTipo={(t) => {
            setTipoId(t?.id ?? null);
            if (t) setPortales(t.visiblePortalDefault);
          }}
          emitido={emitido}
          onEmitido={setEmitido}
          vence={vence}
          onVence={setVence}
        />
        <CampoVisibilidad portales={portales} onCambiar={setPortales} />
      </div>
    </Sheet>
  );
}
