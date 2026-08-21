import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

type ArtistPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type ArtistImage = {
  storage_path: string;
  image_type: string;
  alt_text: string | null;
  photographer: string | null;
  sort_order: number;
};

type ArtistLink = {
  platform: string;
  url: string;
  label: string | null;
};

type Scene = {
  id?: string;
  name: string;
  slug: string;
  is_primary?: boolean;
};

type ReleaseLink = {
  platform: string;
  url: string;
  label: string | null;
};

type Release = {
  id: string;
  title: string;
  release_type: string;
  release_date: string | null;
  cover_image_path: string | null;
  featured: boolean;
  links?: ReleaseLink[];
};

type TrackLink = {
  platform: string;
  url: string;
  label: string | null;
};

type RecommendedTrack = {
  id: string;
  title: string;
  featured: boolean;
  recommendation_type: string | null;
  track_number: number | null;
  duration_seconds: number | null;

  release?: {
    id: string;
    title: string;
    release_type: string;
    release_date?: string | null;
    cover_image_path?: string | null;
  } | null;

  links?: TrackLink[];
};

function formatPlatform(
  platform: string
) {
  return platform
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
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
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function formatDuration(
  seconds: number | null
) {
  if (!seconds) {
    return null;
  }

  const minutes =
    Math.floor(seconds / 60);

  const remainingSeconds =
    seconds % 60;

  return `${minutes}:${String(
    remainingSeconds
  ).padStart(2, "0")}`;
}

export default async function ArtistPage({
  params,
}: ArtistPageProps) {
  const { slug } =
    await params;

  const supabase =
    await createClient();

  // ============================================
  // ARTIST
  // ============================================

  const {
    data: artist,
    error: artistError,
  } = await supabase.rpc(
    "get_artist_detail",
    {
      artist_slug: slug,
    }
  );

  if (
    artistError ||
    !artist
  ) {
    notFound();
  }

  // ============================================
  // MUSIC
  // ============================================

  const {
    data: music,
    error: musicError,
  } = await supabase.rpc(
    "get_artist_music",
    {
      artist_slug: slug,
    }
  );

  if (musicError) {
    console.error(
      "get_artist_music error:",
      musicError
    );
  }

  const musicData =
    Array.isArray(music)
      ? music[0]
      : music;

  // ============================================
  // NORMALIZE DATA
  // ============================================

  const images =
    (artist.images ??
      []) as ArtistImage[];

  const links =
    (artist.links ??
      []) as ArtistLink[];

  const releases =
    (musicData?.releases ??
      []) as Release[];

  const recommendedTracks =
    (musicData?.recommended_tracks ??
      []) as RecommendedTrack[];

  const scenes =
    (artist.scenes ??
      []) as Scene[];

  const genres =
    artist.genres ?? [];

  const location =
    artist.location ?? null;

  const primaryScene =
    scenes.find(
      (scene) =>
        scene.is_primary
    ) ??
    scenes[0] ??
    null;

  const secondaryScenes =
    scenes.filter(
      (scene) =>
        scene.slug !==
        primaryScene?.slug
    );

  // ============================================
  // HERO IMAGE
  // ============================================

  const heroImage =
    images.find(
      (image) =>
        image.image_type ===
        "hero"
    ) ??
    images.find(
      (image) =>
        image.image_type ===
        "profile"
    ) ??
    images[0];

  let heroImageUrl:
    | string
    | null = null;

  if (
    heroImage?.storage_path
  ) {
    const { data } =
      supabase.storage
        .from(
          "artist-images"
        )
        .getPublicUrl(
          heroImage.storage_path
        );

    heroImageUrl =
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
            href="/"
            className="text-xs font-black uppercase tracking-[0.18em] hover:underline"
          >
            ← Back to Atlas
          </Link>

          {primaryScene && (
            <Link
              href={`/scenes/${primaryScene.slug}`}
              className="text-right text-xs font-black uppercase tracking-[0.18em] hover:underline"
            >
              {primaryScene.name} →
            </Link>
          )}
        </div>
      </header>

      {/* ========================================
          HERO
      ======================================== */}

      <section className="border-b-2 border-black">
        <div className="mx-auto grid max-w-6xl lg:grid-cols-[1.15fr_0.85fr]">
          {/* HERO COPY */}

          <div className="flex min-h-[420px] flex-col justify-between border-black p-6 sm:p-10 lg:min-h-[620px] lg:border-r-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em]">
                Artist
              </p>

              {location && (
                <p className="mt-4 text-sm font-bold uppercase tracking-[0.12em]">
                  {[
                    location.city,
                    location.region,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </div>

            <div className="py-12">
              <h1 className="max-w-4xl break-words text-[clamp(3.75rem,11vw,9rem)] font-black uppercase leading-[0.82] tracking-[-0.06em]">
                {artist.name}
              </h1>
            </div>

            <div className="flex flex-wrap gap-2">
              {genres.map(
                (genre: {
                  id?: string;
                  name: string;
                  slug?: string;
                }) => (
                  <span
                    key={
                      genre.id ??
                      genre.slug ??
                      genre.name
                    }
                    className="border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase"
                  >
                    {genre.name}
                  </span>
                )
              )}
            </div>
          </div>

          {/* HERO IMAGE */}

          <div className="relative min-h-[420px] bg-black lg:min-h-[620px]">
            {heroImageUrl ? (
              <>
                <img
                  src={
                    heroImageUrl
                  }
                  alt={
                    heroImage.alt_text ??
                    artist.name
                  }
                  className="absolute inset-0 h-full w-full object-cover"
                />

                <div className="absolute inset-0 bg-black/10" />

                {heroImage.photographer && (
                  <div className="absolute bottom-0 right-0 bg-black px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                    Photo:{" "}
                    {
                      heroImage.photographer
                    }
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full min-h-[420px] items-center justify-center p-8 text-center text-white lg:min-h-[620px]">
                <p className="text-sm font-black uppercase tracking-[0.2em]">
                  Artist image coming soon
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================
          MAIN CONTENT
      ======================================== */}

      <section className="mx-auto grid max-w-6xl lg:grid-cols-[1fr_320px]">
        {/* LEFT COLUMN */}

        <div className="border-black p-6 sm:p-10 lg:border-r-2">
          {/* ABOUT */}

          <section>
            <p className="text-xs font-black uppercase tracking-[0.2em]">
              About
            </p>

            <div className="mt-5 max-w-3xl">
              {artist.bio_long ? (
                <p className="whitespace-pre-line text-lg leading-8">
                  {
                    artist.bio_long
                  }
                </p>
              ) : artist.bio_short ? (
                <p className="text-lg leading-8">
                  {
                    artist.bio_short
                  }
                </p>
              ) : (
                <p className="text-lg leading-8 text-black/55">
                  Artist biography coming soon.
                </p>
              )}
            </div>
          </section>

          {/* ====================================
              ESSENTIAL MUSIC
          ==================================== */}

          {recommendedTracks.length >
            0 && (
            <section className="mt-14 border-t-2 border-black pt-8">
              <p className="text-xs font-black uppercase tracking-[0.2em]">
                Essential Music
              </p>

              <h2 className="mt-2 text-3xl font-black uppercase">
                Start Here
              </h2>

              <div className="mt-6 divide-y-2 divide-black border-y-2 border-black">
                {recommendedTracks.map(
                  (track) => (
                    <article
                      key={
                        track.id
                      }
                      className="py-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-black">
                              {track.track_number
                                ? `${track.track_number}. `
                                : ""}
                              {
                                track.title
                              }
                            </h3>

                            {track.recommendation_type && (
                              <span className="border-2 border-black px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
                                {formatRecommendation(
                                  track.recommendation_type
                                )}
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold uppercase text-black/60">
                            {track.release?.title && (
                              <span>
                                {
                                  track
                                    .release
                                    .title
                                }
                              </span>
                            )}

                            {formatDuration(
                              track.duration_seconds
                            ) && (
                              <span>
                                •{" "}
                                {formatDuration(
                                  track.duration_seconds
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        {!!track.links
                          ?.length && (
                          <div className="flex flex-wrap gap-2">
                            {track.links.map(
                              (
                                link
                              ) => (
                                <a
                                  key={`${track.id}-${link.platform}-${link.url}`}
                                  href={
                                    link.url
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase transition-colors hover:bg-black hover:text-white"
                                >
                                  {link.label ??
                                    formatPlatform(
                                      link.platform
                                    )}
                                </a>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </article>
                  )
                )}
              </div>
            </section>
          )}

          {/* ====================================
              RELEASES
          ==================================== */}

          {releases.length >
            0 && (
            <section className="mt-14 border-t-2 border-black pt-8">
              <p className="text-xs font-black uppercase tracking-[0.2em]">
                Discography
              </p>

              <h2 className="mt-2 text-3xl font-black uppercase">
                Releases
              </h2>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {releases.map(
                  (release) => {
                    let coverUrl:
                      | string
                      | null = null;

                    if (
                      release.cover_image_path
                    ) {
                      const {
                        data,
                      } =
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
                      <article
                        key={
                          release.id
                        }
                        className="border-2 border-black bg-white"
                      >
                        {coverUrl ? (
                          <div className="aspect-square overflow-hidden border-b-2 border-black bg-black">
                            <img
                              src={
                                coverUrl
                              }
                              alt={
                                release.title
                              }
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex aspect-square items-center justify-center border-b-2 border-black bg-black p-6 text-center text-white">
                            <span className="text-sm font-black uppercase tracking-[0.18em]">
                              {
                                release.title
                              }
                            </span>
                          </div>
                        )}

                        <div className="p-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xl font-black uppercase">
                              {
                                release.title
                              }
                            </p>

                            {release.featured && (
                              <span className="border border-black px-2 py-1 text-[9px] font-black uppercase">
                                Featured
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold uppercase text-black/60">
                            <span>
                              {
                                release.release_type
                              }
                            </span>

                            {release.release_date && (
                              <span>
                                •{" "}
                                {release.release_date.slice(
                                  0,
                                  4
                                )}
                              </span>
                            )}
                          </div>

                          {!!release.links
                            ?.length && (
                            <div className="mt-5 flex flex-wrap gap-2">
                              {release.links.map(
                                (
                                  link
                                ) => (
                                  <a
                                    key={`${release.id}-${link.platform}-${link.url}`}
                                    href={
                                      link.url
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="border-2 border-black px-3 py-2 text-[10px] font-black uppercase transition-colors hover:bg-black hover:text-white"
                                  >
                                    {link.label ??
                                      formatPlatform(
                                        link.platform
                                      )}
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
            </section>
          )}

          {/* ====================================
              LISTEN & FOLLOW
          ==================================== */}

          {links.length >
            0 && (
            <section className="mt-14 border-t-2 border-black pt-8">
              <p className="text-xs font-black uppercase tracking-[0.2em]">
                Listen & Follow
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                {links.map(
                  (link) => (
                    <a
                      key={`${link.platform}-${link.url}`}
                      href={
                        link.url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border-2 border-black bg-white px-4 py-3 text-xs font-black uppercase transition-colors hover:bg-black hover:text-white"
                    >
                      {link.label ??
                        formatPlatform(
                          link.platform
                        )}
                    </a>
                  )
                )}
              </div>
            </section>
          )}
        </div>

        {/* ======================================
            ARTIST DETAILS SIDEBAR
        ====================================== */}

        <aside className="bg-white p-6 sm:p-8">
          <p className="text-xs font-black uppercase tracking-[0.2em]">
            Artist Details
          </p>

          <dl className="mt-6 divide-y-2 divide-black border-y-2 border-black">
            {/* STATUS */}

            <div className="py-4">
              <dt className="text-[10px] font-black uppercase tracking-[0.18em] text-black/55">
                Status
              </dt>

              <dd className="mt-1 font-black uppercase">
                {artist.status ??
                  "Unknown"}
              </dd>
            </div>

            {/* TYPE */}

            <div className="py-4">
              <dt className="text-[10px] font-black uppercase tracking-[0.18em] text-black/55">
                Type
              </dt>

              <dd className="mt-1 font-black uppercase">
                {artist.artist_type ??
                  "Artist"}
              </dd>
            </div>

            {/* YEARS */}

            {(artist.year_started ||
              artist.year_ended) && (
              <div className="py-4">
                <dt className="text-[10px] font-black uppercase tracking-[0.18em] text-black/55">
                  Years Active
                </dt>

                <dd className="mt-1 font-black uppercase">
                  {artist.year_started ??
                    "?"}
                  {" – "}
                  {artist.year_ended ??
                    "Present"}
                </dd>
              </div>
            )}

            {/* LOCATION */}

            {location && (
              <div className="py-4">
                <dt className="text-[10px] font-black uppercase tracking-[0.18em] text-black/55">
                  Location
                </dt>

                <dd className="mt-1 font-black">
                  {[
                    location.city,
                    location.region,
                    location.country,
                  ]
                    .filter(Boolean)
                    .join(", ")}
                </dd>
              </div>
            )}

            {/* SCENES */}

            {scenes.length >
              0 && (
              <div className="py-4">
                <dt className="text-[10px] font-black uppercase tracking-[0.18em] text-black/55">
                  Scenes
                </dt>

                <dd className="mt-3 flex flex-wrap gap-2">
                  {scenes.map(
                    (scene) => (
                      <Link
                        key={
                          scene.id ??
                          scene.slug
                        }
                        href={`/scenes/${scene.slug}`}
                        className={
                          scene.is_primary
                            ? "border-2 border-black bg-black px-2.5 py-2 text-[10px] font-black uppercase text-white transition-colors hover:bg-white hover:text-black"
                            : "border-2 border-black bg-white px-2.5 py-2 text-[10px] font-black uppercase transition-colors hover:bg-black hover:text-white"
                        }
                      >
                        {
                          scene.name
                        }
                      </Link>
                    )
                  )}
                </dd>
              </div>
            )}

            {/* MONTHLY LISTENERS */}

            {artist.monthly_listeners !=
              null && (
              <div className="py-4">
                <dt className="text-[10px] font-black uppercase tracking-[0.18em] text-black/55">
                  Monthly Listeners
                </dt>

                <dd className="mt-1 text-xl font-black">
                  {Number(
                    artist.monthly_listeners
                  ).toLocaleString()}
                </dd>
              </div>
            )}
          </dl>
        </aside>
      </section>

      {/* ========================================
          KEEP EXPLORING
      ======================================== */}

      <section className="border-t-2 border-black bg-[#f3efe4]">
        <div className="mx-auto max-w-6xl px-6 py-12 sm:px-10 sm:py-16">
          <p className="text-xs font-black uppercase tracking-[0.2em]">
            Keep Exploring
          </p>

          <h2 className="mt-2 text-4xl font-black uppercase sm:text-5xl">
            Follow the Scene
          </h2>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {/* PRIMARY SCENE */}

            {primaryScene && (
              <Link
                href={`/scenes/${primaryScene.slug}`}
                className="group border-2 border-black bg-black p-6 text-white transition-colors hover:bg-white hover:text-black sm:p-8"
              >
                <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-60">
                  Primary Scene
                </p>

                <h3 className="mt-4 text-3xl font-black uppercase leading-[0.95] sm:text-4xl">
                  {
                    primaryScene.name
                  }
                </h3>

                <p className="mt-8 text-xs font-black uppercase tracking-[0.15em] group-hover:underline">
                  Explore Scene →
                </p>
              </Link>
            )}

            {/* OTHER SCENES */}

            {secondaryScenes.length >
              0 && (
              <div className="border-2 border-black bg-white p-6 sm:p-8">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/55">
                  Also Connected To
                </p>

                <div className="mt-4 divide-y-2 divide-black border-y-2 border-black">
                  {secondaryScenes.map(
                    (scene) => (
                      <Link
                        key={
                          scene.id ??
                          scene.slug
                        }
                        href={`/scenes/${scene.slug}`}
                        className="flex items-center justify-between gap-4 py-4 font-black uppercase hover:underline"
                      >
                        <span>
                          {
                            scene.name
                          }
                        </span>

                        <span>
                          →
                        </span>
                      </Link>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RETURN TO MAP */}

          <div className="mt-8 border-t-2 border-black pt-6">
            <Link
              href="/"
              className="inline-flex border-2 border-black bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.12em] transition-colors hover:bg-black hover:text-white"
            >
              ← Return to Atlas
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}