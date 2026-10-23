import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@opai/auth";

// Better Auth (ADR-015): login, sesión, cierre, recuperación. Rate limit propio de la librería.
export const { GET, POST } = toNextJsHandler(auth);
