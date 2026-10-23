"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { signOut } from "@opai/auth/client";
import { AuthCard, Button, Monograma } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { ETIQUETA_ROL } from "@/app/_components/portales";
import { fechaCorta } from "@/lib/formato";

import { aceptarInvitacion, registrarYAceptar } from "./acciones";
import { InvitacionNoVigente } from "./invitacion-estados";
import { FormularioCuenta, Tarjeta } from "./invitacion-partes";

export type DatosInvitacion = {
  tenant: string;
  email: string;
  rol: string;
  estado: string;
  usuarioExiste: boolean;
  nombreUsuario: string | null;
  invitadoPor: string | null;
  expiresAt: string;
  acceptedAt: string | null;
};

type Sesion = { nombre: string; email: string };
type Props = { slug: string; token: string; datos: DatosInvitacion; sesion: Sesion | null };

/** Texto bajo la tarjeta de cuenta según haya sesión y coincida el correo. */
function explicacion(datos: DatosInvitacion, sesion: Sesion | null, coincide: boolean): string {
  if (!sesion) {
    return `Ya tienes una cuenta en OPAI con este correo. Inicia sesión y sumaremos ${datos.tenant} a tus empresas.`;
  }
  return coincide
    ? `Acepta para sumar ${datos.tenant} a tus empresas.`
    : `Entraste con otra cuenta. La invitación es para ${datos.email}.`;
}

/** Invitación: sin cuenta, con cuenta (o sesión abierta), y estados no vigentes (export-acceso 04). */
export function Invitacion({ slug, token, datos, sesion }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  if (datos.estado !== "pendiente") {
    return <InvitacionNoVigente slug={slug} token={token} datos={datos} />;
  }

  const login = `/login?next=${encodeURIComponent(`/invitacion/${slug}/${token}`)}`;
  const coincide = sesion?.email.toLowerCase() === datos.email;
  const ejecutar = async (accion: () => Promise<string>) => {
    setEnviando(true);
    setError(await accion());
    setEnviando(false);
  };
  const cuenta =
    sesion && !coincide
      ? sesion
      : { nombre: datos.nombreUsuario ?? datos.email, email: datos.email };

  const acciones = sesion ? (
    coincide ? (
      <Button
        size="lg"
        block
        disabled={enviando}
        onClick={() => void ejecutar(() => aceptarInvitacion(slug, token))}
      >
        Aceptar invitación
      </Button>
    ) : (
      <Button size="lg" block onClick={() => void signOut().then(() => router.push(login))}>
        Entrar con {datos.email}
      </Button>
    )
  ) : datos.usuarioExiste ? (
    <>
      <Button size="lg" block onClick={() => router.push(login)}>
        Iniciar sesión para aceptar
      </Button>
      <Button
        variant="ghost"
        size="lg"
        className="text-accent"
        onClick={() => router.push("/login")}
      >
        No soy yo
      </Button>
    </>
  ) : (
    <Button type="submit" form="crear-cuenta" size="lg" block disabled={enviando}>
      {enviando ? "Creando cuenta…" : "Crear cuenta y aceptar"}
    </Button>
  );

  return (
    <AuthCard
      Link={LinkNext}
      insignia={<Monograma nombre={datos.tenant} className="size-12 rounded-md text-base" />}
      titulo={`${datos.tenant} te invitó como ${ETIQUETA_ROL[datos.rol] ?? datos.rol}`}
      subtitulo={`${datos.invitadoPor ? `Invitación de ${datos.invitadoPor} · ` : ""}vence el ${fechaCorta(datos.expiresAt)}`}
      acciones={acciones}
    >
      {sesion || datos.usuarioExiste ? (
        <>
          <Tarjeta nombre={cuenta.nombre} email={cuenta.email} />
          <p className="text-md text-fg-muted md:text-base">
            {explicacion(datos, sesion, coincide)}
          </p>
          {error ? <p className="text-sm font-medium text-danger-fg">{error}</p> : null}
        </>
      ) : (
        <FormularioCuenta
          email={datos.email}
          error={error}
          onEnviar={(nombre, password) =>
            void ejecutar(() => registrarYAceptar(slug, token, nombre, password))
          }
        />
      )}
    </AuthCard>
  );
}
