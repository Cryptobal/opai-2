"use client";

import { useRouter } from "next/navigation";
import { lazy, Suspense, useState } from "react";

import { AuthCard, Button, Monograma } from "@opai/ds";

import { accionSalir } from "@/app/_acciones/auth";

import { LinkNext } from "@/app/_components/link-next";
import { ETIQUETA_ROL } from "@/app/_components/portales";
import { fechaCorta } from "@/lib/formato";

import { aceptarInvitacion, registrarYAceptar } from "./acciones";
import { FormularioCuenta, Tarjeta } from "./invitacion-partes";

// Estados no vigentes (vencida, revocada, ya usada): rama terminal poco frecuente, con sus propios
// íconos. Se carga en un chunk aparte (fuera de la primera carga de /(auth)/*) para no gastar
// presupuesto de JS en algo que casi nunca se muestra (ADR-037). `lazy` usa React, sin runtime extra.
const InvitacionNoVigente = lazy(() =>
  import("./invitacion-no-vigente").then((m) => ({ default: m.InvitacionNoVigente })),
);

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
    return (
      <Suspense fallback={null}>
        <InvitacionNoVigente slug={slug} token={token} datos={datos} />
      </Suspense>
    );
  }

  const login = `/login?next=${encodeURIComponent(`/invitacion/${slug}/${token}`)}`;
  const coincide = sesion?.email.toLowerCase() === datos.email;
  const ejecutar = async (accion: () => Promise<string>) => {
    setEnviando(true);
    setError(await accion());
    setEnviando(false);
  };
  // Con otra sesión abierta: si la cuenta invitada existe, se entra con ella (login);
  // si no existe, se vuelve a esta misma invitación, que muestra el formulario de cuenta nueva.
  // La limpieza de cachés se carga de forma dinámica para no sumar su peso a la primera carga de
  // /(auth)/* (presupuesto de JS, ADR-037): solo se necesita al cambiar de cuenta.
  const cambiarDeCuenta = async () => {
    const destino = datos.usuarioExiste ? login : `/invitacion/${slug}/${token}`;
    const { trasLimpiarCaches } = await import("@/app/_components/pwa/limpiar-cache");
    trasLimpiarCaches(() => accionSalir(destino));
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
      <Button size="lg" block onClick={() => void cambiarDeCuenta()}>
        {datos.usuarioExiste ? `Entrar con ${datos.email}` : `Crear cuenta para ${datos.email}`}
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
