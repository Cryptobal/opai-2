"use client";

import { Lock } from "lucide-react";
import { useState } from "react";

import { Alerta, avisar, Badge, RadioGroup, SeccionTarjeta, Switch } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Valores = { tema: string; silencio: boolean; resumen: string };

const TEMAS = [
  { valor: "sistema", etiqueta: "Sistema", descripcion: "Sigue tu dispositivo" },
  { valor: "claro", etiqueta: "Claro" },
  { valor: "oscuro", etiqueta: "Oscuro" },
];

/**
 * Aplica el tema al instante (el DS lee `data-theme` en <html>) y lo recuerda en este dispositivo
 * para el script del layout raíz, que lo aplica antes de pintar en las próximas cargas.
 */
function aplicarTema(t: string) {
  const html = document.documentElement;
  if (t === "sistema") delete html.dataset["theme"];
  else html.dataset["theme"] = t === "oscuro" ? "dark" : "light";
  try {
    localStorage.setItem("opai_tema", t);
  } catch {
    // Sin almacenamiento (modo privado): el tema vale solo para esta pestaña.
  }
}

/** Preferencias propias (35): tema, idioma y avisos personales; cada cambio se guarda solo. */
export function PreferenciasForm({ inicial }: { inicial: Valores }) {
  const [v, setV] = useState(inicial);
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  async function guardar<K extends keyof Valores>(k: K, valor: Valores[K], clave: string) {
    const previo = v;
    setV((x) => ({ ...x, [k]: valor }));
    if (k === "tema") aplicarTema(String(valor));
    const r = await ejecutar("core.config.set", { modulo: "core", clave, valor });
    if (r) avisar.exito("Preferencia guardada");
    else setV(previo);
  }
  return (
    <div className="flex flex-col gap-4">
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <SeccionTarjeta titulo="Tema">
        <RadioGroup
          etiqueta="Tema"
          valor={v.tema}
          opciones={TEMAS}
          onCambiar={(t) => void guardar("tema", t, "preferencias_tema")}
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
            disabled={pendiente}
            onCambiar={(a) => void guardar("silencio", a, "preferencias_silencio")}
          />
          <Switch
            etiqueta="Resumen diario"
            descripcion="Un correo al día con tus avisos pendientes"
            activo={v.resumen === "diario"}
            disabled={pendiente}
            onCambiar={(a) =>
              void guardar("resumen", a ? "diario" : "nunca", "preferencias_resumen")
            }
          />
        </div>
      </SeccionTarjeta>
    </div>
  );
}
