"use client";

import { type ReactNode, useState } from "react";

import { Alerta, avisar, Campo, Input, RadioGroup, SeccionTarjeta } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { ModelosIa } from "./modelos-ia";
import type { Integracion } from "./tipos";

type Config = Record<string, unknown>;
const configDe = (i: Integracion): Config =>
  i.config && typeof i.config === "object" ? { ...(i.config as Config) } : {};

const OPCIONES = {
  plataforma: {
    etiqueta: "De plataforma",
    descripcion: "OPAI provee el servicio y factura el consumo",
  },
  propia: { etiqueta: "Propia", descripcion: "Usas tus credenciales y pagas directo al proveedor" },
} as const;

import { FORM_INTEGRACION } from "../../_centro/formularios";

export { FORM_INTEGRACION } from "../../_centro/formularios";

/** Modalidad y configuración no secreta (29); "Guardar" de la barra superior envía este formulario. */
export function FormIntegracion({
  items,
  children,
}: {
  items: Integracion[];
  children?: ReactNode;
}) {
  const principal = items[0];
  const { ejecutar, error } = useCapacidad("erp");
  const [modalidad, setModalidad] = useState(
    principal?.modalidad === "plataforma" && !principal.plataformaDisponible
      ? "propia"
      : (principal?.modalidad ?? "propia"),
  );
  const [configs, setConfigs] = useState<Record<string, Config>>(() =>
    Object.fromEntries(items.map((i) => [i.proveedor, configDe(i)])),
  );
  if (!principal) return null;
  const ia = principal.categoria === "ia";
  const set = (proveedor: string, c: Config) => setConfigs((x) => ({ ...x, [proveedor]: c }));
  const texto = (k: string) => String(configs[principal.proveedor]?.[k] ?? "");
  async function guardar() {
    for (const i of items) {
      const mod = i.proveedor === principal?.proveedor ? modalidad : "propia";
      const limpio = Object.fromEntries(
        Object.entries(configs[i.proveedor] ?? {}).filter(([, v]) => v !== "" && v !== undefined),
      );
      if (!i.modalidades.includes(mod)) continue;
      const r = await ejecutar("core.integraciones.configurar", {
        proveedor: i.proveedor,
        modalidad: mod,
        config: limpio,
      });
      if (!r) return;
    }
    avisar.exito("Integración guardada");
  }
  return (
    <form
      id={FORM_INTEGRACION}
      className="grid gap-4 lg:grid-cols-2 lg:items-start"
      onSubmit={(e) => {
        e.preventDefault();
        void guardar();
      }}
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {principal.modalidades.length > 1 ? (
          <SeccionTarjeta titulo="Modalidad">
            <RadioGroup
              etiqueta="Modalidad"
              valor={modalidad}
              onCambiar={setModalidad}
              opciones={principal.modalidades.map((m) => ({
                valor: m,
                etiqueta: OPCIONES[m as keyof typeof OPCIONES]?.etiqueta ?? m,
                descripcion:
                  m === "plataforma" && !principal.plataformaDisponible
                    ? "No disponible en este entorno: usa tus propias credenciales."
                    : (OPCIONES[m as keyof typeof OPCIONES]?.descripcion ?? ""),
                ...(m === "plataforma" && !principal.plataformaDisponible
                  ? { disabled: true }
                  : {}),
              }))}
            />
          </SeccionTarjeta>
        ) : null}
        {children}
      </div>
      <div className="flex flex-col gap-4">
        {ia ? <ModelosIa items={items} configs={configs} onCambiar={set} /> : null}
        {principal.categoria === "correo" ? (
          <SeccionTarjeta titulo="Remitente">
            <div className="flex flex-col gap-3.5">
              <Campo
                etiqueta="Nombre y correo del remitente"
                htmlFor="i-remitente"
                ayuda='Por ejemplo "Gard Security <avisos@gard.cl>"'
              >
                <Input
                  id="i-remitente"
                  value={texto("remitente")}
                  onChange={(e) =>
                    set(principal.proveedor, {
                      ...configs[principal.proveedor],
                      remitente: e.target.value,
                    })
                  }
                />
              </Campo>
              <Campo etiqueta="Responder a" htmlFor="i-responder">
                <Input
                  id="i-responder"
                  type="email"
                  value={texto("responderA")}
                  onChange={(e) =>
                    set(principal.proveedor, {
                      ...configs[principal.proveedor],
                      responderA: e.target.value,
                    })
                  }
                />
              </Campo>
            </div>
          </SeccionTarjeta>
        ) : null}
      </div>
    </form>
  );
}
