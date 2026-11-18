/**
 * Plantilla base del anexo (CAR-58). `esEjemplo` en `false` indica texto legal aprobado; si vuelve a
 * `true`, `core.anexos.aprobar` exige una plantilla de Anexo publicada en Documentos.
 */
export const PLANTILLA_ANEXO: { readonly version: string; readonly esEjemplo: boolean } = {
  version: "legal-car58-2026-11",
  esEjemplo: false,
};

export const MENSAJE_PLANTILLA_EJEMPLO =
  "Este anexo no se puede aprobar todavía: la plantilla del anexo de contrato tiene texto de ejemplo, sin validez laboral. Se podrá aprobar cuando esté cargado el texto legal definitivo. Mientras tanto puedes rechazarlo o dejarlo en borrador.";

/** Texto legal aprobado (CAR-58); no editar sin nueva aprobación. */
export const TEXTO_LEGAL_ANEXO_APROBADO = `ANEXO DE CONTRATO DE TRABAJO

En {{ciudad_firma}}, a {{fecha_anexo}}, entre {{empresa_razon_social}}, RUT {{empresa_rut}}, representada por {{representante_nombre}}, cédula de identidad N° {{representante_rut}}, ambos con domicilio en {{empresa_domicilio}}, en adelante «el Empleador», y don(ña) {{trabajador_nombre}}, cédula de identidad N° {{trabajador_rut}}, de nacionalidad {{trabajador_nacionalidad}}, domiciliado(a) en {{trabajador_domicilio}}, en adelante «el Trabajador», se acuerda el siguiente anexo al contrato de trabajo:

PRIMERO: Antecedentes.
Las partes celebraron un contrato de trabajo con fecha {{fecha_contrato_original}}, en virtud del cual el Trabajador presta servicios como {{cargo_actual}}.

SEGUNDO: Modificación.
De común acuerdo, y conforme a los artículos 5° y 11 del Código del Trabajo, las partes modifican la cláusula {{clausula_numero}}, referida a {{clausula_materia}}, del contrato de trabajo, la que queda redactada de la siguiente forma:

«{{clausula_texto_nuevo}}»

TERCERO: Vigencia.
La modificación acordada en este anexo rige a contar del {{fecha_vigencia}}{{#fecha_termino}} y hasta el {{fecha_termino}}, fecha en la que vuelve a regir lo pactado originalmente{{/fecha_termino}}.

CUARTO: Cláusulas no modificadas.
Todas las demás cláusulas del contrato de trabajo y de sus anexos anteriores que no se modifiquen expresamente en este instrumento se mantienen plenamente vigentes.

QUINTO: Ejemplares y firma.
Este anexo se firma en dos ejemplares de igual tenor y fecha, y queda uno en poder de cada parte. Si se firma electrónicamente, la firma electrónica tiene el mismo valor que la firma manuscrita, de acuerdo con la Ley N° 19.799. El Trabajador declara recibir en este acto su ejemplar.

Firmas: {{representante_nombre}}, p.p. {{empresa_razon_social}}, RUT {{empresa_rut}}, Empleador / {{trabajador_nombre}}, RUT {{trabajador_rut}}, Trabajador

Valores sugeridos para {{clausula_materia}}: remuneración, cargo o funciones, jornada de trabajo, distribución de turnos y lugar de prestación de los servicios (instalación).`;

export const CLAUSULA_MATERIA_ANEXO: Record<string, string> = {
  capa: "remuneración",
  monto: "remuneración",
  instalacion: "lugar de prestación de los servicios (instalación)",
  rol: "distribución de turnos y jornada de trabajo",
};

const BLOQUE_FECHA_TERMINO = /\{\{#fecha_termino\}\}([\s\S]*?)\{\{\/fecha_termino\}\}/;

/** Si no hay fecha de término, oculta el bloque condicional sin quitarlo del texto fuente. */
export function aplicarCondicionalFechaTermino(
  texto: string,
  fechaTermino: string | null | undefined,
): string {
  const valor = fechaTermino?.trim();
  return texto.replace(BLOQUE_FECHA_TERMINO, (_, interior: string) =>
    valor ? interior.replaceAll("{{fecha_termino}}", valor) : "",
  );
}

export function rellenarTextoLegalAnexo(
  texto: string,
  valores: Readonly<Record<string, string | null | undefined>>,
): { texto: string; faltantes: string[] } {
  const sinBloque = aplicarCondicionalFechaTermino(texto, valores.fecha_termino);
  const faltantes = new Set<string>();
  const relleno = sinBloque.replace(/\{\{([a-z_]+)\}\}/g, (_, clave: string) => {
    const valor = valores[clave]?.trim();
    if (valor) return valor;
    if (clave === "fecha_termino") return "";
    faltantes.add(clave);
    return `{{${clave}}}`;
  });
  return { texto: relleno, faltantes: [...faltantes] };
}

export type FilaAnexoDoc = { concepto: string; antes: string; despues: string };

/** Respaldo HTML solo mientras `esEjemplo` siga activo en pruebas; no tiene validez laboral. */
export function renderizarAnexoHtml(
  marca: { nombre: string },
  datos: {
    persona: { nombres: string; apellidos: string; rut: string };
    motivoCambio: string;
    fecha: string;
    filas: readonly FilaAnexoDoc[];
  },
): string {
  const nombre = `${datos.persona.nombres} ${datos.persona.apellidos}`;
  const filas = datos.filas
    .map((f) => `<tr><td>${f.concepto}</td><td>${f.antes}</td><td>${f.despues}</td></tr>`)
    .join("");
  return `<article><h1>Anexo de contrato</h1><p>${marca.nombre} / ${nombre}</p><table>${filas}</table><p>Vigencia: ${datos.fecha}</p></article>`;
}