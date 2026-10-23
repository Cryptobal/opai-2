"use client";

import { useState } from "react";

import { Button, Campo, Input, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { CampoPortales, CampoRol } from "./campos";

type Props = { abierto: boolean; onCerrar: () => void; miRol: string };

/** Invitar usuario: correo, rol y portales. El enlace llega por correo (un uso, 72 horas). */
export function InvitarUsuario({ abierto, onCerrar, miRol }: Props) {
  const { ejecutar, error, limpiarError } = useCapacidad("erp");
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState("viewer");
  const [portales, setPortales] = useState<string[]>(["erp"]);
  const [enviado, setEnviado] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cerrar = () => {
    setEnviado(null);
    setEmail("");
    limpiarError();
    onCerrar();
  };

  async function enviar() {
    setEnviando(true);
    const r = await ejecutar<{ email: string }>("core.users.invite", { email, rol, portales });
    setEnviando(false);
    if (r) setEnviado(r.email);
  }

  return (
    <Sheet
      abierto={abierto}
      onCerrar={cerrar}
      titulo="Invitar usuario"
      acciones={
        enviado ? (
          <Button block size="lg" onClick={cerrar}>
            Listo
          </Button>
        ) : (
          <Button
            block
            size="lg"
            disabled={enviando || !email || portales.length === 0}
            onClick={enviar}
          >
            {enviando ? "Enviando…" : "Enviar invitación"}
          </Button>
        )
      }
    >
      {enviado ? (
        <p className="text-base text-fg">
          Enviamos la invitación a <strong>{enviado}</strong>. El enlace vence en 72 horas.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <Campo etiqueta="Correo" htmlFor="inv-email" {...(error ? { error } : {})}>
            <Input
              id="inv-email"
              type="email"
              inputMode="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Campo>
          <CampoRol id="inv-rol" valor={rol} onCambiar={setRol} miRol={miRol} />
          <CampoPortales valor={portales} onCambiar={setPortales} />
        </div>
      )}
    </Sheet>
  );
}
