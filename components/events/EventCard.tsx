import Link from "next/link";

type EventCardProps = {
  event: {
    id: string;
    title: string;
    slug: string;

    eventType:
      | string
      | null;

    status:
      | string
      | null;

    startAt: string;
    timezone:
      | string
      | null;

    featured: boolean;
    allAges:
      | boolean
      | null;

    ticketUrl:
      | string
      | null;

    venue:
      | {
          name: string;
          slug: string;
        }
      | null;

    locationLabel:
      | string
      | null;

    lineup: {
      id: string;
      name: string;
      slug: string;
    }[];
  };
};

function formatEventType(
  value:
    | string
    | null
) {
  if (!value) {
    return "Event";
  }

  return value
    .replaceAll("_", " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function formatDateParts(
  value: string,
  timezone:
    | string
    | null
) {
  const timeZone =
    timezone ??
    "America/Los_Angeles";

  try {
    const date =
      new Date(
        value
      );

    return {
      month:
        new Intl.DateTimeFormat(
          "en-US",
          {
            timeZone,
            month:
              "short",
          }
        ).format(
          date
        ),

      day:
        new Intl.DateTimeFormat(
          "en-US",
          {
            timeZone,
            day:
              "2-digit",
          }
        ).format(
          date
        ),

      weekday:
        new Intl.DateTimeFormat(
          "en-US",
          {
            timeZone,
            weekday:
              "short",
          }
        ).format(
          date
        ),

      time:
        new Intl.DateTimeFormat(
          "en-US",
          {
            timeZone,
            hour:
              "numeric",
            minute:
              "2-digit",
          }
        ).format(
          date
        ),
    };
  } catch {
    return {
      month:
        "",
      day:
        "",
      weekday:
        "",
      time:
        "",
    };
  }
}

export default function EventCard({
  event,
}: EventCardProps) {
  const date =
    formatDateParts(
      event.startAt,
      event.timezone
    );

  return (
    <article className="group overflow-hidden border-2 border-black bg-white">
      <div className="grid sm:grid-cols-[110px_minmax(0,1fr)]">
        <div className="flex min-h-[124px] flex-row items-center justify-between border-b-2 border-black bg-black px-4 py-4 text-white sm:flex-col sm:items-start sm:justify-between sm:border-b-0 sm:border-r-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
              {date.weekday}
            </p>

            <p className="mt-1 text-4xl font-black uppercase leading-none tracking-[-0.05em]">
              {date.day}
            </p>

            <p className="mt-1 text-sm font-black uppercase tracking-[0.08em]">
              {date.month}
            </p>
          </div>

          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/65">
            {date.time}
          </p>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="border-2 border-black bg-[#f3efe4] px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em]">
              {formatEventType(
                event.eventType
              )}
            </span>

            {event.featured && (
              <span className="border-2 border-black bg-black px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em] text-white">
                Featured
              </span>
            )}

            {event.allAges && (
              <span className="border-2 border-black bg-white px-2 py-1 text-[9px] font-black uppercase tracking-[0.1em]">
                All Ages
              </span>
            )}
          </div>

          <Link
            href={`/events/${event.slug}`}
            className="mt-4 inline-block"
          >
            <h2 className="text-2xl font-black uppercase leading-[0.95] tracking-[-0.035em] group-hover:underline sm:text-3xl">
              {event.title}
            </h2>
          </Link>

          {(event.venue ||
            event.locationLabel) && (
            <div className="mt-3">
              {event.venue ? (
                <Link
                  href={`/venues/${event.venue.slug}`}
                  className="text-xs font-black uppercase tracking-[0.1em] hover:underline"
                >
                  {event.venue.name}
                </Link>
              ) : null}

              {event.locationLabel && (
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.1em] text-black/45">
                  {event.locationLabel}
                </p>
              )}
            </div>
          )}

          {event.lineup.length >
            0 && (
            <div className="mt-5 border-t-2 border-black pt-4">
              <p className="text-[9px] font-black uppercase tracking-[0.15em] text-black/45">
                Lineup
              </p>

              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {event.lineup
                  .slice(
                    0,
                    4
                  )
                  .map(
                    (
                      artist,
                      index
                    ) => (
                      <span
                        key={
                          artist.id
                        }
                        className="text-xs font-black uppercase"
                      >
                        <Link
                          href={`/artists/${artist.slug}`}
                          className="hover:underline"
                        >
                          {artist.name}
                        </Link>

                        {index <
                          Math.min(
                            event.lineup.length,
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

                {event.lineup.length >
                  4 && (
                  <span className="text-xs font-black uppercase text-black/45">
                    +{event.lineup.length -
                      4} more
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t-2 border-black pt-4">
            <Link
              href={`/events/${event.slug}`}
              className="text-[10px] font-black uppercase tracking-[0.14em] hover:underline"
            >
              Explore Event →
            </Link>

            {event.ticketUrl && (
              <a
                href={
                  event.ticketUrl
                }
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-[10px] font-black uppercase tracking-[0.14em] hover:underline"
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
