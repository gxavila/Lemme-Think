import Link from "next/link";
import {
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

async function requireContentManager() {
  const supabase =
    await createClient();

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    redirect(
      "/auth/login"
    );
  }

  const {
    data: profile,
  } =
    await supabase
      .from(
        "profiles"
      )
      .select(
        "role, active"
      )
      .eq(
        "id",
        userId
      )
      .single();

  if (
    !profile ||
    !profile.active ||
    ![
      "admin",
      "editor",
    ].includes(
      profile.role
    )
  ) {
    redirect(
      "/"
    );
  }

  return supabase;
}

function makeSlug(
  value: string
) {
  return value
    .trim()
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );
}

async function createPlaylist(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const name =
    String(
      formData.get(
        "name"
      ) ?? ""
    ).trim();

  const slugInput =
    String(
      formData.get(
        "slug"
      ) ?? ""
    ).trim();

  const genreId =
    String(
      formData.get(
        "genre_id"
      ) ?? ""
    ).trim();

  const description =
    String(
      formData.get(
        "description"
      ) ?? ""
    ).trim();

  const isPublished =
    formData.get(
      "is_published"
    ) === "on";

  if (
    !name ||
    !genreId
  ) {
    throw new Error(
      "Playlist name and genre are required."
    );
  }

  const slug =
    slugInput ||
    makeSlug(
      name
    );

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "playlists"
      )
      .insert({
        name,
        slug,
        description:
          description ||
          null,
        playlist_type:
          "essential",
        genre_id:
          genreId,
        is_published:
          isPublished,
        published_at:
          isPublished
            ? new Date().toISOString()
            : null,
      })
      .select(
        "id"
      )
      .single();

  if (error) {
    throw new Error(
      error.message
    );
  }

  redirect(
    `/admin/playlists/${data.id}`
  );
}

export default async function PlaylistsAdminPage() {
  const supabase =
    await requireContentManager();

  const [
    genresResult,
    playlistsResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "genres"
        )
        .select(
          `
          id,
          name,
          slug,
          active
          `
        )
        .eq(
          "active",
          true
        )
        .order(
          "name"
        ),

      supabase
        .from(
          "playlists"
        )
        .select(
          `
          id,
          name,
          slug,
          description,
          playlist_type,
          genre_id,
          is_published,
          published_at,
          created_at,
          genres (
            id,
            name,
            slug
          )
          `
        )
        .eq(
          "playlist_type",
          "essential"
        )
        .order(
          "name"
        ),
    ]);

  if (
    genresResult.error
  ) {
    throw new Error(
      genresResult.error.message
    );
  }

  if (
    playlistsResult.error
  ) {
    throw new Error(
      playlistsResult.error.message
    );
  }

  const genres =
    genresResult.data ??
    [];

  const playlists =
    playlistsResult.data ??
    [];

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      <header className="border-b-2 border-black px-6 py-5">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin/artists"
              className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
            >
              ← Admin
            </Link>

            <h1 className="mt-2 text-3xl font-black uppercase">
              Essential Playlists
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-black/60">
              Curate genre-based Essential Tracks from music already stored in the Atlas.
            </p>
          </div>

          <Link
            href="/"
            className="w-fit border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white transition-colors hover:bg-white hover:text-black"
          >
            View Atlas →
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-5xl gap-8 px-6 py-10 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside>
          <section className="border-2 border-black bg-white p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
              New Playlist
            </p>

            <h2 className="mt-2 text-2xl font-black uppercase leading-none">
              Create Essentials
            </h2>

            <form
              action={
                createPlaylist
              }
              className="mt-6 space-y-5"
            >
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.12em]">
                  Name
                </span>

                <input
                  name="name"
                  required
                  placeholder="Essential Post-Punk"
                  className="mt-2 w-full border-2 border-black bg-white px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.12em]">
                  Slug
                </span>

                <input
                  name="slug"
                  placeholder="essential-post-punk"
                  className="mt-2 w-full border-2 border-black bg-white px-3 py-2"
                />

                <span className="mt-1 block text-[11px] text-black/45">
                  Leave blank to create it from the name.
                </span>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.12em]">
                  Genre
                </span>

                <select
                  name="genre_id"
                  required
                  defaultValue=""
                  className="mt-2 w-full border-2 border-black bg-white px-3 py-2"
                >
                  <option
                    value=""
                    disabled
                  >
                    Select genre
                  </option>

                  {genres.map(
                    (
                      genre
                    ) => (
                      <option
                        key={
                          genre.id
                        }
                        value={
                          genre.id
                        }
                      >
                        {
                          genre.name
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.12em]">
                  Description
                </span>

                <textarea
                  name="description"
                  rows={4}
                  placeholder="A curated introduction to..."
                  className="mt-2 w-full resize-y border-2 border-black bg-white px-3 py-2"
                />
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="is_published"
                  className="h-4 w-4"
                />

                <span className="text-xs font-black uppercase">
                  Publish immediately
                </span>
              </label>

              <button
                type="submit"
                className="w-full border-2 border-black bg-black px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-black"
              >
                Create Playlist
              </button>
            </form>
          </section>
        </aside>

        <section>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
                Curated
              </p>

              <h2 className="mt-1 text-3xl font-black uppercase leading-none">
                Essential Tracks
              </h2>
            </div>

            <span className="text-xs font-black uppercase text-black/45">
              {playlists.length}{" "}
              {playlists.length ===
              1
                ? "Playlist"
                : "Playlists"}
            </span>
          </div>

          {!playlists.length ? (
            <div className="mt-6 border-2 border-black bg-white p-8">
              <p className="font-black uppercase">
                No Essential playlists yet.
              </p>

              <p className="mt-2 text-sm text-black/55">
                Create the first playlist using the form.
              </p>
            </div>
          ) : (
            <div className="mt-6 divide-y-2 divide-black border-y-2 border-black bg-white">
              {playlists.map(
                (
                  playlist
                ) => {
                  const genre =
                    Array.isArray(
                      playlist.genres
                    )
                      ? playlist.genres[0]
                      : playlist.genres;

                  return (
                    <Link
                      key={
                        playlist.id
                      }
                      href={`/admin/playlists/${playlist.id}`}
                      className="grid gap-3 p-5 transition-colors hover:bg-black hover:text-white sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-black uppercase tracking-[-0.025em]">
                            {
                              playlist.name
                            }
                          </h3>

                          <span
                            className={
                              playlist.is_published
                                ? "border border-current px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em]"
                                : "border border-current px-2 py-1 text-[8px] font-black uppercase tracking-[0.1em] opacity-45"
                            }
                          >
                            {playlist.is_published
                              ? "Published"
                              : "Draft"}
                          </span>
                        </div>

                        <p className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] opacity-55">
                          {genre?.name ??
                            "No Genre"}
                        </p>

                        {playlist.description && (
                          <p className="mt-2 max-w-2xl text-sm opacity-65">
                            {
                              playlist.description
                            }
                          </p>
                        )}
                      </div>

                      <span className="text-xl font-black">
                        →
                      </span>
                    </Link>
                  );
                }
              )}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
