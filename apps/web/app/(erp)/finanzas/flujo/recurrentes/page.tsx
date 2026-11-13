import { PaginaPortal } from "@/app/_components/pagina-portal";

import { cargarRecurrentes } from "./_componentes/datos";
import { HojaRecurrente } from "./_componentes/diferidas";
import { ListaRecurrentes } from "./_componentes/lista-recurrentes";

export const metadata = { title: "Gastos recurrentes" };

/** Gastos recurrentes del flujo de caja (CAR-382): se proyectan solos y se dan por pagados con el banco. */
export default function GastosRecurrentes() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Gastos recurrentes"
      ruta="/finanzas/flujo/recurrentes"
      cargar={() => cargarRecurrentes()}
      opciones={() => ({ volver: { href: "/finanzas/flujo", etiqueta: "Flujo de caja" } })}
    >
      {(d) => (
        <>
          <ListaRecurrentes state={d.state} items={d.items} filas={d.filas} configura={d.configura} />
          {d.configura ? <HojaRecurrente key={d.items.length} items={d.items} filas={d.filas} /> : null}
        </>
      )}
    </PaginaPortal>
  );
}
