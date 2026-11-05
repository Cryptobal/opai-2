import { PaginaMisRendiciones } from "@/app/_components/rendiciones/pagina-lista";

export const metadata = { title: "Rendiciones pagadas" };

export default function Page() {
  return <PaginaMisRendiciones portal="supervisor" pestana="pagadas" />;
}
