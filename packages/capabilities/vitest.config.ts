import { defineConfig } from "vitest/config";

// `fileParallelism: false`: los tests `*-db.test.ts` comparten una base Postgres real y uno de ellos
// (secretos-db) rota la KEK sobre TODAS las claves del tenant; serializar los archivos los vuelve
// independientes del orden y evita que las claves de un test choquen con la rotación de otro.
export default defineConfig({
  test: { name: "capabilities", include: ["test/**/*.test.ts"], fileParallelism: false },
});
