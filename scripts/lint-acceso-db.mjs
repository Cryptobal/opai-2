/** Frontera independiente de no-restricted-imports (los workspaces la personalizan). */
export const accesoDb = {
  meta: {
    type: "problem",
    schema: [],
    messages: { prohibido: "Acceso global libre prohibido: usa funciones con nombre de @opai/db." },
  },
  create(context) {
    const archivo = context.filename.replaceAll("\\", "/");
    const db = archivo.includes("/packages/db/");
    const auth = archivo.includes("/packages/auth/");
    const contexto = archivo.endsWith("/packages/capabilities/src/contexto.ts");
    // Operaciones de identidad (CAR-43, CAR-54, CAR-45): solo `ctx.identidad`, ya autorizado.
    const identidad = archivo.endsWith("/packages/capabilities/src/identidad-db.ts");
    const IDENTIDAD = [
      "borrarUsuario",
      "restablecerSegundoFactor",
      "ultimosAccesos",
      "usuarioEnOtrasEmpresas",
    ];
    function revisar(node) {
      if (node.source?.value !== "@opai/db" || db) return;
      for (const s of node.specifiers ?? []) {
        const nombre = s.imported?.name ?? s.local?.name;
        if (
          s.type === "ImportNamespaceSpecifier" ||
          s.type === "ImportDefaultSpecifier" ||
          nombre === "globales" ||
          ((nombre === "clienteAuth" || nombre === "clienteBloqueoLogin") && !auth) ||
          (nombre === "accesoPlataforma" && !contexto) ||
          (IDENTIDAD.includes(nombre) && !identidad) ||
          (nombre === "registrarEventoSeguridad" && !auth) ||
          (nombre === "dbAdmin" && !archivo.includes("/scripts/"))
        ) {
          context.report({ node: s, messageId: "prohibido" });
        }
      }
      if (node.type === "ExportAllDeclaration") context.report({ node, messageId: "prohibido" });
    }
    return {
      ImportDeclaration: revisar,
      ExportNamedDeclaration: revisar,
      ExportAllDeclaration: revisar,
      ImportExpression(node) {
        if (!db && !auth && node.source?.value === "@opai/db")
          context.report({ node, messageId: "prohibido" });
      },
      CallExpression(node) {
        if (!db && !auth && node.callee?.name === "require" && node.arguments[0]?.value === "@opai/db")
          context.report({ node, messageId: "prohibido" });
      },
    };
  },
};
