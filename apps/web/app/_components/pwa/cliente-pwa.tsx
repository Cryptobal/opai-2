"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

// La banda se carga aparte: la lógica de registro no arrastra componentes del DS al primer JS de
// cada ruta (ADR-037). El registro corre en toda la app (D5 b); la banda solo aparece si hay espera.
const BandaNueva = dynamic(() => import("./banda-nueva").then((m) => m.BandaNueva));

/**
 * Cliente PWA: registra el service worker en toda la app (D5 b del Brief 04) y ofrece la
 * actualización controlada (R2). El service worker nuevo queda en espera; esta banda avisa y solo
 * al aceptar envía `SKIP_WAITING` y, cuando el nuevo toma el control, recarga una vez. Nunca se
 * recarga sola. Degrada sin romper si no hay soporte o almacenamiento (modo privado, §10).
 */
export function ClientePwa() {
  const [enEspera, setEnEspera] = useState<ServiceWorker | null>(null);
  const [descartado, setDescartado] = useState(false);
  const aceptado = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let registro: ServiceWorkerRegistration | undefined;

    const marcar = (sw: ServiceWorker | null) => {
      // Solo es "versión nueva" si ya hay un service worker controlando (no en la primera instalación).
      if (sw && navigator.serviceWorker.controller) setEnEspera(sw);
    };

    const registrar = async () => {
      try {
        registro = await navigator.serviceWorker.register("/sw.js");
      } catch {
        return; // Sin service worker: la app sigue en línea.
      }
      marcar(registro.waiting);
      registro.addEventListener("updatefound", () => {
        const nuevo = registro?.installing;
        nuevo?.addEventListener("statechange", () => {
          if (nuevo.state === "installed") marcar(nuevo);
        });
      });
    };

    const recargar = () => {
      if (aceptado.current) window.location.reload(); // La primera activación (claim) no recarga.
    };
    navigator.serviceWorker.addEventListener("controllerchange", recargar);

    if (document.readyState === "complete") void registrar();
    else window.addEventListener("load", registrar, { once: true });
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", recargar);
      window.removeEventListener("load", registrar);
    };
  }, []);

  if (!enEspera || descartado) return null;
  const actualizar = () => {
    aceptado.current = true;
    enEspera.postMessage({ type: "SKIP_WAITING" });
  };
  return <BandaNueva onActualizar={actualizar} onCerrar={() => setDescartado(true)} />;
}
