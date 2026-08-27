import Link from "next/link";
import { notFound } from "next/navigation";

import UndergroundAtlasHeader from "@/components/UndergroundAtlasHeader";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type EventPageProps = {
  params: Promise<{
    slug: string;
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
  address_line_1: string | null;
  address_line_2: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  website_url: string | null;
  active: boolean;

  location:
    | EventLocation
    | EventLocation[]
    | null;
};

type LineupArtist = {
  id: string;
  name: string;
  slug: string;
  published: boolean;
  status: string | null;
};

type LineupRow = {
  artist_id: string;
  billing_role: string;
  billing_order: number;

  artist:
    | LineupArtist
    | LineupArtist[]
    | null;
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
      (letter) =>
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
      (letter) =>
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
      (letter) =>
        letter.toUpperCase()
    );
}

function formatDate(
  value: string,
  timeZone: string
) {
  try {
    return new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,
        weekday:
          "long",
        month:
          "long",
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
          "long",
        month:
          "long",
        day:
          "numeric",
        year:
          "numeric",
      }
    );
  }
}

function formatTime(
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

// ============================================
// PAGE
// ============================================

export default async function EventPage({
  params,
}: EventPageProps) {
  const {
    slug,
  } = await params;

  const supabase =
    await createClient();

  // ============================================
  // EVENT
  // ============================================

  const {
    data: event,
    error,
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
      end_at,
      doors_at,
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
          published,
          status
        )
      )
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
    .single();

  if (
    error ||
    !event
  ) {
    notFound();
  }

  // ============================================
  // NORMALIZE RELATIONS
  // ============================================

  const venue =
    firstRelation<EventVenue>(
      event.venue
    );

  const eventLocation =
    firstRelation<EventLocation>(
      event.location
    );

  const venueLocation =
    firstRelation<EventLocation>(
      venue?.location
    );

  /*
   * For physical events, the venue location is
   * the authoritative geography. Fall back to
   * the event location when no venue location
   * exists.
   */
  const displayLocation =
    venueLocation ??
    eventLocation;

  const timeZone =
    event.timezone ??
    "America/Los_Angeles";

  const lineup =
    (
      event.lineup ??
      []
    )
      .map(
        (
          row
        ) => ({
          ...row,

          artist:
            firstRelation<LineupArtist>(
              row.artist
            ),
        })
      )
      .filter(
        (
          row
        ) =>
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

  const startTime =
    formatTime(
      event.start_at,
      timeZone
    );

  const doorsTime =
    formatTime(
      event.doors_at,
      timeZone
    );

  const endTime =
    formatTime(
      event.end_at,
      timeZone
    );

  const locationLabel =
    displayLocation
      ? [
          displayLocation.city ??
            displayLocation.name,

          displayLocation.region,

          displayLocation.country,
        ]
          .filter(
            Boolean
          )
          .join(
            ", "
          )
      : null;

  // ============================================
  // ADDRESS
  // ============================================

  const addressCityRegion =
    venue
      ? [
          venueLocation?.city ??
            eventLocation?.city,

          venueLocation?.region ??
            eventLocation?.region,
        ]
          .filter(
            Boolean
          )
          .join(
            ", "
          )
      : "";

  const addressCityLine =
    venue
      ? [
          addressCityRegion,
          venue.postal_code,
        ]
          .filter(
            Boolean
          )
          .join(
            " "
          )
      : "";

  const addressCountry =
    venueLocation?.country ??
    eventLocation?.country ??
    null;

  const addressLines =
    venue
      ? [
          venue.address_line_1,
          venue.address_line_2,
          addressCityLine,
          addressCountry,
        ].filter(
          (
            value
          ): value is string =>
            Boolean(
              value
            )
        )
      : [];

  const isCancelled =
    event.status ===
    "cancelled";

  const isPostponed =
    event.status ===
    "postponed";

  // ============================================
  // PAGE
  // ============================================

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      <UndergroundAtlasHeader
        actionHref="/events"
        actionLabel="All Events →"
      />

      {/* ========================================
          EVENT HERO
      ======================================== */}

      <section className="border-b-2 border-black">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="border-black px-4 py-8 sm:px-6 sm:py-10 lg:border-r-2 lg:px-8 lg:py-12">
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

              {event.status !==
                "scheduled" && (
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

            <p className="mt-8 text-[11px] font-black uppercase tracking-[0.18em] text-black/50">
              {formatDate(
                event.start_at,
                timeZone
              )}
            </p>

            <h1 className="mt-3 max-w-5xl break-words break-words text-[clamp(2.5rem,14vw,5.6rem)] font-black uppercase leading-[0.87] tracking-[-0.055em]">
              {event.title}
            </h1>

            {(venue?.name ||
              locationLabel) && (
              <div className="mt-7">
                {venue?.name && (
                  <Link
                    href={`/venues/${venue.slug}`}
                    className="text-lg font-black uppercase hover:underline"
                  >
                    {venue.name} →
                  </Link>
                )}

                {locationLabel && (
                  <p className="mt-1 text-sm font-bold uppercase tracking-[0.08em] text-black/55">
                    {locationLabel}
                  </p>
                )}
              </div>
            )}
          </div>

          <aside className="flex flex-col justify-between gap-8 bg-black px-4 py-8 text-white sm:px-6 lg:px-8 lg:py-12">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/50">
                Show Time
              </p>

              {startTime && (
                <p className="mt-3 text-5xl font-black uppercase leading-none tracking-[-0.05em]">
                  {startTime}
                </p>
              )}

              <div className="mt-5 space-y-1 text-[11px] font-black uppercase tracking-[0.1em] text-white/65">
                {doorsTime && (
                  <p>
                    Doors {doorsTime}
                  </p>
                )}

                {endTime && (
                  <p>
                    Ends {endTime}
                  </p>
                )}
              </div>
            </div>

            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-white/40">
                Timezone
              </p>

              <p className="mt-1 text-sm font-black">
                {timeZone}
              </p>

              {(event.ticket_url ||
                event.event_url) && (
                <div className="mt-6 flex flex-col gap-2">
                  {event.ticket_url &&
                    !isCancelled && (
                    <a
                      href={
                        event.ticket_url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center justify-center border-2 border-white bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-black transition-colors hover:bg-black hover:text-white"
                    >
                      Tickets ↗
                    </a>
                  )}

                  {event.event_url && (
                    <a
                      href={
                        event.event_url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center justify-center border-2 border-white bg-black px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-black"
                    >
                      Official Event ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>

      {/* ========================================
          STATUS ALERT
      ======================================== */}

      {(isCancelled ||
        isPostponed) && (
        <section
          className={
            isCancelled
              ? "border-b-2 border-red-700 bg-red-50"
              : "border-b-2 border-black bg-white"
          }
        >
          <div className="px-4 py-4 sm:px-6 lg:px-8">
            <p
              className={
                isCancelled
                  ? "text-sm font-black uppercase text-red-700"
                  : "text-sm font-black uppercase"
              }
            >
              {isCancelled
                ? "This event has been cancelled."
                : "This event has been postponed."}
            </p>

            {isPostponed && (
              <p className="mt-1 text-sm text-black/60">
                Check the official event source for updated scheduling information.
              </p>
            )}
          </div>
        </section>
      )}

      {/* ========================================
          CONTENT
      ======================================== */}

      <section className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="border-black px-4 py-10 sm:px-6 sm:py-12 lg:border-r-2 lg:px-8">
          {event.description_short && (
            <section className="border-b-2 border-black pb-8">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
                About This Event
              </p>

              <p className="mt-4 max-w-3xl whitespace-pre-line text-base leading-7 text-black/75 sm:text-lg sm:leading-8">
                {event.description_short}
              </p>
            </section>
          )}

          <section
            className={
              event.description_short
                ? "pt-8"
                : ""
            }
          >
            <div className="flex items-end justify-between gap-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
                  Live
                </p>

                <h2 className="mt-1 text-[clamp(2rem,4vw,3.25rem)] font-black uppercase leading-[0.92] tracking-[-0.04em]">
                  Lineup
                </h2>
              </div>

              <span className="text-[10px] font-black uppercase tracking-[0.12em] text-black/45">
                {lineup.length}{" "}
                {lineup.length ===
                1
                  ? "Artist"
                  : "Artists"}
              </span>
            </div>

            {!lineup.length ? (
              <p className="mt-6 text-sm text-black/60">
                Lineup information has not been published yet.
              </p>
            ) : (
              <div className="mt-6 divide-y-2 divide-black border-y-2 border-black">
                {lineup.map(
                  (
                    row,
                    index
                  ) => {
                    const lineupArtist =
                      row.artist;

                    if (
                      !lineupArtist
                    ) {
                      return null;
                    }

                    return (
                      <Link
                        key={
                          lineupArtist.id
                        }
                        href={`/artists/${lineupArtist.slug}`}
                        className="group grid gap-3 py-4 sm:grid-cols-[44px_1fr_auto] sm:items-center"
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
                          <h3 className="text-xl font-black uppercase tracking-[-0.025em] group-hover:underline sm:text-2xl">
                            {lineupArtist.name}
                          </h3>

                          <p className="mt-1 text-[9px] font-black uppercase tracking-[0.13em] text-black/45">
                            {formatBillingRole(
                              row.billing_role
                            )}
                          </p>
                        </div>

                        <span className="text-[10px] font-black uppercase tracking-[0.12em]">
                          Explore →
                        </span>
                      </Link>
                    );
                  }
                )}
              </div>
            )}
          </section>
        </div>

        {/* ======================================
            DETAILS
        ====================================== */}

        <aside className="border-t-2 border-black bg-white px-4 py-8 sm:px-6 lg:border-t-0 lg:px-8">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
            Event Details
          </p>

          <dl className="mt-5 divide-y-2 divide-black border-y-2 border-black">
            <div className="py-3">
              <dt className="text-[9px] font-black uppercase tracking-[0.14em] text-black/45">
                Date
              </dt>

              <dd className="mt-1 text-sm font-black">
                {formatDate(
                  event.start_at,
                  timeZone
                )}
              </dd>
            </div>

            {startTime && (
              <div className="py-3">
                <dt className="text-[9px] font-black uppercase tracking-[0.14em] text-black/45">
                  Start
                </dt>

                <dd className="mt-1 text-sm font-black uppercase">
                  {startTime}
                </dd>
              </div>
            )}

            {doorsTime && (
              <div className="py-3">
                <dt className="text-[9px] font-black uppercase tracking-[0.14em] text-black/45">
                  Doors
                </dt>

                <dd className="mt-1 text-sm font-black uppercase">
                  {doorsTime}
                </dd>
              </div>
            )}

            <div className="py-3">
              <dt className="text-[9px] font-black uppercase tracking-[0.14em] text-black/45">
                Status
              </dt>

              <dd
                className={
                  isCancelled
                    ? "mt-1 text-sm font-black uppercase text-red-700"
                    : "mt-1 text-sm font-black uppercase"
                }
              >
                {formatStatus(
                  event.status
                )}
              </dd>
            </div>

            <div className="py-3">
              <dt className="text-[9px] font-black uppercase tracking-[0.14em] text-black/45">
                Type
              </dt>

              <dd className="mt-1 text-sm font-black uppercase">
                {formatEventType(
                  event.event_type
                )}
              </dd>
            </div>

            <div className="py-3">
              <dt className="text-[9px] font-black uppercase tracking-[0.14em] text-black/45">
                Admission
              </dt>

              <dd className="mt-1 text-sm font-black uppercase">
                {event.all_ages
                  ? "All Ages"
                  : "Check Venue"}
              </dd>
            </div>

            {venue && (
              <div className="py-3">
                <dt className="text-[9px] font-black uppercase tracking-[0.14em] text-black/45">
                  Venue
                </dt>

                <dd className="mt-1">
                  <Link
                    href={`/venues/${venue.slug}`}
                    className="break-words text-sm font-black hover:underline"
                  >
                    {venue.name} →
                  </Link>
                </dd>

                {addressLines.length >
                  0 && (
                  <dd className="mt-2 text-sm leading-6 text-black/55">
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
                  </dd>
                )}

                {venue.website_url && (
                  <dd className="mt-3">
                    <a
                      href={
                        venue.website_url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] font-black uppercase tracking-[0.12em] hover:underline"
                    >
                      Venue Website ↗
                    </a>
                  </dd>
                )}
              </div>
            )}

            {!venue &&
              locationLabel && (
                <div className="py-3">
                  <dt className="text-[9px] font-black uppercase tracking-[0.14em] text-black/45">
                    Location
                  </dt>

                  <dd className="mt-1 text-sm font-black">
                    {locationLabel}
                  </dd>
                </div>
              )}
          </dl>
        </aside>
      </section>

      {/* ========================================
          KEEP EXPLORING
      ======================================== */}

      <section className="border-t-2 border-black bg-black text-white">
        <div className="flex flex-col gap-8 px-4 py-10 sm:px-6 sm:py-12 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
              Keep Exploring
            </p>

            <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.035em] sm:text-4xl">
              Follow the Lineup
            </h2>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/events"
              className="inline-flex min-h-11 items-center justify-center border-2 border-white bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-black transition-colors hover:bg-black hover:text-white"
            >
              All Events →
            </Link>

            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center border-2 border-white bg-black px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-black"
            >
              Explore Map →
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
