"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Alerta, avisar, Button, Campo, Card, CardContent, Input } from "@opai/ds";
import { MENSAJE_PROBLEMA_PIN, problemaDePin } from "@opai/domain";

import { useCapacidad } from "@/app/_components/use-capacidad";

/** Cambiar PIN: PIN actual, nuevo y repetición. Las reglas del PIN nuevo se dicen antes de enviar. */
export function FormularioCambiarPin({ primerIngreso = false }: { primerIngreso?: boolean }) {
  const { ejecutar, pendiente, error } = useCapacidad("trabajador");
  const router = useRouter();
  const [actual, setActual] = useState("");
  const [nuevo, setNuevo] = useState("");
  const [repetir, setRepetir] = useState("");
  const [local, setLocal] = useState<string | null>(null);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const problema = problemaDePin(nuevo);
    if (problema) return setLocal(MENSAJE_PROBLEMA_PIN[problema]);
    if (nuevo !== repetir) return setLocal("Los PIN nuevos no coinciden.");
    setLocal(null);
    const r = await ejecutar("core.credenciales_terreno.cambiar_pin", {
      pinActual: actual,
      pinNuevo: nuevo,
    });
    if (!r) return;
    avisar.exito("Tu PIN quedó cambiado");
    router.push("/trabajador");
  }

  const campo = (id: string, etiqueta: string, valor: string, poner: (v: string) => void) => (
    <Campo etiqueta={etiqueta} htmlFor={id}>
      <Input
        id={id}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={6}
        value={valor}
        onChange={(ev) => poner(ev.target.value.replace(/\D/g, ""))}
        disabled={pendiente}
        required
      />
    </Campo>
  );

  return (
    <div className="flex max-w-md flex-col gap-4">
      <h2 className="t-title text-fg md:hidden">Cambiar PIN</h2>
      {primerIngreso ? (
        <Alerta tono="info" titulo="Elige tu propio PIN">
          RR. HH. te dio un PIN temporal. Escribe ese PIN y elige uno nuevo que solo tú conozcas.
        </Alerta>
      ) : null}
      {local || error ? <Alerta tono="danger" titulo={local ?? error ?? ""} /> : null}
      <Card>
        <CardContent>
          <form onSubmit={guardar} noValidate className="flex flex-col gap-4">
            {campo("pin-actual", "PIN actual", actual, setActual)}
            {campo("pin-nuevo", "PIN nuevo (6 dígitos)", nuevo, setNuevo)}
            {campo("pin-repetir", "Repite el PIN nuevo", repetir, setRepetir)}
            <Button
              type="submit"
              size="lg"
              block
              disabled={pendiente || actual.length < 6 || nuevo.length < 6}
            >
              {pendiente ? "Guardando…" : "Cambiar PIN"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
