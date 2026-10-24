import { tituloPagina } from "@/app/_components/portales";
import { PortalPlaceholder } from "@/app/_components/portal-placeholder";

export const metadata = { title: tituloPagina("trabajador", "Inicio") };

export default function Pagina() {
  return <PortalPlaceholder portal="trabajador" titulo="Portal Trabajador" ruta="/trabajador" />;
}
