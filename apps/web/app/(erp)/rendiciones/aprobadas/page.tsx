import { PaginaMisRendiciones } from "@/app/_components/rendiciones/pagina-lista";

export const metadata = { title: "Rendiciones aprobadas" };

export default function Page() {
  return <PaginaMisRendiciones portal="erp" pestana="aprobadas" />;
}
