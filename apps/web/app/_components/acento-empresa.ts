"use client";

import { useEffect } from "react";

import { acentoDeMarca, type Modo, type TonoAcento } from "@opai/domain/marca-acento";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

type Tonos = Record<Modo, TonoAcento>;

const VARIABLES = ["--ds-accent", "--ds-accent-fg", "--ds-accent-muted", "--ds-focus"] as const;

const modoActual = (): Modo => {
  const tema = document.documentElement.dataset["theme"];
  if (tema === "dark") return "noche";
  if (tema === "light") return "dia";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "noche" : "dia";
};

/** Pone el acento en cada raíz de la piel nueva (<html> y el marco), con el tono del tema visible. */
function pintar(tonos: Tonos) {
  const t = tonos[modoActual()];
  const valores: [string, string][] = [t.acento, t.texto, t.suave, t.acento].map((v, i) => [
    VARIABLES[i] ?? "",
    v,
  ]);
  for (const el of document.querySelectorAll<HTMLElement>('[data-marco="nuevo"]'))
    for (const [k, v] of valores) el.style.setProperty(k, v);
}

/**
 * Color de la empresa como acento del diseño nuevo (ADR-109, CAR-335 D2): lee la marca con
 * `core.marca.get` (la misma capacidad que Configuración › Marca y el MCP), lo ajusta con
 * `acentoDeMarca` y lo vuelve a pintar si cambia el tema. Sin color o sin permiso queda el acento por
 * defecto de la piel.
 */
export function useAcentoEmpresa(activo: boolean, portal: string, epoca: string) {
  useEffect(() => {
    if (!activo) return;
    let tonos: Tonos | null = null;
    let vivo = true;
    void ejecutarCapacidad(portal, "core.marca.get", {}, false, "ninguna")
      .then((r) => {
        const color =
          r.ok && r.data && typeof r.data === "object" && "colorPrimario" in r.data
            ? r.data.colorPrimario
            : null;
        tonos = acentoDeMarca(typeof color === "string" ? color : null);
        if (vivo && tonos) pintar(tonos);
      })
      .catch(() => undefined);
    const repintar = () => tonos && pintar(tonos);
    const observador = new MutationObserver(repintar);
    observador.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-marco"],
    });
    const sistema = window.matchMedia("(prefers-color-scheme: dark)");
    sistema.addEventListener("change", repintar);
    return () => {
      vivo = false;
      // Al cambiar de empresa o de diseño no queda el color anterior en <html> (menús y diálogos).
      for (const el of document.querySelectorAll<HTMLElement>('[data-marco="nuevo"], html'))
        for (const k of VARIABLES) el.style.removeProperty(k);
      observador.disconnect();
      sistema.removeEventListener("change", repintar);
    };
  }, [activo, portal, epoca]);
}
