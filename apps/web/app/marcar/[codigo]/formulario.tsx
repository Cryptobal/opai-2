"use client";

import { Alerta, AuthCard, Button, Campo, Input } from "@opai/ds";

import { MarcarPin } from "@/app/_components/asistencia/marcar-pin";
import { MarcarResultado } from "@/app/_components/asistencia/marcar-resultado";

import { useMarcacionPublica } from "./use-marcacion-publica";

/** Marca pública: RUT para ubicar la persona y PIN como en el kiosco. */
export function FormularioMarcacionPublica({
  codigo,
  instalacion,
  empresa,
}: {
  codigo: string;
  instalacion: string;
  empresa: string;
}) {
  const m = useMarcacionPublica(codigo);
  if (m.listo) return <MarcarResultado m={m.listo} instalacion={instalacion} />;

  return (
    <AuthCard titulo="Marcar asistencia" subtitulo={`${empresa} · ${instalacion}`}>
      {m.paso === "rut" ? (
        <div className="flex flex-col gap-4">
          <Campo etiqueta="Tu RUT" htmlFor="rut" ayuda="Para identificarte antes de marcar.">
            <Input
              id="rut"
              name="rut"
              autoComplete="off"
              inputMode="text"
              placeholder="12.345.678-9"
              value={m.rut}
              onChange={(e) => m.setRut(e.target.value)}
              required
            />
          </Campo>
          <Button size="lg" block onClick={() => m.rut.trim() && m.setPaso("pin")} disabled={!m.rut.trim()}>
            Continuar
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {m.error ? <Alerta tono="danger" titulo={m.error} /> : null}
          <MarcarPin
            pin={m.pin}
            onPin={m.setPin}
            motivo="otro"
            onMotivo={() => {}}
            pideMotivo={false}
            pendiente={m.pendiente}
            onMarcar={() => void m.marcar()}
          />
          <Button variant="ghost" block onClick={m.cambiarRut} disabled={m.pendiente}>
            Cambiar RUT
          </Button>
        </div>
      )}
    </AuthCard>
  );
}