import { Badge, ListScreen } from "@opai/ds";

import { ChipsFiltro } from "@/app/_components/maestros/chips-filtro";
import { LinkNext } from "@/app/_components/link-next";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { fecha } from "@/lib/fechas";
import { estadoPantalla } from "@/lib/formato";
import type { SearchParams } from "@/lib/parametros";

import { cargarFirmas, ETIQUETA_CLASE, ETIQUETA_ESTADO, filtrosDe, TONO_ESTADO, type Solicitud } from "./_componentes/datos";

export const metadata = { title: "Firmas" };
type Props = { searchParams: SearchParams };

const OPCIONES_ESTADO = [
  { valor: "enviada", etiqueta: "Enviadas" },
  { valor: "en_curso", etiqueta: "En curso" },
  { valor: "completada", etiqueta: "Completadas" },
  { valor: "rechazada", etiqueta: "Rechazadas" },
  { valor: "vencida", etiqueta: "Vencidas" },
  { valor: "cancelada", etiqueta: "Canceladas" },
];

/**
 * Bandeja de firmas (firma.md §5, CAR-82 · PR 2): solicitudes del tenant con su estado, clase y
 * plazo. Mobile e iPad: lista que navega a la ficha; la vista dividida de escritorio (`SplitScreen`)
 * queda pendiente del diseño (a confirmar).
 */
export default function Firmas({ searchParams }: Props) {
  return (
    <PaginaPortal
      portal="erp"
      titulo="Firmas"
      ruta="/documentos/firmas"
      completo
      cargar={async () => {
        const p = await filtrosDe(searchParams);
        return { p, r: await cargarFirmas(p) };
      }}
    >
      {({ r }) => {
        const items = r.ok ? r.data.solicitudes : [];
        return (
          <ListScreen<Solicitud>
            state={estadoPantalla(r)}
            titulo="Firmas"
            filtros={
              <ChipsFiltro filtros={[{ param: "estado", etiqueta: "Estado", opciones: OPCIONES_ESTADO }]} />
            }
            items={items}
            clave={(s) => s.id}
            href={(s) => `/documentos/firmas/${s.id}`}
            Link={LinkNext}
            tarjeta={(s) => (
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-base font-medium text-fg">
                    {ETIQUETA_CLASE[s.clase] ?? s.clase}
                  </span>
                  <Badge tono={TONO_ESTADO[s.estado] ?? "neutro"}>
                    {ETIQUETA_ESTADO[s.estado] ?? s.estado}
                  </Badge>
                </span>
                <span className="t-caption">
                  Nivel {s.nivel} · {s.firmantes.filter((f) => f.rol === "firma").length} firmante(s) ·
                  vence {fecha(s.plazoVence)}
                </span>
              </span>
            )}
            columnas={[
              {
                id: "clase",
                etiqueta: "Documento",
                render: (s) => ETIQUETA_CLASE[s.clase] ?? s.clase,
              },
              { id: "nivel", etiqueta: "Nivel", render: (s) => s.nivel },
              {
                id: "estado",
                etiqueta: "Estado",
                render: (s) => (
                  <Badge tono={TONO_ESTADO[s.estado] ?? "neutro"}>
                    {ETIQUETA_ESTADO[s.estado] ?? s.estado}
                  </Badge>
                ),
              },
              {
                id: "firmantes",
                etiqueta: "Firmantes",
                render: (s) =>
                  `${s.firmantes.filter((f) => f.estado === "firmado").length}/${s.firmantes.filter((f) => f.rol === "firma").length}`,
              },
              { id: "vence", etiqueta: "Vence", render: (s) => fecha(s.plazoVence), className: "t-numeric" },
            ]}
            textos={{
              vacio: {
                titulo: "Sin solicitudes de firma",
                descripcion: "Envía un documento a firmar desde su ficha en Documentos.",
              },
            }}
          />
        );
      }}
    </PaginaPortal>
  );
}
