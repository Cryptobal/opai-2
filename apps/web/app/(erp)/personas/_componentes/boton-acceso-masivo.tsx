"use client";

import { useState } from "react";

import { Alerta, avisar, Button, Dialog } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Resultado = {
  resultados: { personaId: string; estado: string }[];
};

/** Da acceso al portal del trabajador a las personas visibles en la página (máx. 50). */
export function BotonAccesoMasivo({
  personaIds,
  habilitado,
}: {
  personaIds: string[];
  habilitado: boolean;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [abierto, setAbierto] = useState(false);
  if (!habilitado || personaIds.length === 0) return null;

  async function aplicar() {
    const r = await ejecutar<Resultado>("core.personas.dar_acceso_portal", { personaIds });
    if (!r) return;
    const invitados = r.resultados.filter((x) => x.estado === "invitado").length;
    const vinculados = r.resultados.filter((x) => x.estado === "vinculado").length;
    avisar.exito(
      invitados || vinculados
        ? `Listo: ${invitados} invitación${invitados === 1 ? "" : "es"}, ${vinculados} vinculado${vinculados === 1 ? "" : "s"}.`
        : "Ninguna persona necesitaba acceso nuevo.",
    );
    setAbierto(false);
  }

  return (
    <>
      <Button type="button" variant="ghost" onClick={() => setAbierto(true)}>
        Dar acceso al portal
      </Button>
      <Dialog
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo="Dar acceso al portal"
        descripcion={`Se intentará dar acceso a ${personaIds.length} persona${personaIds.length === 1 ? "" : "s"} de esta página.`}
        acciones={
          <>
            <Button type="button" variant="secondary" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button type="button" disabled={pendiente} onClick={() => void aplicar()}>
              {pendiente ? "Aplicando…" : "Confirmar"}
            </Button>
          </>
        }
      >
        {error ? <Alerta tono="danger" titulo={error} /> : null}
      </Dialog>
    </>
  );
}