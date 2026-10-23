import { cn } from "../cn";

export const estiloTab = (seleccionada: boolean) =>
  cn(
    "relative inline-flex h-11 shrink-0 items-center gap-1.5 px-3 text-base whitespace-nowrap outline-none transition-colors",
    "focus-visible:rounded-md focus-visible:outline-2 focus-visible:-outline-offset-[6px] focus-visible:outline-focus",
    seleccionada
      ? "font-semibold text-fg after:absolute after:inset-x-2.5 after:-bottom-px after:h-0.5 after:rounded-t-sm after:bg-fg after:content-['']"
      : "font-medium text-fg-muted hover:text-fg",
  );

export function ContadorTab({ n, activa }: { n: number | undefined; activa?: boolean }) {
  return n !== undefined ? (
    <span
      className={cn(
        "t-numeric inline-flex h-[18px] min-w-5 items-center justify-center rounded-full px-1.5 text-xs",
        activa ? "bg-fg text-bg" : "bg-fill text-fg-muted",
      )}
    >
      {n}
    </span>
  ) : null;
}
