import { Suspense } from "react";

import { forTenant, tenantPorSlug } from "@opai/db";
import { AuthCard, Loading } from "@opai/ds";

export const metadata = { title: "Privacidad · Control de acceso" };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ instalacion?: string; punto?: string }>;
};

async function Contenido({ params, searchParams }: Props) {
  const { slug } = await params;
  const q = await searchParams;
  const tenant = await tenantPorSlug(slug);
  if (!tenant) {
    return (
      <AuthCard titulo="Aviso de privacidad">
        <p className="t-body">No encontramos esta empresa.</p>
      </AuthCard>
    );
  }
  const db = forTenant(tenant.id);
  const base = process.env["NEXT_PUBLIC_APP_URL"] ?? "https://test.opai.cl";
  const [perfil, inst, punto] = await Promise.all([
    db.perfilEmpresa.findUnique({ where: { tenantId: tenant.id } }),
    q.instalacion
      ? db.instalacion.findUnique({ where: { id: q.instalacion }, select: { nombre: true } })
      : null,
    q.punto
      ? db.puntoAcceso.findFirst({ where: { id: q.punto }, select: { nombre: true } })
      : null,
  ]);
  const nombre = perfil?.nombreComercial ?? tenant.nombre;
  const logoUrl = perfil?.logoPrincipalId
    ? `${base}/api/marca/${tenant.slug}/logoPrincipal`
    : null;
  const pie = [perfil?.razonSocial, perfil?.rut ? `RUT ${perfil.rut}` : null, perfil?.comuna]
    .filter(Boolean)
    .join(" · ");
  const fila = q.instalacion
    ? await db.configAcceso.findFirst({
        where: { instalacionId: q.instalacion },
        select: { valor: true },
      })
    : await db.configAcceso.findFirst({ where: { instalacionId: null }, select: { valor: true } });
  const aviso =
    typeof fila?.valor === "object" &&
    fila.valor !== null &&
    "avisoPrivacidad" in fila.valor &&
    typeof (fila.valor as { avisoPrivacidad?: string }).avisoPrivacidad === "string"
      ? (fila.valor as { avisoPrivacidad: string }).avisoPrivacidad
      : "Tratamos tus datos para controlar el ingreso y la seguridad del recinto, según la Ley 21.719. Puedes ejercer tus derechos contactando al responsable indicado abajo.";
  return (
    <AuthCard titulo="Control de acceso">
      <div className="flex flex-col gap-3 text-left">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="mx-auto h-12 w-auto object-contain" />
        ) : null}
        <p className="t-caption text-center text-fg-muted">{nombre}</p>
        {inst ? <p className="t-body text-center font-medium">{inst.nombre}</p> : null}
        {punto ? <p className="t-caption text-center">{punto.nombre}</p> : null}
        <p className="t-body whitespace-pre-wrap">{aviso}</p>
        <p className="t-caption text-fg-muted">
          Base de licitud: interés legítimo de seguridad del recinto. No pedimos consentimiento salvo
          que el responsable active la captura de fotografía.
        </p>
        {pie ? <p className="t-caption text-fg-muted">{pie}</p> : null}
      </div>
    </AuthCard>
  );
}

/** Página pública enlazada desde el cartel y la portería (R19, CA9). */
export default function PaginaPrivacidadAcceso(props: Props) {
  return (
    <Suspense fallback={<Loading variante="formulario" className="p-4" />}>
      <Contenido {...props} />
    </Suspense>
  );
}