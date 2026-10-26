"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Banda } from "@opai/ds";

const CLAVE = "opai_instalar_descartado";
const TERRENO = ["/terreno", "/trabajador", "/supervisor"];

type EventoInstalar = Event & { prompt: () => Promise<void> };
type NavegadorIOS = Navigator & { standalone?: boolean };

function esTerreno(ruta: string | null): boolean {
  return !!ruta && TERRENO.some((p) => ruta === p || ruta.startsWith(`${p}/`));
}

function enStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as NavegadorIOS).standalone === true
  );
}

function descartado(): boolean {
  try {
    return localStorage.getItem(CLAVE) === "1";
  } catch {
    return false; // Almacenamiento no disponible (modo privado): no insistir.
  }
}

/** iOS/Safari no expone `beforeinstallprompt`: se detecta para mostrar las instrucciones manuales. */
function esIosSafari(): boolean {
  const ua = navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios/i.test(ua);
}

const sinSuscripcion = () => () => {};

/**
 * Aviso de instalar en contexto, discreto y descartable, en los portales de terreno (Brief 04).
 * Android/escritorio usan `beforeinstallprompt`; iOS muestra las instrucciones de «Compartir →
 * Agregar a pantalla de inicio». No pide permisos ni suscribe (eso llega con el módulo que lo use,
 * ADR-044.4). La elección de descartar se recuerda en el dispositivo.
 */
export function AvisoInstalar() {
  const ruta = usePathname();
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [cerrado, setCerrado] = useState(false);
  // iOS y standalone son valores del cliente; useSyncExternalStore evita el desajuste de hidratación.
  const ios = useSyncExternalStore(
    sinSuscripcion,
    () => !enStandalone() && !descartado() && esIosSafari(),
    () => false,
  );

  useEffect(() => {
    if (enStandalone() || descartado()) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalar);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const cerrar = () => {
    try {
      localStorage.setItem(CLAVE, "1");
    } catch {
      // Almacenamiento no disponible: al menos se oculta en esta sesión.
    }
    setCerrado(true);
  };

  if (cerrado || !esTerreno(ruta)) return null;
  if (evento) {
    return (
      <Banda
        mensaje="Instala OPAI en este dispositivo."
        accion={{ etiqueta: "Instalar", onClick: () => void evento.prompt() }}
        onCerrar={cerrar}
      />
    );
  }
  if (ios) {
    return (
      <Banda mensaje="Instala OPAI: Compartir → «Agregar a pantalla de inicio»." onCerrar={cerrar} />
    );
  }
  return null;
}
