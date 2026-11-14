import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";
import { exigirDatos } from "@/lib/carga";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { type Factura, ListaFacturas } from "./_componentes/lista-facturas";

export const metadata = { title: tituloPagina("cliente", "Facturas") };

/**
 * Facturas de la cuenta en el Portal Cliente (CAR-518): solo si la empresa las encendió para la cuenta. El alcance
 * (cuenta e instalaciones del acceso) lo aplica el servidor (ADR-022).
 */
export default function Pagina({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="cliente"
      titulo="Facturas"
      ruta="/cliente/facturas"
      volver={{ href: "/cliente", etiqueta: "Resumen" }}
      cargando="lista"
      cargar={async () => {
        const { desde } = await leerParametros(searchParams);
        const r = await ejecutarComoUsuario<{ items: Factura[]; siguiente: string | null }>(
          "cliente",
          "portal_cliente.facturas.listar",
          desde ? { cursor: desde } : {},
        );
        return exigirDatos(r);
      }}
    >
      {(r) => <ListaFacturas items={r.items} siguiente={r.siguiente} />}
    </PaginaPortal>
  );
}
