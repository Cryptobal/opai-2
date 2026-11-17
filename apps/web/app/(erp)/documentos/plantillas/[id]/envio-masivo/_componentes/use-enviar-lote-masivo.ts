"use client";

import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from "react";

import { avisarCambio } from "@/app/_components/ejecutar-capacidad";
import type { useCapacidad } from "@/app/_components/use-capacidad";

import type { CandidataMasivo } from "./lista-candidatas-masivo";

type Cap = ReturnType<typeof useCapacidad>;

export function useEnviarLoteMasivo(
  plantillaId: string,
  cap: Cap,
  candidatas: CandidataMasivo[],
  setCandidatas: Dispatch<SetStateAction<CandidataMasivo[]>>,
  seleccion: Set<string>,
) {
  const [resumen, setResumen] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const clave = useMemo(() => crypto.randomUUID(), []);

  const enviar = useCallback(
    async (dryRun: boolean) => {
      const ids = [...seleccion].filter((id) => candidatas.find((p) => p.personaId === id)?.puedeGenerar);
      if (!ids.length) return;
      const r = await cap.ejecutar<{
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
    [candidatas, clave, cap.ejecutar, plantillaId, seleccion, setCandidatas],
  );

  return { resumen, confirmar, setConfirmar, enviar, limpiarResumen: () => setResumen(null) };
}