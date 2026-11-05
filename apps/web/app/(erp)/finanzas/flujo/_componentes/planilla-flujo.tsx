"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Alerta, PlanillaScreen, type EstadoPantalla } from "@opai/ds";

import { armarPlanilla, celdaEditable, clp, type Planilla } from "./datos";
import { AvisoSaldoBanco } from "./aviso-saldo-banco";
import { PlanillaFlujoEscritorio } from "./planilla-flujo-escritorio";

const HojaCelda = dynamic(() => import("./hoja-celda").then((m) => ({ default: m.HojaCelda })));
const VistaMovilFlujo = dynamic(() =>
  import("./vista-movil").then((m) => ({ default: m.VistaMovilFlujo })),
);

type Props = {
  state: EstadoPantalla;
  planilla: Planilla | null;
  gestiona: boolean;
  configura: boolean;
  movil: boolean;
};

export function PlanillaFlujo({ state, planilla, gestiona, configura, movil }: Props) {
  const router = useRouter();
  const [seleccion, setSeleccion] = useState<{ filaId: string; semana: string } | null>(null);
  const [importAbierta, setImportAbierta] = useState(false);
  const p = planilla;
  const armado = useMemo(() => (p ? armarPlanilla(p, { gestiona }) : null), [p, gestiona]);

  const avisoTitulo =
    p && p.aviso.semanas.length
      ? `Semana ${p.aviso.semanas[0]?.semana.slice(8, 10)}-${p.aviso.semanas[0]?.semana.slice(5, 7)} con saldo ${clp(p.aviso.semanas[0]?.saldoFinal ?? 0)}`
      : null;

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
        <AvisoSaldoBanco saldoBanco={p.saldoBanco} />
        <VistaMovilFlujo planilla={p} gestiona={gestiona} onCelda={(filaId, semana) => setSeleccion({ filaId, semana })} />
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
        cabeceraSoloTelefono
        textos={{
          ...(textosError ?? {}),
          vacio: {
            titulo: "Sin filas en el flujo",
            descripcion: "Agrega filas en Configuración › Módulos › Finanzas › Flujo de caja.",
          },
        }}
        filas={[]}
        columnas={[]}
        celda={() => null}
      />
    );
  }

  return (
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
    />
  );
}
