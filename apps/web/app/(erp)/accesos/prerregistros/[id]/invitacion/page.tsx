import { notFound } from "next/navigation";

import { formatearFecha } from "@opai/domain";
import { Empty, Segmentado } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { leerParametros, type SearchParams } from "@/lib/parametros";
import { qrSvg } from "@/lib/qr";

import { cargarInvitacion, cargarPrerregistro, dia, uuid } from "../../_componentes/datos";
import { InvitacionQr } from "../../_componentes/invitacion-qr";

export const metadata = { title: "Invitación de acceso" };

type Props = { params: Promise<{ id: string }>; searchParams: SearchParams };

/** Invitación con QR de un visitante, con los días pendientes para cambiar de día (CAR-478, `InvitacionQR`). */
export default function Invitacion({ params, searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Invitación de acceso"
      ruta="/accesos"
      cargando="detalle"
      cargar={async () => {
        const [{ id: crudo }, p] = await Promise.all([params, leerParametros(searchParams)]);
        const id = uuid(crudo);
        const visitante = uuid(p["visitante"]);
        const d = dia(p["dia"]);
        if (!id || !visitante || !d) notFound();
        const [pr, inv] = await Promise.all([
          cargarPrerregistro(id),
          cargarInvitacion(visitante, d),
        ]);
        if (!pr.ok) notFound();
        return { id, visitante, d, pr: pr.data, inv };
      }}
      opciones={(x) => ({
        volver: { href: `/accesos/prerregistros/${x.id}`, etiqueta: "Prerregistro" },
      })}
    >
      {(x) => {
        const pendientes = x.pr.dias.filter((y) => y.estado === "pendiente");
        return (
          <div className="flex flex-col items-center gap-4">
            {pendientes.length > 1 ? (
              <div className="max-w-full overflow-x-auto print:hidden">
                <Segmentado
                  etiqueta="Día de la invitación"
                  variante="plano"
                  activa={x.d}
                  Link={LinkNext}
                  opciones={pendientes.map((y) => ({
                    id: y.dia,
                    etiqueta: formatearFecha(y.dia),
                    href: `/accesos/prerregistros/${x.id}/invitacion?visitante=${x.visitante}&dia=${y.dia}`,
                  }))}
                />
              </div>
            ) : null}
            {x.inv.ok ? (
              <InvitacionQr inv={x.inv.data} svg={qrSvg(x.inv.data.codigo)} />
            ) : (
              <Empty titulo="Esta invitación ya no sirve" descripcion={x.inv.error.message} />
            )}
          </div>
        );
      }}
    </PaginaPortal>
  );
}
