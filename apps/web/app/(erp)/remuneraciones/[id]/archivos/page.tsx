import { Alerta } from "@opai/ds";

import { PaginaPortal } from "@/app/_components/pagina-portal";

import { cargarPeriodos, permisosNomina } from "../../_componentes/datos";
import { SegmentoRemuneraciones } from "../../_componentes/segmento-remuneraciones";
import { TarjetaArchivoLegal } from "../../_componentes/tarjeta-archivo-legal";

export const metadata = { title: "Archivos y declaraciones" };

type Props = { params: Promise<{ id: string }> };

/** Archivos y declaraciones del período (diseño 06): LRE y Previred con su validación y descarga. */
export default function ArchivosPeriodo({ params }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Archivos y declaraciones"
      ruta="/remuneraciones"
      cargar={async () => {
        const [{ id }, per, perm] = await Promise.all([params, cargarPeriodos(), permisosNomina()]);
        const periodo = per.ok ? (per.data.find((p) => p.id === id) ?? null) : null;
        return { id, periodo, perm };
      }}
      opciones={(d) => ({
        insignia: <SegmentoRemuneraciones activa="periodos" />,
        volver: { href: `/remuneraciones/${d.id}`, etiqueta: d.periodo?.etiqueta ?? "Período" },
        ...(d.periodo ? { titulo: `Archivos · ${d.periodo.etiqueta}` } : {}),
      })}
    >
      {(d) => {
        if (!d.perm.obligaciones) return <Alerta tono="warning" titulo="Tu rol no puede generar los archivos legales." />;
        if (!d.periodo) return <Alerta tono="danger" titulo="No encontramos el período." />;
        return (
          <div className="flex flex-col gap-4">
            <Alerta tono="info" titulo="OPAI prepara y valida los archivos">
              El LRE lo sube en Mi DT el representante laboral electrónico con su ClaveÚnica. La declaración y el pago en Previred los hace la persona responsable. Los archivos salen de las liquidaciones calculadas del período.
            </Alerta>
            <TarjetaArchivoLegal periodoId={d.id} tipo="lre" />
            <TarjetaArchivoLegal periodoId={d.id} tipo="previred" />
          </div>
        );
      }}
    </PaginaPortal>
  );
}
