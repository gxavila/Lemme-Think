import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

type PageProps = {
  params: Promise<{
    slug: string;
    releaseId: string;
  }>;
};

type ReleaseLink = {
  id: string;
  platform: string;
  url: string;
  label: string | null;
  sort_order: number;
};

type TrackLink = {
  id: string;
  track_id: string;
  platform: string;
  url: string;
  label: string | null;
  sort_order: number;
};

type Track = {
  id: string;
  title: string;
  track_number: number | null;
  duration_seconds: number | null;
  featured: boolean;
  recommendation_type: string | null;
};

function formatPlatform(
  platform: string
) {
  return platform
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatRecommendation(
  type: string | null
) {
  if (!type) {
    return null;
  }

  return type
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatDuration(
  seconds: number | null
) {
  if (
    seconds === null ||
    seconds === undefined
  ) {
    return null;
  }

  const minutes =
    Math.floor(
      seconds / 60
    );

  const remainingSeconds =
    seconds % 60;

  return `${minutes}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

export default async function ReleasePage({
  params,
}: PageProps) {
  const {
    slug,
    releaseId,
  } = await params;

  const supabase =
    await createClient();

  // ============================================
  // ARTIST
  // ============================================

  const {
    data: artist,
    error: artistError,
  } = await supabase
    .from("artists")
    .select(
      `
      id,
      name,
      slug,
      published
      `
    )
    .eq(
      "slug",
      slug
    )
    .eq(
      "published",
      true
    )
    .maybeSingle();

  if (
    artistError ||
    !artist
  ) {
    notFound();
  }

  // ============================================
  // RELEASE
  // ============================================

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
      cover_image_path,
      featured
      `
    )
    .eq(
      "id",
      releaseId
    )
    .eq(
      "artist_id",
      artist.id
    )
    .maybeSingle();

  if (
    releaseError ||
    !release
  ) {
    notFound();
  }

  // ============================================
  // RELEASE LINKS
  // ============================================

  const {
    data: releaseLinksData,
    error: releaseLinksError,
  } = await supabase
    .from("release_links")
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
      release.id
    )
    .order(
      "sort_order"
    )
    .order(
      "platform"
    );

  if (
    releaseLinksError
  ) {
    console.error(
      "Release links error:",
      releaseLinksError
    );
  }

  const releaseLinks =
    (releaseLinksData ??
      []) as ReleaseLink[];

  // ============================================
  // TRACKS
  // ============================================

  const {
    data: tracksData,
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
      release.id
    )
    .eq(
      "artist_id",
      artist.id
    )
    .order(
      "track_number",
      {
        ascending: true,
        nullsFirst: false,
      }
    )
    .order(
      "title"
    );

  if (
    tracksError
  ) {
    console.error(
      "Tracks error:",
      tracksError
    );
  }

  const tracks =
    (tracksData ??
      []) as Track[];

  // ============================================
  // TRACK LINKS
  // ============================================

  let trackLinks:
    TrackLink[] = [];

  const trackIds =
    tracks.map(
      (track) =>
        track.id
    );

  if (
    trackIds.length > 0
  ) {
    const {
      data: trackLinksData,
      error: trackLinksError,
    } = await supabase
      .from("track_links")
      .select(
        `
        id,
        track_id,
        platform,
        url,
        label,
        sort_order
        `
      )
      .in(
        "track_id",
        trackIds
      )
      .order(
        "sort_order"
      )
      .order(
        "platform"
      );

    if (
      trackLinksError
    ) {
      console.error(
        "Track links error:",
        trackLinksError
      );
    }

    trackLinks =
      (trackLinksData ??
        []) as TrackLink[];
  }

  // ============================================
  // COVER
  // ============================================

  let coverUrl:
    | string
    | null = null;

  if (
    release.cover_image_path
  ) {
    const { data } =
      supabase.storage
        .from(
          "release-images"
        )
        .getPublicUrl(
          release.cover_image_path
        );

    coverUrl =
      data.publicUrl;
  }

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      {/* ========================================
          TOP BAR
      ======================================== */}

      <header className="border-b-2 border-black bg-white px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
          <Link
            href={`/artists/${artist.slug}`}
            className="text-xs font-black uppercase tracking-[0.18em] hover:underline"
          >
            ← {artist.name}
          </Link>

          <Link
            href="/"
            className="text-right text-xs font-black uppercase tracking-[0.18em] hover:underline"
          >
            Back to Atlas →
          </Link>
        </div>
      </header>

      {/* ========================================
          RELEASE HERO
      ======================================== */}

      <section className="border-b-2 border-black">
        <div className="mx-auto grid max-w-6xl lg:grid-cols-[1.05fr_0.95fr]">
          {/* RELEASE COPY */}

          <div className="flex min-h-[420px] flex-col justify-between border-black p-6 sm:p-10 lg:min-h-[560px] lg:border-r-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em]">
                Release
              </p>

              <p className="mt-4 text-sm font-bold uppercase tracking-[0.12em]">
                {artist.name}
              </p>
            </div>

            <div className="py-10">
              <h1 className="max-w-4xl break-words text-[clamp(3rem,8vw,6.5rem)] font-black uppercase leading-[0.86] tracking-[-0.05em]">
                {release.title}
              </h1>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase">
                {
                  release.release_type
                }
              </span>

              {release.release_date && (
                <span className="border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase">
                  {release.release_date.slice(
                    0,
                    4
                  )}
                </span>
              )}

              {release.featured && (
                <span className="border-2 border-black bg-black px-3 py-2 text-xs font-black uppercase text-white">
                  Featured
                </span>
              )}
            </div>
          </div>

          {/* COVER */}

          <div className="relative min-h-[420px] bg-black lg:min-h-[560px]">
            {coverUrl ? (
              <img
                src={
                  coverUrl
                }
                alt={
                  release.title
                }
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-[420px] items-center justify-center p-8 text-center text-white lg:min-h-[560px]">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-white/55">
                    Release
                  </p>

                  <p className="mt-4 text-4xl font-black uppercase leading-[0.95]">
                    {
                      release.title
                    }
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================
          RELEASE LINKS
      ======================================== */}

      {releaseLinks.length >
        0 && (
        <section className="border-b-2 border-black bg-white">
          <div className="mx-auto max-w-6xl px-6 py-7 sm:px-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-black uppercase tracking-[0.2em]">
                Listen to Release
              </p>

              <div className="flex flex-wrap gap-2">
                {releaseLinks.map(
                  (link) => (
                    <a
                      key={
                        link.id
                      }
                      href={
                        link.url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border-2 border-black bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white"
                    >
                      {link.label ??
                        formatPlatform(
                          link.platform
                        )}
                      {" "}
                      ↗
                    </a>
                  )
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========================================
          TRACK LIST
      ======================================== */}

      <section className="mx-auto max-w-6xl px-6 py-12 sm:px-10 sm:py-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em]">
              Track List
            </p>

            <h2 className="mt-2 text-4xl font-black uppercase sm:text-5xl">
              {tracks.length}{" "}
              {tracks.length === 1
                ? "Track"
                : "Tracks"}
            </h2>
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.12em] text-black/50">
            {artist.name} /{" "}
            {release.title}
          </p>
        </div>

        {tracks.length ===
        0 ? (
          <p className="mt-8 border-y-2 border-black py-8 text-lg text-black/55">
            Track list coming soon.
          </p>
        ) : (
          <div className="mt-8 border-y-2 border-black">
            {tracks.map(
              (
                track,
                index
              ) => {
                const links =
                  trackLinks.filter(
                    (
                      link
                    ) =>
                      link.track_id ===
                      track.id
                  );

                const recommendationLabel =
                  track.recommendation_type
                    ? formatRecommendation(
                        track.recommendation_type
                      )
                    : track.featured
                      ? "Featured"
                      : null;

                const duration =
                  formatDuration(
                    track.duration_seconds
                  );

                return (
                  <article
                    key={
                      track.id
                    }
                    className={
                      index ===
                      tracks.length -
                        1
                        ? "py-6"
                        : "border-b-2 border-black py-6"
                    }
                  >
                    <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-start">
                      {/* TRACK INFORMATION */}

                      <div>
                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                          <span className="text-sm font-black text-black/45">
                            {track.track_number ??
                              String(
                                index +
                                  1
                              ).padStart(
                                2,
                                "0"
                              )}
                          </span>

                          <h3 className="text-xl font-black sm:text-2xl">
                            {
                              track.title
                            }
                          </h3>

                          {duration && (
                            <span className="text-xs font-bold uppercase text-black/45">
                              {
                                duration
                              }
                            </span>
                          )}
                        </div>

                        {recommendationLabel && (
                          <div className="mt-3">
                            <span className="inline-flex border-2 border-black px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em]">
                              {
                                recommendationLabel
                              }
                            </span>
                          </div>
                        )}
                      </div>

                      {/* TRACK LISTENING LINKS */}

                      {links.length >
                        0 && (
                        <div className="flex flex-wrap gap-2 sm:max-w-[360px] sm:justify-end">
                          {links.map(
                            (
                              link
                            ) => (
                              <a
                                key={
                                  link.id
                                }
                                href={
                                  link.url
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="border-2 border-black bg-white px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] transition-colors hover:bg-black hover:text-white"
                              >
                                {link.label ??
                                  formatPlatform(
                                    link.platform
                                  )}
                                {" "}
                                ↗
                              </a>
                            )
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}

        {/* ========================================
            NAVIGATION
        ======================================== */}

        <div className="mt-10 flex flex-wrap gap-3 border-t-2 border-black pt-6">
          <Link
            href={`/artists/${artist.slug}`}
            className="border-2 border-black bg-black px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-black"
          >
            ← Back to Artist
          </Link>

          <Link
            href="/"
            className="border-2 border-black bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.12em] transition-colors hover:bg-black hover:text-white"
          >
            Return to Atlas
          </Link>
        </div>
      </section>
    </main>
  );
}