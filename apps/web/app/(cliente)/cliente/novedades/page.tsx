import { PaginaNovedades } from "@/app/_components/novedades/pagina-novedades";

export const metadata = { title: "Novedades" };

export default function NovedadesCliente() {
  return <PaginaNovedades portal="cliente" />;
}
