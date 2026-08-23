import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

async function requireContentManager() {
  const supabase =
    await createClient();

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      `
      role,
      active
      `
    )
    .eq("id", userId)
    .single();

  if (
    profileError ||
    !profile ||
    !profile.active ||
    ![
      "admin",
      "editor",
    ].includes(
      profile.role
    )
  ) {
    redirect("/");
  }

  return supabase;
}

function getTimeZoneOffset(
  date: Date,
  timeZone: string
) {
  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,
        year:
          "numeric",
        month:
          "2-digit",
        day:
          "2-digit",
        hour:
          "2-digit",
        minute:
          "2-digit",
        second:
          "2-digit",
        hourCycle:
          "h23",
      }
    );

  const parts =
    formatter.formatToParts(
      date
    );

  const values =
    Object.fromEntries(
      parts
        .filter(
          (part) =>
            part.type !==
            "literal"
        )
        .map(
          (part) => [
            part.type,
            part.value,
          ]
        )
    );

  const representedAsUtc =
    Date.UTC(
      Number(
        values.year
      ),
      Number(
        values.month
      ) - 1,
      Number(
        values.day
      ),
      Number(
        values.hour
      ),
      Number(
        values.minute
      ),
      Number(
        values.second
      )
    );

  return (
    representedAsUtc -
    date.getTime()
  );
}

function localDateTimeToUtc(
  value: string,
  timeZone: string
) {
  if (!value) {
    return null;
  }

  const match =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/
    );

  if (!match) {
    throw new Error(
      "Invalid date or time."
    );
  }

  const [
    ,
    year,
    month,
    day,
    hour,
    minute,
  ] = match;

  const localAsUtc =
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      0
    );

  let guess =
    new Date(
      localAsUtc
    );

  let offset =
    getTimeZoneOffset(
      guess,
      timeZone
    );

  guess =
    new Date(
      localAsUtc -
        offset
    );

  offset =
    getTimeZoneOffset(
      guess,
      timeZone
    );

  return new Date(
    localAsUtc -
      offset
  ).toISOString();
}

async function createEvent(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const title =
    String(
      formData.get(
        "title"
      ) ?? ""
    ).trim();

  const slug =
    String(
      formData.get(
        "slug"
      ) ?? ""
    )
      .trim()
      .toLowerCase();

  const eventType =
    String(
      formData.get(
        "event_type"
      ) ?? "concert"
    );

  const status =
    String(
      formData.get(
        "status"
      ) ?? "scheduled"
    );

  const venueId =
    String(
      formData.get(
        "venue_id"
      ) ?? ""
    ).trim();

  const locationId =
    String(
      formData.get(
        "location_id"
      ) ?? ""
    ).trim();

  const timezone =
    String(
      formData.get(
        "timezone"
      ) ??
        "America/Los_Angeles"
    ).trim();

  const startLocal =
    String(
      formData.get(
        "start_at"
      ) ?? ""
    );

  const doorsLocal =
    String(
      formData.get(
        "doors_at"
      ) ?? ""
    );

  const endLocal =
    String(
      formData.get(
        "end_at"
      ) ?? ""
    );

  const ticketUrl =
    String(
      formData.get(
        "ticket_url"
      ) ?? ""
    ).trim();

  const eventUrl =
    String(
      formData.get(
        "event_url"
      ) ?? ""
    ).trim();

  const descriptionShort =
    String(
      formData.get(
        "description_short"
      ) ?? ""
    ).trim();

  const allAges =
    formData.get(
      "all_ages"
    ) === "on";

  const featured =
    formData.get(
      "featured"
    ) === "on";

  const published =
    formData.get(
      "published"
    ) === "on";

  if (!title) {
    throw new Error(
      "Event title is required."
    );
  }

  if (!slug) {
    throw new Error(
      "Event slug is required."
    );
  }

  if (!startLocal) {
    throw new Error(
      "Start date and time are required."
    );
  }

  if (!timezone) {
    throw new Error(
      "Timezone is required."
    );
  }

  if (
    eventType !==
      "livestream" &&
    !venueId &&
    !locationId
  ) {
    throw new Error(
      "Select a venue or location for a physical event."
    );
  }

  const startAt =
    localDateTimeToUtc(
      startLocal,
      timezone
    );

  const doorsAt =
    doorsLocal
      ? localDateTimeToUtc(
          doorsLocal,
          timezone
        )
      : null;

  const endAt =
    endLocal
      ? localDateTimeToUtc(
          endLocal,
          timezone
        )
      : null;

  const {
    data: event,
    error,
  } = await supabase
    .from("events")
    .insert({
      title,
      slug,

      venue_id:
        venueId ||
        null,

      location_id:
        locationId ||
        null,

      event_type:
        eventType,

      status,

      start_at:
        startAt,

      doors_at:
        doorsAt,

      end_at:
        endAt,

      timezone,

      ticket_url:
        ticketUrl ||
        null,

      event_url:
        eventUrl ||
        null,

      description_short:
        descriptionShort ||
        null,

      all_ages:
        allAges,

      featured,
      published,
    })
    .select("id")
    .single();

  if (
    error ||
    !event
  ) {
    throw new Error(
      error?.message ??
        "Unable to create event."
    );
  }

  redirect(
    `/admin/events/${event.id}`
  );
}

export default async function NewEventPage() {
  const supabase =
    await requireContentManager();

  const [
    venuesResult,
    locationsResult,
  ] = await Promise.all([
    supabase
      .from("venues")
      .select(
        `
        id,
        name,
        active,
        location:locations (
          name,
          region,
          country
        )
        `
      )
      .eq(
        "active",
        true
      )
      .order("name"),

    supabase
      .from("locations")
      .select(
        `
        id,
        name,
        city,
        region,
        country
        `
      )
      .order("country")
      .order("region")
      .order("name"),
  ]);

  if (
    venuesResult.error
  ) {
    throw new Error(
      venuesResult.error.message
    );
  }

  if (
    locationsResult.error
  ) {
    throw new Error(
      locationsResult.error.message
    );
  }

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      <header className="border-b-2 border-black px-6 py-5">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/admin/events"
            className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
          >
            ← Events
          </Link>

          <h1 className="mt-2 text-3xl font-black uppercase">
            Add Event
          </h1>

          <p className="mt-2 max-w-xl text-sm text-black/60">
            Create the event first. Artists can
            be added to the lineup after saving.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-10">
        <form
          action={
            createEvent
          }
          className="space-y-10"
        >
          {/* BASIC INFORMATION */}

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Event Information
            </h2>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Event Title
                </span>

                <input
                  name="title"
                  required
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Slug
                </span>

                <input
                  name="slug"
                  required
                  placeholder="cavespeak-at-moes-alley"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Event Type
                </span>

                <select
                  name="event_type"
                  defaultValue="concert"
                  className="mt-2 w-full border-2 border-black bg-white px-3 py-2"
                >
                  <option value="concert">
                    Concert
                  </option>

                  <option value="festival">
                    Festival
                  </option>

                  <option value="showcase">
                    Showcase
                  </option>

                  <option value="tour">
                    Tour
                  </option>

                  <option value="livestream">
                    Livestream
                  </option>

                  <option value="other">
                    Other
                  </option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Status
                </span>

                <select
                  name="status"
                  defaultValue="scheduled"
                  className="mt-2 w-full border-2 border-black bg-white px-3 py-2"
                >
                  <option value="scheduled">
                    Scheduled
                  </option>

                  <option value="postponed">
                    Postponed
                  </option>

                  <option value="cancelled">
                    Cancelled
                  </option>

                  <option value="completed">
                    Completed
                  </option>
                </select>
              </label>
            </div>
          </section>

          {/* WHERE */}

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Where
            </h2>

            <p className="mt-2 text-sm text-black/60">
              Select a venue when available.
              Location can be used for DIY shows,
              outdoor events, or venue-less events.
            </p>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Venue
                </span>

                <select
                  name="venue_id"
                  defaultValue=""
                  className="mt-2 w-full border-2 border-black bg-white px-3 py-2"
                >
                  <option value="">
                    No Venue
                  </option>

                  {venuesResult.data?.map(
                    (
                      venue
                    ) => (
                      <option
                        key={
                          venue.id
                        }
                        value={
                          venue.id
                        }
                      >
                        {
                          venue.name
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Location Fallback
                </span>

                <select
                  name="location_id"
                  defaultValue=""
                  className="mt-2 w-full border-2 border-black bg-white px-3 py-2"
                >
                  <option value="">
                    No Location
                  </option>

                  {locationsResult.data?.map(
                    (
                      location
                    ) => (
                      <option
                        key={
                          location.id
                        }
                        value={
                          location.id
                        }
                      >
                        {[
                          location.name,
                          location.region,
                          location.country,
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            ", "
                          )}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>
          </section>

          {/* WHEN */}

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Date & Time
            </h2>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Start
                </span>

                <input
                  name="start_at"
                  type="datetime-local"
                  required
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Doors
                </span>

                <input
                  name="doors_at"
                  type="datetime-local"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  End
                </span>

                <input
                  name="end_at"
                  type="datetime-local"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Timezone
                </span>

                <input
                  name="timezone"
                  required
                  defaultValue="America/Los_Angeles"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />

                <p className="mt-2 text-xs text-black/50">
                  Use an IANA timezone such as
                  America/Los_Angeles.
                </p>
              </label>
            </div>
          </section>

          {/* LINKS */}

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Links & Description
            </h2>

            <div className="mt-6 grid gap-6">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Ticket URL
                </span>

                <input
                  name="ticket_url"
                  type="url"
                  placeholder="https://"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Event URL
                </span>

                <input
                  name="event_url"
                  type="url"
                  placeholder="https://"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Short Description
                </span>

                <textarea
                  name="description_short"
                  rows={4}
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>
            </div>
          </section>

          {/* FLAGS */}

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Visibility
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              <label className="flex items-start gap-3">
                <input
                  name="all_ages"
                  type="checkbox"
                  className="mt-1 h-5 w-5"
                />

                <span className="text-xs font-black uppercase">
                  All Ages
                </span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  name="featured"
                  type="checkbox"
                  className="mt-1 h-5 w-5"
                />

                <span className="text-xs font-black uppercase">
                  Featured
                </span>
              </label>

              <label className="flex items-start gap-3">
                <input
                  name="published"
                  type="checkbox"
                  className="mt-1 h-5 w-5"
                />

                <span className="text-xs font-black uppercase">
                  Published
                </span>
              </label>
            </div>
          </section>

          <div className="flex justify-end gap-3">
            <Link
              href="/admin/events"
              className="border-2 border-black bg-white px-5 py-3 text-sm font-bold uppercase"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="border-2 border-black bg-black px-5 py-3 text-sm font-bold uppercase text-white transition-colors hover:bg-white hover:text-black"
            >
              Create Event
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}