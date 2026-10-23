import type { ReactNode } from "react";

/** Acceso (provisional con el DS): tarjeta centrada de hasta 400px; a 375 ocupa el ancho. */
export default function LayoutAcceso({ children }: { children: ReactNode }) {
  return (
    <main className="pt-safe pb-safe flex min-h-dvh items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-[400px]">
        <p className="mb-6 text-center text-[22px] leading-7 font-bold tracking-[-0.02em] text-fg">
          OPAI
        </p>
        <div className="rounded-lg border border-border bg-surface p-5 md:p-6">{children}</div>
      </div>
    </main>
  );
}
