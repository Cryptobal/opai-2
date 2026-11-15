"use client";

import { useCallback, useEffect, useState } from "react";

import { eleccionInicial, type Destinos, type EleccionFila, type SugerenciaRegla } from "./destinos";

type Ejecutar = <T = unknown>(id: string, input: unknown, dryRun?: boolean) => Promise<T | null>;
export type ModoReconocer = "documentos" | "fila";

/**
 * Estado del modo «Fila del flujo» de Reconocer (CAR-328): reglas que calzan, destinos (cargados al abrir
 * ese modo) y la elección. Con una regla que calza y sin facturas sugeridas abre directo en ese modo.
 */
export function useReconocerFila(ejecutar: Ejecutar, abierta: boolean, glosa: string) {
  const [modo, setModo] = useState<ModoReconocer>("documentos");
  const [reglas, setReglas] = useState<SugerenciaRegla[]>([]);
  const [destinos, setDestinos] = useState<Destinos | null>(null);
  const [sinDestinos, setSinDestinos] = useState(false);
  const [eleccion, setEleccion] = useState<EleccionFila>(() => eleccionInicial(glosa));

  const alSugerir = useCallback((r: SugerenciaRegla[], hayDocumentos: boolean) => {
    setReglas(r);
    const primera = r[0];
    if (primera && !hayDocumentos) {
      setModo("fila");
      setEleccion((e) => ({ ...e, filaId: primera.flujoFilaId, cuentaId: primera.cuentaContableId }));
    }
  }, []);

  useEffect(() => {
    if (!abierta || modo !== "fila" || destinos || sinDestinos) return;
    let cancel = false;
    void ejecutar<Destinos>("finanzas.bancos.destinos", {}).then((d) => {
      if (cancel) return;
      if (d) setDestinos(d);
      else setSinDestinos(true);
    });
    return () => {
      cancel = true;
    };
  }, [abierta, modo, destinos, sinDestinos, ejecutar]);

  const listo =
    !!eleccion.filaId && (!eleccion.crearRegla || (eleccion.nombreRegla.trim().length >= 2 && !!eleccion.glosaContiene.trim()));
  const reintentar = () => setSinDestinos(false);
  return { modo, setModo, reglas, destinos, sinDestinos, reintentar, eleccion, setEleccion, alSugerir, listo };
}
