"use client";

import { useCallback, useEffect, useState } from "react";

import { Chip, Combobox } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_components/ejecutar-capacidad";
import { useParametros } from "@/app/_components/maestros/use-url";
import type { CuentaFila } from "@/lib/tipos-maestros";

type Opcion = { valor: string; etiqueta: string };

async function buscarCuentas(q: string): Promise<Opcion[]> {
  const t = q.trim();
  const r = await ejecutarCapacidad("erp", "core.cuentas.list", {
    ...(t ? { q: t } : {}),
    limite: 20,
  });
  return r.ok ? (r.data as { items: CuentaFila[] }).items.map((c) => ({ valor: c.id, etiqueta: c.nombre })) : [];
}

async function nombreCuenta(id: string): Promise<string> {
  const r = await ejecutarCapacidad("erp", "core.cuentas.get", { id });
  return r.ok ? (r.data as CuentaFila).nombre : id;
}

/** Filtro por cuenta con búsqueda en servidor (sin tope de las primeras 100). */
export function FiltroCuentaInstalaciones({ cuentaInicial }: { cuentaInicial: string | null }) {
  const { valor, fijar } = useParametros();
  const actual = valor("cuenta");
  const [etiqueta, setEtiqueta] = useState<{ id: string; nombre: string } | null>(
    cuentaInicial && actual ? { id: actual, nombre: cuentaInicial } : null,
  );

  useEffect(() => {
    if (!actual || etiqueta?.id === actual) return;
    void nombreCuenta(actual).then((nombre) => setEtiqueta({ id: actual, nombre }));
  }, [actual, etiqueta?.id]);

  const nombre = actual && etiqueta?.id === actual ? etiqueta.nombre : null;

  const buscar = useCallback(async (q: string) => {
    const items = await buscarCuentas(q);
    const sel = actual ? items.find((i) => i.valor === actual) : null;
    if (actual && nombre && !sel) return [{ valor: actual, etiqueta: nombre }, ...items];
    return items;
  }, [actual, nombre]);

  if (actual && nombre) {
    return (
      <Chip
        etiqueta="Cuenta"
        valor={nombre}
        onQuitar={() => {
          setEtiqueta(null);
          fijar({ cuenta: null, cursor: null, prev: null });
        }}
      />
    );
  }

  return (
    <Combobox
      aria-label="Filtrar por cuenta"
      placeholder="Cuenta"
      opciones={[]}
      valor={null}
      onBuscar={buscar}
      textoInicial="Escribe el nombre de la cuenta"
      onCambiar={(ids) => {
        const id = ids[0];
        if (!id) return;
        void nombreCuenta(id).then((n) => {
          setEtiqueta({ id, nombre: n });
          fijar({ cuenta: id, cursor: null, prev: null });
        });
      }}
    />
  );
}