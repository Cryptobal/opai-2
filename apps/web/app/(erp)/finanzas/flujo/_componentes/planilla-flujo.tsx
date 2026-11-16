"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Alerta, PlanillaScreen, type EstadoPantalla } from "@opai/ds";

import { AccesoRecurrentes, CabeceraVistaMovil } from "./acciones-flujo-toolbar";
import { armarPlanilla, celdaEditable, clp, type Planilla } from "./datos";
import { AvisoSaldoBanco } from "./aviso-saldo-banco";
import { AvisosProyeccion } from "./avisos-proyeccion";
import { filaBase } from "./grupos-cobro";
import { PlanillaFlujoEscritorio } from "./planilla-flujo-escritorio";
import { useFilasAbiertas } from "./use-filas-abiertas";
import { cobrosDeSemana, FILA_COBROS_ESPERADOS, FILA_IVA, hojaEspecial, type HojaEspecial, ivaDeSemana } from "./cobros-celda";

const HojaCelda = dynamic(() => import("./hoja-celda").then((m) => ({ default: m.HojaCelda })));
const HojaCobros = dynamic(() => import("./hoja-cobros").then((m) => ({ default: m.HojaCobros })));
const HojaIva = dynamic(() => import("./hoja-iva").then((m) => ({ default: m.HojaIva })));
const VistaMovilFlujo = dynamic(() =>
  import("./vista-movil").then((m) => ({ default: m.VistaMovilFlujo })),
);

type Props = {
  state: EstadoPantalla;
  planilla: Planilla | null;
  gestiona: boolean;
  configura: boolean;
  movil: boolean;
  /** Quién y en qué empresa: la clave de lo que la persona dejó abierto o cerrado. */
  epoca: string;
};

export function PlanillaFlujo({ state, planilla, gestiona, configura, movil, epoca }: Props) {
  const router = useRouter();
  const [seleccion, setSeleccion] = useState<{ filaId: string; semana: string } | null>(null);
  const [importAbierta, setImportAbierta] = useState(false);
  const [hoja, setHoja] = useState<HojaEspecial | null>(null);
  const { abierta, alternar } = useFilasAbiertas(epoca);
  const p = planilla;
  const armado = useMemo(() => (p ? armarPlanilla(p, { gestiona, abierta }) : null), [p, gestiona, abierta]);

  const avisoTitulo =
    p && p.aviso.semanas.length
      ? `Semana ${p.aviso.semanas[0]?.semana.slice(8, 10)}-${p.aviso.semanas[0]?.semana.slice(5, 7)} con saldo ${clp(p.aviso.semanas[0]?.saldoFinal ?? 0)}`
      : null;

  const hojaCobros =
    gestiona && p && hoja?.tipo === "cobros" ? (
      <HojaCobros
        semana={hoja.semana}
        cobros={cobrosDeSemana(p, FILA_COBROS_ESPERADOS, hoja.semana)}
        onCerrar={() => setHoja(null)}
      />
    ) : gestiona && p && hoja?.tipo === "iva" ? (
      <HojaIva semana={hoja.semana} ivas={ivaDeSemana(p, FILA_IVA, hoja.semana)} onCerrar={() => setHoja(null)} />
    ) : null;
  const abrirCelda = (filaId: string, semana: string) => {
    const h = p ? hojaEspecial(p, filaBase(filaId), semana) : null;
    if (h) setHoja(h);
    else setSeleccion({ filaId, semana });
  };

  const textosError =
    state === "error"
      ? {
          error: {
            titulo: "No pudimos cargar el flujo de caja",
            descripcion: "Ocurrió un error en el servidor al leer la planilla.",
            onReintentar: () => router.refresh(),
          },
        }
      : undefined;

  if (movil && p && armado) {
    return (
      <>
        {avisoTitulo ? (
          <Alerta tono="danger" titulo={avisoTitulo}>
            El aviso se muestra solo dentro de OPAI y no envía correos.
          </Alerta>
        ) : null}
        <CabeceraVistaMovil gestiona={gestiona} configura={configura} />
        <AvisoSaldoBanco saldoBanco={p.saldoBanco} />
        <AvisosProyeccion avisos={p.avisos} epoca={epoca} />
        <VistaMovilFlujo planilla={p} armado={armado} gestiona={gestiona} onCelda={abrirCelda} onAlternar={alternar} />
        {hojaCobros}
        {gestiona ? (
          <HojaCelda
            abierta={!!seleccion}
            onCerrar={() => setSeleccion(null)}
            contexto={seleccion && p ? celdaEditable(p, seleccion.filaId, seleccion.semana) : null}
          />
        ) : null}
      </>
    );
  }

  if (!p || !armado) {
    return (
      <PlanillaScreen
        state={state}
        titulo="Flujo de caja"
        subtitulo="Próximas 12 semanas · montos en CLP"
        accionesSiempre
        acciones={<AccesoRecurrentes gestiona={gestiona} />}
        textos={{
          ...(textosError ?? {}),
          vacio: {
            titulo: "Sin filas en el flujo",
            descripcion: "Crea filas y gastos recurrentes desde Gastos recurrentes en el encabezado.",
          },
        }}
        filas={[]}
        columnas={[]}
        celda={() => null}
      />
    );
  }

  return (
    <>
      <PlanillaFlujoEscritorio
        state={state}
        planilla={p}
        armado={armado}
        gestiona={gestiona}
        configura={configura}
        avisoTitulo={avisoTitulo}
        textosError={textosError}
        seleccion={seleccion}
        onSeleccion={setSeleccion}
        importAbierta={importAbierta}
        onImportAbiertaChange={setImportAbierta}
        onHoja={setHoja}
        onAlternarFila={alternar}
        epoca={epoca}
      />
      {hojaCobros}
    </>
  );
}
