import { NOMBRES_BLOQUE_PROPUESTA, tieneTextoTipo } from "@opai/domain";

import { ejecutarComoUsuario } from "@/lib/servidor";

import { TextosTipoPropuesta } from "./textos-tipo-propuesta";

const TIPOS = Object.keys(NOMBRES_BLOQUE_PROPUESTA).filter(tieneTextoTipo);

/** Texto tipo de la empresa por sección (CAR-576): se define una vez y las propuestas nuevas lo traen precargado. */
export async function SeccionTextosTipo() {
  const r = await ejecutarComoUsuario<{ bloques: { clave: string; tipo: string; texto: string }[] }>(
    "erp",
    "cpq.biblioteca_bloques.list",
    {},
  );
  if (!r.ok) return null;
  const textos = Object.fromEntries(r.data.bloques.filter((b) => b.clave === b.tipo).map((b) => [b.tipo, b.texto]));
  return (
    <div className="space-y-3 border-t border-border pt-6">
      <p className="t-label">Textos tipo de la propuesta</p>
      <p className="t-caption text-fg-muted">
        Escribe una vez el texto de cada sección. Las propuestas nuevas lo traen listo y cada ejecutivo puede ajustarlo en
        su cotización. Las condiciones comerciales salen de la marca en documentos.
      </p>
      <TextosTipoPropuesta tipos={TIPOS.map((t) => ({ tipo: t, nombre: NOMBRES_BLOQUE_PROPUESTA[t] ?? t, texto: textos[t] ?? "" }))} />
    </div>
  );
}
