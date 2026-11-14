import { Alerta } from "@opai/ds";

import { ejecutarComoUsuario } from "@/lib/servidor";

import { Administradores, type Miembros } from "../administradores-tab";
import { PaginaTenant } from "../pagina-tenant";

export const metadata = { title: "Usuarios de la empresa" };

/** Plataforma → empresa · Usuarios: todos los miembros, invitaciones pendientes (reenviar, revocar) e invitar. */
export default function Pagina({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PaginaTenant params={params} tab="usuarios">
      {async (d) => {
        const r = await ejecutarComoUsuario<Miembros>("platform", "platform.tenants.miembros", {
          tenantId: d.tenant.id,
        });
        if (!r.ok)
          return <Alerta tono="danger" titulo="No pudimos cargar los miembros de la empresa." />;
        return <Administradores tenantId={d.tenant.id} miembros={r.data} />;
      }}
    </PaginaTenant>
  );
}
