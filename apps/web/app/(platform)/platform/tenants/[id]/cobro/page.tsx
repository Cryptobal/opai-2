import { exigirDatos } from "@/lib/carga";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { type Cargo, nombreMes, type Resumen } from "../../../facturacion/_componentes/cobro";
import { PaginaTenant } from "../pagina-tenant";
import { CargosEmpresa } from "./cargos-empresa";
import { ModulosCobro } from "./modulos-cobro";

export const metadata = { title: "Cobro de la empresa" };

/**
 * Plataforma → empresa · Cobro (CAR-188, ADR-071): plan base y condición comercial de cada módulo
 * (precio fijo o por unidad con mínimo, inicio del cobro, prueba y descuento), si se factura este mes y por
 * qué, y los cargos listos para facturar de meses anteriores.
 */
export default function Pagina({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PaginaTenant params={params} tab="cobro">
      {async (d) => {
        const periodo = new Date().toISOString().slice(0, 7);
        const [resumen, cargos] = await Promise.all([
          ejecutarComoUsuario<Resumen>("platform", "platform.cobros.resumen", {
            periodo,
            tenantId: d.tenant.id,
          }),
          ejecutarComoUsuario<Cargo[]>("platform", "platform.cobros.cargos_list", {
            tenantId: d.tenant.id,
          }),
        ]);
        const empresa = exigirDatos(resumen).empresas[0];
        const modulos = empresa?.modulos ?? [];
        return (
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="t-subheading text-fg">Plan base y módulos</h3>
                <span className="t-caption">
                  {nombreMes(periodo)}: {empresa?.facturables ?? 0} se facturan
                </span>
              </div>
              <ModulosCobro tenantId={d.tenant.id} modulos={modulos} />
            </section>
            <section className="flex flex-col gap-2">
              <h3 className="t-subheading text-fg">Cargos listos para facturar</h3>
              <CargosEmpresa
                tenantId={d.tenant.id}
                cargos={exigirDatos(cargos)}
                nombres={Object.fromEntries(modulos.map((m) => [m.moduloId, m.nombre]))}
              />
            </section>
          </div>
        );
      }}
    </PaginaTenant>
  );
}
