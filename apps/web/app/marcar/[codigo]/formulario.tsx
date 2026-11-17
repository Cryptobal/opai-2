"use client";

import { useRef, useState } from "react";

import { Alerta, AuthCard, Button, Campo, Input } from "@opai/ds";

import { MarcarPin } from "@/app/_components/asistencia/marcar-pin";
import { MarcarResultado, type MarcaListo } from "@/app/_components/asistencia/marcar-resultado";
import { ubicacion } from "@/app/_components/asistencia/etiquetas";

import { marcarPorEnlacePublico } from "./acciones";

/** Marca pública: RUT para ubicar la persona y PIN como en el kiosco (CAR-606). */
export function FormularioMarcacionPublica({
  codigo,
  instalacion,
  empresa,
}: {
  codigo: string;
  instalacion: string;
  empresa: string;
}) {
  const [paso, setPaso] = useState<"rut" | "pin">("rut");
  const [rut, setRut] = useState("");
  const [pin, setPin] = useState("");
  const [pendiente, setPendiente] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<MarcaListo | null>(null);
  const clave = useRef(crypto.randomUUID());

  async function marcar() {
    setPendiente(true);
    setError(null);
    const ub = await ubicacion();
    const r = await marcarPorEnlacePublico(codigo, {
      rut,
      pin,
      claveDispositivo: clave.current,
      ...(ub ?? {}),
    });
    setPendiente(false);
    if (!r.ok) {
      setError(r.error.message);
      setPin("");
      return;
    }
    setListo((r.data as { marca: MarcaListo }).marca);
  }

  if (listo) return <MarcarResultado m={listo} instalacion={instalacion} />;

  return (
    <AuthCard titulo="Marcar asistencia" subtitulo={`${empresa} · ${instalacion}`}>
      {paso === "rut" ? (
        <div className="flex flex-col gap-4">
          <Campo etiqueta="Tu RUT" htmlFor="rut" ayuda="Para identificarte antes de marcar.">
            <Input
              id="rut"
              name="rut"
              autoComplete="off"
              inputMode="text"
              placeholder="12.345.678-9"
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              required
            />
          </Campo>
          <Button size="lg" block onClick={() => rut.trim() && setPaso("pin")} disabled={!rut.trim()}>
            Continuar
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {error ? <Alerta tono="danger" titulo={error} /> : null}
          <MarcarPin
            pin={pin}
            onPin={setPin}
            motivo="otro"
            onMotivo={() => {}}
            pideMotivo={false}
            pendiente={pendiente}
            onMarcar={() => void marcar()}
          />
          <Button
            variant="ghost"
            block
            onClick={() => {
              setPaso("rut");
              setPin("");
              setError(null);
            }}
            disabled={pendiente}
          >
            Cambiar RUT
          </Button>
        </div>
      )}
    </AuthCard>
  );
}