"use client";

import { useState } from "react";

import { vocabulario } from "@opai/domain";
import { Button, Dialog, Pares, Seccion, Select } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

import type { DetalleTenant } from "./tenant-detalle";

/** Resumen: datos, estado (suspender pide confirmación) y uso de 30 días. */
export function ResumenTenant({ detalle }: { detalle: DetalleTenant }) {
  const { ejecutar, error } = useCapacidad("platform");
  const [suspender, setSuspender] = useState(false);
  const { tenant, uso } = detalle;
  const fijar = (estado: string) =>
    void ejecutar("platform.tenants.set_estado", { tenantId: tenant.id, estado });

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Seccion titulo="Datos">
        {error ? <p className="mb-2 text-sm font-medium text-danger-fg">{error}</p> : null}
        <Pares
          items={[
            { etiqueta: "Slug", valor: <span className="t-mono">{tenant.slug}</span> },
            { etiqueta: "Vertical", valor: vocabulario(tenant.vertical).vertical },
            { etiqueta: "Zona horaria", valor: tenant.timezone },
            {
              etiqueta: "Estado",
              valor: (
                <Select
                  aria-label="Estado de la empresa"
                  valor={tenant.estado}
                  onCambiar={(v) => (v === "suspendido" ? setSuspender(true) : fijar(v))}
                  className="w-40"
                  opciones={[
                    { valor: "trial", etiqueta: "Prueba" },
                    { valor: "activo", etiqueta: "Activa" },
                    { valor: "suspendido", etiqueta: "Suspendida" },
                  ]}
                />
              ),
            },
          ]}
        />
      </Seccion>
      <Seccion titulo="Uso últimos 30 días">
        <Pares
          items={[
            { etiqueta: "Ejecuciones", valor: uso.total, numerico: true },
            { etiqueta: "Con error", valor: uso.errores, numerico: true },
            ...uso.porModulo.map((m) => ({
              etiqueta: `Módulo ${m.modulo}`,
              valor: m.total,
              numerico: true,
            })),
          ]}
        />
      </Seccion>
      <Dialog
        abierto={suspender}
        onCerrar={() => setSuspender(false)}
        titulo={`¿Suspender ${tenant.nombre}?`}
        descripcion="Sus miembros no podrán entrar ni usar API keys hasta que la reactives."
        acciones={
          <>
            <Button variant="secondary" onClick={() => setSuspender(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setSuspender(false);
                fijar("suspendido");
              }}
            >
              Suspender
            </Button>
          </>
        }
      />
    </div>
  );
}
