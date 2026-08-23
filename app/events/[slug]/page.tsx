import Link from "next/link";
import { notFound } from "next/navigation";

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

          <span className="text-right text-xs font-black uppercase tracking-[0.18em]">
            Event
          </span>
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
              <div className="flex flex-wrap gap-2">
                <span className="border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase">
                  {formatEventType(
                    event.event_type
                  )}
                </span>

                {event.featured && (
                  <span className="border-2 border-black bg-black px-3 py-2 text-[10px] font-black uppercase text-white">
                    Featured
                  </span>
                )}

                {event.all_ages && (
                  <span className="border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase">
                    All Ages
                  </span>
                )}

                {event.status !==
                  "scheduled" && (
                  <span
                    className={
                      isCancelled
                        ? "border-2 border-red-700 bg-white px-3 py-2 text-[10px] font-black uppercase text-red-700"
                        : "border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase"
                    }
                  >
                    {formatStatus(
                      event.status
                    )}
                  </span>
                )}
              </div>
            </div>

            <div className="py-12">
              <p className="text-xs font-black uppercase tracking-[0.2em]">
                {formatDate(
                  event.start_at,
                  timeZone
                )}
              </p>

              <h1 className="mt-5 max-w-4xl break-words text-[clamp(3rem,8vw,7rem)] font-black uppercase leading-[0.86] tracking-[-0.05em]">
                {
                  event.title
                }
              </h1>
            </div>

            <div>
              {venue?.name && (
                <Link
                  href={`/venues/${venue.slug}`}
                  className="group inline-flex items-center gap-2 text-lg font-black uppercase"
                >
                  <span className="group-hover:underline">
                    {
                      venue.name
                    }
                  </span>

                  <span
                    className="text-sm"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </Link>
              )}

              {locationLabel && (
                <p className="mt-2 text-sm font-bold uppercase tracking-[0.08em]">
                  {
                    locationLabel
                  }
                </p>
              )}
            </div>
          </div>

          {/* ========================================
              TIME PANEL
          ======================================== */}

<div className="flex flex-col justify-between gap-10 bg-black p-6 text-white sm:p-10 lg:min-h-[620px] lg:gap-0">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/60">
                Show Time
              </p>

              {startTime && (
                <p className="mt-4 text-5xl font-black uppercase sm:text-6xl">
                  {
                    startTime
                  }
                </p>
              )}

              {doorsTime && (
                <p className="mt-4 text-sm font-black uppercase tracking-[0.1em]">
                  Doors{" "}
                  {
                    doorsTime
                  }
                </p>
              )}

              {endTime && (
                <p className="mt-2 text-sm font-bold uppercase tracking-[0.1em] text-white/60">
                  Ends{" "}
                  {
                    endTime
                  }
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-white/50">
                Timezone
              </p>

              <p className="mt-2 font-black">
                {
                  timeZone
                }
              </p>

              {(event.ticket_url ||
                event.event_url) && (
                <div className="mt-8 flex flex-wrap gap-3">
                  {event.ticket_url &&
                    !isCancelled && (
                    <a
                      href={
                        event.ticket_url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border-2 border-white bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-black transition-colors hover:bg-black hover:text-white"
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
                      className="border-2 border-white bg-black px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-black"
                    >
                      Official Event ↗
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
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
          <div className="mx-auto max-w-6xl px-6 py-5 sm:px-10">
            <p
              className={
                isCancelled
                  ? "font-black uppercase text-red-700"
                  : "font-black uppercase"
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
          MAIN CONTENT
      ======================================== */}

      <section className="mx-auto grid max-w-6xl lg:grid-cols-[1fr_320px]">
        {/* ======================================
            LEFT
        ====================================== */}

        <div className="border-black p-6 sm:p-10 lg:border-r-2">
          {/* DESCRIPTION */}

          {event.description_short && (
            <section>
              <p className="text-xs font-black uppercase tracking-[0.2em]">
                About This Event
              </p>

              <p className="mt-5 max-w-3xl whitespace-pre-line text-lg leading-8">
                {
                  event.description_short
                }
              </p>
            </section>
          )}

          {/* ====================================
              LINEUP
          ==================================== */}

          <section
            className={
              event.description_short
                ? "mt-14 border-t-2 border-black pt-8"
                : ""
            }
          >
            <p className="text-xs font-black uppercase tracking-[0.2em]">
              Live
            </p>

            <h2 className="mt-2 text-3xl font-black uppercase">
              Lineup
            </h2>

            {!lineup.length ? (
              <p className="mt-5 text-sm text-black/60">
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
                        className="group grid gap-3 py-5 sm:grid-cols-[50px_1fr_auto] sm:items-center"
                      >
                        <span className="text-sm font-black text-black/40">
                          {String(
                            index + 1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </span>

                        <div>
                          <h3 className="text-2xl font-black uppercase group-hover:underline">
                            {
                              lineupArtist.name
                            }
                          </h3>

                          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-black/50">
                            {formatBillingRole(
                              row.billing_role
                            )}
                          </p>
                        </div>

                        <span className="text-xs font-black uppercase">
                          Explore Artist →
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
            EVENT DETAILS
        ====================================== */}

        <aside className="border-t-2 border-black bg-white p-6 sm:p-8 lg:border-t-0">
          <p className="text-xs font-black uppercase tracking-[0.2em]">
            Event Details
          </p>

          <dl className="mt-6 divide-y-2 divide-black border-y-2 border-black">
            {/* DATE */}

            <div className="py-4">
              <dt className="text-[10px] font-black uppercase tracking-[0.18em] text-black/55">
                Date
              </dt>

              <dd className="mt-1 font-black">
                {formatDate(
                  event.start_at,
                  timeZone
                )}
              </dd>
            </div>

            {/* START */}

            {startTime && (
              <div className="py-4">
                <dt className="text-[10px] font-black uppercase tracking-[0.18em] text-black/55">
                  Start
                </dt>

                <dd className="mt-1 font-black uppercase">
                  {
                    startTime
                  }
                </dd>
              </div>
            )}

            {/* DOORS */}

            {doorsTime && (
              <div className="py-4">
                <dt className="text-[10px] font-black uppercase tracking-[0.18em] text-black/55">
                  Doors
                </dt>

                <dd className="mt-1 font-black uppercase">
                  {
                    doorsTime
                  }
                </dd>
              </div>
            )}

            {/* STATUS */}

            <div className="py-4">
              <dt className="text-[10px] font-black uppercase tracking-[0.18em] text-black/55">
                Status
              </dt>

              <dd
                className={
                  isCancelled
                    ? "mt-1 font-black uppercase text-red-700"
                    : "mt-1 font-black uppercase"
                }
              >
                {formatStatus(
                  event.status
                )}
              </dd>
            </div>

            {/* EVENT TYPE */}

            <div className="py-4">
              <dt className="text-[10px] font-black uppercase tracking-[0.18em] text-black/55">
                Type
              </dt>

              <dd className="mt-1 font-black uppercase">
                {formatEventType(
                  event.event_type
                )}
              </dd>
            </div>

            {/* ADMISSION */}

            <div className="py-4">
              <dt className="text-[10px] font-black uppercase tracking-[0.18em] text-black/55">
                Admission
              </dt>

              <dd className="mt-1 font-black uppercase">
                {event.all_ages
                  ? "All Ages"
                  : "Check Venue"}
              </dd>
            </div>

            {/* ====================================
                VENUE
            ==================================== */}

            {venue && (
              <div className="py-4">
                <dt className="text-[10px] font-black uppercase tracking-[0.18em] text-black/55">
                  Venue
                </dt>

                <dd className="mt-1">
                  <Link
                    href={`/venues/${venue.slug}`}
                    className="group inline-flex items-center gap-2 font-black"
                  >
                    <span className="group-hover:underline">
                      {
                        venue.name
                      }
                    </span>

                    <span
                      className="text-xs"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </Link>
                </dd>

                {addressLines.length >
                  0 && (
                  <dd className="mt-3 text-sm leading-6 text-black/60">
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
                          {
                            line
                          }
                        </span>
                      )
                    )}
                  </dd>
                )}

                {venue.website_url && (
                  <dd className="mt-4">
                    <a
                      href={
                        venue.website_url
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-black uppercase tracking-[0.1em] underline decoration-2 underline-offset-4 hover:no-underline"
                    >
                      Venue Website ↗
                    </a>
                  </dd>
                )}
              </div>
            )}

            {/* LOCATION WITHOUT VENUE */}

            {!venue &&
              locationLabel && (
                <div className="py-4">
                  <dt className="text-[10px] font-black uppercase tracking-[0.18em] text-black/55">
                    Location
                  </dt>

                  <dd className="mt-1 font-black">
                    {
                      locationLabel
                    }
                  </dd>
                </div>
              )}
          </dl>

          {/* ====================================
              ACTIONS
          ==================================== */}

          {(event.ticket_url ||
            event.event_url) && (
            <div className="mt-6 space-y-3">
              {event.ticket_url &&
                !isCancelled && (
                <a
                  href={
                    event.ticket_url
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-between border-2 border-black bg-black px-4 py-3 text-xs font-black uppercase text-white transition-colors hover:bg-white hover:text-black"
                >
                  <span>
                    Tickets
                  </span>

                  <span>
                    ↗
                  </span>
                </a>
              )}

              {event.event_url && (
                <a
                  href={
                    event.event_url
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-between border-2 border-black bg-white px-4 py-3 text-xs font-black uppercase transition-colors hover:bg-black hover:text-white"
                >
                  <span>
                    Official Event
                  </span>

                  <span>
                    ↗
                  </span>
                </a>
              )}
            </div>
          )}
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
            Follow the Lineup
          </h2>

          {lineup.length >
          0 ? (
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lineup.map(
                (
                  row
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
                      className="group border-2 border-black bg-white p-6 transition-colors hover:bg-black hover:text-white"
                    >
                      <p className="text-[10px] font-black uppercase tracking-[0.15em] opacity-55">
                        {formatBillingRole(
                          row.billing_role
                        )}
                      </p>

                      <h3 className="mt-3 text-2xl font-black uppercase leading-tight">
                        {
                          lineupArtist.name
                        }
                      </h3>

                      <p className="mt-8 text-[10px] font-black uppercase tracking-[0.14em] group-hover:underline">
                        Explore Artist →
                      </p>
                    </Link>
                  );
                }
              )}
            </div>
          ) : (
            <p className="mt-6 text-sm text-black/60">
              Artist information has not been published for this event.
            </p>
          )}

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