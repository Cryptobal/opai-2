"use client";

import { useEffect, useState } from "react";

function leerTema(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

/** Sigue el tema claro/oscuro del DS (`data-theme` en `<html>`). */
export function useTemaMapas(): "light" | "dark" {
  const [tema, setTema] = useState<"light" | "dark">(() => leerTema());
  useEffect(() => {
    const obs = new MutationObserver(() => setTema(leerTema()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  return tema;
}