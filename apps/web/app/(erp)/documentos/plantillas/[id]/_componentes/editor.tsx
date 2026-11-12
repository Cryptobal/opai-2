"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";

import { envolverSeleccion, insertarEnTexto } from "@opai/domain";
import { Alerta, DetailScreen, Sheet, Skeleton } from "@opai/ds";

import { fecha } from "@/lib/fechas";

import { AvisoVariables } from "./aviso-variables";
import { AccionesEditor } from "./acciones-editor";
import { BarraEditor, type ModoEditor } from "./barra-editor";
import { PanelVariables } from "./panel-variables";
import { ORIGEN_PLANTILLA, type PlantillaEditor } from "./tipos";
import { useEditorPlantilla } from "./use-editor";
import { Visor } from "./visor";

// La firma (Radix RadioGroup, ~11 KB) se carga aparte: no se usa en el teléfono y la ruta queda en
// 172 KB, con tope propio de 173 KB (ADR-037).
const PanelFirma = dynamic(() => import("./panel-firma").then((m) => m.PanelFirma), {
  loading: () => <Skeleton className="h-80 w-full" />,
});

/**
 * Pantalla 06 · Editor de plantillas (export documentos v4). 375: solo lectura con aviso; 1024: texto
 * y firma, variables en una hoja; 1280: panel de variables, texto y firma. Owner y admin.
 */
export function EditorPlantilla({ inicial }: { inicial: PlantillaEditor }) {
  const e = useEditorPlantilla(inicial);
  const area = useRef<HTMLTextAreaElement>(null);
  const [modo, setModo] = useState<ModoEditor>("editar");
  const [hoja, setHoja] = useState(false);
  const { p } = e;

  const seleccionar = (inicio: number, fin: number) =>
    requestAnimationFrame(() => {
      area.current?.focus();
      area.current?.setSelectionRange(inicio, fin);
    });
  const insertar = (clave: string) => {
    const a = area.current;
    const r = insertarEnTexto(
      e.texto,
      a?.selectionStart ?? e.texto.length,
      a?.selectionEnd ?? e.texto.length,
      `{${clave}}`,
    );
    e.setTexto(r.texto);
    setHoja(false);
    setModo("editar");
    seleccionar(r.cursor, r.cursor);
  };
  const enfatizar = (marca: "**" | "*") => {
    const a = area.current;
    const r = envolverSeleccion(e.texto, a?.selectionStart ?? 0, a?.selectionEnd ?? 0, marca);
    e.setTexto(r.texto);
    seleccionar(r.inicio, r.fin);
  };
  const verEnTexto = (clave: string) => {
    const i = e.texto.indexOf(`{${clave}}`);
    setModo("editar");
    if (i >= 0) seleccionar(i, i + clave.length + 2);
  };

  const vigente = `vigente: v${p.versionVigente}${p.ultimaEdicionEn ? ` del ${fecha(p.ultimaEdicionEn)}` : ""}`;
  const subtitulo =
    p.borrador || e.texto !== p.contenido
      ? `Borrador de la versión ${p.versionVigente + 1} · ${vigente}`
      : `Versión ${vigente}`;

  return (
    <DetailScreen
      state="ready"
      titulo={p.nombre}
      subtitulo={subtitulo}
      estado={<span className="t-overline">{`${p.tipo} · ${ORIGEN_PLANTILLA[p.origen]}`}</span>}
      acciones={<AccionesEditor e={e} />}
    >
      {e.archivada ? (
        <Alerta tono="warning" titulo="Plantilla archivada" className="mb-3">
          Se puede leer, pero no editar ni publicar.
        </Alerta>
      ) : null}
      <Alerta tono="info" titulo="Edita en un computador" className="mb-3 md:hidden">
        En el teléfono la plantilla es de solo lectura.
      </Alerta>
      <div className="grid items-start gap-5 md:grid-cols-[minmax(0,1fr)_240px] xl:grid-cols-[200px_minmax(0,1fr)_240px]">
        <div className="hidden min-w-0 xl:flex">
          <PanelVariables onInsertar={insertar} />
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <BarraEditor
            modo={modo}
            onModo={setModo}
            onEnfasis={enfatizar}
            onVariable={() => setHoja(true)}
          />
          <AvisoVariables desconocidas={e.desconocidas} onVer={verEnTexto} />
          <Visor
            area={area}
            texto={e.texto}
            onTexto={e.setTexto}
            pendiente={e.pendiente || e.archivada}
            modo={modo}
            titulo={p.tipo}
          />
        </div>
        <div className="hidden min-w-0 flex-col gap-4 md:flex">
          <PanelFirma
            clase={p.clase}
            nivel={e.nivel}
            firmantes={e.firmantes}
            onNivel={e.setNivel}
            onFirmantes={e.setFirmantes}
            soloLectura={e.pendiente || e.archivada}
          />
        </div>
      </div>
      <Sheet
        abierto={hoja}
        onCerrar={() => setHoja(false)}
        titulo="Variables"
        descripcion="Toca una variable para insertarla donde está el cursor."
      >
        <PanelVariables onInsertar={insertar} />
      </Sheet>
    </DetailScreen>
  );
}
