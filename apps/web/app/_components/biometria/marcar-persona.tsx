"use client";

import { useRef, useState } from "react";

import { Alerta, Button, Card, CardContent } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { CapturaVida } from "./captura-vida";
import { EnrolarPropio } from "./enrolar-propio";
import { motivoDeFallo, ubicacion } from "./etiquetas";
import { MarcarPin } from "./marcar-pin";
import { MarcarResultado, type MarcaListo } from "./marcar-resultado";
import { consentido, type EstadoBiometria } from "./tipos";

type Paso = "inicio" | "pin" | "enrolar";

/**
 * Marcación (Terreno y Portal Trabajador). El rostro con prueba de vida es el método principal si la persona
 * lo tiene enrolado; «Usar PIN» está siempre visible (D-02) y, si la marca cae al PIN tras probar el rostro,
 * guarda el motivo. La ubicación solo alerta: nunca bloquea (D-13).
 */
export function MarcarPersona({
  portal, canal, estado, instalacionId, instalacion, textoRostro,
}: {
  portal: "terreno" | "trabajador";
  canal: "kiosco" | "telefono_personal";
  estado: EstadoBiometria;
  instalacionId: string;
  instalacion: string;
  textoRostro: string;
}) {
  const { ejecutar, pendiente, error, limpiarError } = useCapacidad(portal);
  const [paso, setPaso] = useState<Paso>("inicio");
  const [pin, setPin] = useState("");
  const [motivo, setMotivo] = useState("otro");
  const [listo, setListo] = useState<MarcaListo | null>(null);
  const [intentoRostro, setIntentoRostro] = useState(false);
  const clave = useRef<string>(crypto.randomUUID());
  const rostroUsable = estado.rostroEnrolado && consentido(estado, "biometria_facial");
  const personaId = estado.yo?.personaId ?? "";

  async function marcar(extra: Record<string, unknown>) {
    const ub = await ubicacion();
    const r = await ejecutar<{ marca: MarcaListo; repetida: boolean }>(
      "asistencia.marcas.registrar",
      { personaId, instalacionId, canal, claveDispositivo: clave.current, ...extra, ...(ub ?? {}) },
      false,
      "ninguna",
    );
    if (r) setListo(r.marca);
    return r;
  }

  async function conRostro(sesionVidaId: string) {
    setIntentoRostro(true);
    const r = await marcar({ metodo: "rostro", sesionVidaId });
    if (!r) setPaso("inicio");
  }
  async function conPin() {
    const respaldo = rostroUsable;
    const r = await marcar({
      metodo: respaldo ? "pin_respaldo" : "rut_pin", credencial: pin,
      ...(respaldo ? { motivoRespaldo: motivo } : {}),
    });
    if (!r) setPin("");
  }

  if (listo) return <MarcarResultado m={listo} instalacion={instalacion} />;
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="t-caption text-fg-muted">{instalacion}</span>
        <span className="t-body-sm text-fg-muted">La hora la fija el servidor al marcar.</span>
      </div>
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      {paso === "inicio" ? (
        <Card>
          <CardContent className="flex flex-col gap-4">
            {rostroUsable ? (
              <CapturaVida portal={portal} etiquetaAccion="Marcar con mi rostro" onListo={conRostro} deshabilitado={pendiente} />
            ) : (
              <Alerta tono="neutral" titulo="Marca con tu RUT y PIN">
                {estado.rostroEnrolado ? "Falta tu consentimiento vigente para usar tu rostro." : "Aún no tienes tu rostro enrolado."}
              </Alerta>
            )}
            <Button variant="secondary" size="lg" block onClick={() => { limpiarError(); if (intentoRostro && error) setMotivo(motivoDeFallo(error)); setPaso("pin"); }}>
              Usar PIN
            </Button>
            {!rostroUsable ? (
              <Button variant="ghost" block onClick={() => { limpiarError(); setPaso("enrolar"); }}>Enrolar mi rostro</Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
      {paso === "pin" ? (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <MarcarPin pin={pin} onPin={setPin} motivo={motivo} onMotivo={setMotivo} pideMotivo={rostroUsable} pendiente={pendiente} onMarcar={() => void conPin()} />
            <Button variant="ghost" block onClick={() => { limpiarError(); setPaso("inicio"); }}>Volver</Button>
          </CardContent>
        </Card>
      ) : null}
      {paso === "enrolar" ? (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <EnrolarPropio portal={portal} estado={estado} texto={textoRostro} onListo={() => setPaso("inicio")} />
            <Button variant="ghost" block onClick={() => setPaso("inicio")}>Volver</Button>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
