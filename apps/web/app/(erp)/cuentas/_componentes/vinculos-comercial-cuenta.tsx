import Link from "next/link";

import { SeccionTarjeta } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { accesoCpq } from "@/lib/cpq-ui";
import { verPestanaNegocios } from "@/lib/pestanas-modulos";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import type { NegocioFila } from "../../negocios/_componentes/datos";

import { TarjetaNegocioCuenta, type CotizacionCuenta } from "./tarjeta-negocio-cuenta";

/** Negocios de la cuenta con cotizaciones, propuesta técnica y agente interno (CAR-150). */
export async function VinculosComercialCuenta({ cuentaId }: { cuentaId: string }) {
  const [negociosModulo, identidad] = await Promise.all([verPestanaNegocios(), identidadActual()]);
  const cpq = accesoCpq(identidad);
  const puede = identidad ? puedeDeIdentidad(identidad) : () => false;
  const agente =
    Boolean(identidad?.modulosActivos.includes("agente")) && puede("core:apikeys.manage");

  let negocios: NegocioFila[] = [];
  if (negociosModulo) {
    const r = await ejecutarComoUsuario<{ items: NegocioFila[] }>("erp", "comercial.negocios.list", {
      cuentaId,
      limite: 50,
    });
    negocios = r.ok ? r.data.items : [];
  }

  const cotizacionesPorNegocio = new Map<string, CotizacionCuenta[]>();
  if (cpq.leer && negocios.length) {
    await Promise.all(
      negocios.map(async (n) => {
        const r = await ejecutarComoUsuario<{ items: CotizacionCuenta[] }>(
          "erp",
          "cpq.cotizaciones.list",
          { negocioId: n.id, limite: 20 },
        );
        if (r.ok) cotizacionesPorNegocio.set(n.id, r.data.items);
      }),
    );
  }

  if (!negociosModulo && !cpq.leer && !agente) {
    return (
      <SeccionTarjeta titulo="Comercial, cotizaciones y agente">
        <p className="t-body-sm text-fg-muted">
          Activa Comercial o CPQ en Configuración › Módulos para vincular negocios y cotizaciones a
          esta cuenta.
        </p>
      </SeccionTarjeta>
    );
  }

  return (
    <SeccionTarjeta titulo="Comercial, cotizaciones y agente">
      <div className="flex flex-col gap-4 t-body-sm">
        {agente ? (
          <EnlaceBoton href="/configuracion/grupo/agentes/agente-interno" variante="secondary">
            Agente interno
          </EnlaceBoton>
        ) : null}
        {negociosModulo ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="t-label">Por negocio</p>
              <EnlaceBoton href={`/cuentas/${cuentaId}/negocios`} variante="ghost">
                Ver pestaña Negocios
              </EnlaceBoton>
            </div>
            {negocios.length === 0 ? (
              <p className="t-caption text-fg-muted">
                Aún no hay negocios.{" "}
                <Link href={`/negocios?nuevo=1&cuenta=${cuentaId}`} className="text-accent underline">
                  Crear negocio
                </Link>
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {negocios.map((n) => (
                  <TarjetaNegocioCuenta
                    key={n.id}
                    negocio={n}
                    cotizaciones={cotizacionesPorNegocio.get(n.id) ?? []}
                    cpqLeer={cpq.leer}
                    cpqCrear={cpq.crear}
                  />
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </SeccionTarjeta>
  );
}
