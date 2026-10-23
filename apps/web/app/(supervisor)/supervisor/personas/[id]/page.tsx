import { MessageCircle, Phone, Upload } from "lucide-react";

import { Alerta, Avatar, Badge } from "@opai/ds";

import { HojaSubir } from "@/app/_components/documentos/diferidas";
import type { TipoDocumento } from "@/app/_components/documentos/tipos";
import { ESTADO_PERSONA, estadoDe } from "@/app/_components/maestros/estados";
import { PaginaPortal } from "@/app/_components/pagina-portal";
import { rut } from "@/lib/fechas";
import { ejecutarComoUsuario } from "@/lib/servidor";

import { AccionTile, marcable } from "../../_componentes/accion-tile";
import { personaTerreno, puedeGestionarDocumentos } from "../../_componentes/datos";
import { avisoUrgente, DocumentosTerreno } from "../../_componentes/documentos-terreno";

export const metadata = { title: "Persona" };

/** Persona en terreno (55): contacto directo, documentos urgentes con "Pedir" y subir documento. */
export default function PersonaTerreno({ params }: { params: Promise<{ id: string }> }) {
  return (
    <PaginaPortal
      portal="supervisor"
      titulo="Persona"
      ruta="/supervisor"
      cargando="detalle"
      volver={{ href: "/supervisor", etiqueta: "Hoy" }}
      cargar={async () => {
        const { id } = await params;
        const [d, puede, t] = await Promise.all([
          personaTerreno(id),
          puedeGestionarDocumentos(),
          ejecutarComoUsuario<TipoDocumento[]>("supervisor", "core.documento_tipos.list", {
            capa: "persona",
          }),
        ]);
        return { ...d, puede, tipos: t.ok ? t.data : [] };
      }}
      opciones={(d) => ({ titulo: d.p?.nombreCompleto ?? "Persona" })}
    >
      {({ p, docs, faltantes, puede, tipos }) => {
        if (!p) return <Alerta tono="danger" titulo="No encontramos a esta persona" />;
        const e = estadoDe(ESTADO_PERSONA, p.bloqueada ? "bloqueada" : p.estado);
        const tel = p.telefono ? marcable(p.telefono) : null;
        const aviso = avisoUrgente(docs);
        return (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <Avatar nombre={p.nombreCompleto} size="xl" />
              <div className="min-w-0">
                <h2 className="t-heading text-fg">{p.nombreCompleto}</h2>
                <p className="text-base text-fg-muted">
                  {p.vinculoVigente?.cargo ?? "Sin vínculo"} ·{" "}
                  <span className="t-mono">{rut(p.rut)}</span>
                </p>
                <Badge tono={e.tono} className="mt-1">
                  {e.etiqueta}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {tel ? <AccionTile href={`tel:${tel}`} icono={Phone} etiqueta="Llamar" /> : null}
              {tel ? (
                <AccionTile
                  href={`https://wa.me/${tel.replace("+", "")}`}
                  icono={MessageCircle}
                  etiqueta="WhatsApp"
                />
              ) : null}
              {puede ? (
                <AccionTile href="?subir=1" icono={Upload} etiqueta="Subir documento" />
              ) : null}
            </div>
            {aviso ? (
              <Alerta tono="danger" titulo={aviso}>
                Pídele la renovación hoy.
              </Alerta>
            ) : null}
            <DocumentosTerreno personaId={p.id} docs={docs} faltantes={faltantes} puede={puede} />
            {puede ? (
              <HojaSubir
                entidad={{ tipo: "persona", id: p.id }}
                tipos={tipos}
                portal="supervisor"
              />
            ) : null}
          </div>
        );
      }}
    </PaginaPortal>
  );
}
