import { trabajosDe } from "./datos";
import { PaginaTenant } from "./pagina-tenant";
import { ResumenTenant } from "./resumen-tenant";

export const metadata = { title: "Empresa" };

/** Plataforma → empresa · Resumen (49). */
export default function Pagina({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PaginaTenant params={params} tab="resumen">
      {async (d, panel) => {
        const t = await trabajosDe(d.tenant.id, true, 5);
        return <ResumenTenant d={d} panel={panel} problemas={t.items} />;
      }}
    </PaginaTenant>
  );
}
