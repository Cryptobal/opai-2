"use client";

import type { Dispatch, SetStateAction } from "react";

import { Campo, type Direccion, Input, Select } from "@opai/ds";
import { rutValido } from "@opai/domain";

import { DireccionOpai } from "@/app/_components/maestros/direccion";

import { CamposRepresentante } from "./campos-representante";
import type { CuentaDetalle } from "@/lib/tipos-maestros";

export type DatosCuenta = {
  nombre: string;
  razonSocial: string;
  rut: string;
  estado: string;
  giro: string;
  origen: string;
  sitioWeb: string;
  direccion: Direccion | null;
  representante: { nombre: string; rut: string };
  escrituraFecha: string;
  escrituraNotaria: string;
};

export const inicialCuenta = (c?: CuentaDetalle): DatosCuenta => ({
  nombre: c?.nombre ?? "",
  razonSocial: c?.razonSocial ?? "",
  rut: c?.rut ?? "",
  estado: c?.estado ?? "prospecto",
  giro: c?.giro ?? "",
  origen: c?.origen ?? "",
  sitioWeb: c?.sitioWeb ?? "",
  direccion: c?.calle ? { calle: c.calle, comuna: c.comuna, region: c.region } : null,
  representante: {
    nombre: c?.representantes[0]?.nombre ?? "",
    rut: c?.representantes[0]?.rut ?? "",
  },
  escrituraFecha: c?.escrituraFecha ?? "",
  escrituraNotaria: c?.escrituraNotaria ?? "",
});

export const rutMalo = (r: string) => Boolean(r.trim()) && !rutValido(r);
export const invalidoCuenta = (d: DatosCuenta) =>
  d.nombre.trim().length < 2 || rutMalo(d.rut) || rutMalo(d.representante.rut);

const ORIGENES = ["Referido", "Licitación", "Sitio web", "Prospección", "Otro"].map((o) => ({
  valor: o,
  etiqueta: o,
}));

/** Secciones Identificación, Clasificación, Dirección y Representante legal (05). */
export function CamposCuenta({
  d,
  setD,
  nueva,
}: {
  d: DatosCuenta;
  setD: Dispatch<SetStateAction<DatosCuenta>>;
  nueva: boolean;
}) {
  const set = <K extends keyof DatosCuenta>(k: K, v: DatosCuenta[K]) =>
    setD((x) => ({ ...x, [k]: v }));
  return (
    <>
      <fieldset className="flex flex-col gap-3.5">
        <legend className="mb-2 text-md font-semibold text-fg">Identificación</legend>
        <Campo etiqueta="Nombre" htmlFor="c-nombre" ayuda="Nombre comercial o de fantasía">
          <Input
            id="c-nombre"
            value={d.nombre}
            onChange={(e) => set("nombre", e.target.value)}
            autoFocus
          />
        </Campo>
        <Campo etiqueta="Razón social" htmlFor="c-razon">
          <Input
            id="c-razon"
            value={d.razonSocial}
            onChange={(e) => set("razonSocial", e.target.value)}
          />
        </Campo>
        <Campo
          etiqueta="RUT"
          htmlFor="c-rut"
          {...(rutMalo(d.rut) ? { error: "RUT inválido" } : {})}
        >
          <Input
            id="c-rut"
            className="t-mono"
            inputMode="text"
            placeholder="76.543.210-K"
            value={d.rut}
            aria-invalid={rutMalo(d.rut) || undefined}
            onChange={(e) => set("rut", e.target.value)}
          />
        </Campo>
      </fieldset>
      <fieldset className="flex flex-col gap-3.5">
        <legend className="mb-2 text-md font-semibold text-fg">Clasificación</legend>
        {nueva ? (
          <Campo etiqueta="Estado" htmlFor="c-estado">
            <Select
              id="c-estado"
              valor={d.estado}
              onCambiar={(v) => set("estado", v)}
              opciones={[
                { valor: "prospecto", etiqueta: "Prospecto" },
                { valor: "cliente_activo", etiqueta: "Cliente activo" },
              ]}
            />
          </Campo>
        ) : null}
        <Campo etiqueta="Giro" htmlFor="c-giro">
          <Input id="c-giro" value={d.giro} onChange={(e) => set("giro", e.target.value)} />
        </Campo>
        <Campo etiqueta="Origen" htmlFor="c-origen">
          <Select
            id="c-origen"
            valor={d.origen || undefined}
            placeholder="¿Cómo llegó?"
            onCambiar={(v) => set("origen", v)}
            opciones={ORIGENES}
          />
        </Campo>
        <Campo etiqueta="Sitio web" htmlFor="c-web">
          <Input
            id="c-web"
            inputMode="url"
            value={d.sitioWeb}
            onChange={(e) => set("sitioWeb", e.target.value)}
          />
        </Campo>
      </fieldset>
      <fieldset className="flex flex-col gap-3.5">
        <legend className="mb-2 text-md font-semibold text-fg">Dirección</legend>
        <DireccionOpai
          id="c-dir"
          valor={d.direccion}
          onCambiar={(v) => set("direccion", v)}
          sinMapa
        />
      </fieldset>
      <CamposRepresentante d={d} set={set} />
    </>
  );
}
