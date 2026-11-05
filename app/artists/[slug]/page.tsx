import Link from "next/link";
import { notFound } from "next/navigation";

import UndergroundAtlasHeader from "@/components/UndergroundAtlasHeader";
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
  position_x: number | null;
  position_y: number | null;
};

type ArtistLink = {
  platform: string;
  url: string;
  label: string | null;
  sort_order?: number | null;
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

type AssociationGenre = {
  name: string;
  slug: string;
};

type AssociationLocation = {
  name: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
};

type AssociatedArtist = {
  artist_id: string;
  name: string;
  slug: string;
  status: string | null;
  relationship: string | null;
  primary_location: AssociationLocation | null;
  genres: AssociationGenre[];
  profile_image: string | null;
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

function formatReleaseType(
  value: string
) {
  return value
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function formatRelationship(
  value: string | null
) {
  if (!value) {
    return "Associated Act";
  }

  return value
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function PlatformIcon({
  platform,
}: {
  platform: string;
}) {
  const key =
    platform
      .trim()
      .toLowerCase()
      .replaceAll(
        " ",
        "_"
      );

  const iconClass =
    "h-5 w-5";

  switch (key) {
    case "youtube":
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={
            iconClass
          }
        >
          <rect
            x="2"
            y="5"
            width="20"
            height="14"
            rx="4"
            fill="currentColor"
          />

          <path
            d="M10 9L16 12L10 15V9Z"
            fill="white"
          />
        </svg>
      );

    case "spotify":
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={
            iconClass
          }
          fill="none"
        >
          <circle
            cx="12"
            cy="12"
            r="10"
            fill="currentColor"
          />

          <path
            d="M7 9.2C10.8 8.2 15.3 8.6 18.3 10.2"
            stroke="white"
            strokeWidth="1.7"
            strokeLinecap="round"
          />

          <path
            d="M7.8 12.2C10.9 11.4 14.6 11.8 17.2 13.1"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          <path
            d="M8.7 15C11.1 14.4 13.8 14.7 16.1 15.8"
            stroke="white"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      );

    case "instagram":
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={
            iconClass
          }
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect
            x="3"
            y="3"
            width="18"
            height="18"
            rx="5"
          />

          <circle
            cx="12"
            cy="12"
            r="4"
          />

          <circle
            cx="17.5"
            cy="6.5"
            r="1"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      );

    case "apple_music":
    case "applemusic":
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={
            iconClass
          }
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18V6l10-2v12" />

          <ellipse
            cx="6.5"
            cy="18"
            rx="2.5"
            ry="2"
          />

          <ellipse
            cx="16.5"
            cy="16"
            rx="2.5"
            ry="2"
          />
        </svg>
      );

    case "soundcloud":
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={
            iconClass
          }
          fill="currentColor"
        >
          <path d="M2 14.5h1v4H2v-4Zm2-2h1v6H4v-6Zm2-1h1v7H6v-7Zm2-2h1v9H8v-9Zm3-.5a5 5 0 0 1 9.6 2H21a3 3 0 0 1 0 6H11V9Z" />
        </svg>
      );

    case "bandcamp":
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={
            iconClass
          }
          fill="currentColor"
        >
          <path d="M7.2 6H22l-5.2 12H2L7.2 6Z" />
        </svg>
      );

    case "tiktok":
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={
            iconClass
          }
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 4v10.5a4.5 4.5 0 1 1-3-4.25" />
          <path d="M14 4c.7 2.4 2.3 3.8 5 4" />
        </svg>
      );

    case "facebook":
      return (
        <span
          aria-hidden="true"
          className="text-[22px] font-black leading-none"
        >
          f
        </span>
      );

    case "x":
    case "twitter":
      return (
        <span
          aria-hidden="true"
          className="text-[17px] font-black leading-none"
        >
          X
        </span>
      );

    case "bluesky":
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={
            iconClass
          }
          fill="currentColor"
        >
          <path d="M12 11.2C10.8 8.8 7.5 4.7 4.5 2.7 1.6.8.5 1.1.5 4.5c0 .7.4 5.7.7 6.5 1 3.2 4.6 4.3 7.7 3.7-5.4.9-6.8 4-3.8 7 5.7 5.9 6.5-1.3 6.9-4 .4 2.7 1.2 9.9 6.9 4 3-3 1.6-6.1-3.8-7 3.1.6 6.7-.5 7.7-3.7.3-.8.7-5.8.7-6.5 0-3.4-1.1-3.7-4-1.8-3 2-6.3 6.1-7.5 8.5Z" />
        </svg>
      );

    case "official":
    case "website":
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={
            iconClass
          }
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
          />

          <path d="M3 12h18" />

          <path d="M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9" />

          <path d="M12 3c-2.5 2.5-3.5 5.5-3.5 9s1 6.5 3.5 9" />
        </svg>
      );

    default:
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={
            iconClass
          }
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 5h5v5" />
          <path d="M10 14 19 5" />
          <path d="M19 13v6H5V5h6" />
        </svg>
      );
  }
}

function PlatformIconLink({
  platform,
  url,
  label,
}: {
  platform: string;
  url: string;
  label?: string | null;
}) {
  const linkLabel =
    label ??
    formatPlatform(
      platform
    );

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={
        linkLabel
      }
      title={
        linkLabel
      }
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center border-2 border-black bg-white transition-colors hover:bg-black hover:text-white"
    >
      <PlatformIcon
        platform={
          platform
        }
      />

      <span className="sr-only">
        {linkLabel}
      </span>
    </a>
  );
}

export default async function ArtistPage({
  params,
}: ArtistPageProps) {
  const {
    slug,
  } =
    await params;

  const supabase =
    await createClient();

  // ============================================
  // ARTIST
  // ============================================

  const {
    data: artist,
    error: artistError,
  } =
    await supabase.rpc(
      "get_artist_detail",
      {
        artist_slug:
          slug,
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
  } =
    await supabase.rpc(
      "get_artist_music",
      {
        artist_slug:
          slug,
      }
    );

  if (
    musicError
  ) {
    console.error(
      "get_artist_music error:",
      musicError
    );
  }

  const musicData =
    Array.isArray(
      music
    )
      ? music[0]
      : music;

  // ============================================
  // ASSOCIATED ARTISTS
  // ============================================

  const {
    data:
      associationData,
    error:
      associationError,
  } =
    await supabase.rpc(
      "get_artist_associations",
      {
        artist_slug:
          slug,
      }
    );

  if (
    associationError
  ) {
    console.error(
      "get_artist_associations error:",
      associationError
    );
  }

  const associationResult =
    Array.isArray(
      associationData
    )
      ? associationData[0]
      : associationData;

  const associatedArtists =
    (
      associationResult?.associations ??
      []
    ) as AssociatedArtist[];

  // ============================================
  // NORMALIZE DATA
  // ============================================

  const images =
    (
      artist.images ??
      []
    ) as ArtistImage[];

  const links =
    (
      (
        artist.links ??
        []
      ) as ArtistLink[]
    ).sort(
      (
        a,
        b
      ) =>
        (
          a.sort_order ??
          0
        ) -
        (
          b.sort_order ??
          0
        )
    );

  const releases =
    (
      musicData?.releases ??
      []
    ) as Release[];

  const scenes =
    (
      artist.scenes ??
      []
    ) as Scene[];

  const genres =
    (
      artist.genres ??
      []
    ) as {
      id?: string;
      name: string;
      slug: string;
    }[];

  const location =
    artist.location ??
    null;

  // ============================================
  // HERO IMAGE
  // ============================================

  const heroImage =
    images.find(
      (
        image
      ) =>
        image.image_type ===
        "hero"
    ) ??
    images.find(
      (
        image
      ) =>
        image.image_type ===
        "profile"
    ) ??
    images[0];

  let heroImageUrl:
    | string
    | null =
    null;

  if (
    heroImage?.storage_path
  ) {
    const {
      data,
    } =
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

  // ============================================
  // DISPLAY VALUES
  // ============================================

  const locationLabel =
    location
      ? [
          location.city ??
            location.name,
          location.region,
          location.country,
        ]
          .filter(
            Boolean
          )
          .join(
            ", "
          )
      : null;

  const featuredRelease =
    releases.find(
      (
        release
      ) =>
        release.featured
    ) ??
    releases[0] ??
    null;

  const additionalReleases =
    featuredRelease
      ? releases.filter(
          (
            release
          ) =>
            release.id !==
            featuredRelease.id
        )
      : releases;

  const longBio =
    artist.bio_long?.trim();

  const shortBio =
    artist.bio_short?.trim();

  const showLongBio =
    longBio &&
    longBio !==
      shortBio;

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      <UndergroundAtlasHeader
        actionHref="/"
        actionLabel="Back to Map →"
      />

      {/* ========================================
          ARTIST
      ======================================== */}

      <section className="border-b-2 border-black bg-white">
        <div className="grid items-stretch lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          {/* IDENTITY */}

          <div className="flex h-full flex-col justify-between border-black px-4 py-6 sm:px-6 sm:py-8 lg:border-r-2 lg:px-8 lg:py-10">
            <div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/45">
                  Artist
                </p>

                {locationLabel && (
                  <p className="text-[10px] font-black uppercase tracking-[0.11em] text-black/65">
                    {locationLabel}
                  </p>
                )}
              </div>

              <h1 className="mt-5 max-w-5xl break-words text-[clamp(2.6rem,10vw,6.5rem)] font-black uppercase leading-[0.84] tracking-[-0.055em]">
                {artist.name}
              </h1>

              {shortBio && (
                <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-black/70 sm:text-lg sm:leading-8">
                  {shortBio}
                </p>
              )}
            </div>

            <div className="mt-7">
              {/* GENRES */}

              {genres.length >
                0 && (
                <div className="flex flex-wrap gap-2">
                  {genres.map(
                    (
                      genre
                    ) => (
                      <span
                        key={
                          genre.id ??
                          genre.slug
                        }
                        className="border-2 border-black bg-black px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.09em] text-white"
                      >
                        {genre.name}
                      </span>
                    )
                  )}
                </div>
              )}

              {/* DETAILS */}

              <div className="mt-3 flex flex-wrap gap-2">
                {artist.year_started && (
                  <span className="border-2 border-black bg-white px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.09em]">
                    {artist.year_started}
                    {artist.year_ended
                      ? `–${artist.year_ended}`
                      : "–Present"}
                  </span>
                )}

                {artist.status && (
                  <span className="border-2 border-black bg-white px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.09em]">
                    {artist.status}
                  </span>
                )}

                {artist.artist_type && (
                  <span className="border-2 border-black bg-white px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.09em]">
                    {artist.artist_type}
                  </span>
                )}
              </div>

              {/* SOCIAL LINKS */}

              {links.length >
                0 && (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-[9px] font-black uppercase tracking-[0.15em] text-black/45">
                    Listen / Follow
                  </span>

                  {links.map(
                    (
                      link
                    ) => (
                      <PlatformIconLink
                        key={`${link.platform}-${link.url}`}
                        platform={
                          link.platform
                        }
                        url={
                          link.url
                        }
                        label={
                          link.label
                        }
                      />
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {/* PHOTO */}

          <div className="flex items-center justify-center bg-black p-0 sm:p-4 lg:p-6">
            {heroImageUrl &&
            heroImage ? (
              <div className="relative flex w-full items-center justify-center overflow-hidden">
                <img
                  src={
                    heroImageUrl
                  }
                  alt={
                    heroImage.alt_text ??
                    artist.name
                  }
                  className="
                    block
                    h-auto
                    w-auto
                    max-w-full
                    object-contain
                    max-h-[320px]
                    sm:max-h-[440px]
                    lg:max-h-[560px]
                  "
                />

                {heroImage.photographer && (
                  <div className="absolute bottom-0 right-0 bg-black px-3 py-2 text-[8px] font-black uppercase tracking-[0.1em] text-white">
                    Photo:{" "}
                    {
                      heroImage.photographer
                    }
                  </div>
                )}
              </div>
            ) : (
              <div className="flex min-h-[260px] w-full items-end p-6 text-white sm:min-h-[340px] lg:min-h-[420px]">
                <p className="text-3xl font-black uppercase leading-[0.9] tracking-[-0.04em]">
                  {artist.name}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================
          FULL BIO
      ======================================== */}

      {showLongBio && (
        <section className="border-b-2 border-black">
          <div className="grid lg:grid-cols-[180px_minmax(0,1fr)]">
            <div className="border-black px-4 py-6 sm:px-6 lg:border-r-2 lg:px-8 lg:py-8">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-black/45">
                About
              </p>
            </div>

            <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
              <p className="max-w-4xl whitespace-pre-line text-base leading-7 text-black/70 sm:text-lg sm:leading-8">
                {longBio}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ========================================
          RELEASES
      ======================================== */}

      <section className="border-b-2 border-black bg-white">
        <div className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-black/45">
                Music
              </p>

              <h2 className="mt-1 text-[clamp(2rem,5vw,3.5rem)] font-black uppercase leading-[0.9] tracking-[-0.045em]">
                Releases
              </h2>
            </div>

            {releases.length >
              0 && (
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-black/45">
                {
                  releases.length
                }{" "}
                {releases.length ===
                1
                  ? "Release"
                  : "Releases"}
              </p>
            )}
          </div>

          {!featuredRelease ? (
            <p className="mt-6 text-sm text-black/55">
              No releases are listed yet.
            </p>
          ) : (
            <>
              {/* ESSENTIAL RELEASE */}

              <article className="mt-7 grid overflow-hidden border-2 border-black bg-[#f3efe4] md:grid-cols-[minmax(220px,340px)_minmax(0,1fr)]">
                <div className="flex max-h-[340px] items-center justify-center border-b-2 border-black bg-black md:border-b-0 md:border-r-2">
                  {featuredRelease.cover_image_path ? (
                    <img
                      src={
                        supabase.storage
                          .from(
                            "release-images"
                          )
                          .getPublicUrl(
                            featuredRelease.cover_image_path
                          ).data
                          .publicUrl
                      }
                      alt={
                        featuredRelease.title
                      }
                      className="block h-auto max-h-[340px] w-auto max-w-full object-contain"
                    />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center p-8 text-center text-white">
                      <span className="text-xl font-black uppercase tracking-[-0.02em]">
                        {
                          featuredRelease.title
                        }
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-between p-5 sm:p-7">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-black/45">
                      Essential Release
                    </p>

                    <h3 className="mt-3 text-3xl font-black uppercase leading-[0.92] tracking-[-0.04em] sm:text-4xl">
                      {
                        featuredRelease.title
                      }
                    </h3>

                    <p className="mt-3 text-[10px] font-black uppercase tracking-[0.1em] text-black/45">
                      {formatReleaseType(
                        featuredRelease.release_type
                      )}

                      {featuredRelease.release_date
                        ? ` · ${featuredRelease.release_date}`
                        : ""}
                    </p>
                  </div>

                  {featuredRelease.links &&
                    featuredRelease.links.length >
                      0 && (
                      <div className="mt-7 flex flex-wrap gap-2">
                        {featuredRelease.links.map(
                          (
                            link
                          ) => (
                            <a
                              key={`${link.platform}-${link.url}`}
                              href={
                                link.url
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="border-2 border-black bg-white px-3 py-2 text-[9px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white"
                            >
                              {link.label ??
                                formatPlatform(
                                  link.platform
                                )}{" "}
                              ↗
                            </a>
                          )
                        )}
                      </div>
                    )}
                </div>
              </article>

              {/* MORE RELEASES */}

              {additionalReleases.length >
                0 && (
                <div className="mt-9">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-black/45">
                    More Releases
                  </p>

                  <div className="mt-4 divide-y-2 divide-black border-y-2 border-black">
                    {additionalReleases.map(
                      (
                        release
                      ) => (
                        <article
                          key={
                            release.id
                          }
                          className="grid gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                        >
                          <div>
                            <h3 className="text-xl font-black uppercase tracking-[-0.025em]">
                              {
                                release.title
                              }
                            </h3>

                            <p className="mt-1 text-[9px] font-black uppercase tracking-[0.1em] text-black/45">
                              {formatReleaseType(
                                release.release_type
                              )}

                              {release.release_date
                                ? ` · ${release.release_date}`
                                : ""}
                            </p>
                          </div>

                          {release.links &&
                            release.links.length >
                              0 && (
                              <div className="flex flex-wrap gap-x-4 gap-y-2 sm:justify-end">
                                {release.links.map(
                                  (
                                    link
                                  ) => (
                                    <a
                                      key={`${link.platform}-${link.url}`}
                                      href={
                                        link.url
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[9px] font-black uppercase tracking-[0.1em] hover:underline"
                                    >
                                      {link.label ??
                                        formatPlatform(
                                          link.platform
                                        )}{" "}
                                      ↗
                                    </a>
                                  )
                                )}
                              </div>
                            )}
                        </article>
                      )
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ========================================
          ASSOCIATED ACTS
      ======================================== */}

      {associatedArtists.length >
        0 && (
        <section className="border-b-2 border-black">
          <div className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-black/45">
                  Connections
                </p>

                <h2 className="mt-1 text-[clamp(2rem,5vw,3.5rem)] font-black uppercase leading-[0.9] tracking-[-0.045em]">
                  Associated Acts
                </h2>
              </div>

              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-black/45">
                {
                  associatedArtists.length
                }{" "}
                Connected
              </p>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {associatedArtists.map(
                (
                  associated
                ) => {
                  const associatedLocation =
                    associated.primary_location;

                  const associatedLocationLabel =
                    associatedLocation
                      ? [
                          associatedLocation.city ??
                            associatedLocation.name,
                          associatedLocation.region,
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            ", "
                          )
                      : null;

                  return (
                    <Link
                      key={
                        associated.artist_id
                      }
                      href={`/artists/${associated.slug}`}
                      className="group grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-2 border-black bg-white p-4 transition-colors hover:bg-black hover:text-white sm:p-5"
                    >
                      <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.15em] opacity-50">
                          {formatRelationship(
                            associated.relationship
                          )}
                        </p>

                        <h3 className="mt-1 text-xl font-black uppercase tracking-[-0.025em]">
                          {
                            associated.name
                          }
                        </h3>

                        {associatedLocationLabel && (
                          <p className="mt-1 text-[9px] font-black uppercase tracking-[0.09em] opacity-50">
                            {
                              associatedLocationLabel
                            }
                          </p>
                        )}

                        {associated.genres.length >
                          0 && (
                          <p className="mt-3 text-[9px] font-black uppercase tracking-[0.08em] opacity-65">
                            {associated.genres
                              .slice(
                                0,
                                3
                              )
                              .map(
                                (
                                  genre
                                ) =>
                                  genre.name
                              )
                              .join(
                                " · "
                              )}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center text-lg font-black">
                        →
                      </div>
                    </Link>
                  );
                }
              )}
            </div>
          </div>
        </section>
      )}

      {/* ========================================
          SCENES
      ======================================== */}

      {scenes.length >
        0 && (
        <section>
          <div className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-black/45">
              Part Of
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {scenes.map(
                (
                  scene
                ) => (
                  <Link
                    key={
                      scene.slug
                    }
                    href={`/scenes/${scene.slug}`}
                    className={
                      scene.is_primary
                        ? "border-2 border-black bg-black px-4 py-3 text-[10px] font-black uppercase tracking-[0.09em] text-white transition-colors hover:bg-white hover:text-black"
                        : "border-2 border-black bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.09em] transition-colors hover:bg-black hover:text-white"
                    }
                  >
                    {scene.name} →
                  </Link>
                )
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}