import Link from "next/link";

import EventsFilters from "./EventsFilters";

import UndergroundAtlasHeader from "@/components/UndergroundAtlasHeader";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

// ============================================
// TYPES
// ============================================

type EventsPageProps = {
  searchParams: Promise<{
    event_window?:
      | string
      | string[];
    event_locations?:
      | string
      | string[];
    event_genres?:
      | string
      | string[];
  }>;
};

type EventLocation = {
  id: string;
  name: string | null;
  slug: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
};

type EventVenue = {
  id: string;
  name: string;
  slug: string;
  website_url: string | null;

  location:
    | EventLocation
    | EventLocation[]
    | null;
};

type EventArtist = {
  id: string;
  name: string;
  slug: string;
  published: boolean;
};

type EventLineupRow = {
  artist_id: string;
  billing_role: string;
  billing_order: number;

  artist:
    | EventArtist
    | EventArtist[]
    | null;
};

type Event = {
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

type Genre = {
  id: string;
  name: string;
  slug: string;
};

type LocationOption = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  region: string | null;
  country: string;
};

type ArtistGenreRow = {
  artist_id: string;
  genre_id: string;
};

type NormalizedLineupRow = {
  artist_id: string;
  billing_role: string;
  billing_order: number;
  artist: EventArtist;
};

type NormalizedEvent = Event & {
  normalizedVenue:
    | EventVenue
    | null;

  normalizedEventLocation:
    | EventLocation
    | null;

  normalizedVenueLocation:
    | EventLocation
    | null;

  normalizedDisplayLocation:
    | EventLocation
    | null;

  normalizedLineup:
    NormalizedLineupRow[];
};

// ============================================
// FILTER OPTIONS
// ============================================

const DATE_WINDOWS = [
  {
    value:
      "7-days",
    label:
      "Next 7 Days",
    days:
      7,
  },
  {
    value:
      "30-days",
    label:
      "Next 30 Days",
    days:
      30,
  },
  {
    value:
      "90-days",
    label:
      "Next 90 Days",
    days:
      90,
  },
  {
    value:
      "any",
    label:
      "Any Upcoming Date",
    days:
      null,
  },
] as const;

type DateWindow =
  typeof DATE_WINDOWS[number]["value"];

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

function normalizeSearchValues(
  value:
    | string
    | string[]
    | undefined
) {
  const rawValues =
    Array.isArray(
      value
    )
      ? value
      : value
        ? [value]
        : [];

  return [
    ...new Set(
      rawValues
        .flatMap(
          (
            item
          ) =>
            item.split(",")
        )
        .map(
          (
            item
          ) =>
            item.trim()
        )
        .filter(
          Boolean
        )
    ),
  ];
}

function normalizeDateWindow(
  value:
    | string
    | string[]
    | undefined
): DateWindow {
  const raw =
    Array.isArray(
      value
    )
      ? value[0]
      : value;

  const match =
    DATE_WINDOWS.find(
      (
        option
      ) =>
        option.value ===
        raw
    );

  return (
    match?.value ??
    "30-days"
  );
}

function getEndDate(
  window:
    DateWindow
) {
  const option =
    DATE_WINDOWS.find(
      (
        item
      ) =>
        item.value ===
        window
    );

  if (
    !option ||
    option.days ===
      null
  ) {
    return null;
  }

  const date =
    new Date();

  date.setDate(
    date.getDate() +
      option.days
  );

  return date;
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
    return new Date(
      value
    ).toLocaleDateString(
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
    );
  }
}

function formatEventTime(
  value:
    | string
    | null,
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
    return new Date(
      value
    ).toLocaleTimeString(
      "en-US",
      {
        hour:
          "numeric",
        minute:
          "2-digit",
      }
    );
  }
}

function formatStatus(
  value: string
) {
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

function formatEventType(
  value: string
) {
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

function formatBillingRole(
  value: string
) {
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

function buildLocationLabel(
  location:
    | EventLocation
    | null
) {
  if (!location) {
    return null;
  }

  return [
    location.city ??
      location.name,
    location.region,
  ]
    .filter(
      Boolean
    )
    .join(
      ", "
    );
}

function buildLocationOptionLabel(
  location:
    LocationOption
) {
  return [
    location.city ??
      location.name,
    location.region,
  ]
    .filter(
      Boolean
    )
    .join(
      ", "
    );
}

// ============================================
// PAGE
// ============================================

export default async function EventsPage({
  searchParams,
}: EventsPageProps) {
  const params =
    await searchParams;

  const selectedWindow =
    normalizeDateWindow(
      params.event_window
    );

  const selectedLocations =
    normalizeSearchValues(
      params.event_locations
    );

  const selectedGenres =
    normalizeSearchValues(
      params.event_genres
    );

  const endDate =
    getEndDate(
      selectedWindow
    );

  // ============================================
  // EVENT MAP URL
  // ============================================

  const eventMapParams =
    new URLSearchParams();

  eventMapParams.set(
    "mode",
    "events"
  );

  eventMapParams.set(
    "event_window",
    selectedWindow
  );

  selectedGenres.forEach(
    (
      genre
    ) => {
      eventMapParams.append(
        "event_genres",
        genre
      );
    }
  );

  selectedLocations.forEach(
    (
      location
    ) => {
      eventMapParams.append(
        "event_locations",
        location
      );
    }
  );

  const eventMapHref =
    `/?${eventMapParams.toString()}`;

  const supabase =
    await createClient();

  // ============================================
  // FILTER DATA
  // ============================================

  const [
    genreResult,
    locationResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "genres"
        )
        .select(
          `
          id,
          name,
          slug
          `
        )
        .eq(
          "active",
          true
        )
        .order(
          "name"
        ),

      supabase
        .from(
          "locations"
        )
        .select(
          `
          id,
          name,
          slug,
          city,
          region,
          country
          `
        )
        .order(
          "country"
        )
        .order(
          "region"
        )
        .order(
          "city"
        ),
    ]);

  if (
    genreResult.error
  ) {
    throw new Error(
      genreResult.error.message
    );
  }

  if (
    locationResult.error
  ) {
    throw new Error(
      locationResult.error.message
    );
  }

  const genres =
    (
      genreResult.data ??
      []
    ) as Genre[];

  const locations =
    (
      locationResult.data ??
      []
    ) as LocationOption[];

  // ============================================
  // UPCOMING EVENTS
  // ============================================

  let eventQuery =
    supabase
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
          website_url,

          location:locations (
            id,
            name,
            slug,
            city,
            region,
            country
          )
        ),

        location:locations (
          id,
          name,
          slug,
          city,
          region,
          country
        ),

        lineup:event_artists (
          artist_id,
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
      .eq(
        "published",
        true
      )
      .gte(
        "start_at",
        new Date()
          .toISOString()
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
    endDate
  ) {
    eventQuery =
      eventQuery.lte(
        "start_at",
        endDate.toISOString()
      );
  }

  const {
    data:
      eventRows,
    error:
      eventError,
  } =
    await eventQuery;

  if (
    eventError
  ) {
    throw new Error(
      eventError.message
    );
  }

  const rawEvents =
    (
      eventRows ??
      []
    ) as unknown as Event[];

  // ============================================
  // NORMALIZE EVENT RELATIONS
  // ============================================

  const normalizedEvents:
    NormalizedEvent[] =
    rawEvents.map(
      (
        event
      ) => {
        const normalizedVenue =
          firstRelation<EventVenue>(
            event.venue
          );

        const normalizedEventLocation =
          firstRelation<EventLocation>(
            event.location
          );

        const normalizedVenueLocation =
          firstRelation<EventLocation>(
            normalizedVenue
              ?.location
          );

        const normalizedDisplayLocation =
          normalizedVenueLocation ??
          normalizedEventLocation;

        const normalizedLineup =
          (
            event.lineup ??
            []
          )
            .map(
              (
                row
              ) => {
                const artist =
                  firstRelation<EventArtist>(
                    row.artist
                  );

                if (
                  !artist ||
                  !artist.published
                ) {
                  return null;
                }

                return {
                  artist_id:
                    row.artist_id,

                  billing_role:
                    row.billing_role,

                  billing_order:
                    row.billing_order,

                  artist,
                };
              }
            )
            .filter(
              (
                row
              ): row is
                NormalizedLineupRow =>
                row !==
                null
            )
            .sort(
              (
                a,
                b
              ) =>
                a.billing_order -
                b.billing_order
            );

        return {
          ...event,
          normalizedVenue,
          normalizedEventLocation,
          normalizedVenueLocation,
          normalizedDisplayLocation,
          normalizedLineup,
        };
      }
    );

  // ============================================
  // GENRES BY ARTIST
  // ============================================

  const artistIds = [
    ...new Set(
      normalizedEvents.flatMap(
        (
          event
        ) =>
          event.normalizedLineup.map(
            (
              row
            ) =>
              row.artist.id
          )
      )
    ),
  ];

  let artistGenreRows:
    ArtistGenreRow[] = [];

  if (
    artistIds.length >
    0
  ) {
    const {
      data,
      error,
    } =
      await supabase
        .from(
          "artist_genres"
        )
        .select(
          `
          artist_id,
          genre_id
          `
        )
        .in(
          "artist_id",
          artistIds
        );

    if (
      error
    ) {
      throw new Error(
        error.message
      );
    }

    artistGenreRows =
      data ??
      [];
  }

  const genreSlugById =
    new Map(
      genres.map(
        (
          genre
        ) => [
          genre.id,
          genre.slug,
        ]
      )
    );

  const genreSlugsByArtist =
    new Map<
      string,
      Set<string>
    >();

  artistGenreRows.forEach(
    (
      row
    ) => {
      const slug =
        genreSlugById.get(
          row.genre_id
        );

      if (!slug) {
        return;
      }

      const existing =
        genreSlugsByArtist.get(
          row.artist_id
        ) ??
        new Set<string>();

      existing.add(
        slug
      );

      genreSlugsByArtist.set(
        row.artist_id,
        existing
      );
    }
  );

  // ============================================
  // APPLY LOCATION + GENRE FILTERS
  // ============================================

  const upcomingEvents =
    normalizedEvents.filter(
      (
        event
      ) => {
        const locationMatch =
          selectedLocations.length ===
            0 ||
          (
            event
              .normalizedDisplayLocation
              ?.slug
              ? selectedLocations.includes(
                  event
                    .normalizedDisplayLocation
                    .slug
                )
              : false
          );

        if (
          !locationMatch
        ) {
          return false;
        }

        if (
          selectedGenres.length ===
          0
        ) {
          return true;
        }

        return event.normalizedLineup.some(
          (
            row
          ) => {
            const artistGenres =
              genreSlugsByArtist.get(
                row.artist.id
              );

            if (
              !artistGenres
            ) {
              return false;
            }

            return selectedGenres.some(
              (
                genreSlug
              ) =>
                artistGenres.has(
                  genreSlug
                )
            );
          }
        );
      }
    );

  // ============================================
  // FILTER DISPLAY
  // ============================================

  const selectedDateLabel =
    DATE_WINDOWS.find(
      (
        option
      ) =>
        option.value ===
        selectedWindow
    )?.label ??
    "Next 30 Days";

  const selectedLocationLabels =
    selectedLocations
      .map(
        (
          slug
        ) =>
          locations.find(
            (
              location
            ) =>
              location.slug ===
              slug
          )
      )
      .filter(
        (
          location
        ): location is
          LocationOption =>
          Boolean(
            location
          )
      )
      .map(
        (
          location
        ) =>
          buildLocationOptionLabel(
            location
          )
      );

  const selectedGenreLabels =
    selectedGenres
      .map(
        (
          slug
        ) =>
          genres.find(
            (
              genre
            ) =>
              genre.slug ===
              slug
          )
      )
      .filter(
        (
          genre
        ): genre is
          Genre =>
          Boolean(
            genre
          )
      )
      .map(
        (
          genre
        ) =>
          genre.name
      );

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      <UndergroundAtlasHeader
        actionHref={eventMapHref}
        actionLabel="Back to Map →"
      />

      {/* ========================================
          HERO
      ======================================== */}

      <section className="border-b-2 border-black">
        <div className="px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-black/45">
            Events
          </p>

          <h1 className="mt-3 max-w-5xl break-words text-[clamp(2.4rem,13vw,5.8rem)] font-black uppercase leading-[0.87] tracking-[-0.055em]">
            Upcoming Shows
          </h1>

          <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-black/65 sm:text-lg">
            Live music, local venues, and upcoming events across the Atlas.
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            <span className="border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em]">
              {upcomingEvents.length}{" "}
              {upcomingEvents.length === 1
                ? "Event"
                : "Events"}
            </span>

            {upcomingEvents.some(
              (
                event
              ) =>
                event.featured
            ) && (
              <span className="border-2 border-black bg-black px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                Featured Shows Included
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ========================================
          AUTO-APPLY FILTERS
      ======================================== */}

      <EventsFilters
        genres={
          genres
        }
        locations={
          locations
        }
        selectedWindow={
          selectedWindow
        }
        selectedGenres={
          selectedGenres
        }
        selectedLocations={
          selectedLocations
        }
      />

      {/* ========================================
          ACTIVE FILTER SUMMARY
      ======================================== */}

      <section className="border-b-2 border-black">
        <div className="px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-2 text-[10px] font-black uppercase tracking-[0.16em] text-black/45">
              Showing
            </span>

            <span className="border-2 border-black bg-black min-h-8 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-white">
              {
                selectedDateLabel
              }
            </span>

            {selectedGenreLabels.map(
              (
                genre
              ) => (
                <span
                  key={
                    `genre-${genre}`
                  }
                  className="border-2 border-black bg-white min-h-8 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em]"
                >
                  {
                    genre
                  }
                </span>
              )
            )}

            {selectedLocationLabels.map(
              (
                location
              ) => (
                <span
                  key={
                    `location-${location}`
                  }
                  className="border-2 border-black bg-white min-h-8 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em]"
                >
                  {
                    location
                  }
                </span>
              )
            )}
          </div>
        </div>
      </section>

      {/* ========================================
          EVENTS
      ======================================== */}

      <section>
        {!upcomingEvents.length ? (
          <div className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
            <div className="border-2 border-black bg-white p-5 sm:p-8 sm:p-10">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/50">
                Nothing Found
              </p>

              <h2 className="mt-3 text-3xl font-black uppercase">
                No Matching Shows
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-6 text-black/60">
                No upcoming events match the current date, genre, and location filters.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/events"
                  className="inline-flex border-2 border-black bg-black min-h-11 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-black"
                >
                  Clear Filters
                </Link>

                <Link
                  href={
                    eventMapHref
                  }
                  className="inline-flex border-2 border-black bg-white min-h-11 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] tracking-[0.12em] transition-colors hover:bg-black hover:text-white"
                >
                  Explore Event Map →
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 px-4 py-7 sm:px-6 sm:py-9 lg:px-8 xl:grid-cols-2">
            {upcomingEvents.map(
              (
                event,
                eventIndex
              ) => {
                const timeZone =
                  event.timezone ??
                  "America/Los_Angeles";

                const venue =
                  event.normalizedVenue;

                const displayLocation =
                  event
                    .normalizedDisplayLocation;

                const locationLabel =
                  buildLocationLabel(
                    displayLocation
                  );

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
                  event.normalizedLineup;

                const isCancelled =
                  event.status ===
                  "cancelled";

                const isPostponed =
                  event.status ===
                  "postponed";

                return (
                  <article
                    key={
                      event.id
                    }
                    className={
                      isCancelled
                        ? "overflow-hidden border-2 border-red-700 bg-red-50"
                        : event.featured
                          ? "overflow-hidden border-2 border-black bg-white"
                          : "overflow-hidden border-2 border-black bg-white"
                    }
                  >
                    <div className="grid sm:grid-cols-[112px_minmax(0,1fr)]">
                      {/* DATE */}

                      <div className="flex min-h-[124px] flex-row items-center justify-between border-b-2 border-black bg-black p-4 text-white sm:flex-col sm:items-start sm:justify-between sm:border-b-0 sm:border-r-2">
                        <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/50">
                          {String(
                            eventIndex +
                              1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </p>

                        <p className="mt-2 text-sm font-black uppercase leading-tight">
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
                          <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/55">
                            Doors{" "}
                            {
                              doorsTime
                            }
                          </p>
                        )}
                      </div>

                      {/* EVENT */}

                      <div className="p-4 sm:p-6">
                        <div className="flex flex-wrap gap-2">
                          <span className="border-2 border-black bg-white min-h-8 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em]">
                            {formatEventType(
                              event.event_type
                            )}
                          </span>

                          {event.featured && (
                            <span className="border-2 border-black bg-black min-h-8 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-white">
                              Featured
                            </span>
                          )}

                          {event.all_ages && (
                            <span className="border-2 border-black bg-white min-h-8 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em]">
                              All Ages
                            </span>
                          )}

                          {(isCancelled ||
                            isPostponed) && (
                            <span
                              className={
                                isCancelled
                                  ? "border-2 border-red-700 bg-white min-h-8 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-red-700"
                                  : "border-2 border-black bg-white min-h-8 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.1em]"
                              }
                            >
                              {formatStatus(
                                event.status
                              )}
                            </span>
                          )}
                        </div>

                        <Link
                          href={`/events/${event.slug}`}
                          className="group block"
                        >
                          <h2 className="mt-5 text-3xl font-black uppercase leading-[0.9] tracking-[-0.03em] group-hover:underline sm:text-4xl">
                            {
                              event.title
                            }
                          </h2>
                        </Link>

                        {(venue?.name ||
                          locationLabel) && (
                          <div className="mt-5">
                            {venue?.name && (
                              <Link
                                href={`/venues/${venue.slug}`}
                                className="group inline-flex items-center gap-2 font-black uppercase"
                              >
                                <span className="group-hover:underline">
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
                              <p className="mt-1 text-sm font-bold text-black/55">
                                {
                                  locationLabel
                                }
                              </p>
                            )}
                          </div>
                        )}

                        {event.description_short && (
                          <p className="mt-5 max-w-2xl text-sm leading-6 text-black/65">
                            {
                              event.description_short
                            }
                          </p>
                        )}

                        {lineup.length >
                          0 && (
                          <div className="mt-6">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-black/45">
                              Lineup
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {lineup.map(
                                (
                                  row
                                ) => {
                                  const artist =
                                    row.artist;

                                  return (
                                    <Link
                                      key={
                                        artist.id
                                      }
                                      href={`/artists/${artist.slug}`}
                                      className="border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase transition-colors hover:bg-black hover:text-white"
                                    >
                                      {
                                        artist.name
                                      }

                                      {row.billing_role !==
                                      "performer"
                                        ? ` · ${formatBillingRole(
                                            row.billing_role
                                          )}`
                                        : ""}
                                    </Link>
                                  );
                                }
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* ACTIONS */}

                      <div className="border-t-2 border-black p-5 sm:col-start-2 sm:p-6">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                          <div>
                          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
                            Status
                          </p>

                          <p
                            className={
                              isCancelled
                                ? "mt-2 font-black uppercase text-red-700"
                                : "mt-2 font-black uppercase"
                            }
                          >
                            {formatStatus(
                              event.status
                            )}
                          </p>

                          {isPostponed && (
                            <p className="mt-3 text-xs leading-5 text-black/55">
                              Check the event details for updated scheduling information.
                            </p>
                          )}

                          {isCancelled && (
                            <p className="mt-3 text-xs leading-5 text-red-700">
                              This event has been cancelled.
                            </p>
                          )}
                        </div>

                          <div className="flex flex-wrap gap-2 sm:justify-end">
                            <Link
                              href={`/events/${event.slug}`}
                              className="inline-flex min-h-10 items-center justify-center border-2 border-black bg-white min-h-9 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white"
                            >
                              View Event →
                            </Link>

                            {venue && (
                              <Link
                                href={`/venues/${venue.slug}`}
                                className="inline-flex min-h-10 items-center justify-center border-2 border-black bg-white min-h-9 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white"
                              >
                                Venue →
                              </Link>
                            )}

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
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>

      {/* ========================================
          FOOTER CTA
      ======================================== */}

      <section className="border-t-2 border-black bg-black text-white">
        <div className="flex flex-col gap-8 px-4 py-10 sm:px-6 sm:py-12 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
              Keep Exploring
            </p>

            <h2 className="mt-3 max-w-3xl text-4xl font-black uppercase leading-[0.9] tracking-[-0.04em] sm:text-5xl">
              Find the Artists
              <br />
              Behind the Shows
            </h2>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={
                eventMapHref
              }
              className="inline-flex w-full items-center justify-center border-2 border-white bg-white min-h-11 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] tracking-[0.12em] text-black transition-colors hover:bg-black hover:text-white sm:w-auto"
            >
              Explore Event Map →
            </Link>

            <Link
              href="/"
              className="inline-flex w-full items-center justify-center border-2 border-white bg-black min-h-11 px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-black sm:w-auto"
            >
              Explore Artists →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}