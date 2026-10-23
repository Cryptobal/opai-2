"use client";

import { Lock } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

import { Badge, Campo, Input, SeccionTarjeta, Select } from "@opai/ds";
import { esVertical, vocabulario } from "@opai/domain";

import { CampoTexto } from "./campo-texto";
import { CONTACTOS, type DatosEmpresa, type Tenant, ZONAS } from "./datos-empresa";

type Props = {
  d: DatosEmpresa;
  setD: Dispatch<SetStateAction<DatosEmpresa>>;
  tenant: Tenant;
  dis: boolean;
  set: (k: keyof DatosEmpresa["textos"]) => (v: string) => void;
  correoMalo: (c: string) => string | undefined;
};

const NOMBRE_VERTICAL: Record<string, string> = {
  seguridad: "Seguridad privada",
  aseo: "Aseo",
  outsourcing: "Outsourcing",
  mantenimiento: "Mantenimiento",
};

/** Operación (zona horaria editable, vertical fijada por OPAI) y contacto por área. */
export function OperacionYContacto({ d, setD, tenant, dis, set, correoMalo }: Props) {
  const t = d.textos;
  const voc = vocabulario(esVertical(tenant.vertical) ? tenant.vertical : "seguridad");
  const vertical = NOMBRE_VERTICAL[tenant.vertical] ?? tenant.vertical;
  return (
    <>
      <SeccionTarjeta titulo="Operación">
        <div className="grid gap-4 md:grid-cols-2">
          <Campo
            etiqueta="Zona horaria"
            htmlFor="e-zona"
            ayuda="Para presentar horas y turnos"
            className="md:col-span-2"
          >
            <Select
              id="e-zona"
              valor={d.timezone}
              opciones={ZONAS}
              disabled={dis}
              onCambiar={(v) => setD((x) => ({ ...x, timezone: v }))}
            />
          </Campo>
          <Campo
            etiqueta="Vertical"
            htmlFor="e-vertical"
            ayuda={`Define el vocabulario: ${voc.persona.plural}, ${voc.instalacion.plural}`}
          >
            <div className="flex items-center gap-2">
              <Input id="e-vertical" value={vertical} disabled readOnly />
              <Badge tono="neutro" punto={false} className="flex-none">
                <Lock className="size-3" aria-hidden /> Fijado por OPAI
              </Badge>
            </div>
          </Campo>
        </div>
      </SeccionTarjeta>
      <SeccionTarjeta titulo="Contacto por área">
        <div className="grid gap-4 md:grid-cols-2">
          {CONTACTOS.map(([k, etiqueta, tipo]) => (
            <CampoTexto
              key={k}
              id={`e-${k}`}
              etiqueta={etiqueta}
              tipo={tipo}
              valor={t[k]}
              onCambiar={set(k)}
              disabled={dis}
              error={tipo === "email" ? correoMalo(t[k]) : undefined}
            />
          ))}
        </div>
      </SeccionTarjeta>
    </>
  );
}
