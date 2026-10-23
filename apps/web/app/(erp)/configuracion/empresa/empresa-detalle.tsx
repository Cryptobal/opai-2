"use client";

import { useState } from "react";

import { vocabulario } from "@opai/domain";
import {
  Badge,
  Button,
  Campo,
  DetailScreen,
  type EstadoPantalla,
  Input,
  Pares,
  Seccion,
  Sheet,
} from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

export type Empresa = {
  id: string;
  slug: string;
  nombre: string;
  vertical: string;
  timezone: string;
  estado: string;
};
export type Uso = {
  total: number;
  errores: number;
  porModulo: { modulo: string; total: number }[];
};

type Props = {
  state: EstadoPantalla;
  empresa: Empresa | null;
  uso: Uso | null;
  puedeEditar: boolean;
};

const ESTADO = { activo: "success", trial: "info", suspendido: "danger" } as const;

/** Configuración → Empresa: datos del tenant (editables por owner/admin) y uso de 30 días. */
export function EmpresaDetalle({ state, empresa, uso, puedeEditar }: Props) {
  const [editar, setEditar] = useState(false);
  const { ejecutar, error } = useCapacidad("erp");
  const [nombre, setNombre] = useState(empresa?.nombre ?? "");
  const [timezone, setTimezone] = useState(empresa?.timezone ?? "America/Santiago");

  async function guardar() {
    if (await ejecutar("core.tenant.update", { nombre, timezone })) setEditar(false);
  }

  return (
    <>
      <DetailScreen
        state={state}
        titulo={empresa?.nombre ?? "Empresa"}
        {...(empresa
          ? {
              subtitulo: `${empresa.slug} · ${vocabulario(empresa.vertical).vertical}`,
              estado: (
                <Badge tono={ESTADO[empresa.estado as keyof typeof ESTADO] ?? "neutro"}>
                  {empresa.estado}
                </Badge>
              ),
            }
          : {})}
        acciones={
          puedeEditar ? (
            <Button variant="secondary" onClick={() => setEditar(true)}>
              Editar
            </Button>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Seccion titulo="Datos">
            <Pares
              items={[
                { etiqueta: "Nombre", valor: empresa?.nombre ?? "—" },
                { etiqueta: "Slug", valor: <span className="t-mono">{empresa?.slug}</span> },
                {
                  etiqueta: "Vertical",
                  valor: empresa ? vocabulario(empresa.vertical).vertical : "—",
                },
                { etiqueta: "Zona horaria", valor: empresa?.timezone ?? "—" },
              ]}
            />
          </Seccion>
          <Seccion titulo="Uso últimos 30 días">
            <Pares
              items={[
                { etiqueta: "Ejecuciones", valor: uso?.total ?? 0, numerico: true },
                { etiqueta: "Con error", valor: uso?.errores ?? 0, numerico: true },
                ...(uso?.porModulo ?? []).map((m) => ({
                  etiqueta: `Módulo ${m.modulo}`,
                  valor: m.total,
                  numerico: true,
                })),
              ]}
            />
          </Seccion>
        </div>
      </DetailScreen>
      <Sheet
        abierto={editar}
        onCerrar={() => setEditar(false)}
        titulo="Editar empresa"
        acciones={
          <Button block size="lg" onClick={guardar}>
            Guardar
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Campo etiqueta="Nombre" htmlFor="emp-nombre" {...(error ? { error } : {})}>
            <Input id="emp-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Campo>
          <Campo
            etiqueta="Zona horaria"
            htmlFor="emp-tz"
            ayuda="Formato IANA, por ejemplo America/Santiago."
          >
            <Input id="emp-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} />
          </Campo>
          <p className="t-caption">La vertical solo la cambia OPAI desde Plataforma.</p>
        </div>
      </Sheet>
    </>
  );
}
