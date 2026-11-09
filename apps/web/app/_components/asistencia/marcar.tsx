"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Alerta, Button, Card, CardContent } from "@opai/ds";

import { CapturaRostro } from "./captura-rostro";
import { EnrolarRostro } from "./enrolar-rostro";
import { motivoDeFallo, ubicacion } from "./etiquetas";
import { MarcarPin, PinParaEnrolar } from "./marcar-pin";
import { type MarcaListo, MarcarResultado } from "./marcar-resultado";
import type { EstadoAsistencia } from "./tipos";
import { type Modo, useEjecutorAsistencia } from "./use-ejecutor";

type Paso = "inicio" | "pin" | "enrolar";

/**
 * Marcación (Terreno y Portal Trabajador). El rostro con prueba de vida es el método principal si la persona lo
 * tiene enrolado; «Usar PIN» está siempre visible (D-02) y, si la marca cae al PIN tras probar el rostro, guarda el
 * motivo. Rostro y PIN llegan a la MISMA capacidad de marca (una cadena auditable, idempotente). La ubicación solo
 * alerta: nunca bloquea (D-13). Requiere conexión: no se marca sin poder verificar la identidad.
 */
export function Marcar({
  modo, personaId, nombre, textoRostro, instalacionId, instalacion, estadoInicial,
}: {
  modo: Modo;
  /** Kiosco: la persona elegida (declarada). Teléfono: se omite, es la de la sesión. */
  personaId?: string | undefined;
  nombre: string;
  textoRostro: string;
  instalacionId?: string | undefined;
  instalacion?: string | undefined;
  estadoInicial?: EstadoAsistencia | null | undefined;
}) {
  const ejecutor = useEjecutorAsistencia(modo);
  const { ejecutar, pendiente, error, limpiarError } = ejecutor;
  const [estado, setEstado] = useState<EstadoAsistencia | null>(estadoInicial ?? null);
  const [paso, setPaso] = useState<Paso>("inicio");
  const [pin, setPin] = useState("");
  const [motivo, setMotivo] = useState("otro");
  const [listo, setListo] = useState<MarcaListo | null>(null);
  const [intentoRostro, setIntentoRostro] = useState(false);
  const clave = useRef<string>(crypto.randomUUID());
  const base = useCallback(() => ({ ...(personaId ? { personaId } : {}), ...(modo === "equipo" ? { credencial: pin } : {}) }), [personaId, modo, pin]);

  const cargar = useCallback(async () => {
    const e = await ejecutar<EstadoAsistencia>("asistencia.rostro.estado", personaId ? { personaId } : {});
    if (e) setEstado(e);
  }, [ejecutar, personaId]);
  useEffect(() => {
    if (estadoInicial) return;
    let vivo = true;
    void ejecutar<EstadoAsistencia>("asistencia.rostro.estado", personaId ? { personaId } : {}).then((e) => vivo && e && setEstado(e));
    return () => {
      vivo = false;
    };
  }, [ejecutar, personaId, estadoInicial]);

  const rostroUsable = !!estado?.rostroEnrolado && !!estado.consentimientoRostro;
  const lugar = instalacion ?? estado?.instalacionNombre ?? "tu instalación";

  async function marcar(extra: Record<string, unknown>) {
    const ub = await ubicacion();
    const r = await ejecutar<{ marca: MarcaListo }>("asistencia.marcas.registrar", {
      ...(personaId ? { personaId } : { personaId: estado?.personaId }),
      instalacionId: instalacionId ?? estado?.instalacionId, canal: modo === "equipo" ? "kiosco" : "telefono_personal",
      claveDispositivo: clave.current, ...extra, ...(ub ?? {}),
    });
    if (r) setListo(r.marca);
    return r;
  }
  async function conRostro(muestra: string) {
    setIntentoRostro(true);
    if (!(await marcar({ metodo: "rostro", muestra }))) setPaso("inicio");
  }
  async function conPin() {
    const r = await marcar({ metodo: rostroUsable ? "pin_respaldo" : "rut_pin", credencial: pin, ...(rostroUsable ? { motivoRespaldo: motivo } : {}) });
    if (!r) setPin("");
  }

  if (listo) return <MarcarResultado m={listo} instalacion={lugar} />;
  const sugerido = nombre.split(" ")[0]?.toLowerCase() ?? "prueba";
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1">
        <span className="t-caption text-fg-muted">{lugar} · {nombre}</span>
        <span className="t-body-sm text-fg-muted">La hora la fija el servidor al marcar. Necesitas conexión.</span>
      </div>
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      {paso === "inicio" ? (
        <Card><CardContent className="flex flex-col gap-4">
          {rostroUsable ? (
            <CapturaRostro ejecutar={ejecutar} base={base()} etiqueta="Marcar con mi rostro" nombreSugerido={sugerido} deshabilitado={pendiente} onMuestra={conRostro} />
          ) : (
            <Alerta tono="neutral" titulo="Marca con tu RUT y PIN">
              {estado?.rostroEnrolado ? "Falta tu consentimiento vigente para usar tu rostro." : "Aún no tienes tu rostro enrolado."}
            </Alerta>
          )}
          <Button variant="secondary" size="lg" block onClick={() => { if (intentoRostro && error) setMotivo(motivoDeFallo(error)); limpiarError(); setPaso("pin"); }}>Usar PIN</Button>
          {!rostroUsable ? <Button variant="ghost" block onClick={() => { limpiarError(); setPaso("enrolar"); }}>Enrolar mi rostro</Button> : null}
        </CardContent></Card>
      ) : null}
      {paso === "pin" ? (
        <Card><CardContent className="flex flex-col gap-3">
          <MarcarPin pin={pin} onPin={setPin} motivo={motivo} onMotivo={setMotivo} pideMotivo={rostroUsable} pendiente={pendiente} onMarcar={() => void conPin()} />
          <Button variant="ghost" block onClick={() => { limpiarError(); setPaso("inicio"); }}>Volver</Button>
        </CardContent></Card>
      ) : null}
      {paso === "enrolar" && estado ? (
        <Card><CardContent className="flex flex-col gap-3">
          {modo === "equipo" ? <PinParaEnrolar pin={pin} onPin={setPin} /> : null}
          <EnrolarRostro ejecutor={ejecutor} base={base()} estado={estado} texto={textoRostro} nombreSugerido={sugerido} onListo={() => { void cargar(); setPaso("inicio"); }} />
          <Button variant="ghost" block onClick={() => setPaso("inicio")}>Volver</Button>
        </CardContent></Card>
      ) : null}
    </div>
  );
}
