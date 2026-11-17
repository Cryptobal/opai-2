"use client";

import { useCallback, useMemo, useState } from "react";

import type { VistaRellenoPersona } from "@/app/_components/documentos/generar-entidad/tipos";
import { useCapacidad } from "@/app/_components/use-capacidad";
import { avisarCambio } from "@/app/_components/ejecutar-capacidad";

import type { CandidataMasivo } from "./lista-candidatas-masivo";
import type { FiltrosEnvioMasivo as Filtros } from "./filtros-envio-masivo";

export function useEnvioMasivo(plantillaId: string) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [filtros, setFiltros] = useState<Filtros>({ instalacionId: "", cargoId: "", anexoBorrador: false });
  const [candidatas, setCandidatas] = useState<CandidataMasivo[]>([]);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [vista, setVista] = useState<VistaRellenoPersona | null>(null);
  const [resumen, setResumen] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const clave = useMemo(() => crypto.randomUUID(), []);

  const cargar = useCallback(async () => {
    const r = await ejecutar<{ items: CandidataMasivo[] }>("core.documento_plantillas.candidatas", {
      plantillaId,
      ...(filtros.instalacionId ? { instalacionId: filtros.instalacionId } : {}),
      ...(filtros.cargoId ? { cargoId: filtros.cargoId } : {}),
      ...(filtros.anexoBorrador ? { anexoBorrador: true } : {}),
    });
    if (!r) return;
    setCandidatas(r.items);
    setSeleccion(new Set(r.items.filter((p) => p.puedeGenerar).map((p) => p.personaId)));
    setVista(null);
    setResumen(null);
  }, [ejecutar, plantillaId, filtros]);

  const elegidas = candidatas.filter((p) => seleccion.has(p.personaId) && p.puedeGenerar);

  const previsualizar = useCallback(
    async (personaId: string) => {
      const r = await ejecutar<VistaRellenoPersona>("core.documento_plantillas.rellenar", {
        plantillaId,
        personaId,
      });
      if (r) setVista(r);
    },
    [ejecutar, plantillaId],
  );

  const enviar = useCallback(
    async (dryRun: boolean) => {
      const ids = [...seleccion].filter((id) => candidatas.find((p) => p.personaId === id)?.puedeGenerar);
      if (!ids.length) return;
      const r = await ejecutar<{
        exitosas: number;
        fallidas: number;
        filas: { nombre: string; estado: string; mensaje: string | null }[];
      }>(
        "core.documento_plantillas.enviar_masivo",
        { plantillaId, personaIds: ids },
        dryRun,
        dryRun ? "ninguna" : "layout",
        dryRun ? undefined : clave,
      );
      if (!r) return;
      if (dryRun) {
        setConfirmar(true);
        return;
      }
      setConfirmar(false);
      setResumen(`${r.exitosas} enviadas · ${r.fallidas} con error`);
      avisarCambio();
      setCandidatas((prev) =>
        prev.map((p) => {
          const f = r.filas.find((x) => x.nombre === p.nombre);
          if (!f || f.estado === "ok") return p;
          return { ...p, puedeGenerar: false, motivoBloqueo: f.mensaje };
        }),
      );
    },
    [candidatas, clave, ejecutar, plantillaId, seleccion],
  );

  const toggleSeleccion = useCallback((personaId: string, marcado: boolean) => {
    setSeleccion((s) => {
      const n = new Set(s);
      if (marcado) n.add(personaId);
      else n.delete(personaId);
      return n;
    });
  }, []);

  return {
    filtros,
    setFiltros,
    candidatas,
    seleccion,
    vista,
    resumen,
    confirmar,
    setConfirmar,
    pendiente,
    error,
    elegidas,
    cargar,
    previsualizar,
    enviar,
    toggleSeleccion,
  };
}