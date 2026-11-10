import { defineConfig } from "vitest/config";

// `fileParallelism: false`: los tests `*-db.test.ts` comparten una base Postgres real y uno de ellos
// (secretos-db) rota la KEK sobre TODAS las claves del tenant; serializar los archivos los vuelve
// independientes del orden y evita que las claves de un test choquen con la rotación de otro.
// Topes como los de `packages/db`: un test de base que en local tarda milisegundos puede pasar de los 5 s por defecto en
// un runner de CI cargado (CAR-240: `finanzas-referencias-db` cayó por tiempo sin ningún error propio).
export default defineConfig({
  test: {
    name: "capabilities",
    include: ["test/**/*.test.ts"],
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
