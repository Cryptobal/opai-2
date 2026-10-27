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
  const urls = z.array(z.string().max(200)).max(15).parse(input);
  const validas: string[] = [];
  // Acota las consultas concurrentes y falla cerrado también ante un error transitorio.
  for (const href of [...new Set(urls)]) {
    const m = /^\/(cuentas|instalaciones|personas|cargos)\/([0-9a-f-]{36})$/.exec(href);
    if (!m || !z.uuid().safeParse(m[2]).success) continue;
    const coleccion = m[1] as keyof typeof lectores;
    if ((await lectores[coleccion](m[2]!)).ok) validas.push(href);
  }
  return validas;
}
