import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { exigirDestinoComprasQaLocal } from "./compras-qa-destino";
import { escribirComprasQa } from "./compras-qa-escribir";

/** Solo INSERT inicial; una repetición exacta es de lectura. Nunca adopta ni repara datos. */
export async function sembrarComprasQa(urlLocal: string): Promise<void> {
  exigirDestinoComprasQaLocal(urlLocal);
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: urlLocal }) });
  try {
    await escribirComprasQa(db);
  } finally {
    await db.$disconnect();
  }
}
