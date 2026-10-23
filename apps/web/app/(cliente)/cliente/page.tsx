import { PortalPlaceholder } from "@/app/_components/portal-placeholder";

export const metadata = { title: "Portal Cliente" };

export default function Pagina() {
  return <PortalPlaceholder portal="cliente" titulo="Portal Cliente" ruta="/cliente" />;
}
