"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Campo, Input, Select, Sheet, Textarea } from "@opai/ds";

import { useHojaUrl } from "../maestros/use-url";
import { useCapacidad } from "../use-capacidad";

const FINES = [
  { valor: "comunicaciones_comerciales", etiqueta: "Comunicaciones comerciales" },
  { valor: "encuestas", etiqueta: "Encuestas de satisfacción" },
  { valor: "eventos", etiqueta: "Invitaciones a eventos" },
] as const;

/** Registrar que el titular otorga su consentimiento para un fin accesorio (`?consentimiento=1`). */
export function HojaConsentimiento({ titular }: { titular: { tipo: string; id: string } }) {
  const hoja = useHojaUrl("consentimiento");
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [proposito, setProposito] = useState<string>(FINES[0].valor);
  const [version, setVersion] = useState("");
  const [nota, setNota] = useState("");
  async function registrar() {
    const r = await ejecutar("core.cumplimiento.consentimiento_registrar", {
      titular,
      proposito,
      versionAviso: version.trim(),
      ...(nota.trim() ? { nota: nota.trim() } : {}),
    });
    if (!r) return;
    avisar.exito("Consentimiento registrado");
    hoja.cerrar();
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Registrar consentimiento"
      descripcion="Solo para fines accesorios. Queda versionado y no se edita: para retirarlo, se revoca."
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente || !version.trim()} onClick={() => void registrar()}>
            {pendiente ? "Registrando…" : "Registrar"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="Fin" htmlFor="con-fin">
          <Select id="con-fin" valor={proposito} onCambiar={setProposito} opciones={FINES} />
        </Campo>
        <Campo
          etiqueta="Versión del aviso de privacidad"
          htmlFor="con-version"
          ayuda="La que leyó el titular, p. ej. «2026-11»"
        >
          <Input id="con-version" value={version} onChange={(e) => setVersion(e.target.value)} />
        </Campo>
        <Campo
          etiqueta="Cómo se obtuvo"
          htmlFor="con-nota"
          ayuda="Opcional: formulario, correo, papel firmado"
        >
          <Textarea id="con-nota" rows={3} value={nota} onChange={(e) => setNota(e.target.value)} />
        </Campo>
      </div>
    </Sheet>
  );
}
