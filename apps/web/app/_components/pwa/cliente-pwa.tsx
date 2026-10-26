"use client";

import { useEffect } from "react";

/**
 * Cliente PWA: registra el service worker en toda la app (D5 b del Brief 04: la instalación y la
 * actualización controlada valen para todos los portales). Degrada sin romper si el navegador no
 * soporta service workers o si el almacenamiento no está disponible (modo privado, §10). El aviso
 * de versión nueva y el de instalar se agregan en el bloque 3.
 */
export function ClientePwa() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const registrar = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Sin service worker: la app sigue funcionando en línea.
      });
    };
    if (document.readyState === "complete") registrar();
    else window.addEventListener("load", registrar, { once: true });
    return () => window.removeEventListener("load", registrar);
  }, []);
  return null;
}
