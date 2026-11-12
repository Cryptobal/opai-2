"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, avisar, Badge, Button, Dialog, SeccionTarjeta } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { EstadoSlack } from "./tipos";

/** Conectar o desconectar el espacio de Slack (solo owner y admin llegan a esta pantalla). */
export function ConexionSlack({ estado }: { estado: EstadoSlack }) {
  const router = useRouter();
  const [confirmar, setConfirmar] = useState(false);
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  if (!estado.disponible && !estado.conectada) {
    return (
      <SeccionTarjeta titulo="Conexión">
        <Alerta tono="info" titulo="Slack todavía no está disponible aquí">
          <p className="t-body-sm">
            La app de Slack de OPAI aún no está habilitada en este ambiente. Puedes dejar lista la
            configuración de los avisos: se usará cuando conectes Slack.
          </p>
        </Alerta>
      </SeccionTarjeta>
    );
  }
  async function conectar() {
    const r = await ejecutar<{ url: string }>("core.slack.iniciar_conexion", {});
    if (r) window.location.assign(r.url);
  }
  return (
    <SeccionTarjeta titulo="Conexión">
      {error ? <Alerta tono="danger" titulo={error} className="mb-3" /> : null}
      {estado.conectada ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <Badge tono="success">Conectado</Badge>
            <p className="t-body text-fg">{estado.espacio}</p>
            <p className="t-caption">
              Solo se envían las anomalías que actives abajo. Las marcaciones normales quedan en
              OPAI.
            </p>
          </div>
          <Button type="button" variant="destructive" onClick={() => setConfirmar(true)}>
            Desconectar
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="t-body-sm text-fg-muted">
            Conecta el espacio de Slack de tu empresa para que los supervisores reciban las
            anomalías de terreno. Los guardias no usan Slack.
          </p>
          <Button type="button" disabled={pendiente} onClick={() => void conectar()}>
            {pendiente ? "Abriendo Slack…" : "Conectar con Slack"}
          </Button>
        </div>
      )}
      <Dialog
        abierto={confirmar}
        onCerrar={() => setConfirmar(false)}
        titulo="¿Desconectar Slack?"
        descripcion="OPAI deja de enviar avisos a Slack en el acto. Tu configuración se guarda para cuando vuelvas a conectar."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setConfirmar(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={pendiente}
              onClick={async () => {
                if (!(await ejecutar("core.slack.desconectar", {}))) return;
                setConfirmar(false);
                avisar.exito("Slack desconectado");
                router.refresh();
              }}
            >
              Desconectar
            </Button>
          </>
        }
      />
    </SeccionTarjeta>
  );
}
