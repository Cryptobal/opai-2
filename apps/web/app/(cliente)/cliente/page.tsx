import { tituloPagina } from "@/app/_components/portales";
import { PortalPlaceholder } from "@/app/_components/portal-placeholder";

export const metadata = { title: tituloPagina("cliente", "Inicio") };

export default function Pagina() {
  return <PortalPlaceholder portal="cliente" titulo="Portal Cliente" ruta="/cliente" />;
}
