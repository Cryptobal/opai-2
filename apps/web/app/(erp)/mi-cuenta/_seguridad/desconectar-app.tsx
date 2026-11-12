"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, Button, Dialog } from "@opai/ds";

import { accionDesconectarApp } from "@/app/_acciones/apps-conectadas";

import type { AppConectadaVista } from "./tipos";

/** Confirma y desconecta una app (core.apps_conectadas.desconectar). Corta sus accesos al momento. */
export function DesconectarApp({
  app,
  onCerrar,
}: {
  app: AppConectadaVista;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nombre = app.nombre ?? "esta app";

  async function desconectar() {
    setPendiente(true);
    let r: Awaited<ReturnType<typeof accionDesconectarApp>>;
    try {
      r = await accionDesconectarApp(app.clientId);
    } catch {
      r = { ok: false, error: "No hubo conexión. Vuelve a intentarlo." };
    } finally {
      setPendiente(false);
    }
    if (!r.ok) return setError(r.error);
    onCerrar();
    router.refresh();
  }

  return (
    <Dialog
      abierto
      onCerrar={onCerrar}
      titulo={`¿Desconectar ${nombre}?`}
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar} disabled={pendiente}>
            Cancelar
          </Button>
          <Button variant="destructive" cargando={pendiente} onClick={() => void desconectar()}>
            Desconectar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? (
          <Alerta tono="danger" titulo="No se pudo desconectar">
            {error}
          </Alerta>
        ) : null}
        <p className="text-base text-fg">
          {nombre} deja de entrar a esta empresa con tu cuenta desde ahora. Para volver a usarla,
          conéctala de nuevo desde la app.
        </p>
      </div>
    </Dialog>
  );
}
