"use client";

import { useCallback, useState } from "react";

import type { VistaRellenoPersona } from "@/app/_components/documentos/generar-entidad/tipos";
import type { useCapacidad } from "@/app/_components/use-capacidad";

import type { CandidataMasivo } from "./lista-candidatas-masivo";
import type { FiltrosEnvioMasivo as Filtros } from "./filtros-envio-masivo";

type Cap = ReturnType<typeof useCapacidad>;

export function useCandidatasMasivo(plantillaId: string, cap: Cap) {
  const [filtros, setFiltros] = useState<Filtros>({ instalacionId: "", cargoId: "", anexoBorrador: false });
  const [candidatas, setCandidatas] = useState<CandidataMasivo[]>([]);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [vista, setVista] = useState<VistaRellenoPersona | null>(null);

  const cargar = useCallback(async () => {
    const r = await cap.ejecutar<{ items: CandidataMasivo[] }>("core.documento_plantillas.candidatas", {
      plantillaId,
      ...(filtros.instalacionId ? { instalacionId: filtros.instalacionId } : {}),
      ...(filtros.cargoId ? { cargoId: filtros.cargoId } : {}),
      ...(filtros.anexoBorrador ? { anexoBorrador: true } : {}),
    });
    if (!r) return;
    setCandidatas(r.items);
    setSeleccion(new Set(r.items.filter((p) => p.puedeGenerar).map((p) => p.personaId)));
    setVista(null);
  }, [cap.ejecutar, plantillaId, filtros]);

  const previsualizar = useCallback(
    async (personaId: string) => {
      const r = await cap.ejecutar<VistaRellenoPersona>("core.documento_plantillas.rellenar", {
        plantillaId,
        personaId,
      });
      if (r) setVista(r);
    },
    [cap.ejecutar, plantillaId],
  );

  const toggleSeleccion = useCallback((personaId: string, marcado: boolean) => {
    setSeleccion((s) => {
      const n = new Set(s);
      if (marcado) n.add(personaId);
      else n.delete(personaId);
      return n;
    });
  }, []);

  const elegidas = candidatas.filter((p) => seleccion.has(p.personaId) && p.puedeGenerar);

  return { filtros, setFiltros, candidatas, setCandidatas, seleccion, vista, elegidas, cargar, previsualizar, toggleSeleccion };
}