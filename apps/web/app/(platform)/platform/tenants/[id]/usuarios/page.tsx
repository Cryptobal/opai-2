import { PaginaTenant } from "../pagina-tenant";
import { Administradores } from "../tenant-tabs";

export const metadata = { title: "Usuarios de la empresa" };

/** Plataforma → empresa · Usuarios: owners y administradores, invitaciones e invitar. */
export default function Pagina({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PaginaTenant params={params} tab="usuarios">
      {(d) => <Administradores detalle={d} />}
    </PaginaTenant>
  );
}
