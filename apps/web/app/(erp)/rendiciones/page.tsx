import { PaginaMisRendiciones } from "@/app/_components/rendiciones/pagina-lista";

export const metadata = { title: "Mis rendiciones" };

export default function Page() {
  return <PaginaMisRendiciones portal="erp" pestana="borradores" />;
}
