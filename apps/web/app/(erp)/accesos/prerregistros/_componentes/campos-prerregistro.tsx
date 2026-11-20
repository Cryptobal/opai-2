"use client";

import { Button, Campo, Input, InputFecha, Select, Switch, Textarea } from "@opai/ds";

import { type BorradorPrerregistro, VISITANTE_VACIO } from "./borrador";
import { CamposVisitante } from "./campos-visitante";

type P = { b: BorradorPrerregistro; set: (b: BorradorPrerregistro) => void };

/** Instalación, fecha o rango (máx. 30 días) y horario esperado. */
function CamposLugar({
  b,
  set,
  instalaciones,
}: P & { instalaciones: { id: string; nombre: string }[] }) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby="pr-lugar">
      <h3 id="pr-lugar" className="t-subheading">
        Lugar y fecha
      </h3>
      <Campo etiqueta="Instalación" htmlFor="pr-inst">
        <Select
          id="pr-inst"
          valor={b.instalacionId}
          opciones={instalaciones.map((i) => ({ valor: i.id, etiqueta: i.nombre }))}
          onCambiar={(v) => set({ ...b, instalacionId: v })}
        />
      </Campo>
      <div className="grid grid-cols-2 gap-3">
        <Campo etiqueta="Desde" htmlFor="pr-desde">
          <InputFecha id="pr-desde" valor={b.desde} onCambiar={(v) => set({ ...b, desde: v })} />
        </Campo>
        <Campo etiqueta="Hasta (opcional, máx. 30 días)" htmlFor="pr-hasta">
          <InputFecha id="pr-hasta" valor={b.hasta} onCambiar={(v) => set({ ...b, hasta: v })} />
        </Campo>
        <Campo etiqueta="Llega desde (hora)" htmlFor="pr-hd">
          <InputFecha
            id="pr-hd"
            tipo="time"
            valor={b.horaDesde}
            onCambiar={(v) => set({ ...b, horaDesde: v })}
          />
        </Campo>
        <Campo etiqueta="Hasta (hora)" htmlFor="pr-hh">
          <InputFecha
            id="pr-hh"
            tipo="time"
            valor={b.horaHasta}
            onCambiar={(v) => set({ ...b, horaHasta: v })}
          />
        </Campo>
      </div>
    </section>
  );
}

/** Anfitrión, motivo, nota para el guardia y «Avisarme cuando llegue». */
function CamposDetalle({ b, set }: P) {
  return (
    <section className="flex flex-col gap-3" aria-labelledby="pr-detalle">
      <h3 id="pr-detalle" className="t-subheading">
        Detalle
      </h3>
      <Campo etiqueta="Anfitrión" htmlFor="pr-anfitrion">
        <Input
          id="pr-anfitrion"
          value={b.anfitrion}
          maxLength={120}
          onChange={(e) => set({ ...b, anfitrion: e.target.value })}
        />
      </Campo>
      <Campo etiqueta="Motivo" htmlFor="pr-motivo">
        <Input
          id="pr-motivo"
          value={b.motivo}
          maxLength={200}
          onChange={(e) => set({ ...b, motivo: e.target.value })}
        />
      </Campo>
      <Campo etiqueta="Nota para el guardia" htmlFor="pr-nota">
        <Textarea
          id="pr-nota"
          rows={2}
          maxLength={300}
          value={b.nota}
          onChange={(e) => set({ ...b, nota: e.target.value })}
        />
      </Campo>
      <Switch
        etiqueta="Avisarme cuando llegue"
        descripcion="Queda anotado; el aviso se activa con las notificaciones de Accesos."
        activo={b.avisar}
        onCambiar={(v) => set({ ...b, avisar: v })}
      />
    </section>
  );
}

/** Campos de la hoja «Prerregistrar visita» (diseño `Prerregistrar`). */
export function CamposPrerregistro({
  b,
  set,
  instalaciones,
}: P & { instalaciones: { id: string; nombre: string }[] }) {
  const vs = b.visitantes;
  return (
    <div className="flex flex-col gap-6">
      <CamposLugar b={b} set={set} instalaciones={instalaciones} />
      <section className="flex flex-col gap-3" aria-labelledby="pr-visitantes">
        <h3 id="pr-visitantes" className="t-subheading">
          Visitantes
        </h3>
        {vs.map((v, i) => (
          <CamposVisitante
            key={i}
            i={i}
            v={v}
            set={(nv) => set({ ...b, visitantes: vs.map((x, j) => (j === i ? nv : x)) })}
            quitar={
              vs.length > 1 ? () => set({ ...b, visitantes: vs.filter((_, j) => j !== i) }) : null
            }
          />
        ))}
        {vs.length < 20 ? (
          <Button
            variant="secondary"
            className="self-start"
            onClick={() => set({ ...b, visitantes: [...vs, VISITANTE_VACIO] })}
          >
            Agregar visitante
          </Button>
        ) : null}
      </section>
      <CamposDetalle b={b} set={set} />
    </div>
  );
}
