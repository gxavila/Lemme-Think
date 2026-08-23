import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

// ============================================
// TYPES
// ============================================

type VenueLocation = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  region: string | null;
  country: string;
};

type VenueRecord = {
  id: string;
  name: string;
  slug: string;

  address_line_1: string | null;
  address_line_2: string | null;
  postal_code: string | null;

  latitude: number | null;
  longitude: number | null;

  website_url: string | null;

  active: boolean;

  location:
    | VenueLocation
    | VenueLocation[]
    | null;
};

type VenueScene = {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description_short: string | null;
  featured: boolean;
};

type EventArtist = {
  id: string;
  name: string;
  slug: string;
  published: boolean;
};

type EventLineupRow = {
  billing_role: string | null;
  billing_order: number | null;

  artist:
    | EventArtist
    | EventArtist[]
    | null;
};

type VenueEvent = {
  id: string;
  title: string;
  slug: string;

  event_type: string | null;
  status: string | null;

  start_at: string;
  doors_at: string | null;
  end_at: string | null;

  timezone: string | null;

  ticket_url: string | null;
  event_url: string | null;

  description_short: string | null;

  all_ages: boolean | null;
  featured: boolean;

  lineup:
    | EventLineupRow[]
    | null;
};

type UpcomingArtist = {
  id: string;
  name: string;
  slug: string;
  eventCount: number;
};

// ============================================
// HELPERS
// ============================================

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

  if (
    Array.isArray(
      value
    )
  ) {
    return value[0] ?? null;
  }

  return value;
}

function normalizeLineup(
  lineup:
    | EventLineupRow[]
    | null
    | undefined
) {
  if (
    !Array.isArray(
      lineup
    )
  ) {
    return [];
  }

  return lineup
    .map(
      (
        row
      ) => {
        const artist =
          firstRelation(
            row.artist
          );

        if (
          !artist ||
          !artist.published
        ) {
          return null;
        }

        return {
          billing_role:
            row.billing_role,

          billing_order:
            row.billing_order ??
            0,

          artist,
        };
      }
    )
    .filter(
      (
        row
      ): row is {
        billing_role:
          string | null;

        billing_order:
          number;

        artist:
          EventArtist;
      } =>
        row !== null
    )
    .sort(
      (
        a,
        b
      ) => {
        if (
          a.billing_order !==
          b.billing_order
        ) {
          return (
            a.billing_order -
            b.billing_order
          );
        }

        return a.artist.name.localeCompare(
          b.artist.name
        );
      }
    );
}

function formatEventDate(
  value: string,
  timezone: string
) {
  try {
    return new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          timezone,

        weekday:
          "short",

        month:
          "short",

        day:
          "numeric",

        year:
          "numeric",
      }
    ).format(
      new Date(
        value
      )
    );
  } catch {
    return new Intl.DateTimeFormat(
      "en-US",
      {
        weekday:
          "short",

        month:
          "short",

        day:
          "numeric",

        year:
          "numeric",
      }
    ).format(
      new Date(
        value
      )
    );
  }
}

function formatEventTime(
  value: string,
  timezone: string
) {
  try {
    return new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          timezone,

        hour:
          "numeric",

        minute:
          "2-digit",
      }
    ).format(
      new Date(
        value
      )
    );
  } catch {
    return new Intl.DateTimeFormat(
      "en-US",
      {
        hour:
          "numeric",

        minute:
          "2-digit",
      }
    ).format(
      new Date(
        value
      )
    );
  }
}

function formatEventType(
  value:
    | string
    | null
) {
  if (!value) {
    return "Event";
  }

  return value
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (
        letter
      ) =>
        letter.toUpperCase()
    );
}

function buildAddress(
  venue: VenueRecord,
  location: VenueLocation | null
) {
  const lines: string[] =
    [];

  if (
    venue.address_line_1
  ) {
    lines.push(
      venue.address_line_1
    );
  }

  if (
    venue.address_line_2
  ) {
    lines.push(
      venue.address_line_2
    );
  }

  const cityRegion =
    [
      location?.city,
      location?.region,
    ]
      .filter(
        Boolean
      )
      .join(
        ", "
      );

  const cityLine =
    [
      cityRegion,
      venue.postal_code,
    ]
      .filter(
        Boolean
      )
      .join(
        " "
      );

  if (
    cityLine
  ) {
    lines.push(
      cityLine
    );
  }

  if (
    location?.country
  ) {
    lines.push(
      location.country
    );
  }

  return lines;
}

function buildUpcomingArtists(
  events: VenueEvent[]
): UpcomingArtist[] {
  const artists =
    new Map<
      string,
      UpcomingArtist
    >();

  events.forEach(
    (
      event
    ) => {
      const lineup =
        normalizeLineup(
          event.lineup
        );

      lineup.forEach(
        (
          row
        ) => {
          const existing =
            artists.get(
              row.artist.id
            );

          if (
            existing
          ) {
            existing.eventCount +=
              1;

            return;
          }

          artists.set(
            row.artist.id,
            {
              id:
                row.artist.id,

              name:
                row.artist.name,

              slug:
                row.artist.slug,

              eventCount:
                1,
            }
          );
        }
      );
    }
  );

  return Array.from(
    artists.values()
  ).sort(
    (
      a,
      b
    ) =>
      a.name.localeCompare(
        b.name
      )
  );
}

// ============================================
// PAGE
// ============================================

export default async function VenuePage({
  params,
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const {
    slug,
  } =
    await params;

  const supabase =
    await createClient();

  // ============================================
  // VENUE
  // ============================================

  const {
    data:
      venueData,
    error:
      venueError,
  } =
    await supabase
      .from(
        "venues"
      )
      .select(`
        id,
        name,
        slug,
        address_line_1,
        address_line_2,
        postal_code,
        latitude,
        longitude,
        website_url,
        active,
        location:locations (
          id,
          name,
          slug,
          city,
          region,
          country
        )
      `)
      .eq(
        "slug",
        slug
      )
      .eq(
        "active",
        true
      )
      .single();

  if (
    venueError ||
    !venueData
  ) {
    notFound();
  }

  const venue =
    venueData as unknown as VenueRecord;

  const location =
    firstRelation(
      venue.location
    );

  // ============================================
  // LOCAL SCENES
  // ============================================

  let localScenes:
    VenueScene[] = [];

  if (
    location?.id
  ) {
    const {
      data:
        sceneData,
      error:
        sceneError,
    } =
      await supabase
        .from(
          "scenes"
        )
        .select(
          `
          id,
          name,
          slug,
          tagline,
          description_short,
          featured
          `
        )
        .eq(
          "location_id",
          location.id
        )
        .eq(
          "published",
          true
        )
        .order(
          "featured",
          {
            ascending:
              false,
          }
        )
        .order(
          "name",
          {
            ascending:
              true,
          }
        );

    if (
      sceneError
    ) {
      console.error(
        "Unable to load venue scenes:",
        sceneError
      );
    } else {
      localScenes =
        (
          sceneData ??
          []
        ) as VenueScene[];
    }
  }

  // ============================================
  // UPCOMING EVENTS
  // ============================================

  const {
    data:
      eventData,
    error:
      eventError,
  } =
    await supabase
      .from(
        "events"
      )
      .select(`
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
      `)
      .eq(
        "venue_id",
        venue.id
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
          ascending:
            true,
        }
      );

  if (
    eventError
  ) {
    console.error(
      "Unable to load venue events:",
      eventError
    );
  }

  const upcomingEvents =
    (
      eventData ??
      []
    ) as unknown as VenueEvent[];

  const activeUpcomingEvents =
    upcomingEvents.filter(
      (
        event
      ) =>
        event.status !==
        "cancelled"
    );

  const upcomingArtists =
    buildUpcomingArtists(
      activeUpcomingEvents
    );

  const addressLines =
    buildAddress(
      venue,
      location
    );

  const locationLabel =
    [
      location?.city ??
        location?.name,

      location?.region,
    ]
      .filter(
        Boolean
      )
      .join(
        ", "
      );

  const showCount =
    activeUpcomingEvents.length;

  const artistCount =
    upcomingArtists.length;

  // ============================================
  // RENDER
  // ============================================

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      {/* ======================================
          TOP BAR
      ====================================== */}

      <div className="border-b-2 border-black bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8 lg:px-10">
          <Link
            href="/?mode=events"
            className="text-[10px] font-black uppercase tracking-[0.16em] transition-opacity hover:opacity-55"
          >
            ← Back to Atlas
          </Link>

          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
            Venue
          </span>
        </div>
      </div>

      {/* ======================================
          VENUE HERO
      ====================================== */}

      <section className="border-b-2 border-black bg-white">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* HERO COPY */}

          <div className="px-4 py-10 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-black/50">
              Local Venue
            </p>

            <h1 className="mt-4 max-w-4xl break-words text-4xl font-black uppercase leading-[0.88] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              {
                venue.name
              }
            </h1>

            {locationLabel && (
              <p className="mt-6 text-lg font-black uppercase tracking-[0.05em] sm:text-xl">
                {
                  locationLabel
                }
              </p>
            )}

            {location?.country && (
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-black/45">
                {
                  location.country
                }
              </p>
            )}

            {localScenes.length >
              0 && (
              <div className="mt-8">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-black/45">
                  Local Scenes
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {localScenes.map(
                    (
                      scene
                    ) => (
                      <Link
                        key={
                          scene.id
                        }
                        href={`/scenes/${scene.slug}`}
                        className={
                          scene.featured
                            ? "border-2 border-black bg-black px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-white transition-colors hover:bg-white hover:text-black"
                            : "border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white"
                        }
                      >
                        {
                          scene.name
                        }{" "}
                        →
                      </Link>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          {/* UPCOMING SNAPSHOT */}

          <div className="border-t-2 border-black bg-[#111] p-6 text-white lg:border-l-2 lg:border-t-0 lg:p-8">
            <div className="flex h-full flex-col justify-between gap-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
                  Upcoming
                </p>

                <div className="mt-8 border-t-2 border-white">
                  <div className="flex items-end justify-between gap-5 border-b-2 border-white py-5">
                    <span className="text-xs font-black uppercase tracking-[0.12em] text-white/60">
                      Shows
                    </span>

                    <span className="text-5xl font-black leading-none">
                      {
                        showCount
                      }
                    </span>
                  </div>

                  <div className="flex items-end justify-between gap-5 border-b-2 border-white py-5">
                    <span className="text-xs font-black uppercase tracking-[0.12em] text-white/60">
                      Artists
                    </span>

                    <span className="text-5xl font-black leading-none">
                      {
                        artistCount
                      }
                    </span>
                  </div>
                </div>
              </div>

              <a
                href="#upcoming-shows"
                className="inline-flex min-h-11 w-full items-center justify-center border-2 border-white bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-black transition-colors hover:bg-black hover:text-white sm:w-fit"
              >
                View Upcoming Shows ↓
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================
          MAIN CONTENT
      ====================================== */}

      <div className="mx-auto grid max-w-7xl lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ====================================
            UPCOMING SHOWS
        ==================================== */}

        <div
          id="upcoming-shows"
          className="scroll-mt-6 px-4 py-10 sm:px-8 sm:py-12 lg:px-10 lg:py-14"
        >
          <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b-2 border-black pb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/45">
                Live
              </p>

              <h2 className="mt-1 text-3xl font-black uppercase tracking-[-0.025em]">
                Upcoming Shows
              </h2>
            </div>

            <span className="text-xs font-black uppercase tracking-[0.12em]">
              {
                upcomingEvents.length
              }{" "}
              {upcomingEvents.length ===
              1
                ? "Event"
                : "Events"}
            </span>
          </div>

          {upcomingEvents.length ===
          0 ? (
            <div className="border-2 border-black bg-white p-6 sm:p-8">
              <p className="text-xl font-black uppercase">
                Nothing Listed Yet
              </p>

              <p className="mt-3 max-w-xl text-sm leading-6 text-black/60">
                There are no upcoming published Atlas events currently listed for this venue.
              </p>

              <Link
                href="/?mode=events"
                className="mt-6 inline-flex min-h-11 items-center border-2 border-black bg-black px-4 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-black"
              >
                Explore Events →
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {upcomingEvents.map(
                (
                  event
                ) => {
                  const timezone =
                    event.timezone ??
                    "America/Los_Angeles";

                  const lineup =
                    normalizeLineup(
                      event.lineup
                    );

                  const status =
                    event.status ??
                    "scheduled";

                  const isCancelled =
                    status ===
                    "cancelled";

                  return (
                    <article
                      key={
                        event.id
                      }
                      className={
                        isCancelled
                          ? "border-2 border-black bg-black/[0.04]"
                          : "border-2 border-black bg-white"
                      }
                    >
                      <div className="grid md:grid-cols-[155px_minmax(0,1fr)]">
                        {/* DATE COLUMN */}

                        <div className="border-b-2 border-black bg-[#111] p-5 text-white md:border-b-0 md:border-r-2">
                          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/50">
                            {
                              formatEventType(
                                event.event_type
                              )
                            }
                          </p>

                          <p className="mt-4 text-xl font-black uppercase leading-tight">
                            {
                              formatEventDate(
                                event.start_at,
                                timezone
                              )
                            }
                          </p>

                          <p className="mt-2 text-sm font-bold">
                            {
                              formatEventTime(
                                event.start_at,
                                timezone
                              )
                            }
                          </p>
                        </div>

                        {/* EVENT CONTENT */}

                        <div className="p-5 sm:p-6">
                          <div className="flex flex-wrap gap-2">
                            {event.featured && (
                              <span className="border border-black bg-black px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-white">
                                Featured
                              </span>
                            )}

                            {event.all_ages ===
                              true && (
                              <span className="border border-black px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em]">
                                All Ages
                              </span>
                            )}

                            {status ===
                              "postponed" && (
                              <span className="border border-black bg-[#f3efe4] px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em]">
                                Postponed
                              </span>
                            )}

                            {isCancelled && (
                              <span className="border border-black bg-[#f3efe4] px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em]">
                                Cancelled
                              </span>
                            )}
                          </div>

                          <h3 className="mt-3 text-2xl font-black uppercase leading-tight tracking-[-0.025em]">
                            <Link
                              href={`/events/${event.slug}`}
                              className="transition-opacity hover:opacity-55"
                            >
                              {
                                event.title
                              }
                            </Link>
                          </h3>

                          {lineup.length >
                            0 && (
                            <div className="mt-4">
                              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-black/45">
                                Lineup
                              </p>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {lineup.map(
                                  (
                                    row
                                  ) => (
                                    <Link
                                      key={
                                        row.artist.id
                                      }
                                      href={`/artists/${row.artist.slug}`}
                                      className="border border-black bg-[#f3efe4] px-2.5 py-1.5 text-[10px] font-black uppercase transition-colors hover:bg-black hover:text-white"
                                    >
                                      {
                                        row.artist.name
                                      }
                                    </Link>
                                  )
                                )}
                              </div>
                            </div>
                          )}

                          {event.description_short && (
                            <p className="mt-4 max-w-2xl text-sm leading-6 text-black/60">
                              {
                                event.description_short
                              }
                            </p>
                          )}

                          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                            <Link
                              href={`/events/${event.slug}`}
                              className="inline-flex min-h-11 w-full items-center justify-center border-2 border-black bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white sm:w-auto"
                            >
                              View Event →
                            </Link>

                            {event.ticket_url &&
                              !isCancelled && (
                              <a
                                href={
                                  event.ticket_url
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-11 w-full items-center justify-center border-2 border-black bg-black px-4 py-3 text-[10px] font-black uppercase tracking-[0.1em] text-white transition-colors hover:bg-white hover:text-black sm:w-auto"
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

        {/* ====================================
            SIDEBAR
        ==================================== */}

        <aside className="border-t-2 border-black bg-white lg:border-l-2 lg:border-t-0">
          {/* ====================================
              VENUE DETAILS
          ==================================== */}

          <div className="border-b-2 border-black p-6 lg:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/45">
              About This Place
            </p>

            <h2 className="mt-2 text-xl font-black uppercase">
              Venue Details
            </h2>

            {addressLines.length >
              0 && (
              <div className="mt-6">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-black/45">
                  Address
                </p>

                <div className="mt-2 text-sm font-bold leading-6">
                  {addressLines.map(
                    (
                      line
                    ) => (
                      <div
                        key={
                          `address-${line}`
                        }
                      >
                        {
                          line
                        }
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            {location && (
              <div className="mt-6">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-black/45">
                  Atlas Location
                </p>

                <p className="mt-2 text-sm font-black">
                  {
                    location.name
                  }
                </p>

                {locationLabel &&
                  locationLabel !==
                    location.name && (
                  <p className="mt-1 text-xs font-bold text-black/50">
                    {
                      locationLabel
                    }
                  </p>
                )}
              </div>
            )}

            {venue.website_url && (
              <div className="mt-6">
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-black/45">
                  Online
                </p>

                <a
                  href={
                    venue.website_url
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex text-[10px] font-black uppercase tracking-[0.1em] underline decoration-2 underline-offset-4 hover:no-underline"
                >
                  Official Website ↗
                </a>
              </div>
            )}
          </div>

          {/* ====================================
              LOCAL SCENES
          ==================================== */}

          {localScenes.length >
            0 && (
            <div className="border-b-2 border-black p-6 lg:p-8">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/45">
                Local Ecosystem
              </p>

              <h2 className="mt-2 text-xl font-black uppercase">
                {localScenes.length ===
                1
                  ? "Local Scene"
                  : "Local Scenes"}
              </h2>

              <div className="mt-5 border-t-2 border-black">
                {localScenes.map(
                  (
                    scene
                  ) => (
                    <Link
                      key={
                        scene.id
                      }
                      href={`/scenes/${scene.slug}`}
                      className="group block border-b-2 border-black py-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          {scene.featured && (
                            <p className="mb-2 text-[9px] font-black uppercase tracking-[0.14em] text-black/45">
                              Featured Scene
                            </p>
                          )}

                          <h3 className="text-lg font-black uppercase group-hover:underline">
                            {
                              scene.name
                            }
                          </h3>

                          {scene.tagline && (
                            <p className="mt-2 text-xs leading-5 text-black/60">
                              {
                                scene.tagline
                              }
                            </p>
                          )}
                        </div>

                        <span
                          className="shrink-0 text-sm font-black"
                          aria-hidden="true"
                        >
                          →
                        </span>
                      </div>
                    </Link>
                  )
                )}
              </div>
            </div>
          )}

          {/* ====================================
              UPCOMING ARTISTS
          ==================================== */}

          <div className="p-6 lg:p-8">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/45">
              On the Calendar
            </p>

            <h2 className="mt-2 text-xl font-black uppercase">
              Upcoming Artists
            </h2>

            {upcomingArtists.length >
            0 ? (
              <div className="mt-5 border-t-2 border-black">
                {upcomingArtists.map(
                  (
                    artist
                  ) => (
                    <Link
                      key={
                        artist.id
                      }
                      href={`/artists/${artist.slug}`}
                      className="flex items-center justify-between gap-4 border-b-2 border-black py-4 transition-opacity hover:opacity-55"
                    >
                      <span className="text-sm font-black uppercase">
                        {
                          artist.name
                        }
                      </span>

                      <span className="shrink-0 text-[9px] font-black uppercase tracking-[0.1em] text-black/45">
                        {
                          artist.eventCount
                        }{" "}
                        {artist.eventCount ===
                        1
                          ? "Show"
                          : "Shows"}
                      </span>
                    </Link>
                  )
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-black/55">
                No upcoming Atlas artists are currently scheduled here.
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* ======================================
          KEEP EXPLORING
      ====================================== */}

      <section className="border-t-2 border-black bg-[#111] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-8 sm:py-12 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/45">
              Keep Exploring
            </p>

            <h2 className="mt-2 text-2xl font-black uppercase sm:text-3xl">
              Find More Shows
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">
              Explore artists, events, venues, and local scenes across the Atlas.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {localScenes.length ===
              1 && (
              <Link
                href={`/scenes/${localScenes[0].slug}`}
                className="inline-flex min-h-11 items-center border-2 border-white bg-black px-4 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-black"
              >
                Explore Scene →
              </Link>
            )}

            <Link
              href="/events"
              className="inline-flex min-h-11 items-center border-2 border-white bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-black transition-colors hover:bg-black hover:text-white"
            >
              Browse Events →
            </Link>

            <Link
              href="/?mode=events"
              className="inline-flex min-h-11 items-center border-2 border-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-black"
            >
              Event Map →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}