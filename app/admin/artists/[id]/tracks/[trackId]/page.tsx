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
    trackId: string;
  }>;
};

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
    redirect("/auth/login");
  }

  const {
    data: profile,
  } =
    await supabase
      .from("profiles")
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
    redirect("/");
  }

  return supabase;
}

// ============================================
// UPDATE TRACK
// ============================================

async function updateTrack(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const artistId =
    String(
      formData.get(
        "artist_id"
      ) ?? ""
    );

  const trackId =
    String(
      formData.get(
        "track_id"
      ) ?? ""
    );

  const title =
    String(
      formData.get(
        "title"
      ) ?? ""
    ).trim();

  const trackNumberRaw =
    String(
      formData.get(
        "track_number"
      ) ?? ""
    );

  const durationRaw =
    String(
      formData.get(
        "duration_seconds"
      ) ?? ""
    );

  const recommendationType =
    String(
      formData.get(
        "recommendation_type"
      ) ?? ""
    );

  const featured =
    formData.get(
      "featured"
    ) === "on";

  if (
    !artistId ||
    !trackId ||
    !title
  ) {
    throw new Error(
      "Track title is required."
    );
  }

  const trackNumber =
    trackNumberRaw
      ? Number(
          trackNumberRaw
        )
      : null;

  const durationSeconds =
    durationRaw
      ? Number(
          durationRaw
        )
      : null;

  if (
    trackNumber !== null &&
    (
      !Number.isFinite(
        trackNumber
      ) ||
      trackNumber < 1
    )
  ) {
    throw new Error(
      "Track number must be 1 or greater."
    );
  }

  if (
    durationSeconds !==
      null &&
    (
      !Number.isFinite(
        durationSeconds
      ) ||
      durationSeconds < 0
    )
  ) {
    throw new Error(
      "Duration must be 0 or greater."
    );
  }

  const {
    error,
  } =
    await supabase
      .from("tracks")
      .update({
        title,
        track_number:
          trackNumber,
        duration_seconds:
          durationSeconds,
        featured,
        recommendation_type:
          recommendationType ||
          null,
      })
      .eq(
        "id",
        trackId
      )
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
    `/admin/artists/${artistId}/tracks/${trackId}`
  );
}

// ============================================
// ADD TRACK LINK
// ============================================

async function addTrackLink(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const artistId =
    String(
      formData.get(
        "artist_id"
      ) ?? ""
    );

  const trackId =
    String(
      formData.get(
        "track_id"
      ) ?? ""
    );

  const platform =
    String(
      formData.get(
        "platform"
      ) ?? ""
    );

  const url =
    String(
      formData.get(
        "url"
      ) ?? ""
    ).trim();

  const label =
    String(
      formData.get(
        "label"
      ) ?? ""
    ).trim();

  const sortOrderRaw =
    String(
      formData.get(
        "sort_order"
      ) ?? "0"
    );

  if (
    !artistId ||
    !trackId ||
    !platform ||
    !url
  ) {
    throw new Error(
      "Track, platform, and URL are required."
    );
  }

  const {
    error,
  } =
    await supabase
      .from(
        "track_links"
      )
      .insert({
        track_id:
          trackId,
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
    `/admin/artists/${artistId}/tracks/${trackId}`
  );
}

// ============================================
// DELETE TRACK LINK
// ============================================

async function deleteTrackLink(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const artistId =
    String(
      formData.get(
        "artist_id"
      ) ?? ""
    );

  const trackId =
    String(
      formData.get(
        "track_id"
      ) ?? ""
    );

  const linkId =
    String(
      formData.get(
        "link_id"
      ) ?? ""
    );

  if (
    !artistId ||
    !trackId ||
    !linkId
  ) {
    throw new Error(
      "Missing track link information."
    );
  }

  const {
    error,
  } =
    await supabase
      .from(
        "track_links"
      )
      .delete()
      .eq(
        "id",
        linkId
      )
      .eq(
        "track_id",
        trackId
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  redirect(
    `/admin/artists/${artistId}/tracks/${trackId}`
  );
}

// ============================================
// PAGE
// ============================================

export default async function TrackPage({
  params,
}: PageProps) {
  const {
    id,
    trackId,
  } = await params;

  const supabase =
    await requireContentManager();

  // ==========================================
  // ARTIST
  // ==========================================

  const {
    data: artist,
    error:
      artistError,
  } =
    await supabase
      .from(
        "artists"
      )
      .select(
        `
        id,
        name,
        slug
        `
      )
      .eq(
        "id",
        id
      )
      .single();

  if (
    artistError ||
    !artist
  ) {
    notFound();
  }

  // ==========================================
  // TRACK
  // ==========================================

  const {
    data: track,
    error:
      trackError,
  } =
    await supabase
      .from(
        "tracks"
      )
      .select(
        `
        id,
        artist_id,
        release_id,
        title,
        track_number,
        duration_seconds,
        featured,
        recommendation_type
        `
      )
      .eq(
        "id",
        trackId
      )
      .eq(
        "artist_id",
        id
      )
      .single();

  if (
    trackError ||
    !track
  ) {
    notFound();
  }

  // ==========================================
  // RELEASE
  // ==========================================

  let release:
    | {
        id: string;
        title: string;
      }
    | null = null;

  if (
    track.release_id
  ) {
    const {
      data:
        releaseData,
    } =
      await supabase
        .from(
          "releases"
        )
        .select(
          "id, title"
        )
        .eq(
          "id",
          track.release_id
        )
        .maybeSingle();

    release =
      releaseData ??
      null;
  }

  // ==========================================
  // TRACK LINKS
  // ==========================================

  const {
    data: links,
    error:
      linksError,
  } =
    await supabase
      .from(
        "track_links"
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
        "track_id",
        trackId
      )
      .order(
        "sort_order"
      )
      .order(
        "platform"
      );

  if (
    linksError
  ) {
    throw new Error(
      linksError.message
    );
  }

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      {/* ========================================
          HEADER
      ======================================== */}

      <header className="border-b-2 border-black px-6 py-5">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {track.release_id ? (
              <Link
                href={`/admin/artists/${artist.id}/releases/${track.release_id}`}
                className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
              >
                ← Release
              </Link>
            ) : (
              <Link
                href={`/admin/artists/${artist.id}`}
                className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
              >
                ← Artist
              </Link>
            )}

            <h1 className="mt-2 text-3xl font-black uppercase">
              {track.title}
            </h1>

            <p className="mt-1 text-xs font-bold uppercase tracking-[0.15em]">
              {artist.name}
            </p>

            {release && (
              <p className="mt-1 text-xs font-bold text-black/55">
                {release.title}
              </p>
            )}
          </div>

          <Link
            href={`/artists/${artist.slug}`}
            className="border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white transition-colors hover:bg-white hover:text-black"
          >
            View Artist →
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl space-y-10 px-6 py-10">
        {/* ======================================
            TRACK DETAILS
        ====================================== */}

        <section className="border-2 border-black bg-white p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-black uppercase">
                Track Details
              </h2>

              <p className="mt-2 text-sm text-black/60">
                Edit the track and choose whether it appears in the public Start Here section.
              </p>
            </div>

            {track.featured && (
              <span className="w-fit border-2 border-black bg-black px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                Featured
              </span>
            )}
          </div>

          <form
            action={
              updateTrack
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
              name="track_id"
              value={
                track.id
              }
            />

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Track Title
              </span>

              <input
                name="title"
                required
                defaultValue={
                  track.title
                }
                className="mt-2 w-full border-2 border-black px-3 py-2"
              />
            </label>

            <div className="grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Track Number
                </span>

                <input
                  type="number"
                  name="track_number"
                  min="1"
                  defaultValue={
                    track.track_number ??
                    ""
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Duration Seconds
                </span>

                <input
                  type="number"
                  name="duration_seconds"
                  min="0"
                  defaultValue={
                    track.duration_seconds ??
                    ""
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Recommendation
              </span>

              <select
                name="recommendation_type"
                defaultValue={
                  track.recommendation_type ??
                  ""
                }
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

              <p className="mt-2 text-xs text-black/55">
                Recommendation type provides the public label when this track is featured.
              </p>
            </label>

            <label className="flex items-start gap-3 border-2 border-black p-4">
              <input
                type="checkbox"
                name="featured"
                defaultChecked={
                  track.featured
                }
                className="mt-1"
              />

              <span>
                <span className="block font-black uppercase">
                  Featured Track
                </span>

                <span className="mt-1 block text-sm text-black/60">
                  Featured tracks can appear in the artist page&apos;s Start Here section.
                </span>
              </span>
            </label>

            <button
              type="submit"
              className="border-2 border-black bg-black px-5 py-3 text-xs font-black uppercase text-white transition-colors hover:bg-white hover:text-black"
            >
              Save Track
            </button>
          </form>
        </section>

        {/* ======================================
            ADD TRACK LINK
        ====================================== */}

        <section className="border-2 border-black bg-white p-6">
          <h2 className="text-xl font-black uppercase">
            Add Track Link
          </h2>

          <p className="mt-2 text-sm text-black/60">
            Add a direct listening or viewing link for this track.
          </p>

          <form
            action={
              addTrackLink
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
              name="track_id"
              value={
                track.id
              }
            />

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
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

              <label className="block">
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

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Custom Label
                </span>

                <input
                  name="label"
                  placeholder="Optional"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="block">
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
              className="border-2 border-black bg-black px-4 py-3 text-xs font-black uppercase text-white transition-colors hover:bg-white hover:text-black"
            >
              Add Link
            </button>
          </form>
        </section>

        {/* ======================================
            CURRENT LINKS
        ====================================== */}

        <section className="border-2 border-black bg-white p-6">
          <h2 className="text-xl font-black uppercase">
            Current Links
          </h2>

          {!links?.length ? (
            <p className="mt-5 text-black/60">
              No track links added yet.
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

                      <p className="mt-2 text-xs font-bold uppercase text-black/55">
                        Sort:{" "}
                        {
                          link.sort_order
                        }
                      </p>
                    </div>

                    <form
                      action={
                        deleteTrackLink
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
                        name="track_id"
                        value={
                          track.id
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
                        className="border-2 border-red-700 px-3 py-2 text-xs font-bold uppercase text-red-700 transition-colors hover:bg-red-700 hover:text-white"
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
      </section>
    </main>
  );
}