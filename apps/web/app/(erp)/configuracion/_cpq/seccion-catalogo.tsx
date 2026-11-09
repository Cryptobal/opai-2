import { Estado } from "@opai/ds";

import { estadoPantalla } from "@/lib/formato";
import { ejecutarComoUsuario, identidadActual } from "@/lib/servidor";
import { puedeDeIdentidad } from "@/lib/permisos-ui";

import { CatalogoEditable } from "./catalogo-editable";
import type { CategoriaCatalogo, ItemCatalogo } from "./catalogo-tipos";
import { SeccionCostosPredefinidos } from "./seccion-costos-predefinidos";
import { SeccionEsquemasCobertura } from "./seccion-esquemas";
import { type FilaReferencia, SueldosReferenciaCpq } from "./sueldos-referencia-cpq";

/** Pestaña Catálogo de Configuración → Módulos → CPQ: ítems y categorías editables y sueldos de referencia. */
export async function SeccionCatalogoCpq() {
  const identidad = await identidadActual();
  const editable = identidad ? puedeDeIdentidad(identidad)("cpq:modelo.manage") : false;
  const [r, cats, ref] = await Promise.all([
    ejecutarComoUsuario<{ items: ItemCatalogo[] }>("erp", "cpq.catalogo_items.list", { incluirInactivos: true }),
    ejecutarComoUsuario<{ items: CategoriaCatalogo[] }>("erp", "cpq.catalogo_categorias.list", { incluirInactivas: true }),
    ejecutarComoUsuario<{ items: FilaReferencia[] }>("erp", "cpq.sueldos_referencia.list", {}),
  ]);
  const verReferencias = ref.ok && ref.data.items.some((i) => i.sueldoBaseClp !== undefined);
  const falla = !r.ok ? r : !cats.ok ? cats : null;
  return (
    <Estado state={falla ? estadoPantalla(falla) : "ready"} variante="formulario">
      {r.ok && cats.ok ? (
        <div className="space-y-6">
          <p className="t-body-sm text-fg-muted">
            Ítems y categorías del catálogo CPQ de la empresa. Editar o archivar no cambia las cotizaciones ya armadas ni las enviadas.
          </p>
          <CatalogoEditable items={r.data.items} categorias={cats.data.items} editable={editable} />
          <SeccionCostosPredefinidos />
          <SeccionEsquemasCobertura />
          {ref.ok && verReferencias ? <SueldosReferenciaCpq filas={ref.data.items} /> : null}
        </div>
      ) : null}
    </Estado>
  );
}
