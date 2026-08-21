import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function AdminArtistsPage() {
  const supabase = await createClient();

  // ============================================
  // AUTHENTICATION
  // ============================================

  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  if (claimsError || !userId) {
    redirect("/auth/login");
  }

  // ============================================
  // AUTHORIZATION
  // ============================================

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("id, display_name, role, active")
    .eq("id", userId)
    .single();

  // Instead of silently redirecting home,
  // show us exactly what failed.
  if (profileError) {
    return (
      <main className="min-h-screen bg-[#f3efe4] p-8 text-black">
        <div className="mx-auto max-w-3xl border-2 border-red-600 bg-white p-6">
          <h1 className="text-2xl font-black uppercase">
            Profile Error
          </h1>

          <p className="mt-4">
            {profileError.message}
          </p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-[#f3efe4] p-8 text-black">
        <div className="mx-auto max-w-3xl border-2 border-red-600 bg-white p-6">
          <h1 className="text-2xl font-black uppercase">
            Profile Not Found
          </h1>

          <p className="mt-4">
            No profile exists for the authenticated user.
          </p>
        </div>
      </main>
    );
  }

  if (!profile.active) {
    return (
      <main className="min-h-screen bg-[#f3efe4] p-8 text-black">
        <div className="mx-auto max-w-3xl border-2 border-red-600 bg-white p-6">
          <h1 className="text-2xl font-black uppercase">
            Account Inactive
          </h1>
        </div>
      </main>
    );
  }

  if (!["admin", "editor"].includes(profile.role)) {
    return (
      <main className="min-h-screen bg-[#f3efe4] p-8 text-black">
        <div className="mx-auto max-w-3xl border-2 border-red-600 bg-white p-6">
          <h1 className="text-2xl font-black uppercase">
            Access Denied
          </h1>

          <p className="mt-4">
            Current role: {profile.role}
          </p>
        </div>
      </main>
    );
  }

  // ============================================
  // LOAD ARTISTS
  // ============================================

  const {
    data: artists,
    error: artistsError,
  } = await supabase
    .from("artists")
    .select(
      `
        id,
        name,
        slug,
        status,
        artist_type,
        published,
        featured,
        updated_at
      `
    )
    .order("name");

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      <header className="border-b-2 border-black px-6 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div>
            <Link
              href="/admin"
              className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
            >
              ← Admin
            </Link>

            <h1 className="mt-2 text-3xl font-black uppercase">
              Artists
            </h1>
          </div>

          <Link
            href="/admin/artists/new"
            className="border-2 border-black bg-black px-4 py-2 text-sm font-bold uppercase text-white"
          >
            Add Artist
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 border-b-2 border-black pb-5">
          <p className="text-xs font-bold uppercase tracking-[0.15em]">
            Signed in as
          </p>

          <p className="mt-1 font-bold">
            {profile.display_name}
          </p>

          <p className="mt-1 text-xs font-bold uppercase">
            {profile.role}
          </p>
        </div>

        {artistsError ? (
          <div className="border-2 border-red-600 bg-white p-5">
            <p className="font-black uppercase">
              Unable to Load Artists
            </p>

            <p className="mt-3 text-sm">
              {artistsError.message}
            </p>
          </div>
        ) : artists && artists.length > 0 ? (
          <div className="border-2 border-black bg-white">
            {artists.map((artist) => (
              <div
                key={artist.id}
                className="flex flex-col gap-4 border-b-2 border-black p-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-xl font-black uppercase">
                    {artist.name}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold uppercase">
                    <span>{artist.status}</span>

                    {artist.artist_type && (
                      <span>
                        • {artist.artist_type}
                      </span>
                    )}

                    <span>
                      •{" "}
                      {artist.published
                        ? "Published"
                        : "Draft"}
                    </span>

                    {artist.featured && (
                      <span>• Featured</span>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Link
                    href={`/artists/${artist.slug}`}
                    className="border-2 border-black px-3 py-2 text-xs font-bold uppercase hover:bg-black hover:text-white"
                  >
                    View
                  </Link>

                  <Link
                    href={`/admin/artists/${artist.id}`}
                    className="border-2 border-black bg-black px-3 py-2 text-xs font-bold uppercase text-white"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-black bg-white p-6">
            <p className="font-bold">
              No artists found.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}