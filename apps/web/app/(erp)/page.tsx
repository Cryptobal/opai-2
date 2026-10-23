import { PaginaPortal } from "@/app/_components/pagina-portal";

import { InicioErp } from "./_componentes/inicio";

export default function Inicio() {
  return (
    <PaginaPortal portal="erp" titulo="Inicio" ruta="/">
      <InicioErp />
    </PaginaPortal>
  );
}
