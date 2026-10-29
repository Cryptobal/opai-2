"use client";

import { useRef, useState } from "react";

import { avisar } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

export type Valores = { tema: string; silencio: boolean; resumen: string };

/**
 * Aplica el tema al instante (el DS lee `data-theme` en <html>) y lo recuerda en este dispositivo
 * para el script del layout raíz, que lo aplica antes de pintar en las próximas cargas.
 */
export function aplicarTema(t: string) {
  const html = document.documentElement;
  if (t === "sistema") delete html.dataset["theme"];
  else html.dataset["theme"] = t === "oscuro" ? "dark" : "light";
  try {
    localStorage.setItem("opai_tema", t);
  } catch {
    // Sin almacenamiento (modo privado): el tema vale solo para esta pestaña.
  }
}

/**
 * Estado y escritura de las preferencias propias (35). Cola serial por formulario (como
 * `useNavegacionArea`): varios clics seguidos a la misma preferencia ya no disparan pedidos en
 * paralelo, que podían completar en otro orden y dejar guardado algo distinto de lo último
 * elegido bajo contención del lock de auditoría del tenant (regresión del PR #109).
 * `ultimoPedido` descarta en la cola los pedidos que una elección más nueva del mismo campo ya
 * volvió obsoletos, así solo sale el último valor por campo.
 */
export function usePreferencias(inicial: Valores) {
  const [v, setV] = useState(inicial);
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const confirmado = useRef(inicial);
  const cola = useRef(Promise.resolve());
  const ultimoPedido = useRef<Partial<Valores>>({});

  function guardar<K extends keyof Valores>(k: K, valor: Valores[K], clave: string) {
    setV((x) => ({ ...x, [k]: valor }));
    if (k === "tema") aplicarTema(String(valor));
    ultimoPedido.current[k] = valor;
    cola.current = cola.current.then(async () => {
      if (ultimoPedido.current[k] !== valor) return;
      const r = await ejecutar("core.config.set", { modulo: "core", clave, valor });
      if (r) {
        confirmado.current = { ...confirmado.current, [k]: valor };
        avisar.exito("Preferencia guardada");
      } else {
        setV((x) => ({ ...x, [k]: confirmado.current[k] }));
        if (k === "tema") aplicarTema(String(confirmado.current.tema));
      }
    });
  }

  return { v, pendiente, error, guardar };
}
