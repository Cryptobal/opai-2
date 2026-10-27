import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Pin } from "lucide-react";

import type { AreaNav } from "@opai/domain";
import { avisar, esActivo } from "@opai/ds";

import { entradaInicio, entradasAreaPrincipal, type GrupoArea } from "@/lib/navegacion-areas";
import type { ItemNav } from "@/lib/navegacion";
import { validarFichasNav } from "@/app/_acciones/validar-fichas-nav";

import { iconoShell } from "./icono-shell";
import { useNavegacionArea } from "./use-navegacion-area";

/**
 * Compone las preferencias de navegación (D1, D3, §3) con `datos.grupos`: la barra inferior según
 * el área principal elegida, los fijados con su icono resuelto y qué área queda abierta en el
 * acordeón. Separado de `MarcoShell` solo por el límite de 150 líneas por archivo.
 */
export function useShellNavegacion(
  grupos: GrupoArea[] | undefined,
  navInferiorDefecto: ItemNav[] | undefined,
  rutaEfectiva: string,
  portal: string,
  activo: boolean,
  titulo: string,
  iconos?: Record<string, ReactNode>,
) {
  const prefs = useNavegacionArea(portal, activo);
  useEffect(() => {
    if (prefs.errorCarga) avisar.error("No se pudieron cargar las preferencias de navegación.");
  }, [prefs.errorCarga]);
  const [fichasValidas, setFichasValidas] = useState<string[]>([]);
  useEffect(() => {
    let vigente = true;
    void validarFichasNav(prefs.fijados.filter((f) => f.tipo === "ficha").map((f) => f.href)).then(
      (v) => {
        if (vigente) setFichasValidas(v);
      },
    );
    return () => {
      vigente = false;
    };
  }, [prefs.fijados]);
  const navInferior = useMemo(() => {
    if (!grupos || !grupos.some((g) => g.area === prefs.areaPrincipal)) return navInferiorDefecto;
    const inicio = entradaInicio(grupos);
    const resto = entradasAreaPrincipal(grupos, prefs.areaPrincipal);
    return [inicio, ...resto]
      .filter((e): e is NonNullable<typeof e> => e != null)
      .map((e) => ({ href: e.href, etiqueta: e.etiqueta, icono: e.icono }));
  }, [grupos, navInferiorDefecto, prefs.areaPrincipal]);
  const navInferiorResuelto = useMemo(
    () => navInferior?.map((n) => ({ ...n, icono: iconoShell(n.icono, iconos) })),
    [navInferior, iconos],
  );
  const iconoPin = Pin;
  const entradasPermitidas = useMemo(() => grupos?.flatMap((g) => g.entradas.map((e) => e.href)), [grupos]);
  const fijados = useMemo(() => {
    const entradas = grupos?.flatMap((g) => g.entradas) ?? [];
    return [...prefs.fijados]
      .sort((a, b) => a.fijadoEn.localeCompare(b.fijadoEn))
      .flatMap((f) => {
        if (f.tipo === "ficha" && fichasValidas.includes(f.href))
          return [{ href: f.href, etiqueta: f.etiqueta, icono: iconoPin }];
        const entrada = f.tipo === "entrada" ? entradas.find((e) => e.href === f.href) : undefined;
        return entrada ? [{ href: entrada.href, etiqueta: entrada.etiqueta, icono: iconoPin }] : [];
      });
  }, [prefs.fijados, iconoPin, grupos, fichasValidas]);
  // D1: al entrar queda abierta el área de la página actual; si la persona abre o pliega otra, se
  // recuerda por usuario y empresa (`navegacion_area_abierta`, null = sin preferencia explícita).
  const areaActiva = useMemo(
    () => grupos?.find((g) => g.area !== "inicio" && g.entradas.some((e) => esActivo(rutaEfectiva, e.href)))?.area ?? null,
    [grupos, rutaEfectiva],
  );
  const rutaPrevia = useRef(rutaEfectiva);
  const [areaElegida, setAreaElegida] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (rutaPrevia.current !== rutaEfectiva && prefs.cargado) {
      rutaPrevia.current = rutaEfectiva;
      if (areaActiva) {
        void Promise.resolve().then(() => setAreaElegida(areaActiva));
        prefs.fijarAreaAbierta(areaActiva);
      }
    }
  }, [rutaEfectiva, areaActiva, prefs]);
  const guardada = prefs.areaAbierta === "ninguna" ? null : prefs.areaAbierta;
  const areaAbierta = areaElegida === undefined ? (areaActiva ?? guardada) : areaElegida;
  const esFicha = /^\/(cuentas|instalaciones|personas|cargos)\/[0-9a-f-]{36}$/.test(rutaEfectiva);
  return {
    navInferiorResuelto,
    fijados,
    errorFijados: prefs.errorCarga,
    reintentarFijados: prefs.reintentar,
    areaAbierta,
    onFijar: (item: { href: string; etiqueta: string }) =>
      prefs.fijar(
        { tipo: "entrada", href: item.href, etiqueta: item.etiqueta },
        entradasPermitidas,
      ),
    onDesfijar: prefs.desfijar,
    esFicha,
    fichaFijada: prefs.fijados.some((f) => f.href === rutaEfectiva),
    onFijarFicha: async () => {
      if ((await validarFichasNav([rutaEfectiva])).includes(rutaEfectiva))
        prefs.fijar(
          { tipo: "ficha", href: rutaEfectiva, etiqueta: titulo },
          entradasPermitidas,
        );
    },
    onAreaAbierta: (area: string) => {
      const siguiente = areaAbierta === area ? null : (area as AreaNav);
      setAreaElegida(siguiente);
      prefs.fijarAreaAbierta(siguiente);
    },
  };
}
