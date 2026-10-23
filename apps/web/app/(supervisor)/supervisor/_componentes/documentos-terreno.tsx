import { CeldaVigencia, SeccionTarjeta, textoVigencia } from "@opai/ds";

import { diasHasta, type Documento } from "@/app/_components/documentos/tipos";
import { fecha } from "@/lib/fechas";

import { BotonPedir } from "./boton-pedir";

type Props = {
  personaId: string;
  docs: Documento[];
  faltantes: { tipoId: string; nombre: string }[];
  puede: boolean;
};

/** Documentos de la persona en terreno (55): primero lo vencido, por vencer y faltante, con "Pedir". */
export function DocumentosTerreno({ personaId, docs, faltantes, puede }: Props) {
  const urgentes = docs
    .filter((d) => d.vigencia === "vencido" || d.vigencia === "por_vencer")
    .sort((a, b) => (a.venceEn ?? "").localeCompare(b.venceEn ?? ""));
  const vigentes = docs.filter((d) => d.vigencia === "vigente" || d.vigencia === "sin_fecha");
  const fila = "flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0";
  return (
    <SeccionTarjeta titulo="Documentos" sinRelleno>
      <ul>
        {urgentes.map((d) => (
          <li key={d.id} className={fila}>
            <CeldaVigencia estado={d.vigencia} dias={diasHasta(d.venceEn)} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-base font-medium text-fg">{d.tipo ?? d.nombre}</span>
              <span className="t-caption">
                {d.vigencia === "vencido"
                  ? `Venció el ${fecha(d.venceEn)}`
                  : `Vence el ${fecha(d.venceEn)}`}
              </span>
            </span>
            {puede && d.tipoId ? <BotonPedir personaId={personaId} tipoId={d.tipoId} /> : null}
          </li>
        ))}
        {faltantes.map((f) => (
          <li key={f.tipoId} className={fila}>
            <CeldaVigencia estado="falta" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-base font-medium text-fg">{f.nombre}</span>
              <span className="t-caption">Obligatorio · nunca se subió</span>
            </span>
            {puede ? <BotonPedir personaId={personaId} tipoId={f.tipoId} /> : null}
          </li>
        ))}
        {vigentes.length ? (
          <li className={fila}>
            <CeldaVigencia estado="vigente" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-base font-medium text-fg">
                {vigentes.map((d) => d.tipo ?? d.nombre).join(", ")}
              </span>
              <span className="t-caption">{vigentes.length === 1 ? "Vigente" : "Vigentes"}</span>
            </span>
          </li>
        ) : null}
        {!urgentes.length && !faltantes.length && !vigentes.length ? (
          <li className="px-4 py-4 text-base text-fg-muted">Sin documentos.</li>
        ) : null}
      </ul>
    </SeccionTarjeta>
  );
}

/** Aviso del documento más urgente ("Antecedentes vencidos hace 52 días"). */
export function avisoUrgente(docs: Documento[]) {
  const d = docs.find((x) => x.vigencia === "vencido");
  return d
    ? `${d.tipo ?? d.nombre}: ${textoVigencia("vencido", diasHasta(d.venceEn)).toLowerCase()}`
    : null;
}
