"use client";

import { Button, ChipToggle, Select } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { useParametros } from "@/app/_components/maestros/use-url";

import { BarraPautaAccionesInst } from "./barra-pauta-acciones-inst";
import { claveMes, mesVecino } from "./etiquetas";
import { NavegacionVistasPauta } from "./navegacion-vistas-pauta";
import { SelectorMesPauta } from "./selector-mes-pauta";
import type { OpcionInstalacion } from "./tipos";

function urlExportar(
  inst: string,
  formato: "excel" | "pdf",
  anio: number,
  mes: number,
  fecha: string,
  diaria: boolean,
  sinCubrir: boolean,
) {
  const p = new URLSearchParams({ inst, formato });
  if (sinCubrir) p.set("sinCubrir", "1");
  if (diaria) p.set("fecha", fecha);
  else {
    p.set("anio", String(anio));
    p.set("mes", String(mes));
  }
  return `/api/pauta/export?${p}`;
}

type Props = {
  instalaciones: readonly OpcionInstalacion[];
  inst: string | null;
  anio: number;
  mes: number;
  verPpc: boolean;
  diaria: boolean;
  fecha: string;
  puedeEditar: boolean;
};

/** Selector de instalación y de mes, filtro «Sin cubrir» y acceso al historial (todo en la URL). */
export function BarraPauta({ instalaciones, inst, anio, mes, verPpc, diaria, fecha, puedeEditar }: Props) {
  const { fijar } = useParametros();
  const irA = (delta: number) => {
    const m = mesVecino(anio, mes, delta);
    fijar({ mes: claveMes(m.anio, m.mes), dia: null, serie: null });
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <NavegacionVistasPauta
        diaria={diaria}
        anio={anio}
        mes={mes}
        claveMes={claveMes(anio, mes)}
        onMensual={() => fijar({ vista: null, ver: null, dia: null })}
        onDiaria={() => fijar({ vista: "diaria", ver: null, dia: null })}
      />
      <Select
        aria-label="Instalación"
        className="w-full sm:w-64"
        valor={inst ?? "todas"}
        onCambiar={(v) => fijar({ inst: v === "todas" ? null : v, dia: null, serie: null })}
        opciones={[
          { valor: "todas", etiqueta: "Todas las instalaciones" },
          ...instalaciones.map((i) => ({ valor: i.id, etiqueta: i.nombre })),
        ]}
      />
      <SelectorMesPauta
        diaria={diaria}
        fecha={fecha}
        anio={anio}
        mes={mes}
        onFecha={(v) => fijar({ fecha: v, dia: null })}
        onMesAnterior={() => irA(-1)}
        onMesSiguiente={() => irA(1)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <ChipToggle
          etiqueta="Sin cubrir"
          activo={verPpc}
          onCambiar={(a) => fijar({ ver: a ? "ppc" : null })}
        />
        {inst ? (
          <BarraPautaAccionesInst
            inst={inst}
            anio={anio}
            mes={mes}
            diaria={diaria}
            puedeEditar={puedeEditar}
            urlExportar={(formato) => urlExportar(inst, formato, anio, mes, fecha, diaria, verPpc)}
            onAlertas={() => fijar({ alertas: "1" })}
          />
        ) : null}
      </div>
      <Button
        variant="secondary"
        className="ml-auto w-full sm:ml-auto sm:w-auto"
        onClick={() => fijar({ historial: "1" })}
      >
        Historial
      </Button>
    </div>
  );
}
