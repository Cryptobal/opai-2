import { Suspense } from "react";

import { DetailScreen, type EstadoPantalla, ParesGrid, SeccionTarjeta, Skeleton } from "@opai/ds";

import { PanelActividad } from "@/app/_components/actividad/panel-actividad";
import { PrivacidadTitular } from "@/app/_components/cumplimiento/privacidad-titular";
import { EtiquetasFicha } from "@/app/_components/etiquetas/etiquetas-ficha";

import { EnlaceBotonHoja } from "@/app/_components/maestros/enlace-boton-hoja";
import { HojaContacto } from "../../cuentas/_componentes/diferidas";

import { telefono } from "@/lib/fechas";

import { ArchivarContacto } from "./archivar-contacto";
import { CuentasContacto } from "./cuentas-contacto";
import type { ContactoDetalle } from "./datos";

/**
 * Ficha de un contacto (persona): datos de contacto, cuenta y roles; debajo, su privacidad
 * (consentimientos y solicitudes, Ley 21.719) para quien tiene `cumplimiento.read`.
 */
export function FichaContacto(p: {
  state: EstadoPantalla;
  contacto: ContactoDetalle | null;
  gestionar?: boolean;
  /** `?tipo=` de la URL: filtro de la línea de tiempo de actividad. */
  tipo?: string | undefined;
  /** Búsqueda de la lista, que el filtro de actividad conserva. */
  q?: string | undefined;
}) {
  const c = p.contacto;
  return (
    <DetailScreen
      state={c ? p.state : p.state === "ready" ? "error" : p.state}
      titulo={c ? `${c.nombres} ${c.apellidos}`.trim() : "Contacto"}
    >
      {c ? (
        <div className="flex flex-col gap-4">
          <SeccionTarjeta
            titulo="Datos de contacto"
            accion={
              p.gestionar ? (
                <EnlaceBotonHoja variante="secondary" href={`?contacto=${c.id}`}>
                  Editar datos
                </EnlaceBotonHoja>
              ) : null
            }
          >
            <ParesGrid
              items={[
                { etiqueta: "Correo", valor: c.email },
                { etiqueta: "Teléfono", valor: c.telefono ? telefono(c.telefono) : null },
                ...(c.notas ? [{ etiqueta: "Notas", valor: c.notas, ancho: true }] : []),
              ]}
            />
          </SeccionTarjeta>
          {c.archivadoEn || p.gestionar ? (
            <ArchivarContacto
              id={c.id}
              nombre={`${c.nombres} ${c.apellidos}`.trim()}
              archivado={Boolean(c.archivadoEn)}
              gestiona={Boolean(p.gestionar)}
            />
          ) : null}
          <Suspense fallback={<Skeleton className="h-16 w-full" />}>
            <EtiquetasFicha tipo="contacto" id={c.id} />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <CuentasContacto contactoId={c.id} />
          </Suspense>
          <SeccionTarjeta titulo="Actividad">
            <Suspense fallback={<Skeleton className="h-32 w-full" />}>
              <PanelActividad
                ficha={{
                  tipo: "contacto",
                  id: c.id,
                  nombre: `${c.nombres} ${c.apellidos}`.trim(),
                  relacionadas: [],
                }}
                tipo={p.tipo}
                base={`/contactos/${c.id}`}
                {...(p.q ? { consulta: `q=${encodeURIComponent(p.q)}` } : {})}
                sistema={[]}
              />
            </Suspense>
          </SeccionTarjeta>
          <Suspense fallback={<Skeleton className="h-32 w-full" />}>
            <PrivacidadTitular
              titular={{ tipo: "contacto", id: c.id, nombre: `${c.nombres} ${c.apellidos}`.trim() }}
            />
          </Suspense>
          {p.gestionar ? <HojaContacto cuentaId={c.cuentaId} contactos={[c]} soloDatos /> : null}
        </div>
      ) : null}
    </DetailScreen>
  );
}
