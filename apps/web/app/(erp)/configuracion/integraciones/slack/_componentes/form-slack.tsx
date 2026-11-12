"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Alerta, avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { SeccionAvisos } from "./seccion-avisos";
import { SeccionCanales } from "./seccion-canales";
import { SeccionPanico } from "./seccion-panico";
import { type Canal, type ConfigSlack, type EstadoSlack, FORM_SLACK, type Grupo } from "./tipos";

/** Configuración de los avisos a Slack. «Guardar» de la barra envía este formulario (core.slack.configurar). */
export function FormSlack({ estado, grupos }: { estado: EstadoSlack; grupos: Grupo[] }) {
  const router = useRouter();
  const [config, setConfig] = useState<ConfigSlack>(estado.config);
  const [canales, setCanales] = useState<Canal[] | null>(null);
  const { ejecutar, error, pendiente } = useCapacidad("erp");
  const lectura = useCapacidad("erp");
  const set = <K extends keyof ConfigSlack>(k: K, v: ConfigSlack[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  useEffect(() => {
    if (!estado.conectada) return;
    void lectura.ejecutar<Canal[]>("core.slack.canales", {}).then((r) => setCanales(r ?? []));
    // Solo al montar o al cambiar la conexión: la lista de canales no se recarga en cada cambio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado.conectada]);

  async function guardar() {
    if (!(await ejecutar("core.slack.configurar", config))) return;
    avisar.exito("Configuración de Slack guardada");
    router.refresh();
  }

  return (
    <form
      id={FORM_SLACK}
      className="grid gap-4 lg:grid-cols-2 lg:items-start"
      onSubmit={(e) => {
        e.preventDefault();
        void guardar();
      }}
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {lectura.error ? <Alerta tono="warning" titulo={lectura.error} /> : null}
        <SeccionCanales
          conectada={estado.conectada}
          canales={canales}
          valor={config.canales}
          onCambiar={(v) => set("canales", v)}
        />
        <SeccionPanico panico={config.panico} grupos={grupos} onCambiar={(v) => set("panico", v)} />
      </div>
      <SeccionAvisos
        avisos={config.avisos}
        margen={config.margenAtrasoMin}
        resumen={config.resumen.activo}
        mensajesDirectos={config.mensajesDirectos.activo}
        onAvisos={(v) => set("avisos", v)}
        onMargen={(v) => set("margenAtrasoMin", v)}
        onResumen={(v) => set("resumen", { activo: v })}
        onMensajesDirectos={(v) => set("mensajesDirectos", { activo: v })}
      />
      {/* Como el resto de Configuración: «Guardar» al pie del formulario, en todos los tamaños. */}
      <div className="flex justify-end lg:col-span-2">
        <Button type="submit" disabled={pendiente}>
          {pendiente ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}
