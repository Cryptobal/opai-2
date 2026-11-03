import Link from "next/link";

import { SeccionTarjeta } from "@opai/ds";

import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { accesoCpq } from "@/lib/cpq-ui";
import { verPestanaNegocios } from "@/lib/pestanas-modulos";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { identidadActual } from "@/lib/servidor";

/** Enlaces visibles desde la cuenta hacia negocios, cotizaciones, propuesta técnica y agente (CAR-150). */
export async function VinculosComercialCuenta({ cuentaId }: { cuentaId: string }) {
  const [negocios, identidad] = await Promise.all([verPestanaNegocios(), identidadActual()]);
  const cpq = accesoCpq(identidad);
  const puede = identidad ? puedeDeIdentidad(identidad) : () => false;
  const agente =
    Boolean(identidad?.modulosActivos.includes("agente")) && puede("core:apikeys.manage");
  if (!negocios && !cpq.leer && !agente) {
    return (
      <SeccionTarjeta titulo="Comercial y agente">
        <p className="t-body-sm text-fg-muted">
          Activa Comercial o CPQ en Configuración › Módulos para vincular negocios y cotizaciones a
          esta cuenta.
        </p>
      </SeccionTarjeta>
    );
  }
  return (
    <SeccionTarjeta titulo="Comercial y agente">
      <ul className="flex flex-col gap-3 t-body-sm">
        {negocios ? (
          <li>
            <Link href={`/cuentas/${cuentaId}/negocios`} className="text-accent underline">
              Negocios de la cuenta
            </Link>
            <p className="t-caption text-fg-muted">
              Oportunidades comerciales ligadas a esta empresa.
            </p>
          </li>
        ) : null}
        {cpq.leer ? (
          <li>
            <div className="flex flex-wrap items-center gap-2">
              <EnlaceBoton href="/cotizaciones" variante="secondary">
                Cotizaciones
              </EnlaceBoton>
              {cpq.crear ? (
                <EnlaceBoton href={`/cotizaciones/nueva`} variante="ghost">
                  Nueva cotización
                </EnlaceBoton>
              ) : null}
            </div>
            <p className="t-caption text-fg-muted">
              Elige un negocio abierto de esta cuenta al crear. La propuesta técnica vive en la ficha
              de cada cotización.
            </p>
          </li>
        ) : null}
        {agente ? (
          <li>
            <Link
              href="/configuracion/grupo/agentes/agente-interno"
              className="text-accent underline"
            >
              Agente interno
            </Link>
            <p className="t-caption text-fg-muted">
              Configura el asistente de OPAI y las API keys del tenant (no por cuenta, pero opera
              sobre los datos que autorices).
            </p>
          </li>
        ) : null}
      </ul>
    </SeccionTarjeta>
  );
}
