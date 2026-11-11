"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, Button, Campo, Input, Sheet } from "@opai/ds";

import { accionGuardarPasskey, accionOpcionesNuevaPasskey } from "@/app/_acciones/passkeys";
import { crearPasskey, mensajeWebAuthn, useSoportaPasskeys } from "@/app/_components/webauthn";

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

/** Agregar una passkey: nombre y luego Face ID, huella o llave (CAR-286). */
export function AgregarPasskey({ primera }: { primera: boolean }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const soporta = useSoportaPasskeys();

  async function agregar() {
    setError(null);
    setPendiente(true);
    try {
      const op = await accionOpcionesNuevaPasskey();
      if (!op.ok) return setError(op.mensaje);
      const respuesta = await crearPasskey(op.opciones);
      const r = await accionGuardarPasskey(respuesta, nombre);
      if (!r.ok) return setError(r.mensaje);
      setAbierto(false);
      router.refresh();
    } catch (e) {
      setError(mensajeWebAuthn(e));
    } finally {
      setPendiente(false);
    }
  }

  if (!soporta)
    return <p className="text-sm text-fg-muted">Este navegador no permite usar passkeys.</p>;
  return (
    <>
      <Button
        variant={primera ? "primary" : "secondary"}
        onClick={() => {
          setNombre(nombreSugerido());
          setError(null);
          setAbierto(true);
        }}
      >
        <Plus aria-hidden className="size-4" />
        Agregar passkey
      </Button>
      <Sheet
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
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
    </>
  );
}
