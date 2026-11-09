import { PaginaNovedades } from "@/app/_components/novedades/pagina-novedades";

export const metadata = { title: "Novedades" };

export default function NovedadesSupervisor() {
  return <PaginaNovedades portal="supervisor" />;
}
