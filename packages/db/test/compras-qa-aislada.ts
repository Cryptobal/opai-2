import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { Client } from "pg";

import { exigirDestinoComprasQaLocal } from "../scripts/compras-qa-destino";
import { PrismaClient } from "../src/generated/prisma/client";
import { vigilarCatalogo } from "./compras-qa-catalogo";
import { type Limpieza, LimpiezaComprasQaError, prepararComprasQa } from "./compras-qa-etapas";
import { destinosComprasQa, nombreComprasQa } from "./compras-qa-destinos-ci";

export async function crearComprasQaAislada(origen: string) {
  const nombre = nombreComprasQa(randomUUID());
  let control: Client | undefined;
  let vigilancia: ReturnType<typeof vigilarCatalogo> | undefined;
  let creada = false;
  let admin: PrismaClient | undefined;
  async function cerrar() {
    const fallos: Limpieza[] = [];
    try {
      await admin?.$disconnect();
    } catch {
      fallos.push("cerrar Prisma");
    }
    try {
      if (creada) await control?.query(`DROP DATABASE "${nombre}"`);
    } catch {
      fallos.push("descartar la base de este caso");
    }
    try {
      await control?.end();
      vigilancia?.retirar();
    } catch {
      fallos.push("cerrar el catálogo");
    }
    if (vigilancia?.fallo()) fallos.push("socket del catálogo");
    if (fallos.length) throw new LimpiezaComprasQaError(fallos);
  }
  return prepararComprasQa(async (etapa) => {
    const { catalogo, caso, plantilla } = destinosComprasQa(origen, nombre);
    exigirDestinoComprasQaLocal(caso);
    etapa("abrir catálogo");
    control = new Client({ connectionString: catalogo });
    vigilancia = vigilarCatalogo(control);
    await control.connect();
    etapa("clonar plantilla");
    await control.query(`CREATE DATABASE "${nombre}" TEMPLATE "${plantilla}"`);
    creada = true;
    etapa("verificar plantilla vacía");
    admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: caso }) });
    if (await admin.tenant.count() !== 0) throw new Error("La plantilla de compras no está vacía.");
    if (vigilancia.fallo()) {
      etapa("socket del catálogo");
      throw new Error("Falló el socket del catálogo de compras.");
    }
    return { admin, url: caso, cerrar };
  }, cerrar);
}
