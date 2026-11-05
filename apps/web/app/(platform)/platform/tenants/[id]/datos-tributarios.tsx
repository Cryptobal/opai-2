"use client";

import { Pencil } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

import { formatearRut } from "@opai/domain";
import { Badge, Button, ParesGrid, SeccionTarjeta } from "@opai/ds";

// La hoja (formulario y Radix) se descarga al abrirla: no pesa en la ruta (ADR-037).
const HojaTributaria = dynamic(() => import("./hoja-tributaria").then((m) => m.HojaTributaria));

export type PerfilTributario = { razonSocial: string | null; rut: string | null };

/** Razón social y RUT de la empresa, a quien OPAI le factura; se completan o corrigen desde aquí. */
export function DatosTributarios(props: { tenantId: string; perfil: PerfilTributario | null }) {
  const { tenantId, perfil } = props;
  const [abierta, setAbierta] = useState(false);
  const faltaRut = !perfil?.rut;
  return (
    <SeccionTarjeta
      titulo="Datos tributarios"
      accion={
        <Button variant="ghost" onClick={() => setAbierta(true)}>
          <Pencil className="size-4" aria-hidden />
          {faltaRut ? "Completar" : "Editar"}
        </Button>
      }
    >
      <ParesGrid
        items={[
          { etiqueta: "Razón social", valor: perfil?.razonSocial ?? null },
          {
            etiqueta: "RUT",
            valor: perfil?.rut ? (
              formatearRut(perfil.rut)
            ) : (
              <Badge tono="warning">Falta el RUT</Badge>
            ),
          },
        ]}
      />
      {abierta ? (
        <HojaTributaria
          tenantId={tenantId}
          perfil={perfil ?? { razonSocial: null, rut: null }}
          onCerrar={() => setAbierta(false)}
        />
      ) : null}
    </SeccionTarjeta>
  );
}
