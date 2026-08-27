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

type EventLocation = {
  id?: string;
  name: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
};

type EventVenue = {
  id: string;
  name: string;
  slug: string;
  address_line_1: string | null;
  address_line_2: string | null;
  postal_code: string | null;
  website_url: string | null;

  location:
    | EventLocation
    | EventLocation[]
    | null;
};

type EventLineupArtist = {
  id: string;
  name: string;
  slug: string;
  published: boolean;
};

type EventLineupRow = {
  billing_role: string;
  billing_order: number;

  artist:
    | EventLineupArtist
    | EventLineupArtist[]
    | null;
};

type UpcomingEvent = {
  id: string;
  title: string;
  slug: string;
  event_type: string;
  status: string;
  start_at: string;
  doors_at: string | null;
  end_at: string | null;
  timezone: string | null;
  ticket_url: string | null;
  event_url: string | null;
  description_short: string | null;
  all_ages: boolean | null;
  featured: boolean;
  published: boolean;

  venue:
    | EventVenue
    | EventVenue[]
    | null;

  location:
    | EventLocation
    | EventLocation[]
    | null;

  lineup:
    | EventLineupRow[]
    | null;
};

type EventArtistLink = {
  event_id: string;
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

function PlatformIcon({
  platform,
}: {
  platform: string;
}) {
  const key =
    platform
      .trim()
      .toLowerCase()
      .replaceAll(" ", "_");

  const iconClass =
    "h-5 w-5";

  switch (key) {
    case "youtube":
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={iconClass}
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
          className={iconClass}
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
          className={iconClass}
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
          className={iconClass}
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
          className={iconClass}
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
          className={iconClass}
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
          className={iconClass}
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
          className={iconClass}
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
          className={iconClass}
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
          className={iconClass}
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
      aria-label={linkLabel}
      title={linkLabel}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center border-2 border-black bg-white transition-colors hover:bg-black hover:text-white"
    >
      <PlatformIcon
        platform={platform}
      />

      <span className="sr-only">
        {linkLabel}
      </span>
    </a>
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
  ).padStart(
    2,
    "0"
  )}`;
}

function firstRelation<T>(
  value:
    | T
    | T[]
    | null
    | undefined
): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(
    value
  )
    ? value[0] ?? null
    : value;
}

function formatEventDate(
  value: string,
  timeZone: string
) {
  try {
    return new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    ).format(
      new Date(value)
    );
  } catch {
    return new Date(
      value
    ).toLocaleDateString(
      "en-US",
      {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    );
  }
}

function formatEventTime(
  value: string | null,
  timeZone: string
) {
  if (!value) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,
        hour: "numeric",
        minute: "2-digit",
      }
    ).format(
      new Date(value)
    );
  } catch {
    return new Date(
      value
    ).toLocaleTimeString(
      "en-US",
      {
        hour: "numeric",
        minute: "2-digit",
      }
    );
  }
}

function formatEventStatus(
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

function formatBillingRole(
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

export default async function ArtistPage({
  params,
}: ArtistPageProps) {
  const {
    slug,
  } = await params;

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
  // ASSOCIATED ARTISTS
  // ============================================

  const {
    data: associationData,
    error: associationError,
  } = await supabase.rpc(
    "get_artist_associations",
    {
      artist_slug: slug,
    }
  );

  if (associationError) {
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
  // UPCOMING EVENTS
  // ============================================

  /*
   * Load the artist's event IDs first, then query
   * events directly. This avoids filtering through
   * a deeply embedded event relation and makes the
   * upcoming-show lookup deterministic.
   */
  const {
    data: eventArtistLinks,
    error: eventLinksError,
  } = await supabase
    .from(
      "event_artists"
    )
    .select(
      "event_id"
    )
    .eq(
      "artist_id",
      artist.id
    );

  if (eventLinksError) {
    console.error(
      "artist event links query error:",
      eventLinksError
    );
  }

  const eventIds =
    [
      ...new Set(
        (
          (
            eventArtistLinks ??
            []
          ) as EventArtistLink[]
        ).map(
          (row) =>
            row.event_id
        )
      ),
    ];

  let upcomingEvents:
    UpcomingEvent[] = [];

  if (
    eventIds.length >
    0
  ) {
    const {
      data: eventRows,
      error: eventsError,
    } = await supabase
      .from(
        "events"
      )
      .select(
        `
        id,
        title,
        slug,
        event_type,
        status,
        start_at,
        doors_at,
        end_at,
        timezone,
        ticket_url,
        event_url,
        description_short,
        all_ages,
        featured,
        published,

        venue:venues (
          id,
          name,
          slug,
          address_line_1,
          address_line_2,
          postal_code,
          website_url,

          location:locations (
            id,
            name,
            city,
            region,
            country
          )
        ),

        location:locations (
          id,
          name,
          city,
          region,
          country
        ),

        lineup:event_artists (
          billing_role,
          billing_order,

          artist:artists (
            id,
            name,
            slug,
            published
          )
        )
        `
      )
      .in(
        "id",
        eventIds
      )
      .eq(
        "published",
        true
      )
      .gte(
        "start_at",
        new Date().toISOString()
      )
      .in(
        "status",
        [
          "scheduled",
          "postponed",
          "cancelled",
        ]
      )
      .order(
        "start_at",
        {
          ascending: true,
        }
      );

    if (eventsError) {
      console.error(
        "upcoming events query error:",
        eventsError
      );
    } else {
      upcomingEvents =
        (
          eventRows ??
          []
        ) as unknown as UpcomingEvent[];
    }
  }

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

  const recommendedTracks =
    (
      musicData?.recommended_tracks ??
      []
    ) as RecommendedTrack[];

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

  const artistLinks =
    links;

  const featuredRelease =
    releases.find(
      (
        release
      ) =>
        release.featured
    ) ??
    releases[0] ??
    null;

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      <UndergroundAtlasHeader
        actionHref="/"
        actionLabel="Back to Map →"
      />

      {/* ========================================
          ARTIST HERO
      ======================================== */}

      <section className="border-b-2 border-black bg-white">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col justify-between border-black px-4 py-8 sm:px-6 sm:py-10 lg:min-h-[480px] lg:border-r-2 lg:px-8 lg:py-12">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-black/45">
                Artist
              </p>

              {locationLabel && (
                <p className="mt-3 text-[11px] font-black uppercase tracking-[0.12em]">
                  {locationLabel}
                </p>
              )}
            </div>

            <div className="py-8 lg:py-10">
              <h1 className="max-w-5xl break-words break-words text-[clamp(2.5rem,14vw,6rem)] font-black uppercase leading-[0.86] tracking-[-0.055em]">
                {artist.name}
              </h1>

              {artist.bio_short && (
                <p className="mt-6 max-w-2xl text-lg font-bold leading-7 sm:text-xl">
                  {artist.bio_short}
                </p>
              )}
            </div>

            <div>
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
                        className="border-2 border-black bg-black min-h-9 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-white"
                      >
                        {genre.name}
                      </span>
                    )
                  )}
                </div>
              )}

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {artist.year_started && (
                  <span className="border-2 border-black bg-white min-h-9 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em]">
                    {artist.year_started}
                    {artist.year_ended
                      ? `–${artist.year_ended}`
                      : "–Present"}
                  </span>
                )}

                {artist.status && (
                  <span className="border-2 border-black bg-white min-h-9 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em]">
                    {artist.status}
                  </span>
                )}

                {artist.artist_type && (
                  <span className="border-2 border-black bg-white min-h-9 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em]">
                    {artist.artist_type}
                  </span>
                )}
              </div>

              {artistLinks.length >
                0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {artistLinks.map(
                    (
                      link
                    ) => (
                      <PlatformIconLink
                        key={
                          `${link.platform}-${link.url}`
                        }
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

          <div className="relative aspect-[16/10] overflow-hidden bg-black lg:aspect-auto lg:min-h-[480px]">
            {heroImageUrl &&
            heroImage ? (
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
                  style={{
                    objectPosition:
                      `${heroImage.position_x ?? 50}% ${heroImage.position_y ?? 50}%`,
                  }}
                />

                <div className="absolute inset-0 bg-black/10" />

                {heroImage.photographer && (
                  <div className="absolute bottom-0 right-0 bg-black px-3 py-2 text-[9px] font-black uppercase tracking-[0.1em] text-white">
                    Photo: {heroImage.photographer}
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full min-h-[320px] items-end p-6 text-white sm:p-8">
                <p className="text-4xl font-black uppercase leading-[0.88] tracking-[-0.04em]">
                  {artist.name}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================
          ABOUT
      ======================================== */}

      <section className="border-b-2 border-black">
        <div className="grid lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="border-black px-4 py-6 sm:px-6 lg:border-r-2 lg:px-8">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
              About
            </p>
          </div>

          <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {artist.bio_long ? (
              <p className="max-w-4xl whitespace-pre-line text-base leading-7 text-black/75 sm:text-lg sm:leading-8">
                {artist.bio_long}
              </p>
            ) : artist.bio_short ? (
              <p className="max-w-4xl text-base leading-7 text-black/75 sm:text-lg">
                {artist.bio_short}
              </p>
            ) : (
              <p className="text-base text-black/50">
                Artist biography coming soon.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ========================================
          MUSIC
      ======================================== */}

      <section className="border-b-2 border-black bg-white">
        <div className="px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
                Music
              </p>

              <h2 className="mt-1 text-[clamp(2rem,4vw,3.25rem)] font-black uppercase leading-[0.92] tracking-[-0.04em]">
                Listen First
              </h2>
            </div>
          </div>

          <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="border-2 border-black bg-[#f3efe4] p-4 sm:p-6">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-black/45">
                Featured Release
              </p>

              {featuredRelease ? (
                <div className="mt-4">
                  {featuredRelease.cover_image_path && (
                    <div className="mb-5 aspect-square overflow-hidden border-2 border-black bg-black">
                      <img
                        src={
                          supabase.storage
                            .from(
                              "release-images"
                            )
                            .getPublicUrl(
                              featuredRelease.cover_image_path
                            ).data.publicUrl
                        }
                        alt={
                          featuredRelease.title
                        }
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}

                  <h3 className="text-2xl font-black uppercase tracking-[-0.03em]">
                    {featuredRelease.title}
                  </h3>

                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.1em] text-black/45">
                    {featuredRelease.release_type}
                    {featuredRelease.release_date
                      ? ` · ${featuredRelease.release_date}`
                      : ""}
                  </p>

                  {featuredRelease.links &&
                    featuredRelease.links.length >
                      0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {featuredRelease.links.map(
                          (
                            link
                          ) => (
                            <a
                              key={
                                `${link.platform}-${link.url}`
                              }
                              href={
                                link.url
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="border-2 border-black bg-white px-3 py-2 text-[9px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white"
                            >
                              {formatPlatform(
                                link.platform
                              )}{" "}
                              ↗
                            </a>
                          )
                        )}
                      </div>
                    )}
                </div>
              ) : (
                <p className="mt-4 text-sm text-black/55">
                  No featured release is listed yet.
                </p>
              )}
            </div>

            <div className="border-2 border-black bg-white p-4 sm:p-6">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-black/45">
                Recommended Tracks
              </p>

              {!recommendedTracks.length ? (
                <p className="mt-4 text-sm text-black/55">
                  Recommended tracks are coming soon.
                </p>
              ) : (
                <div className="mt-4 divide-y-2 divide-black border-y-2 border-black">
                  {recommendedTracks.map(
                    (
                      track,
                      index
                    ) => (
                      <div
                        key={
                          track.id
                        }
                        className="grid gap-3 py-4 md:grid-cols-[44px_minmax(0,1fr)_auto] sm:items-center"
                      >
                        <span className="text-[10px] font-black text-black/35">
                          {String(
                            index + 1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </span>

                        <div>
                          <h3 className="text-lg font-black uppercase tracking-[-0.02em]">
                            {track.title}
                          </h3>

                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[9px] font-black uppercase tracking-[0.1em] text-black/45">
                            {track.recommendation_type && (
                              <span>
                                {formatRecommendation(
                                  track.recommendation_type
                                )}
                              </span>
                            )}

                            {track.duration_seconds !==
                              null && (
                              <span>
                                {formatDuration(
                                  track.duration_seconds
                                )}
                              </span>
                            )}

                            {track.release?.title && (
                              <span>
                                {track.release.title}
                              </span>
                            )}
                          </div>
                        </div>

                        {track.links &&
                          track.links.length >
                            0 && (
                            <div className="flex flex-wrap gap-2 sm:justify-end">
                              {track.links.map(
                                (
                                  link
                                ) => (
                                  <a
                                    key={
                                      `${link.platform}-${link.url}`
                                    }
                                    href={
                                      link.url
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[9px] font-black uppercase tracking-[0.1em] hover:underline"
                                  >
                                    {formatPlatform(
                                      link.platform
                                    )}{" "}
                                    ↗
                                  </a>
                                )
                              )}
                            </div>
                          )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>

          {releases.length >
            1 && (
            <div className="mt-8">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-black/45">
                Releases
              </p>

              <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {releases.map(
                  (
                    release
                  ) => (
                    <article
                      key={
                        release.id
                      }
                      className="border-2 border-black bg-[#f3efe4] p-5"
                    >
                      <h3 className="text-xl font-black uppercase tracking-[-0.025em]">
                        {release.title}
                      </h3>

                      <p className="mt-2 text-[9px] font-black uppercase tracking-[0.1em] text-black/45">
                        {release.release_type}
                        {release.release_date
                          ? ` · ${release.release_date}`
                          : ""}
                      </p>

                      {release.links &&
                        release.links.length >
                          0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {release.links.map(
                              (
                                link
                              ) => (
                                <a
                                  key={
                                    `${link.platform}-${link.url}`
                                  }
                                  href={
                                    link.url
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[9px] font-black uppercase tracking-[0.1em] hover:underline"
                                >
                                  {formatPlatform(
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
        </div>
      </section>

      {/* ========================================
          UPCOMING SHOWS
      ======================================== */}

      <section className="border-b-2 border-black">
        <div className="px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-12">
          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
                Live
              </p>

              <h2 className="mt-1 text-[clamp(2rem,4vw,3.25rem)] font-black uppercase leading-[0.92] tracking-[-0.04em]">
                Upcoming Shows
              </h2>
            </div>

            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-black/45">
              {upcomingEvents.length} Total
            </span>
          </div>

          {!upcomingEvents.length ? (
            <p className="mt-6 text-sm text-black/60">
              No upcoming published shows are currently listed.
            </p>
          ) : (
            <div className="mt-6 grid gap-5 xl:grid-cols-2">
              {upcomingEvents.map(
                (
                  event
                ) => {
                  const venue =
                    firstRelation<EventVenue>(
                      event.venue
                    );

                  const venueLocation =
                    firstRelation<EventLocation>(
                      venue?.location
                    );

                  const eventLocation =
                    firstRelation<EventLocation>(
                      event.location
                    );

                  const displayLocation =
                    venueLocation ??
                    eventLocation;

                  const timezone =
                    event.timezone ??
                    "America/Los_Angeles";

                  return (
                    <article
                      key={
                        event.id
                      }
                      className="overflow-hidden border-2 border-black bg-white"
                    >
                      <div className="grid md:grid-cols-[112px_minmax(0,1fr)]">
                        <div className="flex min-h-[124px] flex-row items-center justify-between border-b-2 border-black bg-black p-4 text-white sm:flex-col sm:items-start sm:justify-between sm:border-b-0 sm:border-r-2">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-white/55">
                              {formatEventDate(
                                event.start_at,
                                timezone
                              )}
                            </p>

                            <p className="mt-2 text-2xl font-black uppercase tracking-[-0.04em]">
                              {formatEventTime(
                                event.start_at,
                                timezone
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="p-4 sm:p-6">
                          <Link
                            href={`/events/${event.slug}`}
                            className="inline-block"
                          >
                            <h3 className="text-2xl font-black uppercase leading-[0.95] tracking-[-0.035em] hover:underline">
                              {event.title}
                            </h3>
                          </Link>

                          {venue && (
                            <Link
                              href={`/venues/${venue.slug}`}
                              className="mt-3 block text-[10px] font-black uppercase tracking-[0.1em] hover:underline"
                            >
                              {venue.name} →
                            </Link>
                          )}

                          {displayLocation && (
                            <p className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-black/45">
                              {[
                                displayLocation.city ??
                                  displayLocation.name,
                                displayLocation.region,
                              ]
                                .filter(
                                  Boolean
                                )
                                .join(
                                  ", "
                                )}
                            </p>
                          )}

                          <div className="mt-5 flex flex-wrap gap-2 border-t-2 border-black pt-4">
                            <Link
                              href={`/events/${event.slug}`}
                              className="inline-flex min-h-10 items-center justify-center border-2 border-black bg-white min-h-9 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white"
                            >
                              View Event →
                            </Link>

                            {event.ticket_url && (
                              <a
                                href={
                                  event.ticket_url
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-10 items-center justify-center border-2 border-black bg-black min-h-9 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-white transition-colors hover:bg-white hover:text-black"
                              >
                                Tickets ↗
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </div>
      </section>

      {/* ========================================
          ASSOCIATED ARTISTS
      ======================================== */}

      <section className="border-b-2 border-black bg-white">
        <div className="px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-12">
          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
                Connections
              </p>

              <h2 className="mt-1 text-[clamp(2rem,4vw,3.25rem)] font-black uppercase leading-[0.92] tracking-[-0.04em]">
                Associated Artists
              </h2>
            </div>

            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-black/45">
              {associatedArtists.length} Total
            </span>
          </div>

          {!associatedArtists.length ? (
            <p className="mt-6 text-sm text-black/60">
              No associated artists are currently listed.
            </p>
          ) : (
            <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {associatedArtists.map(
                (
                  associated
                ) => (
                  <Link
                    key={
                      associated.artist_id
                    }
                    href={`/artists/${associated.slug}`}
                    className="group border-2 border-black bg-[#f3efe4] p-5"
                  >
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-black/45">
                      {associated.relationship ??
                        "Associated Artist"}
                    </p>

                    <h3 className="mt-2 text-xl font-black uppercase tracking-[-0.025em] group-hover:underline">
                      {associated.name}
                    </h3>

                    {associated.primary_location && (
                      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.1em] text-black/45">
                        {[
                          associated
                            .primary_location
                            .city ??
                            associated
                              .primary_location
                              .name,
                          associated
                            .primary_location
                            .region,
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            ", "
                          )}
                      </p>
                    )}

                    {associated.genres.length >
                      0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {associated.genres
                          .slice(
                            0,
                            3
                          )
                          .map(
                            (
                              genre
                            ) => (
                              <span
                                key={
                                  genre.slug
                                }
                                className="border-2 border-black bg-white min-h-7 px-2 py-1 text-[9px] font-black uppercase"
                              >
                                {genre.name}
                              </span>
                            )
                          )}
                      </div>
                    )}
                  </Link>
                )
              )}
            </div>
          )}
        </div>
      </section>

      {/* ========================================
          SCENES
      ======================================== */}

      <section>
        <div className="px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-12">
          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
                Geography
              </p>

              <h2 className="mt-1 text-[clamp(2rem,4vw,3.25rem)] font-black uppercase leading-[0.92] tracking-[-0.04em]">
                Scenes
              </h2>
            </div>
          </div>

          {scenes &&
            scenes.length >
              0 ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {scenes.map(
                (
                  scene
                ) => (
                  <Link
                    key={
                      scene.slug
                    }
                    href={`/scenes/${scene.slug}`}
                    className="group border-2 border-black bg-white p-5"
                  >
                    <p className="text-[9px] font-black uppercase tracking-[0.14em] text-black/45">
                      {scene.is_primary
                        ? "Primary Scene"
                        : "Scene"}
                    </p>

                    <h3 className="mt-2 text-2xl font-black uppercase tracking-[-0.03em] group-hover:underline">
                      {scene.name}
                    </h3>

                    <p className="mt-4 text-[10px] font-black uppercase tracking-[0.12em]">
                      Explore Scene →
                    </p>
                  </Link>
                )
              )}
            </div>
          ) : (
            <p className="mt-6 text-sm text-black/60">
              No scene relationships are currently listed.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
