import { Plus } from "lucide-react";

import { Avatar, Badge, Empty, FilaSeleccionable } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { telefono } from "@/lib/fechas";
import type { SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";
import type { Contacto } from "@/lib/tipos-maestros";

import { HojaContacto, ROL_CONTACTO } from "../../_componentes/hoja-contacto";
import { PaginaCuenta } from "../../_componentes/pagina-cuenta";

export const metadata = { title: "Contactos de la cuenta" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

async function Contactos({ cuentaId }: { cuentaId: string }) {
  const r = await ejecutarComoUsuario<Contacto[]>("erp", "core.contactos.list", { cuentaId });
  const contactos = r.ok ? r.data : [];
  const nuevo = (
    <EnlaceBoton href="?contacto=nuevo" icono={Plus}>
      Nuevo contacto
    </EnlaceBoton>
  );
  return (
    <>
      {contactos.length === 0 ? (
        <Empty
          titulo="Sin contactos"
          descripcion="Agrega a quién llamar por operación, facturación o cobranza."
          accion={nuevo}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="self-end">{nuevo}</div>
          <div className="overflow-hidden rounded-lg border border-border bg-surface [&>*:last-child]:border-b-0">
            {contactos.map((k) => (
              <FilaSeleccionable
                key={k.id}
                href={`?contacto=${k.id}`}
                Link={LinkNext}
                sinChevron
                inicio={<Avatar nombre={`${k.nombres} ${k.apellidos}`} size="lg" />}
                titulo={`${k.nombres} ${k.apellidos}`}
                secundario={[k.cargo, k.email, k.telefono ? telefono(k.telefono) : null]
                  .filter(Boolean)
                  .join(" · ")}
                fin={
                  <span className="hidden flex-wrap justify-end gap-1 sm:flex">
                    {k.esPrincipal ? <Badge punto={false}>Principal</Badge> : null}
                    {k.roles.map((r) => (
                      <Badge key={r} punto={false}>
                        {ROL_CONTACTO[r] ?? r}
                      </Badge>
                    ))}
                  </span>
                }
              />
            ))}
          </div>
        </div>
      )}
      <HojaContacto cuentaId={cuentaId} contactos={contactos} />
    </>
  );
}

/** Tab Contactos (03): filas con cargo, correo y roles; nuevo y editar en Sheet. */
export default function ContactosCuenta(props: Props) {
  return (
    <PaginaCuenta {...props} tab="contactos">
      {(c) => <Contactos cuentaId={c.id} />}
    </PaginaCuenta>
  );
}
