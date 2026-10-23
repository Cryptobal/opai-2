import { LinkNext } from "@/app/_components/link-next";

/** Pie del login: accesos a los otros portales. */
export function PiePortales() {
  return (
    <>
      <LinkNext href="/trabajador/login" className="font-medium text-accent">
        Entrar como trabajador
      </LinkNext>
      <span className="text-fg-subtle">·</span>
      <LinkNext href="/cliente/login" className="font-medium text-accent">
        Portal cliente
      </LinkNext>
    </>
  );
}
