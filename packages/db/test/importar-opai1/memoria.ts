// Utilidades de prueba: carga el fixture y aplica un plan sobre un estado 2.0 en memoria, como lo
// haría la carga real (crear, actualizar, registrar ids externos y mapear los duplicados fundidos).
import { readFileSync } from "node:fs";

import type { Decision } from "../../scripts/importar-opai1/comun";
import type { EntidadImportada, EstadoDestino } from "../../scripts/importar-opai1/destino-tipos";
import { type DatosOpai1, validarDatos } from "../../scripts/importar-opai1/origen";
import type { Plan } from "../../scripts/importar-opai1/plan";

export const RUTA_FIXTURE = new URL("./fixtures/origen-basico.json", import.meta.url).pathname;

export function fixture(): DatosOpai1 {
  return validarDatos(JSON.parse(readFileSync(RUTA_FIXTURE, "utf8")));
}

export function aplicarEnMemoria(plan: Plan, estado: EstadoDestino): EstadoDestino {
  const nuevo = structuredClone(estado);
  let n = 0;
  const uuid = () => `00000000-0000-7000-8000-${String(++n).padStart(12, "0")}`;
  const cuentaReal = new Map<string, string>();
  const real = (clave: string) =>
    clave.startsWith("nueva:") ? (cuentaReal.get(clave) ?? clave) : clave;

  function aplicar<D extends Record<string, unknown>>(
    entidad: EntidadImportada,
    decisiones: readonly Decision<D>[],
    tabla: Record<string, unknown>[],
  ) {
    const destinoDe = new Map<string, string>();
    const mapear = (idOpai1: string, entidadId: string) => {
      destinoDe.set(idOpai1, entidadId);
      if (!nuevo.ids.some((i) => i.entidadTipo === entidad && i.idExterno === idOpai1))
        nuevo.ids.push({ entidadTipo: entidad, idExterno: idOpai1, entidadId });
    };
    for (const d of decisiones) {
      const datos = d.datos
        ? {
            ...d.datos,
            ...("cuentaId" in d.datos ? { cuentaId: real(String(d.datos.cuentaId)) } : {}),
          }
        : null;
      if (d.accion === "crear" && datos) {
        const id = uuid();
        tabla.push({ id, ...datos });
        mapear(d.idOpai1, id);
        if (entidad === "cuenta") cuentaReal.set(`nueva:${d.idOpai1}`, id);
      } else if (d.accion === "actualizar" && datos && d.destinoId) {
        const fila = tabla.find((f) => f["id"] === d.destinoId);
        if (fila) Object.assign(fila, datos);
        mapear(d.idOpai1, d.destinoId);
      } else if (d.accion === "omitido" && d.fusionaCon) {
        const canonica = destinoDe.get(d.fusionaCon);
        if (canonica) mapear(d.idOpai1, canonica);
      } else if (d.destinoId) destinoDe.set(d.idOpai1, d.destinoId);
    }
  }
  aplicar("cuenta", plan.cuentas, nuevo.cuentas);
  aplicar("contacto", plan.contactos, nuevo.contactos);
  aplicar("instalacion", plan.instalaciones, nuevo.instalaciones);
  return nuevo;
}
