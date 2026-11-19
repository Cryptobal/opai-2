import { PaginaFirmaDetalle } from "@/app/_components/firmas/pagina-firma-detalle";

type Props = { params: Promise<{ id: string }> };

/** Flujo de firma en el portal del trabajador (CAR-634). */
export default function Pagina(props: Props) {
  return PaginaFirmaDetalle({
    config: {
      portal: "trabajador",
      listaHref: "/trabajador/por-firmar",
      volverPortal: { href: "/trabajador/por-firmar", etiqueta: "Por firmar" },
      volverSoloTelefono: true,
    },
    params: props.params,
  });
}