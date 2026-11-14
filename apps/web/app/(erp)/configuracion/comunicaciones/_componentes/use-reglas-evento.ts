"use client";

import { useState } from "react";

import { avisar } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { Canal, EventoComunicable, Regla } from "./tipos";

type Cambio = { canal: Canal; activa: boolean; roles?: string };

/** Reglas de aviso de un evento (30) con estado optimista: se actualiza con cada regla guardada. */
export function useReglasEvento(e: EventoComunicable, iniciales: Regla[]) {
  const { ejecutar, pendiente } = useCapacidad("erp");
  const [reglas, setReglas] = useState(iniciales);
  const de = (c: Canal) => reglas.find((r) => r.canal === c);
  const roles = (reglas[0]?.roles.length ? reglas[0].roles : ["owner", "admin"]).join(",");
  async function fijar(cambios: Cambio[]) {
    for (const c of cambios) {
      const r = await ejecutar<Regla>("core.notificacion_reglas.set", {
        evento: e.evento,
        canal: c.canal,
        roles: (c.roles ?? roles).split(","),
        usuarios: de(c.canal)?.usuarios ?? [],
        activa: c.activa,
      });
      if (!r) return avisar.error("No se pudo guardar el aviso");
      setReglas((x) => [...x.filter((y) => y.canal !== c.canal), r]);
    }
    avisar.exito("Aviso actualizado");
  }
  return { reglas, de, roles, fijar, pendiente };
}
