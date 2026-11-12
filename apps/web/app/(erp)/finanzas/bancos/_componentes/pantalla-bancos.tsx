"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Empty, Estado, Segmentado, Tabs, type EstadoPantalla } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { fechaHora } from "@/lib/formato";

import { clp } from "../../flujo/_componentes/datos";
import type { CuentaBanco, MovimientoBanco } from "./bancos-tipos";
import { PESTANAS_ESTADO_BANCO } from "./bancos-tipos";
import { ListaMovimientos } from "./lista-movimientos";

const HojaReconocer = dynamic(() => import("./hoja-reconocer").then((m) => ({ default: m.HojaReconocer })));
const HojaSubirCartola = dynamic(() => import("./hoja-subir-cartola").then((m) => ({ default: m.HojaSubirCartola })));
const HojaAgregarCuenta = dynamic(() =>
  import("./hoja-agregar-cuenta").then((m) => ({ default: m.HojaAgregarCuenta })),
);

type Props = {
  state: EstadoPantalla;
  cuentas: CuentaBanco[];
  cuentaId: string | null;
  estado: string;
  tipo: "ingresos" | "egresos" | null;
  movimientos: MovimientoBanco[];
  movId: string | null;
  gestiona: boolean;
  ver: boolean;
};

export function PantallaBancos({
  state,
  cuentas,
  cuentaId,
  estado,
  tipo,
  movimientos,
  movId,
  gestiona,
  ver,
}: Props) {
  const router = useRouter();
  const [subirAbierta, setSubirAbierta] = useState(false);
  const [crearAbierta, setCrearAbierta] = useState(false);

  if (!ver) {
    return <Empty titulo="Sin permiso" descripcion="No tienes acceso a Bancos en esta empresa." />;
  }

  const cuenta = cuentas.find((c) => c.id === cuentaId) ?? cuentas[0];
  const params = (e: string, t: string | null = tipo) => {
    const q = new URLSearchParams();
    if (cuenta?.id) q.set("cuenta", cuenta.id);
    q.set("estado", e);
    if (t) q.set("tipo", t);
    return `/finanzas/bancos?${q.toString()}`;
  };
  const movSeleccionado = movId ? (movimientos.find((m) => m.id === movId) ?? null) : null;
  const cerrarReconocer = () => {
    router.push(params(estado));
  };

  return (
    <Estado state={state} variante="lista" textos={{ error: { titulo: "No pudimos cargar Bancos" } }}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="t-body-sm text-fg-muted">
              {cuenta ? `${cuenta.banco} · ${cuenta.numeroVisible}` : "Configura una cuenta para importar cartolas."}
            </p>
            {cuenta?.ultimaSyncEn ? (
              <p className="t-body-sm text-fg-muted">
                Sincronizado con el banco el {fechaHora(cuenta.ultimaSyncEn)}
                {cuenta.saldoBanco !== null ? ` · saldo ${clp(cuenta.saldoBanco)}` : ""}
              </p>
            ) : null}
          </div>
          {gestiona && cuentas.length > 0 ? (
            <Button variant="primary" onClick={() => setSubirAbierta(true)}>
              Subir cartola
            </Button>
          ) : null}
        </div>
        {cuentas.length === 0 ? (
          <Empty
            titulo="Sin cuentas bancarias"
            descripcion="Crea una cuenta para importar movimientos desde cartola Santander o CSV genérico."
            accion={
              gestiona ? (
                <Button variant="primary" onClick={() => setCrearAbierta(true)}>
                  Agregar cuenta
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Tabs
              Link={LinkNext}
              activa={estado}
              tabs={PESTANAS_ESTADO_BANCO.map((e) => ({ id: e.id, etiqueta: e.etiqueta, href: params(e.id) }))}
            />
            <Segmentado
              Link={LinkNext}
              etiqueta="Tipo de movimiento"
              activa={tipo ?? "todos"}
              opciones={[
                { id: "todos", etiqueta: "Todos", href: params(estado, null) },
                { id: "ingresos", etiqueta: "Ingresos", href: params(estado, "ingresos") },
                { id: "egresos", etiqueta: "Egresos", href: params(estado, "egresos") },
              ]}
            />
            <ListaMovimientos movimientos={movimientos} gestiona={gestiona} hrefMov={(id) => `${params(estado)}&mov=${id}`} />
          </>
        )}
      </div>
      {gestiona ? (
        <>
          <HojaAgregarCuenta abierta={crearAbierta} onAbiertaChange={setCrearAbierta} />
          <HojaSubirCartola
            cuentas={cuentas}
            cuentaId={cuenta?.id ?? null}
            abierta={subirAbierta}
            onAbiertaChange={setSubirAbierta}
          />
        </>
      ) : null}
      {gestiona && movSeleccionado ? (
        <HojaReconocer key={movSeleccionado.id} movimiento={movSeleccionado} abierta onCerrar={cerrarReconocer} />
      ) : null}
    </Estado>
  );
}
