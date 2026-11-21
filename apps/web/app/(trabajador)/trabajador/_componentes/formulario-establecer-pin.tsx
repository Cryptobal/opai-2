"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Alerta, avisar, Button, Campo, Card, CardContent, Input } from "@opai/ds";
import { MENSAJE_PROBLEMA_PIN, problemaDePin } from "@opai/domain";

import { useCapacidad } from "@/app/_components/use-capacidad";

/** Primer PIN en el portal del trabajador (CAR-803). */
export function FormularioEstablecerPin() {
  const { ejecutar, pendiente, error } = useCapacidad("trabajador");
  const router = useRouter();
  const [nuevo, setNuevo] = useState("");
  const [repetir, setRepetir] = useState("");
  const [local, setLocal] = useState<string | null>(null);

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const problema = problemaDePin(nuevo);
    if (problema) return setLocal(MENSAJE_PROBLEMA_PIN[problema]);
    if (nuevo !== repetir) return setLocal("Los PIN no coinciden.");
    setLocal(null);
    const r = await ejecutar("core.credenciales_terreno.establecer_pin", { pin: nuevo });
    if (!r) return;
    avisar.exito("Tu PIN quedó creado");
    router.push("/trabajador");
    router.refresh();
  }

  const campo = (id: string, etiqueta: string, valor: string, poner: (v: string) => void) => (
    <Campo etiqueta={etiqueta} htmlFor={id}>
      <Input
        id={id}
        type="password"
        inputMode="numeric"
        autoComplete="new-password"
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
      <h2 className="t-title text-fg md:hidden">Crea tu PIN</h2>
      <Alerta tono="info" titulo="Elige tu PIN de 6 dígitos">
        Lo usarás en terreno junto con tu RUT. Guárdalo en un lugar seguro.
      </Alerta>
      {local || error ? <Alerta tono="danger" titulo={local ?? error ?? ""} /> : null}
      <Card>
        <CardContent>
          <form onSubmit={guardar} noValidate className="flex flex-col gap-4">
            {campo("pin-nuevo", "PIN (6 dígitos)", nuevo, setNuevo)}
            {campo("pin-repetir", "Repite el PIN", repetir, setRepetir)}
            <Button type="submit" size="lg" block disabled={pendiente || nuevo.length < 6}>
              {pendiente ? "Guardando…" : "Crear PIN"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}