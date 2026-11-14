"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";

import { Alerta, Button, Dialog } from "@opai/ds";

import { encolarHecho } from "@/lib/terreno/cola";
import { leerGps } from "@/lib/terreno/gps";

type Estado = "libre" | "enviando" | "enviada" | "error";

/** Confirmación contra toques accidentales; mientras se guarda no se puede cancelar (la alerta ya sale). */
function ConfirmarEmergencia(p: {
  abierto: boolean;
  enviando: boolean;
  onCerrar: () => void;
  onEnviar: () => void;
}) {
  return (
    <Dialog
      abierto={p.abierto}
      onCerrar={() => !p.enviando && p.onCerrar()}
      titulo="¿Enviar alerta de emergencia?"
      descripcion="Avisaremos a la central con tu ubicación actual. Si no hay señal, se enviará apenas vuelva."
      acciones={
        <>
          <Button variant="secondary" disabled={p.enviando} onClick={p.onCerrar}>
            Cancelar
          </Button>
          <Button variant="destructive" disabled={p.enviando} onClick={p.onEnviar}>
            {p.enviando ? "Enviando…" : "Enviar alerta"}
          </Button>
        </>
      }
    />
  );
}

/**
 * Botón «Emergencia» de la ronda en curso (CAR-501, diseño «Rondas Guardia» g3e). Separado de las acciones
 * normales y con confirmación; siempre avisa a la Central (decisión 21 de Rondas). Toma la ubicación si el teléfono
 * la da en pocos segundos y va a la cola: sin señal queda en el teléfono y sale apenas vuelva. Solo dice «guardada»
 * cuando la cola releyó la alerta del disco.
 */
export function BotonEmergencia(p: { personaId: string; ejecucionClave: string }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<Estado>("libre");
  const enviar = async () => {
    setEstado("enviando");
    const lectura = await leerGps(4000);
    try {
      await encolarHecho({
        tipo: "rondas.emergencia",
        payload: { ejecucionClave: p.ejecucionClave, ...(lectura ? { lectura } : {}) },
        personaId: p.personaId,
      });
      setEstado("enviada");
    } catch {
      setEstado("error");
    }
    setAbierto(false);
  };
  return (
    <div className="flex flex-col gap-2">
      <Button variant="destructive" aria-haspopup="dialog" onClick={() => setAbierto(true)}>
        <AlertTriangle aria-hidden className="size-4" />
        Emergencia
      </Button>
      <div aria-live="polite">
        {estado === "enviada" ? (
          <Alerta tono="success" titulo="Alerta de emergencia guardada">
            Se envía a la central de inmediato si hay señal, o apenas vuelva. Puedes verla en la
            cola del teléfono.
          </Alerta>
        ) : null}
        {estado === "error" ? (
          <Alerta tono="danger" titulo="No se pudo guardar la alerta">
            No quedó en el teléfono. Vuelve a intentarlo o llama a la central.
          </Alerta>
        ) : null}
      </div>
      <ConfirmarEmergencia
        abierto={abierto}
        enviando={estado === "enviando"}
        onCerrar={() => setAbierto(false)}
        onEnviar={() => void enviar()}
      />
    </div>
  );
}
