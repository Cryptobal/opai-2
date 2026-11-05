import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";

import { FormularioCambiarPin } from "../_componentes/formulario-cambiar-pin";

export const metadata = { title: tituloPagina("trabajador", "Cambiar PIN") };

/** Cambiar el PIN de terreno (D-02). Tras un PIN asignado por RR. HH. se pide en el primer ingreso. */
export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<{ primero?: string }>;
}) {
  const { primero } = await searchParams;
  return (
    <PaginaPortal
      portal="trabajador"
      titulo="Cambiar PIN"
      ruta="/trabajador/cambiar-pin"
      volver={{ href: "/trabajador/mas", etiqueta: "Más" }}
      volverSoloTelefono
    >
      <FormularioCambiarPin primerIngreso={primero === "1"} />
    </PaginaPortal>
  );
}
