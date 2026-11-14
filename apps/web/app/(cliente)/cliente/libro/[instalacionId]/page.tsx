import { notFound } from "next/navigation";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";
import { exigirDatos } from "@/lib/carga";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { LibroNovedades, type Libro } from "../_componentes/libro-novedades";

export const metadata = { title: tituloPagina("cliente", "Libro de novedades") };

type Props = { params: Promise<{ instalacionId: string }>; searchParams: SearchParams };

/**
 * Libro de novedades de una instalación (CAR-502): el texto que escribe el guardia, solo si la empresa lo encendió
 * para la cuenta. El alcance y el permiso los aplica el servidor (ADR-022); una instalación ajena es «no encontrada».
 */
export default async function Pagina({ params, searchParams }: Props) {
  const { instalacionId } = await params;
  const { mes, desde } = await leerParametros(searchParams);
  return (
    <PaginaPortal
      portal="cliente"
      titulo="Libro de novedades"
      ruta={`/cliente/libro/${instalacionId}`}
      volver={{ href: mes ? `/cliente?mes=${mes}` : "/cliente", etiqueta: "Resumen" }}
      cargando="lista"
      cargar={async () => {
        const r = await ejecutarComoUsuario<Libro>("cliente", "portal_cliente.novedades.listar", {
          instalacionId,
          ...(mes ? { mes } : {}),
          ...(desde ? { cursor: desde } : {}),
        });
        if (!r.ok && r.error.code === "NOT_FOUND") notFound();
        return exigirDatos(r);
      }}
    >
      {(l) => <LibroNovedades l={l} />}
    </PaginaPortal>
  );
}
