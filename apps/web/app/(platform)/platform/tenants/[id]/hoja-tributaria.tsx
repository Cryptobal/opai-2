"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { formatearRut } from "@opai/domain";
import { Alerta, avisar, Button, Campo, Input, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";

type Perfil = { razonSocial: string | null; rut: string | null };

/** Hoja para completar o corregir la razón social y el RUT de la empresa (se descarga al abrirla). */
export function HojaTributaria(props: { tenantId: string; perfil: Perfil; onCerrar: () => void }) {
  const { tenantId, perfil, onCerrar } = props;
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("platform");
  const [razon, setRazon] = useState(perfil.razonSocial ?? "");
  const [rut, setRut] = useState(perfil.rut ? formatearRut(perfil.rut) : "");
  const listo = razon.trim().length >= 2 && rut.trim().length >= 3;

  async function guardar() {
    const r = await ejecutar("platform.tenants.perfil_set", {
      tenantId,
      razonSocial: razon,
      rut,
    });
    if (r) {
      avisar.exito("Datos tributarios guardados");
      router.refresh();
      onCerrar();
    }
  }

  return (
    <Sheet
      abierto
      onCerrar={onCerrar}
      titulo="Datos tributarios"
      descripcion="Son los datos a los que OPAI le factura a esta empresa. Sin RUT no se puede abrir una prueba."
      acciones={
        <>
          <Button variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button disabled={pendiente || !listo} onClick={() => void guardar()}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo etiqueta="Razón social" htmlFor="razon">
          <Input id="razon" value={razon} onChange={(e) => setRazon(e.target.value)} />
        </Campo>
        <Campo
          etiqueta="RUT"
          htmlFor="rut"
          ayuda="Con guion y dígito verificador, por ejemplo 76.123.456-0"
        >
          <Input
            id="rut"
            value={rut}
            autoCapitalize="characters"
            onChange={(e) => setRut(e.target.value)}
            onBlur={() => setRut((v) => formatearRut(v))}
          />
        </Campo>
      </div>
    </Sheet>
  );
}
