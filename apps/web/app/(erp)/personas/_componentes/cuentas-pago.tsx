import { Badge } from "@opai/ds";

import { AccionesEntidad } from "@/app/_components/maestros/acciones-entidad";

import { cuentaCorta } from "./estado-ficha";
import type { Pago } from "./lecturas-ficha";

export const TEXTO_TIPO = {
  reemplazar: "Nueva cuenta por defecto",
  agregar: "Cuenta nueva",
  marcar_defecto: "Cambio de cuenta por defecto",
  quitar: "Quitar una cuenta",
} as const;

const SOLICITAR = "core.personas.pago_solicitar_cambio";

/** CAR-275: todas las cuentas de la persona; marcar otra por defecto o quitarla pasa por RRHH. */
export function CuentasPago({
  personaId,
  cuentas,
  puede,
  bloqueado,
}: {
  personaId: string;
  cuentas: Pago["cuentas"];
  puede: boolean;
  bloqueado: boolean;
}) {
  if (cuentas.length < 2 && !cuentas.some((c) => !c.porDefecto)) return null;
  return (
    <ul className="mt-3 flex flex-col gap-2" aria-label="Cuentas bancarias">
      {cuentas.map((c) => (
        <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
          <span className="t-body">
            {cuentaCorta(c) ?? "Cuenta sin datos"}
            {c.titularNombre ? ` · ${c.titularNombre}` : ""}
          </span>
          {c.porDefecto ? (
            <Badge tono="success">Por defecto</Badge>
          ) : puede && !bloqueado ? (
            <AccionesEntidad
              etiqueta="Acciones de la cuenta"
              acciones={[
                {
                  id: `defecto_${c.id}`,
                  etiqueta: "Marcar por defecto",
                  capacidad: {
                    id: SOLICITAR,
                    input: { id: personaId, tipo: "marcar_defecto", cuentaId: c.id },
                    exito: "Solicitud registrada: queda pendiente de aprobación de RRHH",
                  },
                },
                {
                  id: `quitar_${c.id}`,
                  etiqueta: "Quitar cuenta",
                  peligro: true,
                  capacidad: {
                    id: SOLICITAR,
                    input: { id: personaId, tipo: "quitar", cuentaId: c.id },
                    exito: "Solicitud registrada: queda pendiente de aprobación de RRHH",
                  },
                  confirmar: {
                    titulo: "Quitar cuenta bancaria",
                    descripcion: "RRHH debe aprobar la solicitud para que la cuenta se elimine.",
                    boton: "Solicitar",
                  },
                },
              ]}
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
