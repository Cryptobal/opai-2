import { PERMISOS_CORE } from "@opai/domain";
import { Alerta, ParesGrid, SeccionTarjeta } from "@opai/ds";

import { AccionesEntidad, type AccionEntidad } from "@/app/_components/maestros/acciones-entidad";
import { BotonEditarSeccion, HojaEditarSeccion } from "./editar-seccion";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { identidadActual } from "@/lib/servidor";

import { CuentasPago, TEXTO_TIPO } from "./cuentas-pago";
import { SeccionError, SeccionSinAcceso, VacioSeccion } from "./estado-seccion";
import { cuentaCorta } from "./estado-ficha";
import { type CuentaPago, pagoDe } from "./lecturas-ficha";

const TITULO = "Pago y bancos";

/** «BancoEstado · 012»; lo guardado como texto libre se muestra tal cual, marcado para corregir. */
export const banco = (c: CuentaPago) =>
  c.bancoNombre && /^\d{3}$/.test(c.bancoCodigo ?? "")
    ? `${c.bancoNombre} · ${c.bancoCodigo}`
    : c.bancoCodigo
      ? `${c.bancoCodigo} (por corregir)`
      : null;

export async function SeccionPago({ personaId }: { personaId: string }) {
  const identidad = await identidadActual();
  if (!identidad) return null;
  if (!puedeDeIdentidad(identidad)(PERMISOS_CORE.personasPagoRead))
    return <SeccionSinAcceso titulo={TITULO} />;
  const r = await pagoDe(personaId);
  // CAR-124 (estado «error» del diseño): un fallo ya no deja la tarjeta en blanco.
  if (!r.ok) return <SeccionError titulo={TITULO} que="los datos de pago" />;
  const d = r.data;
  const v = d.vigente;
  const sinCuenta = !v.bancoCodigo && !v.tipoCuenta && !v.numeroCuenta && !v.rutTitular;
  const puede = puedeDeIdentidad(identidad)(PERMISOS_CORE.personasPagoManage);
  const bloqueoPendiente = d.solicitudPendiente
    ? "Ya hay una solicitud de cambio pendiente de RRHH."
    : null;
  const puedeAprobar = puedeDeIdentidad(identidad)(PERMISOS_CORE.personasPagoAprobar);
  const acciones: AccionEntidad[] =
    d.solicitudPendiente && puedeAprobar
      ? [
          {
            id: "aprobar_pago",
            etiqueta: "Aprobar cambio de cuenta",
            capacidad: {
              id: "core.personas.pago_aprobar_cambio",
              input: { id: personaId },
              exito: "Cuenta actualizada",
            },
          },
          {
            id: "rechazar_pago",
            etiqueta: "Rechazar solicitud",
            peligro: true,
            capacidad: {
              id: "core.personas.pago_rechazar_cambio",
              input: { id: personaId },
              exito: "Solicitud rechazada",
            },
            confirmar: {
              titulo: "Rechazar cambio de cuenta",
              descripcion: "Indica el motivo del rechazo (obligatorio).",
              boton: "Rechazar",
              motivo: true,
            },
          },
        ]
      : [];
  return (
    <SeccionTarjeta
      titulo={TITULO}
      {...(puede
        ? {
            accion: (
              <div className="flex flex-wrap gap-2">
                <BotonEditarSeccion
                  seccion="pago"
                  etiqueta={d.solicitudPendiente ? "Ver solicitud" : "Solicitar cambio"}
                />
                {d.solicitudPendiente ? null : (
                  <BotonEditarSeccion seccion="pago-agregar" etiqueta="Agregar cuenta" />
                )}
              </div>
            ),
          }
        : {})}
    >
      {d.solicitudPendiente ? (
        <Alerta tono="warning" titulo="Cambio de cuenta pendiente de RRHH">
          {TEXTO_TIPO[d.solicitudPendiente.tipo]}
          {d.solicitudPendiente.tipo === "reemplazar" || d.solicitudPendiente.tipo === "agregar"
            ? `: ${cuentaCorta(d.solicitudPendiente) ?? "sin datos"}`
            : ""}
          . La aprueba o rechaza alguien distinto de quien la registró.
        </Alerta>
      ) : null}
      {sinCuenta && !d.solicitudPendiente ? (
        <VacioSeccion texto="Sin cuenta registrada." accion={puede ? "Solicitar cambio" : null} />
      ) : null}
      {v.porCorregir ? (
        <Alerta tono="warning" titulo="Banco o tipo de cuenta por corregir">
          Se escribió a mano y no está en el catálogo SBIF, así que no sirve para la nómina de pago.
          {puede ? " Usa «Solicitar cambio» y elígelo de la lista." : ""}
        </Alerta>
      ) : null}
      <ParesGrid
        items={[
          { etiqueta: "Banco", valor: banco(v) },
          { etiqueta: "Tipo de cuenta", valor: v.tipoCuentaEtiqueta ?? v.tipoCuenta },
          { etiqueta: "Número de cuenta", valor: v.numeroCuenta, mono: true },
          { etiqueta: "RUT titular", valor: v.rutTitular, mono: true },
        ]}
      />
      <CuentasPago
        personaId={personaId}
        cuentas={d.cuentas}
        puede={puede}
        bloqueado={Boolean(d.solicitudPendiente)}
      />
      {acciones.length ? (
        <div className="mt-3">
          <AccionesEntidad etiqueta="Resolución RRHH" acciones={acciones} />
        </div>
      ) : null}
      {puede ? (
        <>
          <HojaEditarSeccion
            seccion="pago"
            personaId={personaId}
            inicial={{ bancoCodigo: "", tipoCuenta: "", numeroCuenta: "", rutTitular: "" }}
            {...(bloqueoPendiente ? { bloqueo: bloqueoPendiente } : {})}
          />
          <HojaEditarSeccion
            seccion="pago-agregar"
            personaId={personaId}
            inicial={{ bancoCodigo: "", tipoCuenta: "", numeroCuenta: "", porDefecto: "no" }}
            {...(bloqueoPendiente ? { bloqueo: bloqueoPendiente } : {})}
          />
        </>
      ) : null}
    </SeccionTarjeta>
  );
}
