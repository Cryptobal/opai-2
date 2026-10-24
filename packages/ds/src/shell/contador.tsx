export function Contador({ n }: { n?: number | undefined }) {
  return n ? (
    <span className="t-numeric absolute -top-1.5 left-1/2 ml-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger-fg px-1 text-[11px] leading-none font-semibold text-white shadow-[0_0_0_2px_var(--ds-surface)] dark:bg-danger dark:text-inverse-fg">
      {n}
    </span>
  ) : null;
}
