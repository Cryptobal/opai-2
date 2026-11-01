import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { AjusteNoEncontrado } from "../_centro/no-encontrado";

export const metadata = { title: "Este ajuste no existe" };
export default function NoEncontrado({ searchParams }: { searchParams: SearchParams }) {
  return <PaginaPortal portal="erp" titulo="Configuración" ruta="/configuracion" cargar={() => leerParametros(searchParams)}>
    {(p) => <AjusteNoEncontrado ruta={p["ruta"] ?? "/configuracion"} />}
  </PaginaPortal>;
}
