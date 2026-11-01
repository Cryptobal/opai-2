import type { SearchParams } from "@/lib/parametros";

import { ContactosCuenta } from "../../_componentes/contactos-cuenta";
import { PaginaCuenta } from "../../_componentes/pagina-cuenta";

export const metadata = { title: "Contactos de la cuenta" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

export default function ContactosCuentaPagina(props: Props) {
  return (
    <PaginaCuenta {...props} tab="contactos">
      {(c) => <ContactosCuenta cuentaId={c.id} />}
    </PaginaCuenta>
  );
}
