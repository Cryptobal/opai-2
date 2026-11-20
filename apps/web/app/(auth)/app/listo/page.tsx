import { cookies } from "next/headers";
import { Suspense } from "react";

import { Alerta, AuthCard, estilosBoton, Loading } from "@opai/ds";

import { LinkNext } from "@/app/_components/link-next";
import { COOKIE_RETO_APP } from "@/lib/canje-app";
import { requerirIdentidad } from "@/lib/servidor";

export const metadata = { title: "Volver a la app" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

async function Contenido({ searchParams }: Props) {
  // Exige la sesión con el segundo factor completo, como cualquier página con sesión.
  await requerirIdentidad("/app/listo");
  const { error } = await searchParams;
  const desdeLaApp = Boolean((await cookies()).get(COOKIE_RETO_APP));
  return (
    <AuthCard
      titulo="Volver a la app"
      subtitulo="Ya entraste con Google en este navegador."
      Link={LinkNext}
    >
      {error || !desdeLaApp ? (
        <Alerta tono="danger" titulo="No pudimos volver a la app">
          Abre la app OPAI y vuelve a tocar «Continuar con Google».
        </Alerta>
      ) : (
        <LinkNext
          href="/app/volver"
          prefetch={false}
          className={estilosBoton({ size: "lg", block: true })}
        >
          Seguir en la app OPAI
        </LinkNext>
      )}
    </AuthCard>
  );
}

/**
 * Ingreso con Google desde la app nativa (CAR-516, Brief 17b), paso 2, en el navegador del sistema.
 * La vuelta a la app la confirma la persona con un toque: así un enlace ajeno no puede llevarse un
 * ingreso silencioso aunque el navegador ya tenga la sesión de Google abierta.
 */
export default function VolverALaApp(props: Props) {
  return (
    <Suspense fallback={<Loading variante="formulario" />}>
      <Contenido {...props} />
    </Suspense>
  );
}
