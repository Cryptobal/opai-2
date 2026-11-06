"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Alerta, avisar, Button, Campo, Dialog, Input } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Resultado = { aplicado: boolean; pinTemporal: string | null };

/**
 * «Asignar o restablecer PIN» en la ficha de la persona (RR. HH.). Asignar usa el PIN que se escribe;
 * restablecer genera uno temporal que se muestra UNA vez. Ambos primero muestran la vista previa.
 */
export function BotonesPinTerreno({
  personaId,
  nombre,
  tienePin,
}: {
  personaId: string;
  nombre: string;
  tienePin: boolean;
}) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad("erp");
  const [modo, setModo] = useState<"asignar" | "restablecer" | null>(null);
  const [pin, setPin] = useState("");
  const [temporal, setTemporal] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const cerrar = () => {
    setModo(null);
    setPin("");
    setTemporal(null);
    setCopiado(false);
    limpiarError();
  };

  async function confirmar() {
    if (modo === "asignar") {
      const previa = await ejecutar<Resultado>(
        "core.credenciales_terreno.asignar_pin",
        { personaId, pin },
        true,
      );
      if (!previa) return;
      const r = await ejecutar<Resultado>("core.credenciales_terreno.asignar_pin", {
        personaId,
        pin,
      });
      if (!r) return;
      avisar.exito("PIN asignado. Deberá cambiarlo en su primer ingreso.");
      cerrar();
      return;
    }
    const previa = await ejecutar<Resultado>(
      "core.credenciales_terreno.restablecer",
      { personaId },
      true,
    );
    if (!previa) return;
    const r = await ejecutar<Resultado>("core.credenciales_terreno.restablecer", { personaId });
    if (r?.pinTemporal) setTemporal(r.pinTemporal);
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setModo("asignar")}>
          {tienePin ? "Cambiar PIN" : "Asignar PIN"}
        </Button>
        {tienePin ? (
          <Button variant="secondary" onClick={() => setModo("restablecer")}>
            Restablecer PIN
          </Button>
        ) : null}
      </div>
      <Dialog
        abierto={modo !== null}
        onCerrar={cerrar}
        titulo={modo === "asignar" ? `Asignar PIN a ${nombre}` : `Restablecer el PIN de ${nombre}`}
        descripcion={
          temporal
            ? "Entrégaselo en persona. No se vuelve a mostrar."
            : modo === "asignar"
              ? "6 dígitos. Deberá cambiarlo en su primer ingreso."
              : "Se genera un PIN temporal de 6 dígitos y se desbloquea la credencial."
        }
        acciones={
          temporal ? (
            <Button onClick={cerrar}>Listo</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={cerrar}>
                Cancelar
              </Button>
              <Button
                onClick={() => void confirmar()}
                disabled={pendiente || (modo === "asignar" && !/^\d{6}$/.test(pin))}
              >
                {modo === "asignar" ? "Asignar PIN" : "Restablecer PIN"}
              </Button>
            </>
          )
        }
      >
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {temporal ? (
          <div className="flex items-center gap-2">
            <p className="t-mono flex min-h-11 flex-1 items-center justify-center rounded-md border border-border bg-bg text-xl tracking-widest text-fg">
              {temporal}
            </p>
            <Button
              variant="secondary"
              onClick={() =>
                void navigator.clipboard.writeText(temporal).then(() => setCopiado(true))
              }
            >
              {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copiado ? "Copiado" : "Copiar"}
            </Button>
          </div>
        ) : modo === "asignar" ? (
          <Campo etiqueta="PIN de 6 dígitos" htmlFor="pin-asignar">
            <Input
              id="pin-asignar"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            />
          </Campo>
        ) : null}
      </Dialog>
    </>
  );
}
