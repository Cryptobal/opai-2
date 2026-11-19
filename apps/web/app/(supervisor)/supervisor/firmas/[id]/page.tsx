import { PaginaFirmaDetalle } from "@/app/_components/firmas/pagina-firma-detalle";

type Props = { params: Promise<{ id: string }> };

/** Flujo de firma en el portal Supervisor (CAR-634). */
export default function Pagina(props: Props) {
  return PaginaFirmaDetalle({
    config: {
      portal: "supervisor",
      listaHref: "/supervisor/firmas",
      volverOpciones: { href: "/supervisor/firmas", etiqueta: "Firmas" },
    },
    params: props.params,
  });
}