import { Check, RotateCcw, X } from "lucide-react";
import type { ReactNode } from "react";

import { Badge, DetailScreen, type EstadoPantalla } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { type AccionEntidad, AccionesEntidad } from "@/app/_components/maestros/acciones-entidad";
import { EnlaceBoton } from "@/app/_components/maestros/enlace-boton";
import { pesos } from "@/lib/fechas";

import type { NegocioDetalle } from "./datos";

const TONO = { abierto: "info", ganado: "success", perdido: "danger" } as const;
const ESTADO = { abierto: "Abierto", ganado: "Ganado", perdido: "Perdido" } as const;

export type TabNegocio = "resumen" | "cotizaciones" | "documentos" | "actividad";

// «Más acciones»: Editar, instalaciones, contactos y Archivar (export); Ganar/Perder o Reabrir van
// como botones en la cabecera. Cada acción abre su hoja por la URL o ejecuta su capacidad.
function acciones(n: NegocioDetalle): AccionEntidad[] {
  const hoja = (id: string, etiqueta: string): AccionEntidad => ({
    id,
    etiqueta,
    parametro: { clave: id, valor: "1" },
  });
  if (n.archivadoEn) {
    return [
      {
        id: "desarchivar",
        etiqueta: "Desarchivar",
        capacidad: {
          id: "comercial.negocios.archivar",
          input: { id: n.id, archivar: false },
          exito: "Negocio desarchivado",
        },
      },
    ];
  }
  return [
    hoja("editar", "Editar"),
    hoja("instalaciones", "Instalaciones"),
    hoja("contactos", "Contactos"),
    {
      id: "archivar",
      etiqueta: "Archivar",
      peligro: true,
      capacidad: {
        id: "comercial.negocios.archivar",
        input: { id: n.id, archivar: true },
        exito: "Negocio archivado",
      },
      confirmar: {
        titulo: `Archivar ${n.titulo}`,
        descripcion: "Deja de aparecer en las listas por defecto; se conserva el historial.",
        boton: "Archivar",
        peligro: true,
      },
    },
  ];
}

/** Botones de cierre de la cabecera: Ganar y Perder (abierto) o Reabrir (perdido). */
function Cierre({ n, base }: { n: NegocioDetalle; base: string }) {
  if (n.archivadoEn || n.estado === "ganado") return null;
  if (n.estado === "perdido")
    return (
      <EnlaceBoton href={`${base}?reabrir=1`} icono={RotateCcw}>
        Reabrir
      </EnlaceBoton>
    );
  return (
    <>
      <EnlaceBoton href={`${base}?perder=1`} variante="secondary" icono={X}>
        Perder
      </EnlaceBoton>
      <EnlaceBoton href={`${base}?ganar=1`} icono={Check}>
        Ganar
      </EnlaceBoton>
    </>
  );
}

/** Ficha de un negocio: estado sobre el título, cuenta y etapa; pestañas por ruta (ADR-041). */
export function FichaNegocio(p: {
  state: EstadoPantalla;
  negocio: NegocioDetalle | null;
  tab: TabNegocio;
  /** Con `comercial:negocios.manage`: Ganar/Perder/Reabrir y «Más acciones». */
  gestiona?: boolean;
  children: ReactNode;
}) {
  const n = p.negocio;
  const base = `/negocios/${n?.id ?? ""}`;
  const monto = n ? (n.valorMensual ?? n.montoEstimadoMensual) : null;
  return (
    <>
      <DetailScreen
        state={n ? p.state : p.state === "ready" ? "error" : p.state}
        titulo={n?.titulo ?? "Negocio"}
        {...(n
          ? {
              estado: (
                <>
                  <Badge tono={TONO[n.estado]}>{ESTADO[n.estado]}</Badge>
                  <span className="t-caption">{n.etapaNombre}</span>
                </>
              ),
              subtitulo: (
                <>
                  {n.cuentaNombre}
                  {monto != null ? ` · ${pesos(monto)}/mes` : ""}
                  {` · ${n.probabilidad}%`}
                  {/* Teléfono: Ganar/Perder o Reabrir a lo ancho bajo el título, como el export. */}
                  {p.gestiona && n.estado !== "ganado" && !n.archivadoEn ? (
                    <span className="mt-3 flex gap-2 md:hidden [&>*]:flex-1">
                      <Cierre n={n} base={base} />
                    </span>
                  ) : null}
                </>
              ),
              acciones: p.gestiona ? (
                <>
                  <span className="flex gap-2 max-md:hidden">
                    <Cierre n={n} base={base} />
                  </span>
                  <AccionesEntidad etiqueta="Más acciones" acciones={acciones(n)} />
                </>
              ) : undefined,
            }
          : {})}
        tabActiva={p.tab}
        Link={LinkNext}
        tabs={[
          { id: "resumen", etiqueta: "Resumen", href: base },
          { id: "cotizaciones", etiqueta: "Cotizaciones", href: `${base}/cotizaciones` },
          { id: "documentos", etiqueta: "Documentos", href: `${base}/documentos` },
          { id: "actividad", etiqueta: "Actividad", href: `${base}/actividad` },
        ]}
      >
        {p.children}
      </DetailScreen>
    </>
  );
}
