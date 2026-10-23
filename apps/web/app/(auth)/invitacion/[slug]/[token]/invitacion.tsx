"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { signOut } from "@opai/auth/client";
import { Button, Campo, Input } from "@opai/ds";

import { ETIQUETA_ROL } from "@/app/_components/portales";

import { aceptarInvitacion, pedirNuevaInvitacion, registrarYAceptar } from "./acciones";

type Datos = { tenant: string; email: string; rol: string; estado: string; usuarioExiste: boolean };
type Props = { slug: string; token: string; datos: Datos; sesion: string | null };

export function InvitacionInvalida() {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="t-heading text-fg">Invitación no encontrada</h1>
      <p className="text-base text-fg-muted">
        Revisa el enlace o pide una invitación nueva a tu administrador.
      </p>
    </div>
  );
}

export function Invitacion({ slug, token, datos, sesion }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pedida, setPedida] = useState(false);
  const rol = ETIQUETA_ROL[datos.rol] ?? datos.rol;
  const titulo = (
    <h1 className="t-heading text-fg">
      {datos.tenant} te invitó como {rol}
    </h1>
  );
  const volverAEntrar = `/login?next=${encodeURIComponent(`/invitacion/${slug}/${token}`)}`;

  if (datos.estado !== "pendiente") {
    return (
      <div className="flex flex-col gap-4">
        {titulo}
        <p className="text-base text-fg-muted">
          Esta invitación{" "}
          {datos.estado === "aceptada"
            ? "ya se usó"
            : datos.estado === "vencida"
              ? "venció"
              : "fue revocada"}
          .
        </p>
        {pedida ? (
          <p className="text-base text-fg">
            Avisamos al administrador para que te envíe una nueva.
          </p>
        ) : (
          <Button
            size="lg"
            block
            onClick={async () => setPedida(await pedirNuevaInvitacion(slug, token))}
          >
            Pedir nueva invitación
          </Button>
        )}
      </div>
    );
  }

  if (sesion) {
    const coincide = sesion.toLowerCase() === datos.email;
    return (
      <div className="flex flex-col gap-4">
        {titulo}
        <p className="text-base text-fg-muted">
          {coincide
            ? `Entraste como ${sesion}.`
            : `Entraste como ${sesion}, pero la invitación es para ${datos.email}.`}
        </p>
        {error ? <p className="text-sm font-medium text-danger-fg">{error}</p> : null}
        {coincide ? (
          <Button
            size="lg"
            block
            onClick={async () => setError(await aceptarInvitacion(slug, token))}
          >
            Aceptar invitación
          </Button>
        ) : (
          <Button
            size="lg"
            block
            variant="secondary"
            onClick={() => void signOut().then(() => router.push(volverAEntrar))}
          >
            Entrar con {datos.email}
          </Button>
        )}
      </div>
    );
  }

  if (datos.usuarioExiste) {
    return (
      <div className="flex flex-col gap-4">
        {titulo}
        <p className="text-base text-fg-muted">
          Ya tienes cuenta con {datos.email}. Inicia sesión para aceptar.
        </p>
        <Button size="lg" block onClick={() => router.push(volverAEntrar)}>
          Iniciar sesión para aceptar
        </Button>
      </div>
    );
  }

  async function crear(form: FormData) {
    const nueva = String(form.get("password") ?? "");
    if (nueva.length < 10) return setError("La contraseña debe tener al menos 10 caracteres.");
    setError(await registrarYAceptar(slug, token, String(form.get("nombre") ?? ""), nueva));
  }

  return (
    <form action={crear} className="flex flex-col gap-4">
      {titulo}
      <p className="text-base text-fg-muted">Crea tu cuenta para {datos.email}.</p>
      <Campo etiqueta="Nombre y apellido" htmlFor="nombre">
        <Input id="nombre" name="nombre" autoComplete="name" required minLength={2} />
      </Campo>
      <Campo
        etiqueta="Contraseña"
        htmlFor="password"
        ayuda="Mínimo 10 caracteres."
        {...(error ? { error } : {})}
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Campo>
      <Button type="submit" size="lg" block>
        Crear cuenta y aceptar
      </Button>
    </form>
  );
}
