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
    artist.genres ??
    [];

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

          <div className="flex flex-col justify-between border-black p-6 sm:p-10 lg:min-h-[620px] lg:border-r-2">
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

            <div className="py-10 sm:py-12">
              <h1 className="max-w-4xl break-words text-[clamp(3rem,11vw,9rem)] font-black uppercase leading-[0.82] tracking-[-0.06em]">
                {artist.name}
              </h1>
            </div>

            <div className="flex flex-wrap gap-2">
              {genres.map(
                (
                  genre: {
                    id?: string;
                    name: string;
                    slug?: string;
                  }
                ) => (
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

          <div className="relative aspect-[4/3] bg-black lg:aspect-auto lg:min-h-[620px]">
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
                    objectPosition: `${
                      heroImage.position_x ??
                      50
                    }% ${
                      heroImage.position_y ??
                      50
                    }%`,
                  }}
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
              <div className="flex h-full items-center justify-center p-8 text-center text-white lg:min-h-[620px]">
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
          {/* ====================================
              ABOUT
          ==================================== */}

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
              UPCOMING SHOWS
          ==================================== */}

          {upcomingEvents.length >
            0 && (
            <section className="mt-10 border-t-2 border-black pt-6 sm:mt-14 sm:pt-8">
              <p className="text-xs font-black uppercase tracking-[0.2em]">
                Live
              </p>

              <h2 className="mt-2 text-3xl font-black uppercase">
                Upcoming Shows
              </h2>

              <div className="mt-6 divide-y-2 divide-black border-y-2 border-black">
                {upcomingEvents.map(
                  (event) => {
                    const timeZone =
                      event.timezone ??
                      "America/Los_Angeles";

                    const venue =
                      firstRelation(
                        event.venue
                      );

                    const eventLocation =
                      firstRelation(
                        event.location
                      );

                    const venueLocation =
                      firstRelation(
                        venue?.location
                      );

                    const displayLocation =
                      venueLocation ??
                      eventLocation;

                    const locationLabel =
                      displayLocation
                        ? [
                            displayLocation.city ??
                              displayLocation.name,
                            displayLocation.region,
                          ]
                            .filter(
                              Boolean
                            )
                            .join(", ")
                        : null;

                    const startTime =
                      formatEventTime(
                        event.start_at,
                        timeZone
                      );

                    const doorsTime =
                      formatEventTime(
                        event.doors_at,
                        timeZone
                      );

                    const lineup =
                      (
                        event.lineup ??
                        []
                      )
                        .map(
                          (row) => ({
                            ...row,

                            artist:
                              firstRelation(
                                row.artist
                              ),
                          })
                        )
                        .filter(
                          (row) =>
                            row.artist
                              ?.published
                        )
                        .sort(
                          (
                            a,
                            b
                          ) =>
                            a.billing_order -
                            b.billing_order
                        );

                    return (
                      <article
                        key={
                          event.id
                        }
                        className="py-6"
                      >
                        <div className="grid gap-5 sm:grid-cols-[150px_1fr]">
                          {/* DATE */}

                          <div>
                            <p className="text-sm font-black uppercase tracking-[0.08em]">
                              {formatEventDate(
                                event.start_at,
                                timeZone
                              )}
                            </p>

                            {startTime && (
                              <p className="mt-2 text-2xl font-black uppercase">
                                {
                                  startTime
                                }
                              </p>
                            )}

                            {doorsTime && (
                              <p className="mt-1 text-xs font-bold uppercase text-black/55">
                                Doors{" "}
                                {
                                  doorsTime
                                }
                              </p>
                            )}
                          </div>

                          {/* DETAILS */}

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-2xl font-black uppercase leading-tight">
                                {
                                  event.title
                                }
                              </h3>

                              {event.status !==
                                "scheduled" && (
                                <span
                                  className={
                                    event.status ===
                                    "cancelled"
                                      ? "border-2 border-red-700 px-2 py-1 text-[10px] font-black uppercase text-red-700"
                                      : "border-2 border-black px-2 py-1 text-[10px] font-black uppercase"
                                  }
                                >
                                  {formatEventStatus(
                                    event.status
                                  )}
                                </span>
                              )}

                              {event.all_ages && (
                                <span className="border-2 border-black px-2 py-1 text-[10px] font-black uppercase">
                                  All Ages
                                </span>
                              )}
                            </div>

                            {(venue?.name ||
                              locationLabel) && (
                              <div className="mt-3">
                                {venue?.name && (
                                  <Link
                                    href={`/venues/${venue.slug}`}
                                    className="inline-flex items-center gap-2 font-black uppercase transition-opacity hover:opacity-55"
                                  >
                                    <span>
                                      {
                                        venue.name
                                      }
                                    </span>

                                    <span
                                      aria-hidden="true"
                                    >
                                      →
                                    </span>
                                  </Link>
                                )}

                                {locationLabel && (
                                  <p className="mt-1 text-sm font-bold text-black/60">
                                    {
                                      locationLabel
                                    }
                                  </p>
                                )}
                              </div>
                            )}

                            {event.description_short && (
                              <p className="mt-4 max-w-2xl text-sm leading-6 text-black/65">
                                {
                                  event.description_short
                                }
                              </p>
                            )}

                            {/* LINEUP */}

                            {lineup.length >
                              0 && (
                              <div className="mt-5">
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-black/50">
                                  Lineup
                                </p>

                                <div className="mt-2 flex flex-wrap gap-2">
                                  {lineup.map(
                                    (row) =>
                                      row.artist && (
                                        <Link
                                          key={
                                            row.artist.id
                                          }
                                          href={`/artists/${row.artist.slug}`}
                                          className="border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase transition-colors hover:bg-black hover:text-white"
                                        >
                                          {
                                            row.artist.name
                                          }

                                          {row.billing_role !==
                                          "performer"
                                            ? ` · ${formatBillingRole(
                                                row.billing_role
                                              )}`
                                            : ""}
                                        </Link>
                                      )
                                  )}
                                </div>
                              </div>
                            )}

                            {/* ==================================
                                EVENT ACTIONS
                            ================================== */}

                            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                              <Link
                                href={`/events/${event.slug}`}
                                className="inline-flex w-full items-center justify-center border-2 border-black bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white sm:w-auto"
                              >
                                View Event →
                              </Link>

                              {event.ticket_url &&
                                event.status !==
                                  "cancelled" && (
                                  <a
                                    href={
                                      event.ticket_url
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex w-full items-center justify-center border-2 border-black bg-black px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-white transition-colors hover:bg-white hover:text-black sm:w-auto"
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
            </section>
          )}

          {/* ====================================
              ESSENTIAL MUSIC
          ==================================== */}

          {recommendedTracks.length >
            0 && (
            <section className="mt-10 border-t-2 border-black pt-6 sm:mt-14 sm:pt-8">
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

                            {(
                              track.recommendation_type ||
                              track.featured
                            ) && (
                              <span className="border-2 border-black px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
                                {track.recommendation_type
                                  ? formatRecommendation(
                                      track.recommendation_type
                                    )
                                  : "Featured"}
                              </span>
                            )}
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold uppercase text-black/60">
                            {track.release?.title && (
                              <span>
                                {
                                  track.release.title
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
                              (link) => (
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
            <section className="mt-10 border-t-2 border-black pt-6 sm:mt-14 sm:pt-8">
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
                      | null =
                      null;

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
                        <Link
                          href={`/artists/${artist.slug}/releases/${release.id}`}
                          className="group block"
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
                                className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                              />
                            </div>
                          ) : (
                            <div className="flex aspect-square items-center justify-center border-b-2 border-black bg-black p-6 text-center text-white transition-colors group-hover:bg-white group-hover:text-black">
                              <span className="text-sm font-black uppercase tracking-[0.18em]">
                                {
                                  release.title
                                }
                              </span>
                            </div>
                          )}

                          <div className="p-5">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xl font-black uppercase group-hover:underline">
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

                            <p className="mt-5 text-[10px] font-black uppercase tracking-[0.14em]">
                              View Tracks →
                            </p>
                          </div>
                        </Link>

                        {!!release.links
                          ?.length && (
                          <div className="border-t-2 border-black p-5">
                            <div className="flex flex-wrap gap-2">
                              {release.links.map(
                                (link) => (
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
                          </div>
                        )}
                      </article>
                    );
                  }
                )}
              </div>
            </section>
          )}

          {/* ====================================
              ASSOCIATED ARTISTS
          ==================================== */}

          {associatedArtists.length >
            0 && (
            <section className="mt-10 border-t-2 border-black pt-6 sm:mt-14 sm:pt-8">
              <p className="text-xs font-black uppercase tracking-[0.2em]">
                Connections
              </p>

              <h2 className="mt-2 text-3xl font-black uppercase">
                Associated Artists
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-black/60">
                Artists with a direct musical connection through
                shared members, collaborations, side projects,
                or related work.
              </p>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                {associatedArtists.map(
                  (
                    associatedArtist
                  ) => {
                    let associatedImageUrl:
                      | string
                      | null =
                      null;

                    if (
                      associatedArtist.profile_image
                    ) {
                      const {
                        data,
                      } =
                        supabase.storage
                          .from(
                            "artist-images"
                          )
                          .getPublicUrl(
                            associatedArtist.profile_image
                          );

                      associatedImageUrl =
                        data.publicUrl;
                    }

                    const associatedLocation =
                      associatedArtist.primary_location;

                    const locationLabel =
                      associatedLocation
                        ? [
                            associatedLocation.city,
                            associatedLocation.region,
                          ]
                            .filter(
                              Boolean
                            )
                            .join(", ")
                        : null;

                    return (
                      <Link
                        key={
                          associatedArtist.artist_id
                        }
                        href={`/artists/${associatedArtist.slug}`}
                        className="group border-2 border-black bg-white transition-colors hover:bg-black hover:text-white"
                      >
                        {/* IMAGE */}

                        <div className="aspect-[4/3] overflow-hidden border-b-2 border-black bg-black">
                          {associatedImageUrl ? (
                            <img
                              src={
                                associatedImageUrl
                              }
                              alt={
                                associatedArtist.name
                              }
                              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center p-6 text-center text-white">
                              <span className="text-sm font-black uppercase tracking-[0.15em]">
                                {
                                  associatedArtist.name
                                }
                              </span>
                            </div>
                          )}
                        </div>

                        {/* CONTENT */}

                        <div className="p-5">
                          <p className="text-[10px] font-black uppercase tracking-[0.15em] opacity-55">
                            {associatedArtist.relationship ??
                              "Associated Artist"}
                          </p>

                          <h3 className="mt-2 text-2xl font-black uppercase leading-[0.95]">
                            {
                              associatedArtist.name
                            }
                          </h3>

                          {locationLabel && (
                            <p className="mt-3 text-xs font-bold uppercase tracking-[0.08em] opacity-60">
                              {
                                locationLabel
                              }
                            </p>
                          )}

                          {associatedArtist.genres?.length >
                            0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {associatedArtist.genres.map(
                                (genre) => (
                                  <span
                                    key={
                                      genre.slug
                                    }
                                    className="border border-current px-2 py-1 text-[9px] font-black uppercase"
                                  >
                                    {
                                      genre.name
                                    }
                                  </span>
                                )
                              )}
                            </div>
                          )}

                          <p className="mt-6 text-[10px] font-black uppercase tracking-[0.14em] group-hover:underline">
                            Explore Artist →
                          </p>
                        </div>
                      </Link>
                    );
                  }
                )}
              </div>
            </section>
          )}
        </div>

        {/* ======================================
            ARTIST DETAILS SIDEBAR
        ====================================== */}

        <aside className="border-t-2 border-black bg-white p-6 sm:p-8 lg:border-t-0">
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
                    .filter(
                      Boolean
                    )
                    .join(", ")}
                </dd>
              </div>
            )}

            {/* LINKS */}

            {links.length >
              0 && (
              <div className="py-4">
                <dt className="text-[10px] font-black uppercase tracking-[0.18em] text-black/55">
                  Links
                </dt>

                <dd className="mt-3 space-y-2">
                  {links.map(
                    (link) => (
                      <a
                        key={`${link.platform}-${link.url}`}
                        href={
                          link.url
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-4 border-2 border-black bg-white px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.08em] transition-colors hover:bg-black hover:text-white"
                      >
                        <span>
                          {link.label ??
                            formatPlatform(
                              link.platform
                            )}
                        </span>

                        <span
                          aria-hidden="true"
                        >
                          ↗
                        </span>
                      </a>
                    )
                  )}
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