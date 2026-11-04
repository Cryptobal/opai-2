import { Forbidden } from "@opai/ds";

import { HistorialPantalla } from "@/app/_components/agente/historial-pantalla";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { puedeDeIdentidad } from "@/lib/permisos-ui";
import { requerirIdentidad } from "@/lib/servidor";

export const metadata = { title: "Historial del agente" };

/**
 * Historial del agente interno (CAR-120, PR 5c, diseño 17): las conversaciones propias, archivadas y
 * las acciones del agente en nombre de la persona. Exige el módulo `agente` y `agente:usar`.
 */
export default function HistorialAgente() {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Historial"
      ruta="/agente/historial"
      cargar={async () => {
        const id = await requerirIdentidad("/agente/historial");
        return id.modulosActivos.includes("agente") && puedeDeIdentidad(id)("agente:usar");
      }}
    >
      {(disponible) =>
        disponible ? (
          <HistorialPantalla portal="erp" />
        ) : (
          <Forbidden descripcion="El agente interno no está disponible para ti en esta empresa." />
        )
      }
    </PaginaPortal>
  );
}
