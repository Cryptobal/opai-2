import { PaginaPortal } from "@/app/_components/pagina-portal";
import { AjusteNoEncontrado } from "../../_centro/no-encontrado";

export const metadata = { title: "Este ajuste no existe" };
export default function NoEncontrado() {
  return (
    <PaginaPortal portal="erp" titulo="Configuración" ruta="/configuracion">
      <AjusteNoEncontrado ruta="/configuracion/grupo" />
    </PaginaPortal>
  );
}
