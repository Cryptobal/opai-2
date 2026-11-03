import { PaginaPortal } from "@/app/_components/pagina-portal";

import { PaginaBibliotecaPropuesta } from "./_componentes/pagina-biblioteca";

export default function BibliotecaPropuestaPage() {
  return (
    <PaginaPortal portal="erp" titulo="Biblioteca CPQ" ruta="/cpq/biblioteca" cargar={async () => ({ state: "ready" as const })}>
      {() => <PaginaBibliotecaPropuesta />}
    </PaginaPortal>
  );
}
