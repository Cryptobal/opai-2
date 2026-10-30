"use client";

import { useRef, useState } from "react";

import { avisar } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

export type Valores = { tema: string; silencio: boolean; resumen: string };

const ETIQUETA_TEMA: Record<string, string> = {
  sistema: "Sistema",
  claro: "Claro",
  oscuro: "Oscuro",
};

/** Mensaje de la Alerta al revertir: nombra el tema al que se volvió; genérico para el resto (H3). */
function mensajeReversion<K extends keyof Valores>(k: K, confirmado: Valores): string {
  if (k === "tema")
    return `No pudimos guardar el tema; volvimos a ${ETIQUETA_TEMA[confirmado.tema] ?? confirmado.tema}.`;
  return "No pudimos guardar tu preferencia; la dejamos como estaba.";
}

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
 * volvió obsoletos, así solo sale el último valor por campo. Una respuesta que llega tarde (su
 * elección ya no es la última) actualiza lo confirmado por el servidor pero no avisa ni revierte:
 * decide la elección más nueva. La cola nunca queda rechazada: si el último eslabón falla, revierte
 * ese campo (tema, localStorage y estado) al último valor confirmado por el servidor y muestra un
 * mensaje específico (H2/H3); el guardado siguiente sale igual, sin recargar.
 */
export function usePreferencias(inicial: Valores) {
  const [v, setV] = useState(inicial);
  const { ejecutar, pendiente } = useCapacidad("erp");
  const [errorCola, setErrorCola] = useState<string | null>(null);
  const confirmado = useRef(inicial);
  const cola = useRef(Promise.resolve());
  const ultimoPedido = useRef<Partial<Record<keyof Valores, number>>>({});
  const pedidos = useRef(0);

  function guardar<K extends keyof Valores>(k: K, valor: Valores[K], clave: string) {
    setV((x) => ({ ...x, [k]: valor }));
    if (k === "tema") aplicarTema(String(valor));
    // Token por pedido (no por valor): A→B→A son tres pedidos distintos.
    const pedido = ++pedidos.current;
    ultimoPedido.current[k] = pedido;
    setErrorCola(null);
    const esUltimo = () => ultimoPedido.current[k] === pedido;
    // Si ya hay una elección más nueva del campo en la cola, su resultado decide: no se pisa.
    const revertir = () => {
      if (!esUltimo()) return;
      setV((x) => ({ ...x, [k]: confirmado.current[k] }));
      if (k === "tema") aplicarTema(String(confirmado.current.tema));
      setErrorCola(mensajeReversion(k, confirmado.current));
    };
    cola.current = cola.current
      .then(async () => {
        if (!esUltimo()) return;
        // `revalidar: "ninguna"`: el tema ya se aplicó en el cliente y las preferencias se releen al
        // navegar, así que guardar no revalida el layout (no re-corre sus capacidades ni re-renderiza
        // este formulario desde el servidor a mitad de una ráfaga) (B1, H1/H2 del #135).
        const r = await ejecutar("core.config.set", { modulo: "core", clave, valor }, false, "ninguna");
        if (r) {
          // El servidor ya tiene este valor: queda como confirmado aunque una elección más nueva lo
          // reemplace enseguida, para que un fallo posterior revierta a lo realmente guardado.
          confirmado.current = { ...confirmado.current, [k]: valor };
          if (esUltimo()) avisar.exito("Preferencia guardada");
        } else revertir();
      })
      .catch(() => revertir());
  }

  return { v, pendiente, error: errorCola, guardar };
}
