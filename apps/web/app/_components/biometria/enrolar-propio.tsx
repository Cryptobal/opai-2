"use client";

import { Alerta, avisar, Button } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { CapturaVida } from "./captura-vida";
import type { EstadoBiometria } from "./tipos";
import { consentido } from "./tipos";

/** Enrolar mi rostro: primero el consentimiento expreso y versionado (L-13); luego la prueba de vida. */
export function EnrolarPropio({
  portal, estado, texto, onListo,
}: { portal: string; estado: EstadoBiometria; texto: string; onListo: () => void }) {
  const { ejecutar, pendiente, error } = useCapacidad(portal);
  const consentimiento = consentido(estado, "biometria_facial");
  return (
    <div className="flex flex-col gap-4">
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <Alerta tono="info" titulo="Tu rostro es un dato sensible">
        No guardamos ninguna foto. Puedes revocarlo cuando quieras y seguir marcando con tu RUT y PIN.
      </Alerta>
      <p className="text-md text-fg-muted text-pretty">{texto}</p>
      {!consentimiento ? (
        <Button size="lg" block disabled={pendiente} onClick={() => void ejecutar("asistencia.consentimientos.aceptar", { tipo: "biometria_facial" }).then((r) => r && avisar.exito("Consentimiento registrado"))}>
          Acepto el uso de mi rostro
        </Button>
      ) : (
        <CapturaVida
          portal={portal}
          etiquetaAccion="Enrolar mi rostro"
          deshabilitado={pendiente}
          onListo={async (sesionVidaId) => {
            if (await ejecutar("asistencia.biometria.enrolar", { sesionVidaId })) {
              avisar.exito("Rostro enrolado");
              onListo();
            }
          }}
        />
      )}
    </div>
  );
}
