import { PERMISOS_CORE } from "@opai/domain";
import { Alerta, ParesGrid, SeccionTarjeta } from "@opai/ds";

import { AccionesEntidad, type AccionEntidad } from "@/app/_components/maestros/acciones-entidad";
import { BotonEditarSeccion, HojaEditarSeccion } from "./editar-seccion";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

type Cuenta = {
  bancoCodigo: string | null;
  tipoCuenta: string | null;
  numeroCuenta: string | null;
  rutTitular: string | null;
  /** CAR-244: nombre del catálogo SBIF y señal de dato escrito a mano que hay que corregir. */
  bancoNombre: string | null;
  tipoCuentaEtiqueta: string | null;
  porCorregir: boolean;
};
type Pago = {
  personaId: string;
  vigente: Cuenta;
  solicitudPendiente: (Cuenta & { id: string }) | null;
};

/** «BancoEstado · 012»; lo guardado como texto libre se muestra tal cual, marcado para corregir. */
const banco = (c: Cuenta) =>
  c.bancoNombre && !c.porCorregir
    ? `${c.bancoNombre} · ${c.bancoCodigo}`
    : c.bancoCodigo
      ? `${c.bancoCodigo} (por corregir)`
      : null;

export async function SeccionPago({ personaId }: { personaId: string }) {
  const identidad = await identidadActual();
  if (!identidad || !puedeDeIdentidad(identidad)(PERMISOS_CORE.personasPagoRead)) return null;
  const r = await ejecutarComoUsuario<Pago>("erp", "core.personas.pago_ver", { id: personaId });
  // CAR-124 (estado «error» del diseño): un fallo ya no deja la tarjeta en blanco.
  if (!r.ok)
    return (
      <SeccionTarjeta titulo="Pago y bancos">
        <Alerta tono="danger" titulo="No pudimos cargar los datos de pago">
          Recarga la página. Si el problema sigue, avisa a soporte.
        </Alerta>
      </SeccionTarjeta>
    );
  const d = r.data;
  const v = d.vigente;
  const sinCuenta = !v.bancoCodigo && !v.tipoCuenta && !v.numeroCuenta && !v.rutTitular;
  const puede = puedeDeIdentidad(identidad)(PERMISOS_CORE.personasPagoManage);
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
      titulo="Pago y bancos"
      {...(puede
        ? {
            accion: (
              <BotonEditarSeccion
                seccion="pago"
                etiqueta={d.solicitudPendiente ? "Ver solicitud" : "Solicitar cambio"}
              />
            ),
          }
        : {})}
    >
      {d.solicitudPendiente ? (
        <Alerta tono="warning" titulo="Cambio de cuenta pendiente de RRHH">
          La solicitud debe ser aprobada o rechazada por alguien distinto de quien la registró.
        </Alerta>
      ) : null}
      {sinCuenta && !d.solicitudPendiente ? (
        <p className="t-caption mb-3">
          Sin cuenta registrada.{puede ? " Usa «Solicitar cambio» para agregarla." : ""}
        </p>
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
      {acciones.length ? (
        <div className="mt-3">
          <AccionesEntidad etiqueta="Resolución RRHH" acciones={acciones} />
        </div>
      ) : null}
      {puede ? (
        <HojaEditarSeccion
          seccion="pago"
          personaId={personaId}
          inicial={{ bancoCodigo: "", tipoCuenta: "", numeroCuenta: "", rutTitular: "" }}
          {...(d.solicitudPendiente
            ? { bloqueo: "Ya hay una solicitud de cambio pendiente de RRHH." }
            : {})}
        />
      ) : null}
    </SeccionTarjeta>
  );
}
