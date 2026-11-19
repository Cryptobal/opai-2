import { z } from "zod";

const repo = "opai-cl/opai-2";
const evento = z.object({
  number: z.literal(831),
  action: z.enum(["opened", "reopened", "synchronize", "ready_for_review"]),
  repository: z.object({ full_name: z.literal(repo) }),
  pull_request: z.object({
    number: z.literal(831),
    draft: z.literal(false),
    state: z.literal("open"),
    head: z.object({ repo: z.object({ full_name: z.literal(repo), fork: z.literal(false) }) }),
    base: z.object({ repo: z.object({ full_name: z.literal(repo) }) }),
  }),
});
const rama = z.object({
  branch: z.object({
    id: z.string(),
    project_id: z.string(),
    name: z.literal("preview/pr-831"),
    default: z.literal(false),
    primary: z.literal(false).optional(),
    protected: z.literal(false),
    current_state: z.literal("ready"),
  }),
});
const endpoints = z.object({
  endpoints: z.array(
    z.object({
      id: z.string(),
      project_id: z.string(),
      branch_id: z.string(),
      host: z.string(),
      type: z.enum(["read_write", "read_only"]),
      disabled: z.boolean(),
      current_state: z.string(),
    }),
  ),
});
const invalido = () => new Error("Destino preview no verificado; no se abrió conexión.");

export function validarContextoPreview(env: NodeJS.ProcessEnv, payload: unknown) {
  if (
    env.GITHUB_REPOSITORY !== repo ||
    env.GITHUB_EVENT_NAME !== "pull_request" ||
    !evento.safeParse(payload).success ||
    !/^[a-z0-9-]{1,60}$/.test(env.NEON_PROJECT_ID ?? "") ||
    !/^br-[a-z0-9-]+$/.test(env.PREVIEW_BRANCH_ID ?? "") ||
    !env.NEON_API_KEY ||
    !env.DB_URL
  )
    throw invalido();
  return { proyecto: env.NEON_PROJECT_ID!, ramaId: env.PREVIEW_BRANCH_ID! };
}

/** Metadata obtenida por API autenticada, no por un archivo o variable suministrada por el PR. */
export function validarDestinoPreview(
  env: NodeJS.ProcessEnv,
  branchJson: unknown,
  endpointsJson: unknown,
): string {
  const b = rama.safeParse(branchJson),
    es = endpoints.safeParse(endpointsJson);
  if (
    !b.success ||
    !es.success ||
    b.data.branch.id !== env.PREVIEW_BRANCH_ID ||
    b.data.branch.project_id !== env.NEON_PROJECT_ID
  )
    throw invalido();
  const candidatos = es.data.endpoints.filter(
    (e) => e.branch_id === b.data.branch.id && e.type === "read_write",
  );
  if (candidatos.length !== 1) throw invalido();
  const ep = candidatos[0]!;
  if (
    ep.project_id !== env.NEON_PROJECT_ID ||
    ep.disabled ||
    !["active", "idle"].includes(ep.current_state) ||
    !/^ep-[a-z0-9-]+$/.test(ep.id) ||
    !ep.host.startsWith(`${ep.id}.`) ||
    !ep.host.endsWith(".neon.tech")
  )
    throw invalido();
  let url: URL;
  try {
    url = new URL(env.DB_URL!);
  } catch {
    throw invalido();
  }
  const params = [...url.searchParams.entries()];
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.hostname !== ep.host ||
    (url.port && url.port !== "5432") ||
    url.hash ||
    !url.username ||
    !url.password ||
    !/^\/[a-zA-Z0-9_-]+$/.test(url.pathname) ||
    params.some(
      ([k, v]) =>
        !(k === "sslmode" && ["require", "verify-full"].includes(v)) &&
        !(k === "channel_binding" && v === "require"),
    ) ||
    new Set(params.map(([k]) => k)).size !== params.length ||
    !url.searchParams.has("sslmode")
  )
    throw invalido();
  return env.DB_URL!;
}
