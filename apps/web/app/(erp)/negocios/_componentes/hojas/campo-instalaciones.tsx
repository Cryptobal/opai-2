"use client";

import { useEffect, useState } from "react";

import { Campo, Combobox } from "@opai/ds";

import { ejecutarCapacidad } from "@/app/_acciones/capacidad";

type Opcion = { valor: string; etiqueta: string };

/** Instalaciones de la cuenta (core.instalaciones.list con `cuentaId`, respeta el alcance). */
async function instalacionesDe(cuentaId: string): Promise<Opcion[]> {
  const r = await ejecutarCapacidad("erp", "core.instalaciones.list", { cuentaId, limite: 100 });
  if (!r.ok) return [];
  const { items } = r.data as { items: { id: string; nombre: string }[] };
  return items.map((i) => ({ valor: i.id, etiqueta: i.nombre }));
}

function ayuda(cuentaId: string | null, opciones: Opcion[] | null) {
  if (!cuentaId) return "Elige primero la cuenta: solo se listan sus instalaciones.";
  if (!opciones) return "Cargando las instalaciones de la cuenta…";
  if (!opciones.length)
    return "Esta cuenta aún no tiene instalaciones. Créalas desde la ficha de la cuenta y vincúlalas después.";
  return "Opcional. Para salir de la primera etapa el negocio necesita al menos una.";
}

/**
 * «Nuevo negocio» (CAR-33): una o más instalaciones de la cuenta elegida, que `comercial.negocios.create`
 * vincula en la misma escritura (tipo «Nueva»). Al cambiar la cuenta se vuelven a leer sus instalaciones.
 */
export function CampoInstalaciones(p: {
  cuentaId: string | null;
  valores: string[];
  onCambiar: (ids: string[]) => void;
}) {
  // Lo leído queda asociado a su cuenta: con otra cuenta elegida, aún no hay opciones (cargando).
  const [leidas, setLeidas] = useState<{ cuentaId: string; opciones: Opcion[] } | null>(null);
  const opciones = p.cuentaId && leidas?.cuentaId === p.cuentaId ? leidas.opciones : null;
  useEffect(() => {
    const cuentaId = p.cuentaId;
    if (!cuentaId) return;
    let vigente = true;
    void instalacionesDe(cuentaId).then((o) => {
      if (vigente) setLeidas({ cuentaId, opciones: o });
    });
    return () => {
      vigente = false;
    };
  }, [p.cuentaId]);
  return (
    <Campo etiqueta="Instalaciones" htmlFor="neg-instalaciones" ayuda={ayuda(p.cuentaId, opciones)}>
      <Combobox
        id="neg-instalaciones"
        placeholder={opciones?.length ? "Agregar instalación" : "Sin instalaciones para elegir"}
        opciones={opciones ?? []}
        valores={p.valores}
        onCambiar={p.onCambiar}
        disabled={!opciones?.length}
      />
    </Campo>
  );
}

/** Por qué «Crear negocio» sigue deshabilitado, en palabras (vacío si se puede crear). */
export function faltaParaCrear(cuentaId: string | null, titulo: string): string[] {
  const falta: string[] = [];
  if (!cuentaId) falta.push("elegir la cuenta");
  const largo = titulo.trim().length;
  if (largo < 3)
    falta.push(
      largo
        ? `alargar el nombre del negocio (mínimo 3 caracteres, van ${largo})`
        : "escribir el nombre del negocio (mínimo 3 caracteres)",
    );
  return falta;
}
