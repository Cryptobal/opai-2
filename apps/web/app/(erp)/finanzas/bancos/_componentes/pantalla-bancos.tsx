"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Badge, Button, Empty, Estado, Tabs, type EstadoPantalla } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";

import type { CuentaBanco, MovimientoBanco } from "./datos";
import { clp } from "../../flujo/_componentes/datos";
import { HojaReconocer } from "./hoja-reconocer";
import { HojaSubirCartola } from "./hoja-subir-cartola";

const ESTADOS = [
  { id: "pendiente", etiqueta: "Sin reconocer" },
  { id: "sugerido", etiqueta: "Sugeridos" },
  { id: "por_autorizar", etiqueta: "Por autorizar" },
  { id: "conciliado", etiqueta: "Conciliados" },
  { id: "ignorado", etiqueta: "Ignorados" },
] as const;

type Props = {
  state: EstadoPantalla;
  cuentas: CuentaBanco[];
  cuentaId: string | null;
  estado: string;
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
  movimientos,
  movId,
  gestiona,
  ver,
}: Props) {
  const router = useRouter();
  const [subirAbierta, setSubirAbierta] = useState(false);

  if (!ver) {
    return <Empty titulo="Sin permiso" descripcion="No tienes acceso a Bancos en esta empresa." />;
  }

  const cuenta = cuentas.find((c) => c.id === cuentaId) ?? cuentas[0];
  const params = (e: string) => {
    const q = new URLSearchParams();
    if (cuenta?.id) q.set("cuenta", cuenta.id);
    q.set("estado", e);
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
            <h1 className="t-heading">Bancos</h1>
            <p className="t-body-sm text-muted">
              {cuenta ? `${cuenta.banco} · ${cuenta.numeroVisible}` : "Configura una cuenta para importar cartolas."}
            </p>
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
          />
        ) : (
          <>
            <Tabs
              Link={LinkNext}
              activa={estado}
              tabs={ESTADOS.map((e) => ({ id: e.id, etiqueta: e.etiqueta, href: params(e.id) }))}
            />
            {movimientos.length === 0 ? (
              <Empty titulo="Sin movimientos en esta pestaña" descripcion="Importa una cartola o cambia el filtro de estado." />
            ) : (
              <ul className="flex flex-col gap-2">
                {movimientos.map((m) => (
                  <li key={m.id} className="rowcard flex flex-wrap items-center gap-2 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="t-body-sm font-medium">{m.glosa}</p>
                      <p className="t-caption text-muted">
                        {m.fecha}
                        {m.referencia ? ` · ${m.referencia}` : ""}
                      </p>
                    </div>
                    <span className="t-mono t-body-sm">{clp(m.monto)}</span>
                    <Badge tono={m.estado === "conciliado" ? "success" : "neutro"}>{m.estado}</Badge>
                    {gestiona ? (
                      <EnlaceBoton href={`${params(estado)}&mov=${m.id}`} variante="secondary">
                        {m.estado === "conciliado" ? "Ver" : "Reconocer"}
                      </EnlaceBoton>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
      {gestiona ? (
        <HojaSubirCartola
          cuentas={cuentas}
          cuentaId={cuenta?.id ?? null}
          abierta={subirAbierta}
          onAbiertaChange={setSubirAbierta}
        />
      ) : null}
      {gestiona && movSeleccionado ? (
        <HojaReconocer movimiento={movSeleccionado} abierta onCerrar={cerrarReconocer} />
      ) : null}
    </Estado>
  );
}
