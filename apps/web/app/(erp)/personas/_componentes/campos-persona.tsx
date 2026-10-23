"use client";

import type { Dispatch, SetStateAction } from "react";

import { Campo, type Direccion, Input, InputFecha, Select } from "@opai/ds";
import { rutValido } from "@opai/domain";

import { DireccionOpai } from "@/app/_components/maestros/direccion";
import type { PersonaDetalle } from "@/lib/tipos-maestros";

import { NACIONALIDADES, SEXOS } from "./opciones-persona";

export type DatosPersona = {
  nombres: string;
  apellidos: string;
  rut: string;
  fechaNacimiento: string;
  sexo: string;
  nacionalidad: string;
  emailPersonal: string;
  emailLaboral: string;
  telefono: string;
  direccion: Direccion | null;
};

export const inicialPersona = (p?: PersonaDetalle): DatosPersona => ({
  nombres: p?.nombres ?? "",
  apellidos: p?.apellidos ?? "",
  rut: p?.rut ?? "",
  fechaNacimiento: p?.fechaNacimiento ?? "",
  sexo: p?.sexo ?? "",
  nacionalidad: p?.nacionalidad ?? "CL",
  emailPersonal: p?.emailPersonal ?? "",
  emailLaboral: p?.emailLaboral ?? "",
  telefono: p?.telefono ?? "",
  direccion: p?.calle
    ? {
        calle: p.calle,
        comuna: p.comuna,
        region: p.region,
        direccionFormateada: p.direccionFormateada,
        lat: p.lat,
        lng: p.lng,
      }
    : null,
});

const correoMalo = (c: string) => Boolean(c.trim()) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.trim());
export const rutPersonaMalo = (r: string) => !r.trim() || !rutValido(r);
export const invalidoPersona = (d: DatosPersona) =>
  d.nombres.trim().length < 2 ||
  d.apellidos.trim().length < 2 ||
  rutPersonaMalo(d.rut) ||
  correoMalo(d.emailPersonal) ||
  correoMalo(d.emailLaboral);

type Props = { d: DatosPersona; setD: Dispatch<SetStateAction<DatosPersona>> };

/** Identificación, contacto y dirección de una persona (nueva o editar). */
export function CamposPersona({ d, setD }: Props) {
  const set = <K extends keyof DatosPersona>(k: K, v: DatosPersona[K]) =>
    setD((x) => ({ ...x, [k]: v }));
  const rutError = Boolean(d.rut.trim()) && rutPersonaMalo(d.rut);
  return (
    <>
      <fieldset className="flex flex-col gap-3.5">
        <legend className="mb-2 text-md font-semibold text-fg">Identificación</legend>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Campo etiqueta="Nombres" htmlFor="p-nombres">
            <Input
              id="p-nombres"
              value={d.nombres}
              onChange={(e) => set("nombres", e.target.value)}
              autoFocus
            />
          </Campo>
          <Campo etiqueta="Apellidos" htmlFor="p-apellidos">
            <Input
              id="p-apellidos"
              value={d.apellidos}
              onChange={(e) => set("apellidos", e.target.value)}
            />
          </Campo>
        </div>
        <Campo etiqueta="RUT" htmlFor="p-rut" {...(rutError ? { error: "RUT inválido" } : {})}>
          <Input
            id="p-rut"
            className="t-mono"
            placeholder="16.234.567-8"
            value={d.rut}
            aria-invalid={rutError || undefined}
            onChange={(e) => set("rut", e.target.value)}
          />
        </Campo>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Campo etiqueta="Nacimiento" htmlFor="p-nac">
            <InputFecha
              id="p-nac"
              valor={d.fechaNacimiento}
              onCambiar={(v) => set("fechaNacimiento", v)}
            />
          </Campo>
          <Campo etiqueta="Sexo" htmlFor="p-sexo">
            <Select
              id="p-sexo"
              valor={d.sexo}
              onCambiar={(v) => set("sexo", v)}
              opciones={SEXOS}
              placeholder="Elegir"
            />
          </Campo>
        </div>
        <Campo etiqueta="Nacionalidad" htmlFor="p-nacionalidad">
          <Select
            id="p-nacionalidad"
            valor={d.nacionalidad}
            onCambiar={(v) => set("nacionalidad", v)}
            opciones={NACIONALIDADES}
          />
        </Campo>
      </fieldset>
      <fieldset className="flex flex-col gap-3.5">
        <legend className="mb-2 text-md font-semibold text-fg">Contacto</legend>
        <Campo etiqueta="Correo personal" htmlFor="p-correo">
          <Input
            id="p-correo"
            type="email"
            inputMode="email"
            value={d.emailPersonal}
            onChange={(e) => set("emailPersonal", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Correo laboral" htmlFor="p-correo-lab">
          <Input
            id="p-correo-lab"
            type="email"
            inputMode="email"
            value={d.emailLaboral}
            onChange={(e) => set("emailLaboral", e.target.value)}
          />
        </Campo>
        <Campo etiqueta="Teléfono" htmlFor="p-tel">
          <Input
            id="p-tel"
            type="tel"
            inputMode="tel"
            placeholder="+56 9 1234 5678"
            value={d.telefono}
            onChange={(e) => set("telefono", e.target.value)}
          />
        </Campo>
      </fieldset>
      <fieldset className="flex flex-col gap-3.5">
        <legend className="mb-2 text-md font-semibold text-fg">Dirección</legend>
        <DireccionOpai id="p-dir" valor={d.direccion} onCambiar={(v) => set("direccion", v)} />
      </fieldset>
    </>
  );
}
