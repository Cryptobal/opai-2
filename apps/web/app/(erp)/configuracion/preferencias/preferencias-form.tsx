"use client";

import { Lock } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Alerta, Badge, RadioGroup, SeccionTarjeta, Switch } from "@opai/ds";

import { type Valores, usePreferencias } from "./use-preferencias";

const suscribirHidratacion = () => () => {};
const yaHidratado = () => true;
const aunNoHidratado = () => false;

const TEMAS = [
  { valor: "sistema", etiqueta: "Sistema", descripcion: "Sigue tu dispositivo" },
  { valor: "claro", etiqueta: "Claro" },
  { valor: "oscuro", etiqueta: "Oscuro" },
];

/** Preferencias propias (35): tema, idioma y avisos personales; cada cambio se guarda solo. */
export function PreferenciasForm({ inicial }: { inicial: Valores }) {
  const hidratado = useSyncExternalStore(suscribirHidratacion, yaHidratado, aunNoHidratado);
  const { v, error, guardar } = usePreferencias(inicial);
  // Solo se deshabilita hasta hidratar (el controlador vive en el cliente); NO durante el guardado:
  // la cola serial de `usePreferencias` ya ordena los clics (último gana) y confirma con un aviso de
  // éxito. Deshabilitar mientras guarda atenuaba los controles sin explicación (H4) y bloqueaba la
  // ráfaga, de modo que clics seguidos no llegaban a registrarse (parte de H2 del #135).
  return (
    <div className="flex flex-col gap-4">
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <SeccionTarjeta titulo="Tema">
        <RadioGroup
          etiqueta="Tema"
          valor={v.tema}
          opciones={TEMAS.map((opcion) => ({ ...opcion, disabled: !hidratado }))}
          onCambiar={(t) => guardar("tema", t, "preferencias_tema")}
        />
      </SeccionTarjeta>
      <SeccionTarjeta titulo="Idioma">
        <div className="flex items-center justify-between gap-3">
          <span className="text-base text-fg">Español de Chile</span>
          <Badge tono="neutro" punto={false}>
            <Lock className="size-3" aria-hidden /> Por ahora fijo
          </Badge>
        </div>
      </SeccionTarjeta>
      <SeccionTarjeta titulo="Notificaciones personales">
        <div className="flex flex-col gap-4">
          <Switch
            etiqueta="Silenciar avisos por correo"
            descripcion="Los avisos transaccionales (invitaciones, recuperación) siguen llegando"
            activo={v.silencio}
            disabled={!hidratado}
            onCambiar={(a) => guardar("silencio", a, "preferencias_silencio")}
          />
          <Switch
            etiqueta="Resumen diario"
            descripcion="Un correo al día con tus avisos pendientes"
            activo={v.resumen === "diario"}
            disabled={!hidratado}
            onCambiar={(a) => guardar("resumen", a ? "diario" : "nunca", "preferencias_resumen")}
          />
        </div>
      </SeccionTarjeta>
    </div>
  );
}
