import Link from "next/link";
import { notFound } from "next/navigation";

import UndergroundAtlasHeader from "@/components/UndergroundAtlasHeader";
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

  const firstUpcomingEvent =
    activeUpcomingEvents[0] ??
    null;

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      <UndergroundAtlasHeader
        actionHref="/?mode=events"
        actionLabel="Back to Map →"
      />

      {/* ======================================
          VENUE HERO
      ====================================== */}

      <section className="border-b-2 border-black bg-white">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="border-black px-4 py-8 sm:px-6 sm:py-10 lg:border-r-2 lg:px-8 lg:py-12">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-black/45">
              Local Venue
            </p>

            <h1 className="mt-3 max-w-5xl break-words break-words text-[clamp(2.5rem,14vw,5.5rem)] font-black uppercase leading-[0.87] tracking-[-0.055em]">
              {venue.name}
            </h1>

            {locationLabel && (
              <p className="mt-5 text-base font-black uppercase tracking-[0.08em] sm:text-lg">
                {locationLabel}
              </p>
            )}

            {location?.country && (
              <p className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-black/45">
                {location.country}
              </p>
            )}

            {localScenes.length >
              0 && (
              <div className="mt-7">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-black/45">
                  Local Scenes
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
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
                            ? "border-2 border-black bg-black min-h-9 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] text-white transition-colors hover:bg-white hover:text-black"
                            : "border-2 border-black bg-white min-h-9 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white"
                        }
                      >
                        {scene.name} →
                      </Link>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          <aside className="flex flex-col justify-between gap-8 bg-black px-4 py-8 text-white sm:px-6 lg:px-8 lg:py-12">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
                Upcoming
              </p>

              <div className="mt-5 divide-y-2 divide-white border-y-2 border-white">
                <div className="flex items-end justify-between gap-5 py-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/55">
                    Shows
                  </span>

                  <span className="text-4xl font-black leading-none tracking-[-0.05em]">
                    {showCount}
                  </span>
                </div>

                <div className="flex items-end justify-between gap-5 py-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/55">
                    Artists
                  </span>

                  <span className="text-4xl font-black leading-none tracking-[-0.05em]">
                    {artistCount}
                  </span>
                </div>
              </div>
            </div>

            <a
              href="#upcoming-shows"
              className="inline-flex min-h-11 items-center justify-center border-2 border-white bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-black transition-colors hover:bg-black hover:text-white"
            >
              View Upcoming Shows ↓
            </a>
          </aside>
        </div>
      </section>

      {/* ======================================
          UPCOMING SHOWS
      ====================================== */}

      <section
        id="upcoming-shows"
        className="scroll-mt-20 border-b-2 border-black"
      >
        <div className="px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-12">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
                Live
              </p>

              <h2 className="mt-1 text-[clamp(2rem,4vw,3.25rem)] font-black uppercase leading-[0.92] tracking-[-0.04em]">
                Upcoming Shows
              </h2>
            </div>

            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-black/45">
              {upcomingEvents.length}{" "}
              {upcomingEvents.length ===
              1
                ? "Event"
                : "Events"}
            </p>
          </div>

          {upcomingEvents.length ===
          0 ? (
            <div className="mt-7 border-2 border-black bg-white p-7">
              <p className="text-xl font-black uppercase">
                Nothing Listed Yet
              </p>

              <p className="mt-3 max-w-xl text-sm leading-6 text-black/60">
                There are no upcoming published Atlas events currently listed for this venue.
              </p>

              <Link
                href="/?mode=events"
                className="mt-6 inline-flex min-h-10 items-center justify-center border-2 border-black bg-black px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-black"
              >
                Explore Event Map →
              </Link>
            </div>
          ) : (
            <div className="mt-7 grid gap-5 xl:grid-cols-2">
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

                  const isCancelled =
                    event.status ===
                    "cancelled";

                  return (
                    <article
                      key={
                        event.id
                      }
                      className={
                        isCancelled
                          ? "overflow-hidden border-2 border-red-700 bg-red-50"
                          : "overflow-hidden border-2 border-black bg-white"
                      }
                    >
                      <div className="grid md:grid-cols-[112px_minmax(0,1fr)]">
                        <div
                          className={
                            isCancelled
                              ? "flex min-h-[124px] flex-row items-center justify-between border-b-2 border-red-700 bg-red-700 p-4 text-white sm:flex-col sm:items-start sm:justify-between sm:border-b-0 sm:border-r-2"
                              : "flex min-h-[124px] flex-row items-center justify-between border-b-2 border-black bg-black p-4 text-white sm:flex-col sm:items-start sm:justify-between sm:border-b-0 sm:border-r-2"
                          }
                        >
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

                          <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white/55">
                            {formatEventType(
                              event.event_type
                            )}
                          </span>
                        </div>

                        <div className="p-4 sm:p-6">
                          <div className="flex flex-wrap gap-2">
                            {event.featured && (
                              <span className="border-2 border-black bg-black min-h-7 px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-white">
                                Featured
                              </span>
                            )}

                            {event.all_ages && (
                              <span className="border-2 border-black bg-white min-h-7 px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em]">
                                All Ages
                              </span>
                            )}

                            {event.status &&
                              event.status !==
                                "scheduled" && (
                                <span
                                  className={
                                    isCancelled
                                      ? "border-2 border-red-700 bg-white min-h-7 px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-red-700"
                                      : "border-2 border-black bg-white min-h-7 px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em]"
                                  }
                                >
                                  {event.status}
                                </span>
                              )}
                          </div>

                          <Link
                            href={`/events/${event.slug}`}
                            className="mt-4 inline-block"
                          >
                            <h3 className="text-2xl font-black uppercase leading-[0.95] tracking-[-0.035em] hover:underline sm:text-3xl">
                              {event.title}
                            </h3>
                          </Link>

                          {event.description_short && (
                            <p className="mt-3 line-clamp-3 text-sm leading-6 text-black/60">
                              {event.description_short}
                            </p>
                          )}

                          {lineup.length >
                            0 && (
                            <div className="mt-5 border-t-2 border-black pt-4">
                              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-black/45">
                                Lineup
                              </p>

                              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                                {lineup
                                  .slice(
                                    0,
                                    4
                                  )
                                  .map(
                                    (
                                      row,
                                      index
                                    ) => (
                                      <span
                                        key={
                                          row.artist.id
                                        }
                                        className="text-xs font-black uppercase"
                                      >
                                        <Link
                                          href={`/artists/${row.artist.slug}`}
                                          className="hover:underline"
                                        >
                                          {row.artist.name}
                                        </Link>

                                        {index <
                                          Math.min(
                                            lineup.length,
                                            4
                                          ) -
                                            1 && (
                                          <span className="ml-3 text-black/30">
                                            /
                                          </span>
                                        )}
                                      </span>
                                    )
                                  )}

                                {lineup.length >
                                  4 && (
                                  <span className="text-xs font-black uppercase text-black/45">
                                    +{lineup.length -
                                      4} more
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="mt-5 flex flex-wrap gap-2 border-t-2 border-black pt-4">
                            <Link
                              href={`/events/${event.slug}`}
                              className="inline-flex min-h-10 items-center justify-center border-2 border-black bg-white min-h-9 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white"
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

      {/* ======================================
          UPCOMING ARTISTS + VENUE DETAILS
      ====================================== */}

      <section className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="border-black px-4 py-10 sm:px-6 sm:py-12 lg:border-r-2 lg:px-8">
          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
                Artists
              </p>

              <h2 className="mt-1 text-[clamp(2rem,4vw,3.25rem)] font-black uppercase leading-[0.92] tracking-[-0.04em]">
                Coming Through
              </h2>
            </div>

            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-black/45">
              {artistCount} Total
            </span>
          </div>

          {!upcomingArtists.length ? (
            <p className="mt-6 text-sm text-black/60">
              No upcoming artists are currently listed for this venue.
            </p>
          ) : (
            <div className="mt-6 divide-y-2 divide-black border-y-2 border-black">
              {upcomingArtists.map(
                (
                  artist,
                  index
                ) => (
                  <Link
                    key={
                      artist.id
                    }
                    href={`/artists/${artist.slug}`}
                    className="group grid gap-3 py-4 md:grid-cols-[44px_1fr_auto] sm:items-center"
                  >
                    <span className="text-[10px] font-black text-black/35">
                      {String(
                        index + 1
                      ).padStart(
                        2,
                        "0"
                      )}
                    </span>

                    <h3 className="text-xl font-black uppercase tracking-[-0.025em] group-hover:underline">
                      {artist.name}
                    </h3>

                    <span className="text-[9px] font-black uppercase tracking-[0.11em] text-black/45">
                      {artist.eventCount}{" "}
                      {artist.eventCount ===
                      1
                        ? "Show"
                        : "Shows"}
                    </span>
                  </Link>
                )
              )}
            </div>
          )}
        </div>

        <aside className="border-t-2 border-black bg-white px-4 py-8 sm:px-6 lg:border-t-0 lg:px-8">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
            Venue Details
          </p>

          <div className="mt-5 divide-y-2 divide-black border-y-2 border-black">
            {addressLines.length >
              0 && (
              <div className="py-3">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-black/45">
                  Address
                </p>

                <div className="mt-1 break-words text-sm font-bold leading-6">
                  {addressLines.map(
                    (
                      line
                    ) => (
                      <span
                        key={
                          line
                        }
                        className="block"
                      >
                        {line}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

            {locationLabel && (
              <div className="py-3">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-black/45">
                  Area
                </p>

                <p className="mt-1 text-sm font-black">
                  {locationLabel}
                </p>
              </div>
            )}

            {venue.website_url && (
              <div className="py-3">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-black/45">
                  Website
                </p>

                <a
                  href={
                    venue.website_url
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-block break-words text-sm font-black hover:underline"
                >
                  Visit Venue Website ↗
                </a>
              </div>
            )}

            {firstUpcomingEvent && (
              <div className="py-3">
                <p className="text-[9px] font-black uppercase tracking-[0.14em] text-black/45">
                  Next Show
                </p>

                <Link
                  href={`/events/${firstUpcomingEvent.slug}`}
                  className="mt-1 block"
                >
                  <p className="text-sm font-black uppercase hover:underline">
                    {firstUpcomingEvent.title}
                  </p>

                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-black/45">
                    {formatEventDate(
                      firstUpcomingEvent.start_at,
                      firstUpcomingEvent.timezone ??
                        "America/Los_Angeles"
                    )}
                  </p>
                </Link>
              </div>
            )}
          </div>
        </aside>
      </section>

      {/* ======================================
          KEEP EXPLORING
      ====================================== */}

      <section className="border-t-2 border-black bg-black text-white">
        <div className="flex flex-col gap-8 px-4 py-10 sm:px-6 sm:py-12 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
              Keep Exploring
            </p>

            <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.035em] sm:text-4xl">
              Follow the Local Scene
            </h2>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            {localScenes[0] && (
              <Link
                href={`/scenes/${localScenes[0].slug}`}
                className="inline-flex min-h-11 items-center justify-center border-2 border-white bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-black transition-colors hover:bg-black hover:text-white"
              >
                Explore Scene →
              </Link>
            )}

            <Link
              href="/?mode=events"
              className="inline-flex min-h-11 items-center justify-center border-2 border-white bg-black px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-black"
            >
              Explore Event Map →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
