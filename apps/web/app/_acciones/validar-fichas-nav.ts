"use server";

import { z } from "zod";

import { ejecutarComoUsuario } from "@/lib/servidor";

const lectores = {
  cuentas: (id: string) => ejecutarComoUsuario("erp", "core.cuentas.get", { id }),
  instalaciones: (id: string) => ejecutarComoUsuario("erp", "core.instalaciones.get", { id }),
  personas: (id: string) => ejecutarComoUsuario("erp", "core.personas.get", { id }),
  cargos: (id: string) => ejecutarComoUsuario("erp", "core.cargos.get", { id }),
};

/** No confía en URLs del navegador: solo fichas conocidas, UUID y capacidades con alcance. */
export async function validarFichasNav(input: string[]): Promise<string[]> {
  return (await revisarFichasNav(input)).validas;
}

/** Solo un rechazo definitivo permite limpiar la preferencia; una caída no borra fijados. */
export async function revisarFichasNav(input: string[]): Promise<{ validas: string[]; invalidas: string[] }> {
  const urls = z.array(z.string().max(200)).max(15).parse(input);
  const validas: string[] = [];
  const invalidas: string[] = [];
  // Acota las consultas concurrentes y falla cerrado también ante un error transitorio.
  for (const href of [...new Set(urls)]) {
    const m = /^\/(cuentas|instalaciones|personas|cargos)\/([0-9a-f-]{36})$/.exec(href);
    if (!m || !z.uuid().safeParse(m[2]).success) { invalidas.push(href); continue; }
    const coleccion = m[1] as keyof typeof lectores;
    const r = await lectores[coleccion](m[2]!);
    if (r.ok) validas.push(href);
    else if (["NOT_FOUND", "FORBIDDEN"].includes(r.error.code)) invalidas.push(href);
  }
  return { validas, invalidas };
}
