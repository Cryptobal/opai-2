"use client";

import { ArrowLeftRight } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button, Empty, Estado, SplitScreen, type EstadoPantalla } from "@opai/ds";

import type { CuentaBanco, MovimientoBanco } from "./bancos-tipos";
import { CabeceraCuenta } from "./cabecera-cuenta";
import { FiltrosMovimientos } from "./filtros-movimientos";
import { ListaMovimientos } from "./lista-movimientos";
import { PestanasBancos } from "./pestanas-bancos";

const PanelReconocer = dynamic(() => import("./panel-reconocer").then((m) => ({ default: m.PanelReconocer })));
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

/**
 * Movimientos de Bancos con maestro-detalle (CAR-257), como Ventas (CAR-255): la lista queda a la izquierda y el
 * movimiento elegido se reconoce o revisa a la derecha. En teléfono y bajo 1024 px es una pantalla a la vez.
 */
export function PantallaBancos({ state, cuentas, cuentaId, estado, tipo, movimientos, movId, gestiona, ver }: Props) {
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
  const detalle =
    gestiona && movSeleccionado ? (
      <PanelReconocer key={movSeleccionado.id} movimiento={movSeleccionado} onCerrar={() => router.push(params(estado))} />
    ) : null;

  return (
    <Estado state={state} variante="lista" textos={{ error: { titulo: "No pudimos cargar Bancos" } }}>
      <SplitScreen
        telefono={detalle ? "detalle" : "lista"}
        unPanelHastaLg
        etiquetaLista="Movimientos"
        etiquetaDetalle="Detalle del movimiento"
        vacio={{ texto: "Elige un movimiento", icono: ArrowLeftRight }}
        {...(detalle ? { detalle: <div className="md:p-4">{detalle}</div> } : {})}
        lista={
          <div className="flex flex-col gap-4 md:p-4">
            <PestanasBancos activa="movimientos" />
            <CabeceraCuenta
              cuenta={cuenta}
              accion={
                gestiona && cuentas.length > 0 ? (
                  <Button variant="primary" onClick={() => setSubirAbierta(true)}>
                    Subir cartola
                  </Button>
                ) : undefined
              }
            />
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
                <FiltrosMovimientos estado={estado} tipo={tipo} href={params} />
                <ListaMovimientos
                  movimientos={movimientos}
                  gestiona={gestiona}
                  hrefMov={(id) => `${params(estado)}&mov=${id}`}
                  seleccionado={movSeleccionado?.id}
                />
              </>
            )}
          </div>
        }
      />
      {gestiona ? (
        <>
          <HojaAgregarCuenta abierta={crearAbierta} onAbiertaChange={setCrearAbierta} />
          <HojaSubirCartola cuentas={cuentas} cuentaId={cuenta?.id ?? null} abierta={subirAbierta} onAbiertaChange={setSubirAbierta} />
        </>
      ) : null}
    </Estado>
  );
}
