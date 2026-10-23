"use client";

import { puedeAsignarRol, ROLES, type Rol } from "@opai/domain";
import { Campo, Select, Switch } from "@opai/ds";

import { ETIQUETA_ROL } from "@/app/_components/portales";
import { ETIQUETA_PORTAL } from "@/lib/formato";

/** Roles que el usuario actual puede asignar (nunca uno superior al suyo; owner solo un owner). */
export function rolesAsignables(miRol: string): Rol[] {
  const propio = (ROLES as readonly string[]).includes(miRol) ? (miRol as Rol) : "viewer";
  return ROLES.filter((r) => puedeAsignarRol(propio, r));
}

export function CampoRol(props: {
  valor: string;
  onCambiar: (r: string) => void;
  miRol: string;
  id: string;
}) {
  return (
    <Campo etiqueta="Rol" htmlFor={props.id}>
      <Select
        id={props.id}
        valor={props.valor}
        onCambiar={props.onCambiar}
        opciones={rolesAsignables(props.miRol).map((r) => ({
          valor: r,
          etiqueta: ETIQUETA_ROL[r] ?? r,
        }))}
      />
    </Campo>
  );
}

/** Portales a los que entra la persona: uno por fila con interruptor. */
export function CampoPortales(props: { valor: string[]; onCambiar: (p: string[]) => void }) {
  return (
    <fieldset>
      <legend className="t-label mb-1 text-fg">Portales</legend>
      <div className="divide-y divide-border">
        {Object.entries(ETIQUETA_PORTAL).map(([id, etiqueta]) => (
          <Switch
            key={id}
            etiqueta={etiqueta}
            activo={props.valor.includes(id)}
            onCambiar={(on) =>
              props.onCambiar(on ? [...props.valor, id] : props.valor.filter((p) => p !== id))
            }
          />
        ))}
      </div>
    </fieldset>
  );
}
