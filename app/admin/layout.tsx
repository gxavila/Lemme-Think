import Link from "next/link";

import { LogoutButton } from "@/components/logout-button";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b-2 border-black bg-white px-6 py-4 text-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link
            href="/admin"
            className="text-sm font-black uppercase tracking-[0.16em] hover:underline"
          >
            Underground Atlas Admin
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="border-2 border-black px-3 py-2 text-xs font-black uppercase transition-colors hover:bg-black hover:text-white"
            >
              View Atlas
            </Link>

            <LogoutButton />
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}