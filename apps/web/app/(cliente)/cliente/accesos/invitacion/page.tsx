import { notFound } from "next/navigation";

import { Empty } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";
import { tituloPagina } from "@/app/_components/portales";
import { dia, type Invitacion, uuid } from "@/app/(erp)/accesos/prerregistros/_componentes/datos";
import { InvitacionQr } from "@/app/(erp)/accesos/prerregistros/_componentes/invitacion-qr";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { qrSvg } from "@/lib/qr";
import { ejecutarComoUsuario } from "@/lib/servidor";

export const metadata = { title: tituloPagina("cliente", "Invitación de acceso") };

/** Invitación con QR de un visitante que prerregistró el cliente (CAR-539, diseño `InvitacionQR`). */
export default function InvitacionCliente({ searchParams }: { searchParams: SearchParams }) {
  return (
    <PaginaPortal
      portal="cliente"
      titulo="Invitación de acceso"
      ruta="/cliente/accesos"
      cargando="detalle"
      cargar={async () => {
        const p = await leerParametros(searchParams);
        const visitanteId = uuid(p["visitante"]);
        const d = dia(p["dia"]);
        if (!visitanteId || !d) notFound();
        return ejecutarComoUsuario<Invitacion>(
          "cliente",
          "acceso.portal_prerregistros.invitacion",
          {
            visitanteId,
            dia: d,
          },
        );
      }}
      opciones={() => ({ volver: { href: "/cliente/accesos?vista=visitas", etiqueta: "Visitas" } })}
    >
      {(inv) =>
        inv.ok ? (
          <InvitacionQr inv={inv.data} svg={qrSvg(inv.data.codigo)} />
        ) : (
          <Empty titulo="Esta invitación ya no sirve" descripcion={inv.error.message} />
        )
      }
    </PaginaPortal>
  );
}
