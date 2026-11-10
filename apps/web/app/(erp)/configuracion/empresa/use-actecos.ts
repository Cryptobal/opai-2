"use client";

import { useState } from "react";

import type { Actividades } from "./datos-empresa";

export type ActecoElegido = { codigo: number; codigoSii: string; glosa: string | null };

/** Estado del ACTECO de la empresa (CAR-243): la lista elegida y cuál es el principal, que va en cada factura. */
export function useActecos(guardadas: Actividades) {
  const [lista, setLista] = useState<ActecoElegido[]>(() =>
    guardadas.actividades.map(({ codigo, codigoSii, glosa }) => ({ codigo, codigoSii, glosa })),
  );
  const [principal, setPrincipal] = useState<number | null>(guardadas.principal);
  const input = { codigos: lista.map((a) => a.codigo), principal };
  const enBase = { codigos: guardadas.actividades.map((a) => a.codigo), principal: guardadas.principal };
  return {
    lista,
    principal,
    input,
    cambiado: JSON.stringify(input) !== JSON.stringify(enBase),
    /** Agrega un código; el primero queda como principal. Un código repetido no se duplica. */
    agregar(a: ActecoElegido) {
      if (lista.some((x) => x.codigo === a.codigo)) return;
      setLista((l) => [...l, a]);
      if (principal === null) setPrincipal(a.codigo);
    },
    /** Quita un código; si era el principal, el siguiente de la lista pasa a serlo. */
    quitar(codigo: number) {
      const resto = lista.filter((x) => x.codigo !== codigo);
      setLista(resto);
      if (principal === codigo) setPrincipal(resto[0]?.codigo ?? null);
    },
    marcarPrincipal: setPrincipal,
  };
}

export type EstadoActecos = ReturnType<typeof useActecos>;
