"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";

import { Alerta, Button, Dialog } from "@opai/ds";

import { encolarHecho } from "@/lib/terreno/cola";
import { leerGps } from "@/lib/terreno/gps";

type Estado = "libre" | "enviando" | "enviada" | "error";

/**
 * Botón «Emergencia» de la ronda en curso (CAR-501, diseño «Rondas Guardia» g3e). Separado de las acciones
 * normales y con confirmación contra toques accidentales; siempre avisa a la Central (decisión 21 de Rondas).
 * Toma la ubicación si el teléfono la da en pocos segundos y va a la cola: sin señal queda en el teléfono y sale
 * apenas vuelva. Solo dice «enviada» cuando la cola releyó la alerta del disco.
 */
export function BotonEmergencia({
  personaId,
  ejecucionClave,
}: {
  personaId: string;
  ejecucionClave: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [estado, setEstado] = useState<Estado>("libre");
  const enviar = async () => {
    setEstado("enviando");
    const lectura = await leerGps(4000);
    try {
      await encolarHecho({
        tipo: "rondas.emergencia",
        payload: { ejecucionClave, ...(lectura ? { lectura } : {}) },
        personaId,
      });
      setEstado("enviada");
    } catch {
      setEstado("error");
    }
    setAbierto(false);
  };
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="destructive"
        aria-haspopup="dialog"
        onClick={() => {
          setEstado("libre");
          setAbierto(true);
        }}
      >
        <AlertTriangle aria-hidden className="size-4" />
        Emergencia
      </Button>
      {estado === "enviada" ? (
        <Alerta tono="success" titulo="Alerta de emergencia enviada">
          La central y tu supervisor ya la tienen o la recibirán apenas haya señal.
        </Alerta>
      ) : null}
      {estado === "error" ? (
        <Alerta tono="danger" titulo="No se pudo guardar la alerta">
          No quedó en el teléfono. Vuelve a intentarlo o llama a la central.
        </Alerta>
      ) : null}
      <Dialog
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo="¿Enviar alerta de emergencia?"
        descripcion="Avisaremos a la central y a tu supervisor con tu ubicación actual. Si no hay señal, se enviará apenas vuelva."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={estado === "enviando"}
              onClick={() => void enviar()}
            >
              {estado === "enviando" ? "Enviando…" : "Enviar alerta"}
            </Button>
          </>
        }
      />
    </div>
  );
}
