import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

async function requireContentManager() {
  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", userId)
    .single();

  if (
    profileError ||
    !profile ||
    !profile.active ||
    !["admin", "editor"].includes(profile.role)
  ) {
    redirect("/");
  }

  return supabase;
}

export default async function AdminGenresPage() {
  const supabase =
    await requireContentManager();

  const {
    data: genres,
    error: genresError,
  } = await supabase
    .from("genres")
    .select(
      `
      id,
      name,
      slug,
      parent_genre_id,
      description,
      active,
      updated_at
      `
    )
    .order("name");

  if (genresError) {
    throw new Error(
      genresError.message
    );
  }

  const {
    data: artistGenres,
    error: artistGenresError,
  } = await supabase
    .from("artist_genres")
    .select(
      `
      artist_id,
      genre_id
      `
    );

  if (artistGenresError) {
    throw new Error(
      artistGenresError.message
    );
  }

  const genreMap = new Map(
    (genres ?? []).map(
      (genre) => [
        genre.id,
        genre,
      ]
    )
  );

  const artistCountMap =
    new Map<string, number>();

  for (const row of artistGenres ?? []) {
    artistCountMap.set(
      row.genre_id,
      (artistCountMap.get(
        row.genre_id
      ) ?? 0) + 1
    );
  }

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      {/* HEADER */}

      <header className="border-b-2 border-black px-6 py-5">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
            >
              ← Admin
            </Link>

            <h1 className="mt-2 text-3xl font-black uppercase">
              Genres
            </h1>

            <p className="mt-2 max-w-xl text-sm text-black/60">
              Manage the genre taxonomy used by artists
              and atlas filtering.
            </p>
          </div>

          <Link
            href="/admin/genres/new"
            className="border-2 border-black bg-black px-4 py-3 text-xs font-black uppercase text-white transition-colors hover:bg-white hover:text-black"
          >
            Add Genre
          </Link>
        </div>
      </header>

      {/* CONTENT */}

      <section className="mx-auto max-w-6xl px-6 py-10">
        {!genres?.length ? (
          <div className="border-2 border-black bg-white p-6">
            <p className="font-bold">
              No genres found.
            </p>
          </div>
        ) : (
          <div className="border-2 border-black bg-white">
            {genres.map((genre) => {
              const parentGenre =
                genre.parent_genre_id
                  ? genreMap.get(
                      genre.parent_genre_id
                    )
                  : null;

              const artistCount =
                artistCountMap.get(
                  genre.id
                ) ?? 0;

              return (
                <article
                  key={genre.id}
                  className="grid gap-5 border-b-2 border-black p-5 last:border-b-0 md:grid-cols-[1fr_auto]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-black uppercase">
                        {genre.name}
                      </h2>

                      <span
                        className={
                          genre.active
                            ? "border-2 border-black bg-black px-2 py-1 text-[10px] font-black uppercase text-white"
                            : "border-2 border-black bg-white px-2 py-1 text-[10px] font-black uppercase text-black/50"
                        }
                      >
                        {genre.active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>

                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-black/50">
                      {genre.slug}
                    </p>

                    {parentGenre && (
                      <p className="mt-3 text-sm">
                        <span className="font-bold">
                          Parent:
                        </span>{" "}
                        {
                          parentGenre.name
                        }
                      </p>
                    )}

                    {genre.description && (
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-black/65">
                        {
                          genre.description
                        }
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="border-2 border-black px-2 py-1 text-[10px] font-black uppercase">
                        {artistCount}{" "}
                        {artistCount === 1
                          ? "Artist"
                          : "Artists"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Link
                      href={`/admin/genres/${genre.id}`}
                      className="border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white transition-colors hover:bg-white hover:text-black"
                    >
                      Edit
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}