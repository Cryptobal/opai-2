"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alerta, avisar, Button, Campo, Combobox } from "@opai/ds";

import { useCapacidad } from "@/app/_components/use-capacidad";
import type { CuentaFila, InstalacionFila, Puesto } from "@/lib/tipos-maestros";

import {
  CamposInstalacion,
  camposAInput,
  inicialInstalacion,
} from "../_componentes/campos-instalacion";
import { faltantesInstalacion } from "../_componentes/faltantes";
import { CopiarPuestos } from "./copiar-puestos";

type Props = {
  cuentaInicial: string | null;
  cuentas: CuentaFila[];
  instalaciones: InstalacionFila[];
};

/** Formulario en tres columnas en md+ (40); una columna con barra fija en teléfono. */
export function NuevaInstalacion({ cuentaInicial, cuentas, instalaciones }: Props) {
  const router = useRouter();
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [cuentaId, setCuentaId] = useState<string | null>(cuentaInicial);
  const [d, setD] = useState(() => inicialInstalacion());
  const [copiar, setCopiar] = useState<Puesto[]>([]);
  async function crear() {
    if (!cuentaId) return;
    const i = await ejecutar<{ id: string }>("core.instalaciones.create", {
      cuentaId,
      ...camposAInput(d),
    });
    if (!i) return;
    for (const p of copiar) {
      // Cada posición se copia como 1 puesto (sin la dotación deprecada ni los campos solo de vista).
      const {
        id: _id,
        instalacionId: _i,
        horario: _h,
        horarioNoche: _hn,
        estado: _e,
        dotacion: _dot,
        funcion: _f,
        patron: _p,
        patronResumen: _pr,
        cobertura: _c,
        coberturaMotivo: _cm,
        ...datos
      } = p;
      await ejecutar("core.puestos.create", { ...datos, instalacionId: i.id });
    }
    avisar.exito(
      copiar.length ? `Instalación creada con ${copiar.length} puestos` : "Instalación creada",
    );
    router.push(`/instalaciones/${i.id}`);
  }
  const faltan = faltantesInstalacion(d, cuentaId || null);
  const acciones = (
    <>
      <Button variant="secondary" onClick={() => router.back()}>
        Cancelar
      </Button>
      <Button disabled={pendiente || faltan.length > 0} onClick={() => void crear()}>
        {pendiente ? "Creando…" : "Crear instalación"}
      </Button>
    </>
  );
  return (
    <div className="flex flex-col gap-4 pb-36 md:pb-0">
      <div className="hidden items-center justify-end gap-3 md:flex">
        {faltan.length ? <p className="text-sm text-fg-muted">Falta {faltan.join(" y ")}</p> : null}
        {acciones}
      </div>
      {error ? <Alerta tono="danger" titulo={error} /> : null}
      <div className="grid gap-6 md:grid-cols-3">
        <section className="flex flex-col gap-3">
          <h2 className="t-label text-fg">1 · Cuenta</h2>
          <Campo
            etiqueta="Cuenta"
            htmlFor="n-cuenta"
            ayuda="Busca por nombre, razón social o RUT. Se muestran primero las cuentas activas."
          >
            <Combobox
              id="n-cuenta"
              placeholder="Buscar cuenta"
              opciones={[...cuentas]
                .sort(
                  (a, b) =>
                    Number(b.estado === "cliente_activo") - Number(a.estado === "cliente_activo"),
                )
                .map((c) => ({
                  valor: c.id,
                  etiqueta: c.nombre,
                  detalle: `${c.instalaciones} inst.`,
                }))}
              valor={cuentaId}
              onCambiar={([v]) => setCuentaId(v ?? null)}
              onCrear={(texto) =>
                router.push(`/cuentas?nueva=1&nombre=${encodeURIComponent(texto)}`)
              }
            />
          </Campo>
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="t-label text-fg">2 · Datos y ubicación</h2>
          <CamposInstalacion d={d} setD={setD} />
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="t-label text-fg">3 · Copiar puestos desde</h2>
          <CopiarPuestos
            instalaciones={instalaciones.filter((i) => !cuentaId || i.cuentaId === cuentaId)}
            onCambiar={setCopiar}
          />
        </section>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-2 border-t border-border bg-surface-raised px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] md:hidden">
        {faltan.length ? <p className="text-sm text-fg-muted">Falta {faltan.join(" y ")}</p> : null}
        <div className="flex gap-2 [&>*]:h-12 [&>*]:flex-1">{acciones}</div>
      </div>
    </div>
  );
}
