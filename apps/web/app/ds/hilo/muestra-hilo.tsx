"use client";

import Link from "next/link";

import { Enlace, type EstadoLista, HiloShell, type LinkComponent, type PanelHilo, type SegmentoHilo } from "@opai/ds";

import { ACTIVIDAD, AGENDA, INDICE, PENDIENTES } from "./datos";
import { PiezasHilo } from "./piezas";

const LinkNext: LinkComponent = ({ href, className, children, ...rest }) => (
  <Link href={href} className={className} {...rest}>
    {children}
  </Link>
);
const nada = () => undefined;

export type ParametrosMuestra = {
  vista: "inicio" | "pantalla" | "ancha" | "piezas";
  estado: EstadoLista | "vacio";
  panel?: PanelHilo;
  segmento?: SegmentoHilo;
  /** La barra con agente (índigo) o sin agente (búsqueda en tinta). */
  agente?: boolean;
};

const VARIANTES: readonly [string, string][] = [
  ["Inicio, con pendientes", "/ds/hilo"],
  ["Inicio, sin pendientes", "/ds/hilo?estado=vacio"],
  ["Inicio, cargando", "/ds/hilo?estado=cargando"],
  ["Inicio, con error", "/ds/hilo?estado=error"],
  ["Actividad", "/ds/hilo?segmento=actividad"],
  ["Agenda", "/ds/hilo?segmento=agenda"],
  ["Una pantalla de trabajo", "/ds/hilo?vista=pantalla"],
  ["Una planilla (hilo plegado)", "/ds/hilo?vista=ancha"],
  ["Piezas por dentro: botones, campos, etiquetas y tabla", "/ds/hilo?vista=piezas"],
  ["Índice", "/ds/hilo?panel=indice"],
  ["Portales", "/ds/hilo?panel=portales"],
  ["Barra sin agente", "/ds/hilo?agente=no"],
];

const TITULO = { inicio: "Inicio", ancha: "Pauta", pantalla: "Cuentas", piezas: "Piezas y estados" } as const;
const SUB = { inicio: "", ancha: "Operaciones", pantalla: "Comercial", piezas: "Diseño" } as const;

/** Marco Hilo con los datos ficticios del diseño aprobado; cada estado tiene su enlace. */
export function MuestraHilo({ vista, estado, panel, segmento, agente = true }: ParametrosMuestra) {
  const lista = <T,>(items: T[]) => ({
    estado: estado === "vacio" ? ("listo" as const) : estado,
    items: estado === "listo" ? items : [],
  });
  const ruta = vista === "inicio" ? "/ds/hilo" : "/ds/hilo/pantalla";
  return (
    <HiloShell
      key={`${vista}-${estado}-${panel ?? ""}-${segmento ?? ""}`}
      monograma="G"
      sujeto="Gard Security"
      sujetoSub="ERP · Camilo Ibarra"
      saludo="Buen día, Camilo."
      resumen={estado === "listo" ? "3 decisiones te esperan." : "No tienes decisiones pendientes."}
      rutaActual={ruta}
      inicioHref="/ds/hilo"
      ancha={vista === "ancha"}
      titulo={TITULO[vista]}
      sub={SUB[vista]}
      pendientes={lista(PENDIENTES)}
      actividad={lista(ACTIVIDAD)}
      agenda={lista(AGENDA)}
      onReintentar={nada}
      indice={INDICE}
      portales={[
        { id: "erp", etiqueta: "ERP", href: "/ds/hilo", descripcion: "Dueños, gerencia y administración" },
        { id: "supervisor", etiqueta: "Supervisor", href: "/ds/hilo", descripcion: "Supervisores en terreno" },
        { id: "platform", etiqueta: "Plataforma", href: "/ds/hilo", descripcion: "Operadores de OPAI" },
      ]}
      portalActual="erp"
      empresas={[
        { id: "t-1", etiqueta: "Gard Security", marcado: true, onSelect: nada },
        { id: "t-2", etiqueta: "Servicios Andes SpA", onSelect: nada },
      ]}
      cuenta={[
        { id: "pref", etiqueta: "Preferencias", descripcion: "Tema y diseño", onSelect: nada },
        { id: "salir", etiqueta: "Cerrar sesión", onSelect: nada },
      ]}
      barra={
        agente
          ? { agente: true, texto: "Pide, pregunta o busca una pantalla" }
          : { agente: false, texto: "Busca una pantalla o un registro" }
      }
      onBuscar={nada}
      onTema={nada}
      {...(panel ? { panelInicial: panel } : {})}
      {...(segmento ? { segmentoInicial: segmento } : {})}
      Link={LinkNext}
    >
      {vista === "piezas" ? <PiezasHilo /> : null}
      <div className={vista === "piezas" ? "hidden" : "flex max-w-[760px] flex-col gap-4"}>
        <h2 className="t-heading text-fg">Marco «Hilo»</h2>
        <p className="text-base text-fg-muted">
          Hilo, lienzo y barra con datos ficticios. Aquí va la página abierta: las pantallas son las
          mismas del marco clásico.
        </p>
        <ul className="flex flex-col gap-1">
          {VARIANTES.map(([etiqueta, href]) => (
            <li key={href}>
              <Enlace href={href} Link={LinkNext}>
                {etiqueta}
              </Enlace>
            </li>
          ))}
        </ul>
      </div>
    </HiloShell>
  );
}
