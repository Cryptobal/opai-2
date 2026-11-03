import { crearContexto, executeCapability } from "@opai/capabilities";
import { tenantPorSlug } from "@opai/db";

import { ipDe, LIMITES, permitir } from "@/lib/rate-limit";
import { medidorDiferido } from "@/lib/medidor";
import { asegurarRegistro } from "@/lib/registro";
import { demasiadas } from "@/lib/respuestas";

asegurarRegistro();

type Params = { params: Promise<{ slug: string }> };

function err(status: number, code: string, message: string): Response {
  return Response.json({ ok: false, error: { code, message } }, { status });
}

function tokenDe(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7).trim();
  return null;
}

export async function POST(req: Request, { params }: Params): Promise<Response> {
  const { slug } = await params;
  const ip = ipDe(req);
  if (
    !(await permitir(
      `formulario-ip:${ip}:${slug}`,
      LIMITES.formularioWeb.maximo,
      LIMITES.formularioWeb.ventanaMs,
      { fallarCerrado: true },
    ))
  ) {
    return demasiadas();
  }
  const token = tokenDe(req);
  if (!token) return err(401, "UNAUTHENTICATED", "Falta la clave del formulario (Authorization: Bearer).");
  const idempotencyKey = req.headers.get("idempotency-key")?.trim();
  if (!idempotencyKey || idempotencyKey.length < 8) {
    return err(400, "VALIDATION", "Falta la cabecera Idempotency-Key (mínimo 8 caracteres).");
  }
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return err(400, "VALIDATION", "El cuerpo debe ser JSON.");
  }
  const tenant = await tenantPorSlug(slug);
  if (!tenant || tenant.estado !== "activo") {
    return err(404, "NOT_FOUND", "No encontramos este formulario.");
  }
  const ctx = crearContexto({
    tenantId: tenant.id,
    actor: { tipo: "system" },
    medidor: medidorDiferido,
    modulosActivos: ["comercial"],
  });
  const r = await executeCapability(
    ctx,
    "comercial.solicitudes.recibir_formulario_web",
    {
      token,
      ...body,
      origin: req.headers.get("origin"),
      referer: req.headers.get("referer"),
    },
    { idempotencyKey },
  );
  if (!r.ok) {
    const status =
      r.error.code === "UNPROCESSABLE" ? 422 : r.error.code === "NOT_FOUND" ? 404 : 400;
    return err(status, r.error.code, r.error.message);
  }
  return Response.json({ ok: true, ...(r.data as Record<string, unknown>) }, { status: 201 });
}
