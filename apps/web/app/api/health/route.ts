import pkg from "../../../package.json" with { type: "json" };

/** Verificación de vida del despliegue. Sin base de datos: debe responder aunque la base no esté. */
export function GET(): Response {
  return Response.json({
    ok: true,
    version: pkg.version,
    commit: process.env["VERCEL_GIT_COMMIT_SHA"]?.slice(0, 7) ?? "local",
    region: process.env["VERCEL_REGION"] ?? "local",
    hora: new Date().toISOString(),
  });
}
