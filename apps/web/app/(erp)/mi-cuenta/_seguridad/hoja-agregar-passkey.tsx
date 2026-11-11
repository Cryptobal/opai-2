"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Alerta, Button, Campo, Input, Sheet } from "@opai/ds";

import { accionGuardarPasskey, accionOpcionesNuevaPasskey } from "@/app/_acciones/passkeys";
import { crearPasskey, mensajeWebAuthn } from "@/app/_components/webauthn";

/** Nombre sugerido según el dispositivo, para reconocerla después en la lista. */
function nombreSugerido(): string {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  return "Mi dispositivo";
}

/** Hoja «Agregar passkey» (diferida): nombre y luego Face ID, huella o llave (CAR-286). */
export function HojaAgregarPasskey({ onCerrar }: { onCerrar: () => void }) {
  const router = useRouter();
  const [nombre, setNombre] = useState(nombreSugerido);
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Una ceremonia a la vez: el desafío vive en una sola cookie y un doble toque lo invalidaría.
  const enCurso = useRef(false);

  async function agregar() {
    if (enCurso.current) return;
    enCurso.current = true;
    setError(null);
    setPendiente(true);
    try {
      const op = await accionOpcionesNuevaPasskey();
      if (!op.ok) return setError(op.mensaje);
      const respuesta = await crearPasskey(op.opciones);
      const r = await accionGuardarPasskey(respuesta, nombre);
      if (!r.ok) return setError(r.mensaje);
      onCerrar();
      router.refresh();
    } catch (e) {
      setError(mensajeWebAuthn(e));
    } finally {
      enCurso.current = false;
      setPendiente(false);
    }
  }

  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo="Agregar passkey"
      descripcion="Tu dispositivo te pedirá Face ID, huella o el PIN de tu llave. No guardamos tu huella ni tu rostro."
      acciones={
        <Button size="lg" cargando={pendiente} onClick={() => void agregar()}>
          Continuar
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? (
          <Alerta tono="danger" titulo="No se agregó la passkey">
            {error}
          </Alerta>
        ) : null}
        <Campo etiqueta="Nombre" htmlFor="pk-nombre" ayuda="Para reconocerla en tu lista.">
          <Input
            id="pk-nombre"
            value={nombre}
            maxLength={60}
            onChange={(e) => setNombre(e.target.value)}
            disabled={pendiente}
          />
        </Campo>
      </div>
    </Sheet>
  );
}
