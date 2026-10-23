"use client";

import { useState } from "react";

import {
  AjustesForm,
  Badge,
  CeldaVigencia,
  FilaSeleccionable,
  MonoAv,
  Tabs,
  Timeline,
  Vigencia,
} from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";

import { CAMPOS } from "./ajustes-muestra";

/** Tabs por ruta, FilaSeleccionable, Timeline, Vigencia y AjustesForm. */
export function MuestraActividad() {
  const [sel, setSel] = useState("mc");
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <Tabs
          Link={LinkNext}
          activa="contactos"
          tabs={[
            { id: "resumen", etiqueta: "Resumen", href: "/ds" },
            { id: "contactos", etiqueta: "Contactos", contador: 4, href: "/ds" },
            { id: "inst", etiqueta: "Instalaciones", contador: 3, href: "/ds" },
            {
              id: "pers",
              etiqueta: "Personas",
              href: "/ds",
              deshabilitada: "Disponible con Operaciones",
            },
          ]}
        />
        <div className="overflow-hidden rounded-lg border border-border bg-surface [&>*:last-child]:border-b-0">
          {[
            {
              id: "la",
              t: "Logística Andina SpA",
              s: "76.543.210-K · 3 instalaciones",
              b: <Badge tono="success">Activo</Badge>,
            },
            {
              id: "mc",
              t: "Minera Cerro Alto SpA",
              s: "76.998.001-7 · 1 instalación",
              b: <Badge tono="info">Prospecto</Badge>,
            },
            {
              id: "bp",
              t: "Bodegas Pudahuel S.A.",
              s: "96.512.330-2 · 2021–2025",
              b: <Badge>Inactivo</Badge>,
            },
          ].map((f) => (
            <FilaSeleccionable
              key={f.id}
              titulo={f.t}
              secundario={f.s}
              fin={f.b}
              seleccionada={sel === f.id}
              onClick={() => setSel(f.id)}
              inicio={<MonoAv texto={f.id.toUpperCase()} seleccionada={sel === f.id} />}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Vigencia estado="vigente" />
          <Vigencia estado="por_vencer" dias={22} />
          <Vigencia estado="vencido" dias={-52} />
          <Vigencia estado="sin_fecha" />
          <CeldaVigencia estado="vigente" />
          <CeldaVigencia estado="por_vencer" dias={9} />
          <CeldaVigencia estado="vencido" />
          <CeldaVigencia estado="falta" />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <Timeline
          items={[
            {
              id: "1",
              actor: { nombre: "Carlos Irigoyen" },
              accion: "cambió el estado a Cliente activo",
              cuando: "hace 3 días · 20-10-2026 11:42",
            },
            {
              id: "2",
              actor: { nombre: "Grokbot", agente: true },
              accion: "creó el contacto Paula Riquelme",
              cuando: "hace 2 semanas",
              meta: "vía Carlos Irigoyen",
              detalle:
                'capacidad  core.contactos.create\ncanal      MCP · key grok-ops\nnombre     "Paula Riquelme"',
            },
            {
              id: "3",
              actor: { nombre: "Grokbot", agente: true },
              accion: "actualizó el teléfono",
              cuando: "09:52",
              conTipo: true,
              cambio: { campo: "Teléfono", antes: "+56 9 8765 4320", despues: "+56 9 8765 4321" },
            },
          ]}
        />
        <AjustesForm
          campos={CAMPOS}
          valores={{
            "ops.tolerancia": { valor: 15, origen: "tenant" },
            "ops.retencion": { valor: "60 meses", origen: "plataforma" },
          }}
          onGuardar={async () => true}
          onRestablecer={async () => undefined}
        />
      </div>
    </div>
  );
}
