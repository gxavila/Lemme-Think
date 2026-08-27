import Link from "next/link";

type UndergroundAtlasHeaderProps = {
  actionHref?: string;
  actionLabel?: string;
};

export default function UndergroundAtlasHeader({
  actionHref,
  actionLabel,
}: UndergroundAtlasHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b-2 border-black bg-white">
      <div className="flex min-h-[64px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group inline-flex min-w-0 items-center gap-3"
        >
          <span
            aria-hidden="true"
            className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border-2 border-black bg-black text-white transition-colors group-hover:bg-white group-hover:text-black"
          >
            <span className="-translate-x-[3px] -translate-y-[4px] text-[11px] font-black uppercase leading-none">
              U
            </span>

            <span className="absolute h-[2px] w-[28px] -rotate-45 bg-current" />

            <span className="translate-x-[4px] translate-y-[5px] text-[11px] font-black uppercase leading-none">
              A
            </span>
          </span>

          <span className="min-w-0">
            <span className="block text-[9px] font-black uppercase tracking-[0.22em] text-black/45">
              Map the Underground
            </span>

            <span className="mt-0.5 block truncate text-base font-black uppercase leading-none tracking-[-0.04em] sm:text-lg">
              Underground Atlas
            </span>
          </span>
        </Link>

        {actionHref &&
          actionLabel && (
          <Link
            href={
              actionHref
            }
            className="shrink-0 text-[10px] font-black uppercase tracking-[0.14em] hover:underline"
          >
            {actionLabel}
          </Link>
        )}
      </div>
    </header>
  );
}
