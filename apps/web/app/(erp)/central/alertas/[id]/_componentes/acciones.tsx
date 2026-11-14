"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { avisar, Button, Dialog } from "@opai/ds";

import { type Confirmacion, DialogoConfirmar } from "@/app/_components/maestros/dialogo-confirmar";
import { useCapacidad } from "@/app/_components/use-capacidad";

type Props = { id: string; estado: string };
type ConNota = "resolver" | "falsa_alarma" | "reabrir";

const ACTIVOS = new Set(["nueva", "en_contacto", "escalada", "en_atencion", "pospuesta"]);
const PLAZOS = [
  { minutos: 15, etiqueta: "15 minutos" },
  { minutos: 60, etiqueta: "1 hora" },
  { minutos: 240, etiqueta: "4 horas" },
  { minutos: 1440, etiqueta: "24 horas" },
];

const CONFIRMACION: Record<ConNota, Confirmacion & { exito: string }> = {
  resolver: { titulo: "Resolver alerta", descripcion: "Cuenta qué se hizo: queda en la bitácora.", boton: "Resolver", motivo: true, motivoEtiqueta: "Qué se hizo", exito: "Alerta resuelta" },
  falsa_alarma: { titulo: "Cerrar como falsa alarma", descripcion: "Cuenta por qué no era real.", boton: "Falsa alarma", motivo: true, motivoEtiqueta: "Motivo", exito: "Cerrada como falsa alarma" },
  reabrir: { titulo: "Reabrir alerta", descripcion: "Vuelve a la cola como nueva.", boton: "Reabrir", motivo: true, motivoEtiqueta: "Qué evidencia nueva hay", exito: "Alerta reabierta" },
};

/** Acciones de la alerta (spec §6): cada botón llama a la misma capacidad que el MCP. */
export function AccionesAlerta({ id, estado }: Props) {
  const router = useRouter();
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [dialogo, setDialogo] = useState<ConNota | "posponer" | null>(null);
  const activa = ACTIVOS.has(estado);

  async function correr(llamada: Promise<unknown>, exito: string) {
    if (await llamada) {
      avisar.exito(exito);
      setDialogo(null);
      router.refresh();
    }
  }
  function conNota(accion: ConNota, nota: string) {
    if (accion === "resolver") return ejecutar("central.alertas.resolver", { id, nota });
    if (accion === "falsa_alarma") return ejecutar("central.alertas.falsa_alarma", { id, nota });
    return ejecutar("central.alertas.reabrir", { id, nota });
  }
  const cerrar = () => {
    limpiarError();
    setDialogo(null);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {activa && estado !== "en_atencion" && estado !== "pospuesta" ? (
        <Button variant="primary" disabled={pendiente} onClick={() => correr(ejecutar("central.alertas.hacerse_cargo", { id }), "Quedaste a cargo")}>
          Me hago cargo
        </Button>
      ) : null}
      {activa ? (
        <>
          <Button variant={estado === "en_atencion" ? "primary" : "secondary"} disabled={pendiente} onClick={() => setDialogo("resolver")}>
            Resolver
          </Button>
          <Button variant="secondary" disabled={pendiente} onClick={() => setDialogo("falsa_alarma")}>
            Falsa alarma
          </Button>
          {estado !== "pospuesta" ? (
            <Button variant="secondary" disabled={pendiente} onClick={() => setDialogo("posponer")}>
              Posponer
            </Button>
          ) : null}
          {estado !== "pospuesta" ? (
            <Button variant="secondary" disabled={pendiente} onClick={() => correr(ejecutar("central.alertas.escalar", { id }), "Alerta escalada")}>
              Escalar
            </Button>
          ) : null}
        </>
      ) : (
        <Button variant="secondary" disabled={pendiente} onClick={() => setDialogo("reabrir")}>
          Reabrir
        </Button>
      )}

      {dialogo && dialogo !== "posponer" ? (
        <DialogoConfirmar
          confirmacion={CONFIRMACION[dialogo]}
          pendiente={pendiente}
          error={error}
          onCerrar={cerrar}
          onConfirmar={(motivo) => correr(conNota(dialogo, motivo?.trim() ?? ""), CONFIRMACION[dialogo].exito)}
        />
      ) : null}
      <Dialog
        abierto={dialogo === "posponer"}
        onCerrar={cerrar}
        titulo="Posponer alerta"
        descripcion="Sale de la cola y vuelve sola al cumplirse el plazo."
        acciones={
          <Button variant="secondary" onClick={cerrar}>
            Cancelar
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-2">
          {PLAZOS.map((p) => (
            <Button key={p.minutos} variant="secondary" disabled={pendiente} onClick={() => correr(ejecutar("central.alertas.posponer", { id, minutos: p.minutos }), "Alerta pospuesta")}>
              {p.etiqueta}
            </Button>
          ))}
        </div>
        {error ? <p className="mt-3 text-base text-danger">{error}</p> : null}
      </Dialog>
    </div>
  );
}
