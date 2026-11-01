import { Plus } from "lucide-react";

import { PERMISOS_CORE } from "@opai/domain";
import { Avatar, Badge, Empty, Estado, FilaSeleccionable } from "@opai/ds";

import { BotonReintentar } from "@/app/_components/boton-reintentar";
import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { telefono } from "@/lib/fechas";
import { estadoPantalla } from "@/lib/formato";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";

import { ROLES_VINCULO } from "../../contactos/_componentes/vinculos-tipos";
import { HojaContacto } from "./diferidas";

export type ContactoDeCuenta = {
  contactoId: string;
  nombres: string;
  apellidos: string;
  email: string | null;
  telefono: string | null;
  cargo: string | null;
  roles: string[];
  esPrincipal: boolean;
};

/** La cuenta se lee por vínculo; editar lleva a la ficha con todos sus vínculos. */
export async function ContactosCuenta({ cuentaId }: { cuentaId: string }) {
  const [r, identidad] = await Promise.all([
    ejecutarComoUsuario<ContactoDeCuenta[]>("erp", "core.cuentas.contactos", { cuentaId }),
    identidadActual(),
  ]);
  if (!r.ok)
    return (
      <Estado
        state={estadoPantalla(r)}
        variante="lista"
        textos={{ error: { accion: <BotonReintentar /> } }}
      >
        {null}
      </Estado>
    );
  const gestionar = identidad ? puedeDeIdentidad(identidad)(PERMISOS_CORE.cuentasManage) : false;
  const nuevo = gestionar ? (
    <EnlaceBotonHoja href="?contacto=nuevo" icono={Plus}>
      Nuevo contacto
    </EnlaceBotonHoja>
  ) : null;
  return (
    <>
      {r.data.length === 0 ? (
        <Empty
          titulo="Sin contactos"
          descripcion="Vincula una persona desde su ficha o crea un contacto para esta cuenta."
          accion={nuevo}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {nuevo ? <div className="self-end">{nuevo}</div> : null}
          <div className="overflow-hidden rounded-lg border border-border bg-surface [&>*:last-child]:border-b-0">
            {r.data.map((c) => (
              <FilaSeleccionable
                key={c.contactoId}
                href={`/contactos/${c.contactoId}`}
                Link={LinkNext}
                inicio={<Avatar nombre={`${c.nombres} ${c.apellidos}`} size="lg" />}
                titulo={`${c.nombres} ${c.apellidos}`}
                secundario={[c.cargo, c.email, c.telefono ? telefono(c.telefono) : null]
                  .filter(Boolean)
                  .join(" · ")}
                terciario={
                  <span className="flex flex-wrap gap-1">
                    {c.esPrincipal ? <Badge punto={false}>Principal</Badge> : null}
                    {c.roles.map((rol) => (
                      <Badge key={rol} punto={false}>
                        {ROLES_VINCULO[rol] ?? rol}
                      </Badge>
                    ))}
                  </span>
                }
              />
            ))}
          </div>
        </div>
      )}
      {gestionar ? <HojaContacto cuentaId={cuentaId} contactos={[]} /> : null}
    </>
  );
}
