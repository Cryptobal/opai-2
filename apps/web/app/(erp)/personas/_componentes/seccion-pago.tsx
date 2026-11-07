import { PERMISOS_CORE } from "@opai/domain";
import { Alerta, ParesGrid, SeccionTarjeta } from "@opai/ds";

import { AccionesEntidad, type AccionEntidad } from "@/app/_components/maestros/acciones-entidad";
import { BotonEditarSeccion, HojaEditarSeccion } from "./editar-seccion";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

type Pago = {
  personaId: string;
  vigente: {
    bancoCodigo: string | null;
    tipoCuenta: string | null;
    numeroCuenta: string | null;
    rutTitular: string | null;
  };
  solicitudPendiente: {
    id: string;
    bancoCodigo: string | null;
    tipoCuenta: string | null;
    numeroCuenta: string | null;
    rutTitular: string | null;
  } | null;
};

export async function SeccionPago({ personaId }: { personaId: string }) {
  const identidad = await identidadActual();
  if (!identidad || !puedeDeIdentidad(identidad)(PERMISOS_CORE.personasPagoRead)) return null;
  const r = await ejecutarComoUsuario<Pago>("erp", "core.personas.pago_ver", { id: personaId });
  if (!r.ok) return null;
  const d = r.data;
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
      <ParesGrid
        items={[
          { etiqueta: "Banco", valor: d.vigente.bancoCodigo },
          { etiqueta: "Tipo de cuenta", valor: d.vigente.tipoCuenta },
          { etiqueta: "Número de cuenta", valor: d.vigente.numeroCuenta, mono: true },
          { etiqueta: "RUT titular", valor: d.vigente.rutTitular, mono: true },
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
