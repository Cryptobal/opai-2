import { auth } from "./auth";

/**
 * Crea un usuario con contraseña desde el servidor (aceptar invitación, seed). El registro
 * público está deshabilitado, así que no se usa `signUpEmail`. El correo queda verificado
 * porque llegó por un enlace enviado a esa casilla.
 */
export async function crearUsuarioConPassword(datos: {
  email: string;
  nombre: string;
  password: string;
  platformRole?: "owner" | "support";
}): Promise<{ id: string }> {
  const ctx = await auth.$context;
  const { minPasswordLength, maxPasswordLength } = ctx.password.config;
  if (datos.password.length < minPasswordLength || datos.password.length > maxPasswordLength) {
    throw new Error(
      `La contraseña debe tener entre ${minPasswordLength} y ${maxPasswordLength} caracteres.`,
    );
  }
  const email = datos.email.trim().toLowerCase();
  if (await ctx.internalAdapter.findUserByEmail(email)) {
    throw new Error("Ya existe un usuario con ese correo.");
  }
  const user = await ctx.internalAdapter.createUser(
    {
      email,
      name: datos.nombre.trim(),
      emailVerified: true,
      ...(datos.platformRole ? { platformRole: datos.platformRole } : {}),
    },
    { method: "invitation" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: await ctx.password.hash(datos.password),
  });
  return { id: user.id };
}
