import { FONDO_TABLA, LINEA, TENUE } from "./colores";
import { ANCHO_UTIL, type Hoja, MARGEN } from "./hoja";

export type Columna = { titulo: string; peso: number; alinear?: "izq" | "der"; mono?: boolean };
export type FilaTabla = { celdas: readonly string[]; negrita?: boolean };

const TAM = 8.8;
const RELLENO = 4.5;

/** Tabla con encabezado que se repite en cada página y cifras alineadas a la derecha en monoespaciada. */
export function tabla(h: Hoja, columnas: readonly Columna[], filas: readonly FilaTabla[]): void {
  const total = columnas.reduce((a, c) => a + c.peso, 0);
  const anchos = columnas.map((c) => (c.peso / total) * ANCHO_UTIL);
  const xs = anchos.map((_, i) => MARGEN.x + anchos.slice(0, i).reduce((a, b) => a + b, 0));
  const paso = TAM * 1.4;

  const encabezado = () => {
    h.asegurar(paso + RELLENO * 2 + paso);
    h.rect(MARGEN.x, h.y - paso - RELLENO, ANCHO_UTIL, paso + RELLENO, FONDO_TABLA);
    const base = h.y - paso - RELLENO / 2 + 1;
    columnas.forEach((c, i) =>
      h.linea(c.titulo, base, {
        tam: 7.8,
        fuente: "semi",
        color: TENUE,
        x: xs[i]! + 4,
        ancho: anchos[i]! - 8,
        alinear: c.alinear ?? "izq",
      }),
    );
    h.y -= paso + RELLENO;
  };
  encabezado();

  for (const fila of filas) {
    const fuente = fila.negrita ? "semi" : "normal";
    const partes = fila.celdas.map((t, i) =>
      h.cortar(t, TAM, columnas[i]?.mono ? "mono" : fuente, anchos[i]! - 8),
    );
    const lineas = Math.max(1, ...partes.map((p) => p.length));
    const alto = lineas * paso + RELLENO * 1.4;
    if (h.y - alto < MARGEN.abajo) {
      h.nueva();
      encabezado();
    }
    partes.forEach((p, i) =>
      p.forEach((l, k) =>
        h.linea(l, h.y - RELLENO * 0.7 - (k + 1) * paso + 3, {
          tam: TAM,
          fuente: columnas[i]?.mono ? "mono" : fuente,
          x: xs[i]! + 4,
          ancho: anchos[i]! - 8,
          alinear: columnas[i]?.alinear ?? "izq",
        }),
      ),
    );
    h.y -= alto;
    h.regla(LINEA, 0.4);
  }
}

/** Caja de totales alineada a la derecha (neto, IVA, total). */
export function cajaTotales(
  h: Hoja,
  filas: readonly { etiqueta: string; valor: string; fuerte?: boolean }[],
): void {
  const ancho = 220;
  const x = MARGEN.x + ANCHO_UTIL - ancho;
  const paso = 17;
  h.asegurar(filas.length * paso + 12);
  h.espacio(8);
  for (const f of filas) {
    h.y -= paso;
    if (f.fuerte) h.rect(x, h.y - 5, ancho, paso + 2, FONDO_TABLA);
    const fuente = f.fuerte ? "negrita" : "normal";
    h.linea(f.etiqueta, h.y, { x: x + 6, ancho: ancho - 12, tam: f.fuerte ? 10 : 9, fuente });
    h.linea(f.valor, h.y, {
      x: x + 6,
      ancho: ancho - 12,
      alinear: "der",
      tam: f.fuerte ? 10 : 9,
      fuente: "mono",
    });
  }
}
