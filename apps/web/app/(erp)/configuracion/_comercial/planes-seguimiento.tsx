"use client";

import { useState } from "react";

import { avisar, Badge, Button, Empty, SeccionTarjeta } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import { EditorPlan } from "./editor-plan";

export type PasoConfig = { dias: number; hora?: string; canal: "correo" | "whatsapp" | "llamada" | "interno"; ejecutor: "persona" | "opai_automatico" | "agente"; titulo: string; guion?: string };
export type ConfigPlan = {
  conteo: "habiles" | "corridos"; desde: "inicio" | "paso_anterior"; hora: string; ventana: { desde: string; hasta: string };
  alResponder: "pausar" | "detener"; alTerminar: "proponer_cierre" | "solo_avisar"; pasos: PasoConfig[];
};
export type PlanConfig = { id: string; nombre: string; disparador: string; porDefecto: boolean; activo: boolean; version: number; config: ConfigPlan; enCurso: number };

const PLAN_VACIO: ConfigPlan = {
  conteo: "habiles", desde: "inicio", hora: "09:00", ventana: { desde: "08:00", hasta: "19:00" }, alResponder: "pausar", alTerminar: "proponer_cierre",
  pasos: [{ dias: 3, canal: "correo", ejecutor: "persona", titulo: "Seguimiento 1" }],
};

/** Lista de planes con «Editar» y «Nuevo plan». Sin planes, ofrece crear el base de la vertical. */
export function PlanesSeguimiento({ planes }: { planes: PlanConfig[] }) {
  const [editando, setEditando] = useState<PlanConfig | "nuevo" | null>(null);
  const { ejecutar, pendiente } = useCapacidad("erp");
  async function crearBase() {
    const r = await ejecutar("comercial.seguimiento_planes.crear_base", {});
    if (r) avisar.exito("Plan base creado");
  }
  if (!planes.length)
    return (
      <Empty
        titulo="Aún no tienes planes de seguimiento"
        descripcion="Parte del plan base de tu rubro y ajusta los días, canales y quién ejecuta cada paso."
        accion={<Button disabled={pendiente} onClick={() => void crearBase()}>Crear plan base</Button>}
      />
    );
  return (
    <>
      <SeccionTarjeta titulo="Planes de seguimiento" accion={<Button onClick={() => setEditando("nuevo")}>Nuevo plan</Button>} sinRelleno>
        <ul className="divide-y divide-border">
          {planes.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{p.nombre}</span>
                  {p.porDefecto ? <Badge tono="accent">Por defecto</Badge> : null}
                  {!p.activo ? <Badge>Desactivado</Badge> : null}
                </span>
                <span className="t-caption">
                  {p.config.pasos.length} pasos · {p.config.conteo === "habiles" ? "días hábiles" : "días corridos"} · versión {p.version} · {p.enCurso} en curso
                </span>
              </div>
              <Button variant="secondary" onClick={() => setEditando(p)}>Editar</Button>
            </li>
          ))}
        </ul>
      </SeccionTarjeta>
      {editando ? (
        <EditorPlan
          plan={editando === "nuevo" ? { nombre: "", porDefecto: false, activo: true, config: planes[0]?.config ?? PLAN_VACIO } : editando}
          {...(editando !== "nuevo" ? { id: editando.id } : {})}
          onCerrar={() => setEditando(null)}
        />
      ) : null}
    </>
  );
}
