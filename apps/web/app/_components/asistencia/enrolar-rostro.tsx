"use client";

import { Alerta, avisar, Button } from "@opai/ds";

import { CapturaRostro } from "./captura-rostro";
import type { useEjecutorAsistencia } from "./use-ejecutor";
import { type EstadoAsistencia } from "./tipos";

/** Enrolar mi rostro: primero el consentimiento expreso (por Cumplimiento, L-13); luego la prueba de vida. */
export function EnrolarRostro({
  ejecutor, base, estado, texto, nombreSugerido, onListo,
}: {
  ejecutor: ReturnType<typeof useEjecutorAsistencia>;
  base: Record<string, unknown>;
  estado: EstadoAsistencia;
  texto: string;
  nombreSugerido: string;
  onListo: () => void;
}) {
  const { ejecutar, pendiente, error } = ejecutor;
  return (
    <div className="flex flex-col gap-4">
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <Alerta tono="info" titulo="Tu rostro es un dato sensible">
        No guardamos ninguna foto. Puedes revocarlo cuando quieras y seguir marcando con tu RUT y PIN.
      </Alerta>
      <p className="text-md text-fg-muted text-pretty">{texto}</p>
      {!estado.consentimientoRostro ? (
        <Button size="lg" block disabled={pendiente}
          onClick={() => void ejecutar("asistencia.rostro.consentir", { ...base, proposito: "biometria_asistencia" }).then((r) => { if (r) { avisar.exito("Consentimiento registrado"); onListo(); } })}>
          Acepto el uso de mi rostro
        </Button>
      ) : (
        <CapturaRostro ejecutar={ejecutar} base={base} etiqueta="Enrolar mi rostro" nombreSugerido={nombreSugerido} deshabilitado={pendiente}
          onMuestra={async (muestra) => { if (await ejecutar("asistencia.rostro.enrolar", { ...base, muestra, reemplazar: estado.rostroEnrolado })) { avisar.exito("Rostro enrolado"); onListo(); } }} />
      )}
    </div>
  );
}
