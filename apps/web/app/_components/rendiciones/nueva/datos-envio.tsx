"use client";

import { Campo, Input, Select } from "@opai/ds";

import type { DetalleRendicion, OpcionesRendicion } from "../tipos";

export type DatosEnvio = { motivo: string; centro: string; aprobadorId: string };

export const ADMIN = "administracion";

/** Valores iniciales: el aprobador por defecto de la empresa y Administración como centro. */
export function envioInicial(o: OpcionesRendicion, base?: Partial<DatosEnvio>): DatosEnvio {
  return {
    motivo: "",
    centro: ADMIN,
    aprobadorId:
      o.aprobadorPorDefectoId ?? (o.aprobadores.length === 1 ? (o.aprobadores[0]?.id ?? "") : ""),
    ...base,
  };
}

/** Cuerpo común de crear/actualizar (sin tipo ni gastos). */
export function cuerpoComun(d: DatosEnvio) {
  return {
    descripcion: d.motivo.trim(),
    centroCosto: d.centro === ADMIN ? "administracion" : "instalacion",
    ...(d.centro === ADMIN ? {} : { instalacionId: d.centro }),
    ...(d.aprobadorId ? { aprobadorId: d.aprobadorId } : {}),
  };
}

/** Motivo, centro de costo y aprobador: lo que comparten la rendición de compra y la de kilometraje. */
export function CamposEnvio({
  valor,
  onCambiar,
  opciones,
  errores,
}: {
  valor: DatosEnvio;
  onCambiar: (d: DatosEnvio) => void;
  opciones: OpcionesRendicion;
  errores?: Partial<Record<keyof DatosEnvio, string>>;
}) {
  const centros = [
    { valor: ADMIN, etiqueta: "Administración / Oficina central" },
    ...opciones.instalaciones.map((i) => ({ valor: i.id, etiqueta: i.nombre })),
  ];
  const sinAprobadores = opciones.aprobadores.length === 0;
  return (
    <div className="flex flex-col gap-4">
      <Campo
        etiqueta="Motivo de la rendición"
        htmlFor="rend-motivo"
        error={errores?.motivo}
        ayuda="Para qué fue el gasto, en pocas palabras."
      >
        <Input
          id="rend-motivo"
          value={valor.motivo}
          maxLength={200}
          placeholder="Ej.: Insumos de la ronda de noviembre"
          aria-invalid={!!errores?.motivo || undefined}
          onChange={(e) => onCambiar({ ...valor, motivo: e.target.value })}
        />
      </Campo>
      <Campo etiqueta="Centro de costo" htmlFor="rend-centro" error={errores?.centro}>
        <Select
          id="rend-centro"
          valor={valor.centro}
          opciones={centros}
          onCambiar={(centro) => onCambiar({ ...valor, centro })}
        />
      </Campo>
      <Campo
        etiqueta="Quién aprueba"
        htmlFor="rend-aprobador"
        error={
          errores?.aprobadorId ??
          (sinAprobadores
            ? "Tu empresa aún no define quién aprueba. Puedes guardar el borrador y pedirle a un administrador que defina el aprobador por defecto."
            : undefined)
        }
        ayuda={`${opciones.aprobadores.length <= 1 ? "Asignado por tu empresa. " : ""}No puedes elegirte a ti mismo.`}
      >
        <Select
          id="rend-aprobador"
          valor={valor.aprobadorId || undefined}
          placeholder="Elige a quien aprueba"
          disabled={sinAprobadores}
          opciones={opciones.aprobadores.map((a) => ({ valor: a.id, etiqueta: a.nombre }))}
          onCambiar={(aprobadorId) => onCambiar({ ...valor, aprobadorId })}
        />
      </Campo>
    </div>
  );
}

/** Datos iniciales del formulario: los de la rendición que se corrige o los por defecto de la empresa. */
export function envioDe(o: OpcionesRendicion, r?: DetalleRendicion): DatosEnvio {
  return envioInicial(
    o,
    r && {
      motivo: r.descripcion,
      centro: r.instalacionId ?? ADMIN,
      aprobadorId: r.aprobadorId ?? o.aprobadorPorDefectoId ?? "",
    },
  );
}

export type ErroresEnvio = Partial<Record<keyof DatosEnvio, string>>;

/** Errores del motivo y del aprobador (este solo al enviar). */
export function erroresDeEnvio(d: DatosEnvio, enviar: boolean, gastos = 1): ErroresEnvio {
  return {
    ...(gastos === 0 ? { motivo: "Agrega al menos un gasto." } : {}),
    ...(d.motivo.trim().length < 3 ? { motivo: "Cuenta el motivo en pocas palabras." } : {}),
    ...(enviar && !d.aprobadorId ? { aprobadorId: "Elige a quien aprueba." } : {}),
  };
}
