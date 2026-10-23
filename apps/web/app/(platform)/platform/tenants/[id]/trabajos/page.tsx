import { ListaTrabajos } from "../../../_componentes/lista-trabajos";
import { trabajosDe } from "../datos";
import { PaginaTenant } from "../pagina-tenant";

export const metadata = { title: "Trabajos de la empresa" };

/** Plataforma → empresa · Trabajos: su cola, con detalle y reintento. */
export default function Pagina({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PaginaTenant params={params} tab="trabajos">
      {async (d) => {
        const t = await trabajosDe(d.tenant.id, false, 100);
        return <ListaTrabajos state={t.state} items={t.items} conEmpresa={false} />;
      }}
    </PaginaTenant>
  );
}
