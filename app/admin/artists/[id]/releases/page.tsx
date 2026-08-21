import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function requireContentManager() {
  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const { data: profile } =
    await supabase
      .from("profiles")
      .select("role, active")
      .eq("id", userId)
      .single();

  if (
    !profile ||
    !profile.active ||
    !["admin", "editor"].includes(
      profile.role
    )
  ) {
    redirect("/");
  }

  return supabase;
}

async function addRelease(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const artistId = String(
    formData.get("artist_id") ?? ""
  );

  const title = String(
    formData.get("title") ?? ""
  ).trim();

  const releaseType = String(
    formData.get("release_type") ??
      "album"
  );

  const releaseDate = String(
    formData.get("release_date") ?? ""
  );

  const featured =
    formData.get("featured") === "on";

  if (!artistId || !title) {
    throw new Error(
      "Artist and release title are required."
    );
  }

  const { error } = await supabase
    .from("releases")
    .insert({
      artist_id: artistId,
      title,
      release_type: releaseType,
      release_date:
        releaseDate || null,
      featured,
    });

  if (error) {
    throw new Error(error.message);
  }

  redirect(
    `/admin/artists/${artistId}/releases`
  );
}

async function deleteRelease(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const artistId = String(
    formData.get("artist_id") ?? ""
  );

  const releaseId = String(
    formData.get("release_id") ?? ""
  );

  if (!artistId || !releaseId) {
    throw new Error(
      "Missing artist or release ID."
    );
  }

  // Tracks use ON DELETE SET NULL for release_id,
  // so explicitly delete release tracks first.

  const { data: tracks } =
    await supabase
      .from("tracks")
      .select("id")
      .eq("artist_id", artistId)
      .eq("release_id", releaseId);

  if (tracks?.length) {
    const trackIds = tracks.map(
      (track) => track.id
    );

    const { error: trackError } =
      await supabase
        .from("tracks")
        .delete()
        .in("id", trackIds);

    if (trackError) {
      throw new Error(
        trackError.message
      );
    }
  }

  const { error } = await supabase
    .from("releases")
    .delete()
    .eq("id", releaseId)
    .eq("artist_id", artistId);

  if (error) {
    throw new Error(error.message);
  }

  redirect(
    `/admin/artists/${artistId}/releases`
  );
}

export default async function ReleasesPage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase =
    await requireContentManager();

  const {
    data: artist,
    error: artistError,
  } = await supabase
    .from("artists")
    .select("id, name, slug")
    .eq("id", id)
    .single();

  if (artistError || !artist) {
    notFound();
  }

  const {
    data: releases,
    error: releasesError,
  } = await supabase
    .from("releases")
    .select(
      `
      id,
      title,
      release_type,
      release_date,
      featured,
      cover_image_path,
      created_at
      `
    )
    .eq("artist_id", id)
    .order("release_date", {
      ascending: false,
      nullsFirst: false,
    });

  if (releasesError) {
    throw new Error(
      releasesError.message
    );
  }

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      <header className="border-b-2 border-black px-6 py-5">
        <div className="mx-auto max-w-5xl">
          <Link
            href={`/admin/artists/${artist.id}`}
            className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
          >
            ← Edit Artist
          </Link>

          <h1 className="mt-2 text-3xl font-black uppercase">
            {artist.name} Music
          </h1>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        {/* ADD RELEASE */}

        <section className="border-2 border-black bg-white p-6">
          <h2 className="text-xl font-black uppercase">
            Add Release
          </h2>

          <form
            action={addRelease}
            className="mt-6 space-y-6"
          >
            <input
              type="hidden"
              name="artist_id"
              value={artist.id}
            />

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Release Title
              </span>

              <input
                name="title"
                required
                className="mt-2 w-full border-2 border-black px-3 py-2"
              />
            </label>

            <div className="grid gap-6 sm:grid-cols-2">
              <label>
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Release Type
                </span>

                <select
                  name="release_type"
                  defaultValue="album"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                >
                  <option value="album">
                    Album
                  </option>

                  <option value="ep">
                    EP
                  </option>

                  <option value="single">
                    Single
                  </option>

                  <option value="compilation">
                    Compilation
                  </option>

                  <option value="live">
                    Live
                  </option>

                  <option value="other">
                    Other
                  </option>
                </select>
              </label>

              <label>
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Release Date
                </span>

                <input
                  type="date"
                  name="release_date"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="featured"
              />

              <span className="font-bold">
                Featured Release
              </span>
            </label>

            <button
              type="submit"
              className="border-2 border-black bg-black px-5 py-3 text-sm font-bold uppercase text-white"
            >
              Add Release
            </button>
          </form>
        </section>

        {/* RELEASES */}

        <section className="mt-10 border-2 border-black bg-white p-6">
          <h2 className="text-xl font-black uppercase">
            Releases
          </h2>

          {!releases?.length ? (
            <p className="mt-5 text-black/60">
              No releases added yet.
            </p>
          ) : (
            <div className="mt-6 space-y-4">
              {releases.map(
                (release) => (
                  <article
                    key={release.id}
                    className="border-2 border-black p-5"
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xl font-black uppercase">
                          {
                            release.title
                          }
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold uppercase">
                          <span>
                            {
                              release.release_type
                            }
                          </span>

                          {release.release_date && (
                            <span>
                              •{" "}
                              {
                                release.release_date
                              }
                            </span>
                          )}

                          {release.featured && (
                            <span>
                              • Featured
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/artists/${artist.id}/releases/${release.id}`}
                          className="border-2 border-black bg-black px-4 py-2 text-xs font-bold uppercase text-white"
                        >
                          Manage
                        </Link>

                        <form
                          action={
                            deleteRelease
                          }
                        >
                          <input
                            type="hidden"
                            name="artist_id"
                            value={
                              artist.id
                            }
                          />

                          <input
                            type="hidden"
                            name="release_id"
                            value={
                              release.id
                            }
                          />

                          <button
                            type="submit"
                            className="border-2 border-red-700 px-4 py-2 text-xs font-bold uppercase text-red-700"
                          >
                            Delete
                          </button>
                        </form>
                      </div>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}