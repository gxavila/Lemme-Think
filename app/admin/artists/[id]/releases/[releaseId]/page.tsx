import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import ReleaseCoverManager from "@/components/admin/ReleaseCoverManager";

export const instant = false;

type PageProps = {
  params: Promise<{
    id: string;
    releaseId: string;
  }>;
};

async function requireContentManager() {
  const supabase = await createClient();

  const {
    data: claimsData,
  } = await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const {
    data: profile,
  } = await supabase
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

// ============================================
// UPDATE RELEASE
// ============================================

async function updateRelease(
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

  const title = String(
    formData.get("title") ?? ""
  ).trim();

  const releaseType = String(
    formData.get("release_type") ?? "album"
  );

  const releaseDate = String(
    formData.get("release_date") ?? ""
  );

  const featured =
    formData.get("featured") === "on";

  if (
    !artistId ||
    !releaseId ||
    !title
  ) {
    throw new Error(
      "Missing required release information."
    );
  }

  const {
    error,
  } = await supabase
    .from("releases")
    .update({
      title,
      release_type:
        releaseType,
      release_date:
        releaseDate || null,
      featured,
    })
    .eq("id", releaseId)
    .eq(
      "artist_id",
      artistId
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  redirect(
    `/admin/artists/${artistId}/releases/${releaseId}`
  );
}

// ============================================
// ADD RELEASE LINK
// ============================================

async function addReleaseLink(
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

  const platform = String(
    formData.get("platform") ?? ""
  );

  const url = String(
    formData.get("url") ?? ""
  ).trim();

  const label = String(
    formData.get("label") ?? ""
  ).trim();

  const sortOrderRaw = String(
    formData.get("sort_order") ?? "0"
  );

  if (
    !artistId ||
    !releaseId ||
    !platform ||
    !url
  ) {
    throw new Error(
      "Platform and URL are required."
    );
  }

  const {
    error,
  } = await supabase
    .from(
      "release_links"
    )
    .insert({
      release_id:
        releaseId,
      platform,
      url,
      label:
        label || null,
      sort_order:
        Number(
          sortOrderRaw
        ) || 0,
    });

  if (error) {
    throw new Error(
      error.message
    );
  }

  redirect(
    `/admin/artists/${artistId}/releases/${releaseId}`
  );
}

// ============================================
// DELETE RELEASE LINK
// ============================================

async function deleteReleaseLink(
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

  const linkId = String(
    formData.get("link_id") ?? ""
  );

  if (
    !artistId ||
    !releaseId ||
    !linkId
  ) {
    throw new Error(
      "Missing release link information."
    );
  }

  const {
    error,
  } = await supabase
    .from(
      "release_links"
    )
    .delete()
    .eq("id", linkId)
    .eq(
      "release_id",
      releaseId
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  redirect(
    `/admin/artists/${artistId}/releases/${releaseId}`
  );
}

// ============================================
// ADD TRACK
// ============================================

async function addTrack(
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

  const title = String(
    formData.get("title") ?? ""
  ).trim();

  const trackNumberRaw = String(
    formData.get("track_number") ?? ""
  );

  const durationRaw = String(
    formData.get("duration_seconds") ?? ""
  );

  const recommendationType = String(
    formData.get(
      "recommendation_type"
    ) ?? ""
  );

  const featured =
    formData.get("featured") === "on";

  if (
    !artistId ||
    !releaseId ||
    !title
  ) {
    throw new Error(
      "Track title is required."
    );
  }

  const {
    error,
  } = await supabase
    .from("tracks")
    .insert({
      artist_id:
        artistId,
      release_id:
        releaseId,
      title,
      track_number:
        trackNumberRaw
          ? Number(
              trackNumberRaw
            )
          : null,
      duration_seconds:
        durationRaw
          ? Number(
              durationRaw
            )
          : null,
      featured,
      recommendation_type:
        recommendationType ||
        null,
    });

  if (error) {
    throw new Error(
      error.message
    );
  }

  redirect(
    `/admin/artists/${artistId}/releases/${releaseId}`
  );
}

// ============================================
// DELETE TRACK
// ============================================

async function deleteTrack(
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

  const trackId = String(
    formData.get("track_id") ?? ""
  );

  if (
    !artistId ||
    !releaseId ||
    !trackId
  ) {
    throw new Error(
      "Missing track information."
    );
  }

  const {
    error,
  } = await supabase
    .from("tracks")
    .delete()
    .eq("id", trackId)
    .eq(
      "artist_id",
      artistId
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  redirect(
    `/admin/artists/${artistId}/releases/${releaseId}`
  );
}

// ============================================
// PAGE
// ============================================

export default async function ReleasePage({
  params,
}: PageProps) {
  const {
    id,
    releaseId,
  } = await params;

  const supabase =
    await requireContentManager();

  // ==========================================
  // ARTIST
  // ==========================================

  const {
    data: artist,
    error: artistError,
  } = await supabase
    .from("artists")
    .select(
      `
      id,
      name,
      slug
      `
    )
    .eq("id", id)
    .single();

  if (
    artistError ||
    !artist
  ) {
    notFound();
  }

  // ==========================================
  // RELEASE
  // ==========================================

  const {
    data: release,
    error: releaseError,
  } = await supabase
    .from("releases")
    .select(
      `
      id,
      artist_id,
      title,
      release_type,
      release_date,
      featured,
      cover_image_path
      `
    )
    .eq(
      "id",
      releaseId
    )
    .maybeSingle();

  if (releaseError) {
    return (
      <main className="min-h-screen bg-[#f3efe4] p-8 text-black">
        <div className="mx-auto max-w-4xl border-2 border-red-700 bg-white p-6">
          <h1 className="text-2xl font-black uppercase text-red-700">
            Release Query Error
          </h1>

          <p className="mt-4">
            {releaseError.message}
          </p>

          <div className="mt-6 border-t-2 border-black pt-4 text-sm">
            <p>
              <strong>
                Artist ID:
              </strong>{" "}
              {id}
            </p>

            <p className="mt-2">
              <strong>
                Release ID:
              </strong>{" "}
              {releaseId}
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!release) {
    return (
      <main className="min-h-screen bg-[#f3efe4] p-8 text-black">
        <div className="mx-auto max-w-4xl border-2 border-red-700 bg-white p-6">
          <h1 className="text-2xl font-black uppercase text-red-700">
            Release Not Found
          </h1>

          <p className="mt-4">
            Supabase returned no release for this release ID.
          </p>

          <div className="mt-6 border-t-2 border-black pt-4 text-sm">
            <p>
              <strong>
                Artist ID:
              </strong>{" "}
              {id}
            </p>

            <p className="mt-2">
              <strong>
                Release ID:
              </strong>{" "}
              {releaseId}
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (
    release.artist_id !==
    id
  ) {
    return (
      <main className="min-h-screen bg-[#f3efe4] p-8 text-black">
        <div className="mx-auto max-w-4xl border-2 border-red-700 bg-white p-6">
          <h1 className="text-2xl font-black uppercase text-red-700">
            Artist / Release Mismatch
          </h1>

          <p className="mt-4">
            The release exists, but it belongs to a different artist.
          </p>

          <div className="mt-6 border-t-2 border-black pt-4 text-sm">
            <p>
              <strong>
                URL Artist ID:
              </strong>{" "}
              {id}
            </p>

            <p className="mt-2">
              <strong>
                Release Artist ID:
              </strong>{" "}
              {
                release.artist_id
              }
            </p>

            <p className="mt-2">
              <strong>
                Release ID:
              </strong>{" "}
              {releaseId}
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ==========================================
  // RELEASE LINKS
  // ==========================================

  const {
    data: links,
    error: linksError,
  } = await supabase
    .from(
      "release_links"
    )
    .select(
      `
      id,
      platform,
      url,
      label,
      sort_order
      `
    )
    .eq(
      "release_id",
      releaseId
    )
    .order(
      "sort_order"
    )
    .order(
      "platform"
    );

  if (linksError) {
    throw new Error(
      linksError.message
    );
  }

  // ==========================================
  // TRACKS
  // ==========================================

  const {
    data: tracks,
    error: tracksError,
  } = await supabase
    .from("tracks")
    .select(
      `
      id,
      title,
      track_number,
      duration_seconds,
      featured,
      recommendation_type
      `
    )
    .eq(
      "release_id",
      releaseId
    )
    .eq(
      "artist_id",
      id
    )
    .order(
      "track_number"
    );

  if (tracksError) {
    throw new Error(
      tracksError.message
    );
  }

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      {/* ========================================
          HEADER
      ======================================== */}

      <header className="border-b-2 border-black px-6 py-5">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href={`/admin/artists/${artist.id}/releases`}
              className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
            >
              ← Music
            </Link>

            <h1 className="mt-2 text-3xl font-black uppercase">
              {release.title}
            </h1>

            <p className="mt-1 text-xs font-bold uppercase tracking-[0.15em]">
              {artist.name}
            </p>
          </div>

          <Link
            href={`/artists/${artist.slug}`}
            className="border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white"
          >
            View Artist →
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl space-y-10 px-6 py-10">
        {/* ======================================
            RELEASE DETAILS
        ====================================== */}

        <section className="border-2 border-black bg-white p-6">
          <h2 className="text-xl font-black uppercase">
            Release Details
          </h2>

          <form
            action={
              updateRelease
            }
            className="mt-6 space-y-6"
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

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Title
              </span>

              <input
                name="title"
                required
                defaultValue={
                  release.title
                }
                className="mt-2 w-full border-2 border-black px-3 py-2"
              />
            </label>

            <div className="grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Release Type
                </span>

                <select
                  name="release_type"
                  defaultValue={
                    release.release_type
                  }
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

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Release Date
                </span>

                <input
                  type="date"
                  name="release_date"
                  defaultValue={
                    release.release_date ??
                    ""
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="featured"
                defaultChecked={
                  release.featured
                }
              />

              <span className="font-bold">
                Featured Release
              </span>
            </label>

            <button
              type="submit"
              className="border-2 border-black bg-black px-5 py-3 text-xs font-black uppercase text-white"
            >
              Save Release
            </button>
          </form>
        </section>

        {/* ======================================
            RELEASE COVER
        ====================================== */}

        <ReleaseCoverManager
          artistSlug={
            artist.slug
          }
          releaseId={
            release.id
          }
          currentCoverPath={
            release.cover_image_path
          }
        />

        {/* ======================================
            RELEASE LINKS
        ====================================== */}

        <section className="border-2 border-black bg-white p-6">
          <h2 className="text-xl font-black uppercase">
            Release Links
          </h2>

          <p className="mt-2 text-sm text-black/60">
            Add listening links for the complete release.
          </p>

          <form
            action={
              addReleaseLink
            }
            className="mt-6 space-y-5"
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

            <div className="grid gap-5 sm:grid-cols-2">
              <label>
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Platform
                </span>

                <select
                  name="platform"
                  defaultValue="bandcamp"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                >
                  <option value="spotify">
                    Spotify
                  </option>

                  <option value="bandcamp">
                    Bandcamp
                  </option>

                  <option value="apple_music">
                    Apple Music
                  </option>

                  <option value="youtube">
                    YouTube
                  </option>

                  <option value="soundcloud">
                    SoundCloud
                  </option>

                  <option value="official">
                    Official
                  </option>

                  <option value="other">
                    Other
                  </option>
                </select>
              </label>

              <label>
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  URL
                </span>

                <input
                  type="url"
                  name="url"
                  required
                  placeholder="https://..."
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label>
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Custom Label
                </span>

                <input
                  name="label"
                  placeholder="Optional"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label>
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Sort Order
                </span>

                <input
                  type="number"
                  name="sort_order"
                  defaultValue="0"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>
            </div>

            <button
              type="submit"
              className="border-2 border-black bg-black px-4 py-3 text-xs font-black uppercase text-white"
            >
              Add Release Link
            </button>
          </form>

          {!links?.length ? (
            <p className="mt-6 text-black/60">
              No release links added yet.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {links.map(
                (link) => (
                  <div
                    key={
                      link.id
                    }
                    className="flex flex-col justify-between gap-4 border-2 border-black p-4 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="font-black uppercase">
                        {link.label ??
                          link.platform.replaceAll(
                            "_",
                            " "
                          )}
                      </p>

                      <a
                        href={
                          link.url
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block break-all text-sm underline"
                      >
                        {link.url}
                      </a>

                      <p className="mt-2 text-xs uppercase text-black/60">
                        Sort:{" "}
                        {
                          link.sort_order
                        }
                      </p>
                    </div>

                    <form
                      action={
                        deleteReleaseLink
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

                      <input
                        type="hidden"
                        name="link_id"
                        value={
                          link.id
                        }
                      />

                      <button
                        type="submit"
                        className="border-2 border-red-700 px-3 py-2 text-xs font-bold uppercase text-red-700"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* ======================================
            ADD TRACK
        ====================================== */}

        <section className="border-2 border-black bg-white p-6">
          <h2 className="text-xl font-black uppercase">
            Add Track
          </h2>

          <form
            action={
              addTrack
            }
            className="mt-6 space-y-6"
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

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Track Title
              </span>

              <input
                name="title"
                required
                className="mt-2 w-full border-2 border-black px-3 py-2"
              />
            </label>

            <div className="grid gap-6 sm:grid-cols-3">
              <label>
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Track Number
                </span>

                <input
                  type="number"
                  name="track_number"
                  min="1"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label>
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Duration Seconds
                </span>

                <input
                  type="number"
                  name="duration_seconds"
                  min="0"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label>
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Recommendation
                </span>

                <select
                  name="recommendation_type"
                  defaultValue=""
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                >
                  <option value="">
                    None
                  </option>

                  <option value="essential_track">
                    Essential Track
                  </option>

                  <option value="deep_cut">
                    Deep Cut
                  </option>

                  <option value="popular">
                    Popular
                  </option>

                  <option value="other">
                    Other
                  </option>
                </select>
              </label>
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="featured"
              />

              <span className="font-bold">
                Featured Track
              </span>
            </label>

            <button
              type="submit"
              className="border-2 border-black bg-black px-5 py-3 text-xs font-black uppercase text-white"
            >
              Add Track
            </button>
          </form>
        </section>

        {/* ======================================
            TRACKS
        ====================================== */}

        <section className="border-2 border-black bg-white p-6">
          <h2 className="text-xl font-black uppercase">
            Tracks
          </h2>

          {!tracks?.length ? (
            <p className="mt-5 text-black/60">
              No tracks added yet.
            </p>
          ) : (
            <div className="mt-6 divide-y-2 divide-black border-y-2 border-black">
              {tracks.map(
                (track) => (
                  <div
                    key={
                      track.id
                    }
                    className="flex flex-col justify-between gap-4 py-5 sm:flex-row sm:items-center"
                  >
                    <div>
                      <p className="text-lg font-black">
                        {track.track_number
                          ? `${track.track_number}. `
                          : ""}
                        {track.title}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold uppercase text-black/60">
                        {track.featured && (
                          <span>
                            Featured
                          </span>
                        )}

                        {track.recommendation_type && (
                          <span>
                            •{" "}
                            {track.recommendation_type.replaceAll(
                              "_",
                              " "
                            )}
                          </span>
                        )}

                        {track.duration_seconds !=
                          null && (
                          <span>
                            •{" "}
                            {
                              track.duration_seconds
                            }{" "}
                            sec
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/artists/${artist.id}/tracks/${track.id}`}
                        className="border-2 border-black bg-white px-3 py-2 text-xs font-bold uppercase transition-colors hover:bg-black hover:text-white"
                      >
                        Manage Links
                      </Link>

                      <form
                        action={
                          deleteTrack
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

                        <input
                          type="hidden"
                          name="track_id"
                          value={
                            track.id
                          }
                        />

                        <button
                          type="submit"
                          className="border-2 border-red-700 px-3 py-2 text-xs font-bold uppercase text-red-700"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}