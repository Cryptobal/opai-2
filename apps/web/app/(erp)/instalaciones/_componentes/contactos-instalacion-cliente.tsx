"use client";

import { useMemo, useState } from "react";

import { ETIQUETA_ROL_CONTACTO_INSTALACION, type RolContactoInstalacion, ROLES_CONTACTO_INSTALACION } from "@opai/domain";
import { Alerta, avisar, Badge, Button, Checkbox, Combobox, Enlace, SeccionTarjeta } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { useCapacidad } from "@/app/_components/use-capacidad";

type Vinculado = {
  contactoId: string;
  vinculoId: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  roles: RolContactoInstalacion[];
};

export type ContactosDeInstalacion = {
  instalacionId: string;
  vinculados: Vinculado[];
  candidatos: { contactoId: string; nombre: string; email: string | null; telefono: string | null }[];
};

function RolesEditor({
  roles,
  deshabilitado,
  onGuardar,
}: {
  roles: RolContactoInstalacion[];
  deshabilitado: boolean;
  onGuardar: (roles: RolContactoInstalacion[]) => void;
}) {
  const [local, setLocal] = useState(roles);
  const cambio = useMemo(
    () => local.length !== roles.length || local.some((r, i) => r !== roles[i]),
    [local, roles],
  );
  const toggle = (r: RolContactoInstalacion, on: boolean) => {
    setLocal((prev) => (on ? [...new Set([...prev, r])] : prev.filter((x) => x !== r)));
  };
  return (
    <div className="flex flex-col gap-2">
      {ROLES_CONTACTO_INSTALACION.map((r) => (
        <Checkbox
          key={r}
          etiqueta={ETIQUETA_ROL_CONTACTO_INSTALACION[r]}
          marcado={local.includes(r)}
          disabled={deshabilitado}
          onCambiar={(on) => toggle(r, on)}
        />
      ))}
      {cambio ? (
        <Button
          variant="secondary"
          size="md"
          disabled={deshabilitado || !local.length}
          onClick={() => onGuardar(local)}
        >
          Guardar roles
        </Button>
      ) : null}
    </div>
  );
}

export function ContactosInstalacionCliente({
  datos,
  puedeGestionar,
}: {
  datos: ContactosDeInstalacion;
  puedeGestionar: boolean;
}) {
  const { ejecutar, pendiente, error } = useCapacidad("erp");
  const [contactoNuevo, setContactoNuevo] = useState("");
  const [rolesNuevo, setRolesNuevo] = useState<RolContactoInstalacion[]>(["jefe_sitio"]);

  const opcionesContacto = datos.candidatos.map((c) => {
    const opt = { valor: c.contactoId, etiqueta: c.nombre } as const;
    const detalle = c.email ?? c.telefono;
    return detalle ? { ...opt, detalle } : opt;
  });

  async function vincular() {
    if (!contactoNuevo || !rolesNuevo.length) return;
    const r = await ejecutar("core.instalacion_contactos.vincular", {
      instalacionId: datos.instalacionId,
      contactoId: contactoNuevo,
      roles: rolesNuevo,
    });
    if (r) {
      setContactoNuevo("");
      setRolesNuevo(["jefe_sitio"]);
      avisar.exito("Contacto vinculado");
    }
  }

  async function quitar(vinculoId: string) {
    const r = await ejecutar("core.instalacion_contactos.quitar", { vinculoId });
    if (r) avisar.exito("Contacto quitado");
  }

  async function guardarRoles(vinculoId: string, roles: RolContactoInstalacion[]) {
    if (!roles.length) return;
    const r = await ejecutar("core.instalacion_contactos.set_roles", { vinculoId, roles });
    if (r) avisar.exito("Roles actualizados");
  }

  return (
    <SeccionTarjeta titulo="Contactos">
      <div className="flex flex-col gap-3">
        {error ? <Alerta tono="danger" titulo={error} /> : null}
        {datos.vinculados.length ? (
          <ul className="flex flex-col gap-2">
            {datos.vinculados.map((c) => (
              <li
                key={c.vinculoId}
                className="flex flex-col gap-2 rounded-md border border-border-subtle px-3 py-2 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <Enlace Link={LinkNext} href={`/contactos/${c.contactoId}`} className="font-medium">
                    {c.nombre}
                  </Enlace>
                  <p className="t-caption text-fg-muted">
                    {[c.email, c.telefono].filter(Boolean).join(" · ") || "Sin correo ni teléfono"}
                  </p>
                  {!puedeGestionar ? (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {c.roles.map((r) => (
                        <Badge key={r} punto={false}>
                          {ETIQUETA_ROL_CONTACTO_INSTALACION[r]}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
                {puedeGestionar ? (
                  <div className="flex shrink-0 flex-col gap-2 sm:w-52">
                    <RolesEditor
                      key={c.vinculoId}
                      roles={c.roles}
                      deshabilitado={pendiente}
                      onGuardar={(roles) => void guardarRoles(c.vinculoId, roles)}
                    />
                    <Button variant="ghost" size="md" disabled={pendiente} onClick={() => void quitar(c.vinculoId)}>
                      Quitar
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-base text-fg-muted">Sin contactos vinculados.</p>
        )}
        {puedeGestionar && datos.candidatos.length ? (
          <div className="flex flex-col gap-2 border-t border-border-subtle pt-3">
            <p className="t-label">Vincular contacto de la cuenta</p>
            <Combobox
              id="contacto-instalacion-nuevo"
              placeholder="Buscar contacto"
              opciones={opcionesContacto}
              valor={contactoNuevo || null}
              onCambiar={(v) => setContactoNuevo(v[0] ?? "")}
              disabled={pendiente}
            />
            <p className="t-label">Roles</p>
            {ROLES_CONTACTO_INSTALACION.map((r) => (
              <Checkbox
                key={`nuevo-${r}`}
                etiqueta={ETIQUETA_ROL_CONTACTO_INSTALACION[r]}
                marcado={rolesNuevo.includes(r)}
                disabled={pendiente}
                onCambiar={(on) =>
                  setRolesNuevo((prev) => (on ? [...new Set([...prev, r])] : prev.filter((x) => x !== r)))
                }
              />
            ))}
            <Button disabled={pendiente || !contactoNuevo || !rolesNuevo.length} onClick={() => void vincular()}>
              Vincular
            </Button>
          </div>
        ) : null}
      </div>
    </SeccionTarjeta>
  );
}