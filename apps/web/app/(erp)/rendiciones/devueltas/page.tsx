import { PaginaMisRendiciones } from "@/app/_components/rendiciones/pagina-lista";

export const metadata = { title: "Rendiciones devueltas" };

export default function Page() {
  return <PaginaMisRendiciones portal="erp" pestana="devueltas" />;
}
