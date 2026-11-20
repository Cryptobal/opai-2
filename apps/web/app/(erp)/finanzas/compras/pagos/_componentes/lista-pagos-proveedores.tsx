import { ListaMaestro } from "@/app/_components/maestros/lista-maestro";
import { pesos } from "@/lib/fechas";

import { PestanasCompras } from "../../../_componentes/pestanas-compras";
import { type cargarPagosProveedores } from "./datos";

type Datos = Awaited<ReturnType<typeof cargarPagosProveedores>>;

export function ListaPagosProveedores({ state, listado, filtrado }: Datos) {
  const items = listado?.items ?? [];
  const total = listado?.totalPorPagar;
  return (
  <>
    <div className="md:px-4 md:pt-3">
      <PestanasCompras activa="pagos" />
    </div>
    <ListaMaestro
      state={state}
      titulo="Pagos a proveedores"
      buscar="Buscar proveedor o RUT"
      meta={{
        izquierda: total !== undefined ? `Total por pagar ${pesos(total)}` : `${items.length} proveedores`,
      }}
      vacio={{
        titulo: filtrado ? "Ningún proveedor coincide" : "No hay saldos por pagar",
        descripcion: filtrado
          ? "Quita la búsqueda para ver más."
          : "Cuando haya compras sin conciliar del todo, aparecerán aquí agrupadas por proveedor.",
      }}
      filas={items.map((p) => ({
        id: p.proveedorId,
        href: `/finanzas/compras/proveedores/${p.proveedorId}`,
        titulo: p.razonSocial,
        secundario: p.rut,
        terciario: `${p.documentosConSaldo} ${p.documentosConSaldo === 1 ? "documento" : "documentos"} con saldo`,
        fin: (
          <div className="flex flex-col items-end gap-0.5">
            <span className="t-numeric font-medium">{pesos(p.saldoPorPagar)}</span>
            {p.saldoVencido > 0 ? <span className="text-xs text-danger">Vencido {pesos(p.saldoVencido)}</span> : null}
          </div>
        ),
      }))}
    />
  </>
  );
}