import { Alerta } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";

import { obligacionesArchivos } from "../../_componentes/datos";
import { opcionesPeriodo, periodoDeRuta } from "../../_componentes/pagina-periodo";
import { TarjetaArchivoLegal } from "../../_componentes/tarjeta-archivo-legal";
import { TarjetaF29Retencion } from "../../_componentes/tarjeta-f29-retencion";
import { TarjetaPagoBanco } from "../../_componentes/tarjeta-pago-banco";
import { TarjetaLibroRemuneraciones } from "../../_componentes/tarjeta-libro-remuneraciones";

export const metadata = { title: "Archivos y declaraciones" };

type Props = { params: Promise<{ id: string }> };

export default function ArchivosPeriodo({ params }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Archivos y declaraciones"
      ruta="/remuneraciones"
      cargar={async () => {
        const base = await periodoDeRuta(params);
        const { periodo, perm } = base;
        const obl = periodo && perm.obligaciones ? await obligacionesArchivos(periodo.anio, periodo.mes) : null;
        return { ...base, obl };
      }}
      opciones={opcionesPeriodo("Archivos")}
    >
      {(d) => {
        if (!d.perm.obligaciones) return <Alerta tono="warning" titulo="Tu rol no puede generar los archivos legales." />;
        if (!d.periodo) return <Alerta tono="danger" titulo="No encontramos el período." />;
        return (
          <div className="flex flex-col gap-4">
            <Alerta tono="info" titulo="OPAI prepara y valida los archivos">
              El LRE lo sube en Mi DT el representante laboral electrónico con su ClaveÚnica. La declaración y el pago en Previred los hace la persona responsable. Los archivos salen de las liquidaciones calculadas del período.
            </Alerta>
            {d.obl && !d.obl.ok ? <Alerta tono="danger" titulo="No pudimos leer el calendario de obligaciones del mes." /> : null}
            {d.obl?.ok && !d.obl.lre && !d.obl.previred && !d.obl.f30_1 ? (
              <Alerta tono="warning" titulo="El calendario de obligaciones de este año no está generado">
                Genéralo en Remuneraciones › Calendario para guardar aquí los comprobantes de carga y pago.
              </Alerta>
            ) : null}
            <TarjetaArchivoLegal periodoId={d.id} tipo="lre" obligacion={d.obl?.lre ?? null} tenantId={d.obl?.tenantId ?? ""} />
            <TarjetaArchivoLegal periodoId={d.id} tipo="previred" obligacion={d.obl?.previred ?? null} tenantId={d.obl?.tenantId ?? ""} />
            <TarjetaArchivoLegal periodoId={d.id} tipo="f30_1" obligacion={d.obl?.f30_1 ?? null} tenantId={d.obl?.tenantId ?? ""} />
            <TarjetaF29Retencion periodoId={d.id} obligacion={d.obl?.f29 ?? null} />
            <TarjetaPagoBanco periodoId={d.id} periodoEstado={d.periodo.estado} />
            <TarjetaLibroRemuneraciones periodoId={d.id} />
          </div>
        );
      }}
    </PaginaPortal>
  );
}
