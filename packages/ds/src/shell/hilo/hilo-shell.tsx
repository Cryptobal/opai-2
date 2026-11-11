"use client";

import { useEffect, useState } from "react";

import { cn } from "../../cn";
import { LinkPorDefecto } from "../types";
import { BarraHilo } from "./barra";
import { CabeceraHilo } from "./cabecera";
import { ColumnaHilo } from "./columna";
import { IndiceHilo } from "./indice";
import { LienzoHilo } from "./lienzo";
import { PortalesHilo } from "./portales";
import { RielHilo } from "./riel";
import type { HiloShellProps } from "./props";
import type { PanelHilo, SegmentoHilo } from "./tipos";
import { clasesVista, vistaHilo } from "./vista";

const PANEL = {
  indice: { titulo: "Índice", sub: "Todas las pantallas del portal" },
  portales: { titulo: "Portales", sub: "Dónde quieres entrar" },
} as const;

/**
 * Marco «Hilo» (ADR-090; diseño en docs/2.0/design/export-base-hilo/): tres piezas iguales en
 * escritorio, iPad y iPhone. El hilo (lo que espera una respuesta, lo que pasó y lo que viene), el
 * lienzo (la pantalla de trabajo) y la barra al pie. Sin barra lateral ni barra inferior: el Índice
 * y los Portales se abren dentro del lienzo, con la página montada debajo.
 */
export function HiloShell(p: HiloShellProps) {
  const Link = p.Link ?? LinkPorDefecto;
  const [segmento, setSegmento] = useState<SegmentoHilo>(p.segmentoInicial ?? "pendientes");
  // El panel pertenece a la ruta en que se abrió: al navegar se cierra solo, sin efectos.
  const [panel, setPanel] = useState<{ tipo: PanelHilo; ruta: string } | null>(
    p.panelInicial ? { tipo: p.panelInicial, ruta: p.rutaActual } : null,
  );
  const [lienzoAbierto, setLienzoAbierto] = useState(false);
  const activo = panel?.ruta === p.rutaActual ? panel.tipo : null;
  const vista = vistaHilo(p.rutaActual, p.inicioHref, p.ancha);
  const clases = clasesVista(vista, lienzoAbierto || activo !== null);
  // Los diálogos y menús se pintan en <body>: mientras el marco vive, todo el documento usa su piel.
  useEffect(() => {
    document.documentElement.dataset["marco"] = "hilo";
    return () => {
      delete document.documentElement.dataset["marco"];
    };
  }, []);
  const alternar = (tipo: PanelHilo) =>
    setPanel(activo === tipo ? null : { tipo, ruta: p.rutaActual });
  const cerrarPanel = () => setPanel(null);
  const elegirSegmento = (s: SegmentoHilo) => {
    setSegmento(s);
    p.onSegmento?.(s);
  };
  const pendientes = p.pendientes.estado === "listo" ? p.pendientes.items.length : null;
  const contenido =
    activo === "indice" ? (
      <IndiceHilo areas={p.indice} onElegir={cerrarPanel} Link={Link} />
    ) : activo === "portales" ? (
      <PortalesHilo
        portales={p.portales}
        portalActual={p.portalActual}
        empresas={p.empresas}
        cuenta={p.cuenta}
        onTema={p.onTema}
      />
    ) : null;
  return (
    <div
      data-marco="hilo"
      data-vista={vista}
      className="grid h-dvh grid-cols-1 grid-rows-[minmax(0,1fr)_auto] overflow-hidden bg-bg pt-[env(safe-area-inset-top)] text-fg lg:grid-cols-[auto_minmax(0,1fr)]"
    >
      <RielHilo
        monograma={p.monograma}
        inicioHref={p.inicioHref}
        pendientes={pendientes}
        onPortales={() => alternar("portales")}
        onIndice={() => alternar("indice")}
        onTema={p.onTema}
        Link={Link}
        className={cn(clases.riel, "lg:col-start-1 lg:row-span-2 lg:row-start-1")}
      />
      <aside
        aria-label="Hilo"
        className={cn(
          clases.hilo,
          "min-h-0 min-w-0 flex-col lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:w-[370px] lg:border-r lg:border-border hilo:w-[440px]",
        )}
      >
        <CabeceraHilo
          monograma={p.monograma}
          sujeto={p.sujeto}
          sujetoSub={p.sujetoSub}
          inicioHref={p.inicioHref}
          onPortales={() => alternar("portales")}
          onInicio={() => {
            cerrarPanel();
            setLienzoAbierto(true);
          }}
          onIndice={() => alternar("indice")}
          onTema={p.onTema}
          Link={Link}
        />
        <ColumnaHilo
          saludo={p.saludo}
          resumen={p.resumen}
          segmento={segmento}
          onSegmento={elegirSegmento}
          pendientes={p.pendientes}
          actividad={p.actividad}
          agenda={p.agenda}
          rutaActual={p.rutaActual}
          inicioHref={p.inicioHref}
          onReintentar={p.onReintentar}
          Link={Link}
        />
      </aside>
      <LienzoHilo
        titulo={p.titulo}
        sub={p.sub}
        insignia={p.insignia}
        volver={p.volver}
        volverSoloMovil={p.volverSoloMovil}
        inicioHref={p.inicioHref}
        vista={vista}
        panel={activo && contenido ? { ...PANEL[activo], contenido } : undefined}
        onCerrarPanel={cerrarPanel}
        onCerrarLienzo={() => setLienzoAbierto(false)}
        acciones={p.acciones}
        accionesTelefono={p.accionesTelefono}
        completo={p.completo}
        Link={Link}
        className={cn(clases.lienzo, "lg:col-start-2 lg:row-start-1")}
      >
        {p.children}
      </LienzoHilo>
      <BarraHilo {...p.barra} onBuscar={p.onBuscar} className="lg:col-start-2 lg:row-start-2" />
    </div>
  );
}
