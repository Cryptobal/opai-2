"use client";

import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { camposUsuario } from "./opciones";

/** Cliente de Better Auth para componentes de React. Mismo origen, base `/api/auth`. */
export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: [inferAdditionalFields({ user: camposUsuario })],
});

export const { signIn, signOut, changePassword, requestPasswordReset, resetPassword } = authClient;
