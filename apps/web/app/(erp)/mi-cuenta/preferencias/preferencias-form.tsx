"use client";

import { Lock } from "lucide-react";

import { Alerta, Badge, RadioGroup, SeccionTarjeta, Switch } from "@opai/ds";

import { type Valores, usePreferencias } from "./use-preferencias";

const TEMAS = [
  { valor: "sistema", etiqueta: "Sistema", descripcion: "Sigue tu dispositivo" },
  { valor: "claro", etiqueta: "Claro" },
  { valor: "oscuro", etiqueta: "Oscuro" },
];

/** Preferencias propias (35): tema, idioma y avisos personales; cada cambio se guarda solo. */
export function PreferenciasForm({ inicial }: { inicial: Valores }) {
  const { v, error, guardar } = usePreferencias(inicial);
  // Los controles NUNCA se deshabilitan: ni al cargar (antes se atenuaban ~2 s hasta hidratar, un
  // clic en ese lapso se perdía sin aviso, H4 del QA en vivo del #136) ni durante el guardado (la cola
  // serial de `usePreferencias` ordena los clics —último gana— y confirma con un aviso de éxito;
  // deshabilitar bloquearía la ráfaga y clics seguidos no llegarían a registrarse, parte de H2 del
  // #135). El valor inicial viene del servidor, así que el control muestra el estado correcto desde el
  // primer pintado (B1, 5.º ajuste).
  return (
    <div className="flex flex-col gap-4">
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <SeccionTarjeta titulo="Tema">
        <RadioGroup
          etiqueta="Tema"
          valor={v.tema}
          opciones={TEMAS}
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
            onCambiar={(a) => guardar("silencio", a, "preferencias_silencio")}
          />
          <Switch
            etiqueta="Resumen diario"
            descripcion="Un correo al día con tus avisos pendientes"
            activo={v.resumen === "diario"}
            onCambiar={(a) => guardar("resumen", a ? "diario" : "nunca", "preferencias_resumen")}
          />
        </div>
      </SeccionTarjeta>
    </div>
  );
}
