import { parrafosDePlantilla, VARIABLES_PLANTILLA, type SegmentoPlantilla } from "@opai/domain";
import { ChipVariable, cn } from "@opai/ds";

const ETIQUETA = new Map(VARIABLES_PLANTILLA.map((v) => [v.clave, v.etiqueta]));

function Segmento({ s }: { s: SegmentoPlantilla }) {
  const estilo = cn(s.negrita && "font-semibold", s.cursiva && "italic");
  if (s.tipo === "variable") {
    const descripcion = ETIQUETA.get(s.clave);
    return (
      <ChipVariable
        clave={s.clave}
        conocida={s.conocida}
        className={estilo}
        {...(descripcion ? { descripcion } : {})}
      />
    );
  }
  return estilo ? <span className={estilo}>{s.texto}</span> : <>{s.texto}</>;
}

/**
 * Vista previa del texto en «papel» (diseño 06): párrafos con las variables resaltadas (acento si
 * existen, peligro si no) y el énfasis aplicado. Sin datos de nadie: muestra la plantilla, no un
 * documento generado.
 */
export function HojaPlantilla({ titulo, texto }: { titulo: string; texto: string }) {
  const parrafos = parrafosDePlantilla(texto);
  return (
    <article className="mx-auto flex w-full max-w-[600px] flex-col gap-3 rounded-sm border border-paper-rule bg-paper px-4 py-4 text-paper-fg md:px-9 md:py-8">
      <h2 className="t-label text-center">{titulo}</h2>
      {parrafos.map((p, i) => (
        <p key={i} className="t-body-sm whitespace-pre-line text-pretty leading-6">
          {p.map((s, j) => (
            <Segmento key={j} s={s} />
          ))}
        </p>
      ))}
    </article>
  );
}
