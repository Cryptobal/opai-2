/** Capítulo por instalación del PDF de la propuesta técnica (CAR-138 PR 6). Nunca hay texto de relleno: lo que falta se avisa solo en borrador. */
import type { ItemIndice } from "../domain/documento/indice-propuesta";
import { formatearPersonas, type CapituloVista } from "../domain/documento/capitulo-instalacion";
import { TENUE } from "./pdf/colores";
import type { Hoja } from "./pdf/hoja";
import { tabla } from "./pdf/hoja-tabla";

const parrafos = (texto: string) => texto.split(/\n+/).map((x) => x.trim()).filter(Boolean);
const persona = (n: number | null) => (n == null ? "—" : formatearPersonas(n));

export function capituloInstalacion(h: Hoja, c: CapituloVista, numero: string, borrador: boolean): void {
  h.asegurar(90);
  h.espacio(10);
  h.parrafo(`${numero}. ${c.nombre}`, { fuente: "negrita", tam: 12 });
  if (c.direccion) h.parrafo(c.direccion, { tam: 9.5, color: TENUE });
  if (c.mapaUrl) h.parrafo(`Mapa: ${c.mapaUrl}`, { tam: 8.5, color: TENUE });
  if (c.puestos.length) {
    h.espacio(4);
    tabla(
      h,
      [
        { titulo: "Puesto", peso: 4 },
        { titulo: "Guardias simultáneos", peso: 1.8, alinear: "der", mono: true },
        { titulo: "Dotación estimada", peso: 1.6, alinear: "der", mono: true },
        { titulo: "Turno", peso: 3.4 },
      ],
      [
        ...c.puestos.map((p) => ({
          celdas: [p.nombre, String(p.guardiasSimultaneos), persona(p.dotacion), p.turno],
        })),
        { celdas: ["Total", String(c.totales.guardiasSimultaneos), persona(c.totales.dotacion), ""] },
      ],
    );
    h.parrafo("La dotación estimada resulta de la cobertura semanal del turno sobre la jornada media del patrón.", {
      tam: 7.5,
      color: TENUE,
    });
  }
  for (const s of c.secciones) {
    h.asegurar(40);
    h.espacio(6);
    h.parrafo(s.titulo, { fuente: "semi", tam: 10 });
    for (const p of parrafos(s.texto)) {
      h.parrafo(p, { tam: 9.5 });
      h.espacio(3);
    }
  }
  if (borrador && c.faltantes.length) {
    h.asegurar(40);
    h.espacio(6);
    h.parrafo(`Pendiente por completar (solo borrador): ${c.faltantes.map((f) => f.titulo).join("; ")}.`, {
      tam: 8.5,
      color: TENUE,
    });
  }
}

/** Entrada del índice de un bloque; el detalle del servicio lleva un subtítulo por capítulo. */
export const itemIndice = (titulo: string, tipo: string, capitulos: readonly CapituloVista[]): ItemIndice => ({
  titulo,
  ...(tipo === "detalle_servicio" && capitulos.length ? { subtitulos: capitulos.map((c) => c.nombre) } : {}),
});
