"use client";

import { useState } from "react";

import { Alerta, avisar, Campo, SeccionTarjeta } from "@opai/ds";
import { rutValido } from "@opai/domain";

import { DireccionOpai } from "@/app/_components/maestros/direccion";
import { useCapacidad } from "@/app/_components/use-capacidad";

import { CampoTexto, DatoLectura } from "./campo-texto";
import {
  CONTACTOS,
  type DatosEmpresa,
  type Perfil,
  type Tenant,
  inicialEmpresa,
} from "./datos-empresa";
import { OperacionYContacto } from "./operacion-contacto";

type Props = { perfil: Perfil; tenant: Tenant; puedeEditar: boolean };

const rutMalo = (r: string) => (r.trim() && !rutValido(r) ? "RUT inválido" : undefined);
const correoMalo = (c: string) =>
  c.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.trim()) ? "Correo inválido" : undefined;

/** Datos de la empresa (21): identificación, representante, operación y contacto por área. */
export function FormularioEmpresa({ perfil, tenant, puedeEditar }: Props) {
  const [d, setD] = useState<DatosEmpresa>(() => inicialEmpresa(perfil, tenant));
  const { ejecutar, error } = useCapacidad("erp");
  const t = d.textos;
  const set = (k: keyof DatosEmpresa["textos"]) => (v: string) =>
    setD((x) => ({ ...x, textos: { ...x.textos, [k]: v } }));
  const invalido = Boolean(
    rutMalo(t.rut) ||
    rutMalo(t.representanteRut) ||
    correoMalo(t.representanteEmail) ||
    CONTACTOS.some(([k, , tipo]) => tipo === "email" && correoMalo(t[k])),
  );
  async function guardar() {
    if (invalido) return;
    const textos = Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v.trim() || null]));
    const ok = await ejecutar("core.empresa.update", {
      ...textos,
      calle: d.direccion?.calle ?? null,
      comuna: d.direccion?.comuna ?? null,
      region: d.direccion?.region ?? null,
    });
    if (ok && d.timezone !== tenant.timezone)
      if (!(await ejecutar("core.tenant.update", { timezone: d.timezone }))) return;
    if (ok) avisar.exito("Datos de la empresa guardados");
  }
  const dis = !puedeEditar;
  return (
    <form
      id="form-empresa"
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void guardar();
      }}
    >
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      {!perfil.razonSocial && puedeEditar ? (
        <Alerta
          tono="neutral"
          titulo={`Completa los datos reales de ${tenant.nombre}: aparecen en contratos, correos y portales.`}
        />
      ) : null}
      <SeccionTarjeta titulo="Identificación">
        <div className="grid gap-4 md:grid-cols-2">
          <CampoTexto
            id="e-razon"
            etiqueta="Razón social"
            valor={t.razonSocial}
            onCambiar={set("razonSocial")}
            placeholder="Razón social de la empresa"
            disabled={dis}
          />
          <CampoTexto
            id="e-rut"
            etiqueta="RUT"
            valor={t.rut}
            onCambiar={set("rut")}
            placeholder="12.345.678-9"
            mono
            disabled={dis}
            error={rutMalo(t.rut)}
          />
          <CampoTexto
            id="e-giro"
            etiqueta="Giro"
            valor={t.giro}
            onCambiar={set("giro")}
            placeholder="Giro registrado en el SII"
            disabled={dis}
          />
          {dis ? (
            <DatoLectura
              etiqueta="Dirección"
              valor={[perfil.calle, perfil.comuna, perfil.region].filter(Boolean).join(", ")}
            />
          ) : (
            <Campo etiqueta="Dirección" htmlFor="e-dir">
              <DireccionOpai
                id="e-dir"
                sinMapa
                disabled={dis}
                valor={d.direccion}
                onCambiar={(v) => setD((x) => ({ ...x, direccion: v }))}
              />
            </Campo>
          )}
        </div>
      </SeccionTarjeta>
      <SeccionTarjeta titulo="Representante legal">
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          <CampoTexto
            id="e-rep"
            etiqueta="Nombre"
            valor={t.representanteNombre}
            onCambiar={set("representanteNombre")}
            disabled={dis}
          />
          <CampoTexto
            id="e-rep-rut"
            etiqueta="RUT"
            valor={t.representanteRut}
            onCambiar={set("representanteRut")}
            mono
            disabled={dis}
            error={rutMalo(t.representanteRut)}
          />
          <CampoTexto
            id="e-rep-mail"
            etiqueta="Correo"
            tipo="email"
            valor={t.representanteEmail}
            onCambiar={set("representanteEmail")}
            disabled={dis}
            error={correoMalo(t.representanteEmail)}
          />
        </div>
      </SeccionTarjeta>
      <OperacionYContacto
        d={d}
        setD={setD}
        tenant={tenant}
        dis={dis}
        set={set}
        correoMalo={correoMalo}
      />
    </form>
  );
}
