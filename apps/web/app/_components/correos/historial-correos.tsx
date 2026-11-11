import dynamic from "next/dynamic";

import { Alerta, SeccionTarjeta } from "@opai/ds";

import { ejecutarComoUsuario } from "@/lib/servidor";

import { AVISO_EXTERNO, CorreoItem } from "./correo-item";
import { DireccionRegistro } from "./direccion-registro";
import type { PaginaCorreos } from "./tipos";

// Lo interactivo se carga aparte del primer JS de la ficha (ADR-037), como el compositor de actividad.
const MasCorreos = dynamic(() => import("./mas-correos").then((m) => m.MasCorreos));

/**
 * Historial de correos de una ficha (CAR-233): lo que salió de OPAI y lo que entró a la dirección de
 * registro, del más reciente al más antiguo. Solo lectura: OPAI no redacta, responde ni reenvía.
 */
export async function HistorialCorreos(p: {
  entidadTipo: "cuenta" | "contacto" | "negocio";
  entidadId: string;
}) {
  const [r, d] = await Promise.all([
    ejecutarComoUsuario<PaginaCorreos>("erp", "core.correos.historial", {
      entidadTipo: p.entidadTipo,
      entidadId: p.entidadId,
    }),
    ejecutarComoUsuario<{ direccion: string | null }>("erp", "core.correos.direccion", {}),
  ]);
  // Sin permiso para la ficha o el historial: la sección no aparece (la ficha ya maneja sus propios estados).
  if (!r.ok && (r.error.code === "FORBIDDEN" || r.error.code === "NOT_FOUND")) return null;
  const direccion = d.ok ? d.data.direccion : null;
  const items = r.ok ? r.data.items : [];
  return (
    <SeccionTarjeta titulo="Correos">
      <div className="flex flex-col gap-4">
        {!r.ok ? (
          <Alerta
            tono="danger"
            titulo="No pudimos cargar los correos. Vuelve a abrir la ficha para reintentar."
          />
        ) : null}
        {r.ok && items.length === 0 ? (
          <p className="t-body">
            Todavía no hay correos con este cliente. Aparecen aquí las cotizaciones, facturas y
            seguimientos que salen de OPAI, sus respuestas y los correos que envíes con copia oculta
            a la dirección de registro.
          </p>
        ) : null}
        {items.length ? (
          <>
            <p className="t-caption">{AVISO_EXTERNO}</p>
            <ul className="flex flex-col gap-4">
              {items.map((c) => (
                <CorreoItem key={c.id} c={c} />
              ))}
            </ul>
            {r.ok && r.data.siguiente ? (
              <MasCorreos
                entidadTipo={p.entidadTipo}
                entidadId={p.entidadId}
                cursor={r.data.siguiente}
              />
            ) : null}
          </>
        ) : null}
        <DireccionRegistro direccion={direccion} />
      </div>
    </SeccionTarjeta>
  );
}
