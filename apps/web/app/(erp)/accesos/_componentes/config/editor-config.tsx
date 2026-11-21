"use client";

import { useState } from "react";

import { Alerta, avisar, Button } from "@opai/ds";
import type { ConfigAcceso } from "@opai/domain/acceso-config";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { CamposConfig } from "./campos-config";
import { ReglasConfig, TiposConfig } from "./reglas-config";

type Props = {
  /** Sin instalación, edita la de la empresa. */
  instalacionId?: string;
  efectiva: ConfigAcceso;
  personalizada: boolean;
};

/**
 * Configuración de acceso (CAR-479, diseño `ConfigAcceso`): la de la empresa en Configuración y, en la ficha, la de
 * la instalación, que hereda la de la empresa hasta que se personaliza y entonces la reemplaza entera.
 */
export function EditorConfig({ instalacionId, efectiva, personalizada }: Props) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [c, setC] = useState(efectiva);
  const [propia, setPropia] = useState(personalizada || !instalacionId);
  const cambiar = (x: Partial<ConfigAcceso>) => setC((v) => ({ ...v, ...x }));
  const ambito = instalacionId ? { instalacionId } : {};

  async function guardar() {
    if (await ejecutar("acceso.config.set", { ...ambito, config: c }))
      avisar.exito("Configuración guardada");
  }
  async function heredar() {
    const r = await ejecutar<{ efectiva: ConfigAcceso }>("acceso.config.set", {
      ...ambito,
      config: null,
    });
    if (!r) return;
    setC(r.efectiva);
    setPropia(false);
    avisar.exito("La instalación vuelve a usar la configuración de la empresa");
  }

  return (
    <div className="flex flex-col gap-4">
      {instalacionId && !propia ? (
        <Alerta tono="info" titulo="Usa la configuración de la empresa">
          <p>Lo que cambies en Configuración › Módulos › Control de acceso rige también aquí.</p>
          <Button variant="secondary" className="mt-2" onClick={() => setPropia(true)}>
            Personalizar para esta instalación
          </Button>
        </Alerta>
      ) : null}
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <TiposConfig config={c} onCambiar={cambiar} disabled={pendiente || !propia} />
      <ReglasConfig config={c} onCambiar={cambiar} disabled={pendiente || !propia} />
      <CamposConfig
        campos={c.campos}
        onCambiar={(campos) => cambiar({ campos })}
        disabled={pendiente || !propia}
      />
      {propia ? (
        <div className="flex flex-wrap justify-end gap-2">
          {instalacionId && personalizada ? (
            <Button variant="ghost" disabled={pendiente} onClick={() => void heredar()}>
              Volver a la de la empresa
            </Button>
          ) : null}
          <Button disabled={pendiente} onClick={() => void guardar()}>
            {pendiente ? "Guardando…" : "Guardar configuración"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
