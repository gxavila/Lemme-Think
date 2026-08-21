import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, display_name, role, active")
    .eq("id", userId)
    .single();

  if (
    error ||
    !profile ||
    !profile.active ||
    !["admin", "editor"].includes(profile.role)
  ) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      <header className="border-b-2 border-black px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em]">
              Underground Music Atlas
            </p>

            <h1 className="mt-1 text-2xl font-black uppercase">
              Admin
            </h1>
          </div>

          <Link
            href="/"
            className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
          >
            View Atlas →
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="border-b-2 border-black pb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em]">
            Signed In
          </p>

          <p className="mt-2 text-xl font-black">
            {profile.display_name}
          </p>

          <p className="mt-1 text-sm uppercase">
            {profile.role}
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/artists"
            className="border-2 border-black bg-white p-6 hover:bg-black hover:text-white"
          >
            <p className="text-2xl font-black uppercase">
              Artists
            </p>

            <p className="mt-3 text-sm">
              Create and manage artist profiles.
            </p>
          </Link>

          <Link
            href="/admin/scenes"
            className="border-2 border-black bg-white p-6 hover:bg-black hover:text-white"
          >
            <p className="text-2xl font-black uppercase">
              Scenes
            </p>

            <p className="mt-3 text-sm">
              Manage geographic music scenes.
            </p>
          </Link>

          <Link
            href="/admin/genres"
            className="border-2 border-black bg-white p-6 hover:bg-black hover:text-white"
          >
            <p className="text-2xl font-black uppercase">
              Genres
            </p>

            <p className="mt-3 text-sm">
              Maintain the atlas genre taxonomy.
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}