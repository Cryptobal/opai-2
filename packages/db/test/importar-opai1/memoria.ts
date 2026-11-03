// Utilidades de prueba: carga el fixture y aplica un plan sobre un estado 2.0 en memoria, como lo
// haría la carga real (crear, actualizar, registrar ids externos y mapear los duplicados fundidos).
import { readFileSync } from "node:fs";

import { MOTIVO_VINCULO_PERSONA } from "../../scripts/importar-opai1/contactos";
import type { DatosContacto } from "../../scripts/importar-opai1/contactos-datos";
import type { Decision } from "../../scripts/importar-opai1/comun";
import type { ContactoDestino, EntidadImportada, EstadoDestino, VinculoDestino } from "../../scripts/importar-opai1/destino-tipos";
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
  const realCuenta = (clave: string) =>
    clave.startsWith("nueva:") ? (cuentaReal.get(clave) ?? clave) : clave;

  function aplicarSimple<D extends Record<string, unknown>>(
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
            ...("cuentaId" in d.datos ? { cuentaId: realCuenta(String(d.datos.cuentaId)) } : {}),
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

  function upsertVinculo(contactoId: string, datos: DatosContacto) {
    const cuentaId = realCuenta(datos.cuentaId);
    const idx = nuevo.vinculos.findIndex((v) => v.contactoId === contactoId && v.cuentaId === cuentaId);
    const v: VinculoDestino = {
      id: idx >= 0 ? nuevo.vinculos[idx]!.id : uuid(),
      contactoId,
      cuentaId,
      cargo: datos.cargo,
      roles: datos.roles,
      esPrincipal: datos.esPrincipal,
    };
    if (idx >= 0) nuevo.vinculos[idx] = v;
    else nuevo.vinculos.push(v);
    const c = nuevo.contactos.find((x) => x.id === contactoId);
    if (c && c.cuentaId === cuentaId) {
      c.cargo = datos.cargo;
      c.roles = datos.roles;
      c.esPrincipal = datos.esPrincipal;
    }
  }

  function personaDe(idOpai1: string, mapa: Map<string, string>) {
    const directo = mapa.get(idOpai1);
    if (directo) return directo;
    const d = plan.contactos.find((x) => x.idOpai1 === idOpai1);
    if (d?.fusionaCon) return mapa.get(d.fusionaCon) ?? null;
    return null;
  }

  aplicarSimple("cuenta", plan.cuentas, nuevo.cuentas);

  const mapaContacto = new Map<string, string>();
  const mapearContacto = (idOpai1: string, entidadId: string) => {
    mapaContacto.set(idOpai1, entidadId);
    if (!nuevo.ids.some((i) => i.entidadTipo === "contacto" && i.idExterno === idOpai1))
      nuevo.ids.push({ entidadTipo: "contacto", idExterno: idOpai1, entidadId });
  };

  for (const d of plan.contactos) {
    if (d.accion === "omitido" && d.fusionaCon) {
      const canon = personaDe(d.fusionaCon, mapaContacto);
      if (canon) mapearContacto(d.idOpai1, canon);
      continue;
    }
    if (!d.datos) continue;
    const datos: DatosContacto = {
      ...d.datos,
      cuentaId: realCuenta(d.datos.cuentaId),
    };
    if (d.motivo === MOTIVO_VINCULO_PERSONA && d.fusionaCon) {
      const personId = personaDe(d.fusionaCon, mapaContacto);
      if (personId) {
        upsertVinculo(personId, datos);
        mapearContacto(d.idOpai1, personId);
      }
      continue;
    }
    if (d.motivo === "vincula_persona_correo" && d.destinoId) {
      upsertVinculo(d.destinoId, datos);
      mapearContacto(d.idOpai1, d.destinoId);
      continue;
    }
    if (d.accion === "crear") {
      const id = uuid();
      const c: ContactoDestino = {
        id,
        cuentaId: datos.cuentaId,
        nombres: datos.nombres,
        apellidos: datos.apellidos,
        email: datos.email,
        telefono: datos.telefono,
        cargo: datos.cargo,
        esPrincipal: datos.esPrincipal,
        roles: datos.roles,
      };
      nuevo.contactos.push(c);
      upsertVinculo(id, datos);
      mapearContacto(d.idOpai1, id);
    } else if (d.accion === "actualizar" && d.destinoId) {
      const fila = nuevo.contactos.find((c) => c.id === d.destinoId);
      if (fila) {
        Object.assign(fila, {
          nombres: datos.nombres,
          apellidos: datos.apellidos,
          email: datos.email,
          telefono: datos.telefono,
          cargo: datos.cargo,
          esPrincipal: datos.esPrincipal,
          roles: datos.roles,
          cuentaId: datos.cuentaId,
        });
      }
      upsertVinculo(d.destinoId, datos);
      mapearContacto(d.idOpai1, d.destinoId);
    } else if (d.accion === "sin_cambios" && d.destinoId) {
      mapearContacto(d.idOpai1, d.destinoId);
    }
  }

  aplicarSimple("instalacion", plan.instalaciones, nuevo.instalaciones);
  return nuevo;
}
