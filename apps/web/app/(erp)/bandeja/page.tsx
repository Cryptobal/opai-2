import { PaginaPortal } from "@/app/_components/pagina-portal";
import { Bandeja } from "../_componentes/bandeja";

export const metadata = { title: "Bandeja" };
export default function PaginaBandeja() {
  return (
    <PaginaPortal portal="erp" titulo="Bandeja" ruta="/bandeja">
      <Bandeja />
    </PaginaPortal>
  );
}
