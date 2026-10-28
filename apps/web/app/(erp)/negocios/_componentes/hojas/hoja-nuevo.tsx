"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, avisar, Button, Campo, Combobox, Sheet } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import type { CuentaFila } from "@/lib/tipos-maestros";

import { CamposNegocio, camposAInput, type DatosNegocio } from "./campos-negocio";
import type { ConfigComercial } from "./tipos";
import { useHojaNegocio } from "./use-hoja";

type Props = { config: ConfigComercial; cuentas: CuentaFila[]; cuentaInicial: string | null };

const VACIO: DatosNegocio = {
  titulo: "",
  tipoId: "",
  origenId: "",
  cierreEstimado: "",
  inicioServicioEstimado: "",
  monto: "",
  probabilidad: "",
};

/** Nuevo negocio (export «Nuevo negocio»): cuenta, nombre, tipo, origen, cierre y valor mensual. */
export function HojaNuevo({ config, cuentas, cuentaInicial }: Props) {
  const hoja = useHojaNegocio("nuevo");
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [cuentaId, setCuentaId] = useState<string | null>(cuentaInicial);
  const [d, setD] = useState<DatosNegocio>(VACIO);
  const set = <K extends keyof DatosNegocio>(k: K, v: DatosNegocio[K]) =>
    setD((x) => ({ ...x, [k]: v }));
  const primera = config.embudo.etapas.find((e) => e.activa && e.tipo === "abierta");
  async function crear() {
    if (!cuentaId) return;
    const r = await ejecutar<{ id: string }>("comercial.negocios.create", {
      cuentaId,
      ...camposAInput(d, true),
    });
    if (!r) return;
    avisar.exito("Negocio creado");
    hoja.cerrar();
    router.push(`/negocios/${r.id}`);
  }
  return (
    <Sheet
      abierto={hoja.abierta}
      onCerrar={hoja.cerrar}
      titulo="Nuevo negocio"
      descripcion={`Se crea en «${primera?.nombre ?? "la primera etapa"}» y queda a tu nombre.`}
      telefono="completo"
      acciones={
        <>
          <Button variant="secondary" onClick={hoja.cerrar}>
            Cancelar
          </Button>
          <Button
            disabled={pendiente || !cuentaId || d.titulo.trim().length < 3}
            onClick={() => void crear()}
          >
            {pendiente ? "Creando…" : "Crear negocio"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        <Campo
          etiqueta="Cuenta"
          htmlFor="neg-cuenta"
          ayuda="Si la cuenta no existe, créala desde Cuentas."
        >
          <Combobox
            id="neg-cuenta"
            placeholder="Buscar cuenta"
            opciones={cuentas.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
            valor={cuentaId}
            onCambiar={([v]) => setCuentaId(v ?? null)}
          />
        </Campo>
        <CamposNegocio d={d} set={set} config={config} />
      </div>
    </Sheet>
  );
}
