import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

const BILLING_ROLES = [
  {
    value:
      "headliner",
    label:
      "Headliner",
  },
  {
    value:
      "co_headliner",
    label:
      "Co-Headliner",
  },
  {
    value:
      "support",
    label:
      "Support",
  },
  {
    value:
      "performer",
    label:
      "Performer",
  },
  {
    value:
      "guest",
    label:
      "Guest",
  },
  {
    value:
      "other",
    label:
      "Other",
  },
];

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

function utcToLocalInput(
  value:
    | string
    | null,
  timeZone: string
) {
  if (!value) {
    return "";
  }

  try {
    const formatter =
      new Intl.DateTimeFormat(
        "en-CA",
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
          hourCycle:
            "h23",
        }
      );

    const parts =
      Object.fromEntries(
        formatter
          .formatToParts(
            new Date(
              value
            )
          )
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

    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  } catch {
    return "";
  }
}

async function updateEvent(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const eventId =
    String(
      formData.get(
        "event_id"
      ) ?? ""
    ).trim();

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
      ) ?? ""
    );

  const status =
    String(
      formData.get(
        "status"
      ) ?? ""
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
      ) ?? ""
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

  if (
    !eventId ||
    !title ||
    !slug ||
    !startLocal ||
    !timezone
  ) {
    throw new Error(
      "Event ID, title, slug, start time, and timezone are required."
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
    error,
  } = await supabase
    .from("events")
    .update({
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
    .eq(
      "id",
      eventId
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  redirect(
    `/admin/events/${eventId}`
  );
}

async function addEventArtist(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const eventId =
    String(
      formData.get(
        "event_id"
      ) ?? ""
    );

  const artistId =
    String(
      formData.get(
        "artist_id"
      ) ?? ""
    );

  const billingRole =
    String(
      formData.get(
        "billing_role"
      ) ??
        "performer"
    );

  const billingOrder =
    Number(
      formData.get(
        "billing_order"
      ) ?? 0
    );

  if (
    !eventId ||
    !artistId
  ) {
    throw new Error(
      "Event and artist are required."
    );
  }

  if (
    !Number.isInteger(
      billingOrder
    ) ||
    billingOrder < 0
  ) {
    throw new Error(
      "Billing order must be zero or greater."
    );
  }

  const {
    error,
  } = await supabase
    .from(
      "event_artists"
    )
    .insert({
      event_id:
        eventId,

      artist_id:
        artistId,

      billing_role:
        billingRole,

      billing_order:
        billingOrder,
    });

  if (error) {
    throw new Error(
      error.message
    );
  }

  redirect(
    `/admin/events/${eventId}`
  );
}

async function updateEventArtist(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const eventId =
    String(
      formData.get(
        "event_id"
      ) ?? ""
    );

  const artistId =
    String(
      formData.get(
        "artist_id"
      ) ?? ""
    );

  const billingRole =
    String(
      formData.get(
        "billing_role"
      ) ??
        "performer"
    );

  const billingOrder =
    Number(
      formData.get(
        "billing_order"
      ) ?? 0
    );

  if (
    !eventId ||
    !artistId
  ) {
    throw new Error(
      "Event and artist are required."
    );
  }

  const {
    error,
  } = await supabase
    .from(
      "event_artists"
    )
    .update({
      billing_role:
        billingRole,

      billing_order:
        billingOrder,
    })
    .eq(
      "event_id",
      eventId
    )
    .eq(
      "artist_id",
      artistId
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  redirect(
    `/admin/events/${eventId}`
  );
}

async function removeEventArtist(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const eventId =
    String(
      formData.get(
        "event_id"
      ) ?? ""
    );

  const artistId =
    String(
      formData.get(
        "artist_id"
      ) ?? ""
    );

  if (
    !eventId ||
    !artistId
  ) {
    throw new Error(
      "Event and artist are required."
    );
  }

  const {
    error,
  } = await supabase
    .from(
      "event_artists"
    )
    .delete()
    .eq(
      "event_id",
      eventId
    )
    .eq(
      "artist_id",
      artistId
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  redirect(
    `/admin/events/${eventId}`
  );
}

async function deleteEvent(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const eventId =
    String(
      formData.get(
        "event_id"
      ) ?? ""
    );

  const eventTitle =
    String(
      formData.get(
        "event_title"
      ) ?? ""
    );

  const confirmation =
    String(
      formData.get(
        "delete_confirmation"
      ) ?? ""
    ).trim();

  if (
    confirmation !==
    eventTitle
  ) {
    throw new Error(
      "Event title confirmation does not match."
    );
  }

  const {
    error,
  } = await supabase
    .from("events")
    .delete()
    .eq(
      "id",
      eventId
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  redirect(
    "/admin/events"
  );
}

export default async function EditEventPage({
  params,
}: PageProps) {
  const {
    id,
  } = await params;

  const supabase =
    await requireContentManager();

  const [
    eventResult,
    venuesResult,
    locationsResult,
    artistsResult,
    lineupResult,
  ] = await Promise.all([
    supabase
      .from("events")
      .select("*")
      .eq(
        "id",
        id
      )
      .single(),

    supabase
      .from("venues")
      .select(
        `
        id,
        name,
        active
        `
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

    supabase
      .from("artists")
      .select(
        `
        id,
        name,
        published
        `
      )
      .order("name"),

    supabase
      .from(
        "event_artists"
      )
      .select(
        `
        event_id,
        artist_id,
        billing_role,
        billing_order,
        artist:artists (
          id,
          name,
          slug,
          published
        )
        `
      )
      .eq(
        "event_id",
        id
      )
      .order(
        "billing_order"
      ),
  ]);

  if (
    eventResult.error ||
    !eventResult.data
  ) {
    notFound();
  }

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

  if (
    artistsResult.error
  ) {
    throw new Error(
      artistsResult.error.message
    );
  }

  if (
    lineupResult.error
  ) {
    throw new Error(
      lineupResult.error.message
    );
  }

  const event =
    eventResult.data;

  const timeZone =
    event.timezone ??
    "America/Los_Angeles";

  const assignedArtistIds =
    new Set(
      lineupResult.data?.map(
        (row) =>
          row.artist_id
      ) ?? []
    );

  const availableArtists =
    artistsResult.data?.filter(
      (artist) =>
        !assignedArtistIds.has(
          artist.id
        )
    ) ?? [];

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      <header className="border-b-2 border-black px-6 py-5">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin/events"
              className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
            >
              ← Events
            </Link>

            <h1 className="mt-2 text-3xl font-black uppercase">
              Edit{" "}
              {event.title}
            </h1>
          </div>

          <span
            className={
              event.published
                ? "border-2 border-black bg-black px-3 py-2 text-xs font-black uppercase text-white"
                : "border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase"
            }
          >
            {event.published
              ? "Published"
              : "Draft"}
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-10">
        {/* ======================================
            EVENT FORM
        ====================================== */}

        <form
          action={
            updateEvent
          }
          className="space-y-10"
        >
          <input
            type="hidden"
            name="event_id"
            value={
              event.id
            }
          />

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Event Information
            </h2>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <label>
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Event Title
                </span>

                <input
                  name="title"
                  required
                  defaultValue={
                    event.title
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label>
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Slug
                </span>

                <input
                  name="slug"
                  required
                  defaultValue={
                    event.slug
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label>
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Event Type
                </span>

                <select
                  name="event_type"
                  defaultValue={
                    event.event_type
                  }
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

              <label>
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Status
                </span>

                <select
                  name="status"
                  defaultValue={
                    event.status
                  }
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

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <label>
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Venue
                </span>

                <select
                  name="venue_id"
                  defaultValue={
                    event.venue_id ??
                    ""
                  }
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
                        {venue.name}
                        {!venue.active
                          ? " (Inactive)"
                          : ""}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label>
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Location Fallback
                </span>

                <select
                  name="location_id"
                  defaultValue={
                    event.location_id ??
                    ""
                  }
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
              <label>
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Start
                </span>

                <input
                  name="start_at"
                  type="datetime-local"
                  required
                  defaultValue={
                    utcToLocalInput(
                      event.start_at,
                      timeZone
                    )
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label>
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Doors
                </span>

                <input
                  name="doors_at"
                  type="datetime-local"
                  defaultValue={
                    utcToLocalInput(
                      event.doors_at,
                      timeZone
                    )
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label>
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  End
                </span>

                <input
                  name="end_at"
                  type="datetime-local"
                  defaultValue={
                    utcToLocalInput(
                      event.end_at,
                      timeZone
                    )
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label>
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Timezone
                </span>

                <input
                  name="timezone"
                  required
                  defaultValue={
                    timeZone
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>
            </div>
          </section>

          {/* LINKS */}

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Links & Description
            </h2>

            <div className="mt-6 grid gap-6">
              <label>
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Ticket URL
                </span>

                <input
                  name="ticket_url"
                  type="url"
                  defaultValue={
                    event.ticket_url ??
                    ""
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label>
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Event URL
                </span>

                <input
                  name="event_url"
                  type="url"
                  defaultValue={
                    event.event_url ??
                    ""
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label>
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Short Description
                </span>

                <textarea
                  name="description_short"
                  rows={4}
                  defaultValue={
                    event.description_short ??
                    ""
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>
            </div>
          </section>

          {/* VISIBILITY */}

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Visibility
            </h2>

            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              <label className="flex items-start gap-3">
                <input
                  name="all_ages"
                  type="checkbox"
                  defaultChecked={
                    event.all_ages
                  }
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
                  defaultChecked={
                    event.featured
                  }
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
                  defaultChecked={
                    event.published
                  }
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
              Save Changes
            </button>
          </div>
        </form>

        {/* ======================================
            LINEUP
        ====================================== */}

        <section className="mt-14 border-2 border-black bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-black/50">
                Artists
              </p>

              <h2 className="mt-1 text-xl font-black uppercase">
                Event Lineup
              </h2>
            </div>

            <span className="border-2 border-black px-2 py-1 text-xs font-black">
              {
                lineupResult.data
                  ?.length ??
                0
              }
            </span>
          </div>

          {/* ADD ARTIST */}

          {availableArtists.length >
            0 && (
            <form
              action={
                addEventArtist
              }
              className="mt-6 grid gap-4 border-2 border-black bg-[#f3efe4] p-4 sm:grid-cols-[1fr_180px_100px_auto]"
            >
              <input
                type="hidden"
                name="event_id"
                value={
                  event.id
                }
              />

              <select
                name="artist_id"
                required
                defaultValue=""
                className="border-2 border-black bg-white px-3 py-2"
              >
                <option
                  value=""
                  disabled
                >
                  Select Artist
                </option>

                {availableArtists.map(
                  (
                    artist
                  ) => (
                    <option
                      key={
                        artist.id
                      }
                      value={
                        artist.id
                      }
                    >
                      {
                        artist.name
                      }
                      {!artist.published
                        ? " (Draft)"
                        : ""}
                    </option>
                  )
                )}
              </select>

              <select
                name="billing_role"
                defaultValue="performer"
                className="border-2 border-black bg-white px-3 py-2"
              >
                {BILLING_ROLES.map(
                  (
                    role
                  ) => (
                    <option
                      key={
                        role.value
                      }
                      value={
                        role.value
                      }
                    >
                      {
                        role.label
                      }
                    </option>
                  )
                )}
              </select>

              <input
                name="billing_order"
                type="number"
                min="0"
                step="1"
                defaultValue="0"
                className="border-2 border-black bg-white px-3 py-2"
              />

              <button
                type="submit"
                className="border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white"
              >
                Add
              </button>
            </form>
          )}

          {/* CURRENT LINEUP */}

          {!lineupResult.data
            ?.length ? (
            <p className="mt-6 text-sm text-black/60">
              No artists have been added
              to this event yet.
            </p>
          ) : (
            <div className="mt-6 divide-y-2 divide-black border-y-2 border-black">
              {lineupResult.data.map(
                (
                  row
                ) => {
                  const artist =
                    Array.isArray(
                      row.artist
                    )
                      ? row
                          .artist[0]
                      : row.artist;

                  return (
                    <div
                      key={
                        row.artist_id
                      }
                      className="py-5"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-black uppercase">
                            {
                              artist?.name ??
                              "Artist"
                            }
                          </p>

                          <p className="mt-1 text-xs font-bold uppercase text-black/50">
                            {artist?.published
                              ? "Published"
                              : "Draft"}
                          </p>
                        </div>

                        {artist?.id && (
                          <Link
                            href={`/admin/artists/${artist.id}`}
                            className="text-xs font-black uppercase hover:underline"
                          >
                            Edit Artist →
                          </Link>
                        )}
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px_auto_auto]">
                        <form
                          action={
                            updateEventArtist
                          }
                          className="contents"
                        >
                          <input
                            type="hidden"
                            name="event_id"
                            value={
                              event.id
                            }
                          />

                          <input
                            type="hidden"
                            name="artist_id"
                            value={
                              row.artist_id
                            }
                          />

                          <select
                            name="billing_role"
                            defaultValue={
                              row.billing_role
                            }
                            className="border-2 border-black bg-white px-3 py-2"
                          >
                            {BILLING_ROLES.map(
                              (
                                role
                              ) => (
                                <option
                                  key={
                                    role.value
                                  }
                                  value={
                                    role.value
                                  }
                                >
                                  {
                                    role.label
                                  }
                                </option>
                              )
                            )}
                          </select>

                          <input
                            name="billing_order"
                            type="number"
                            min="0"
                            step="1"
                            defaultValue={
                              row.billing_order
                            }
                            className="border-2 border-black px-3 py-2"
                          />

                          <button
                            type="submit"
                            className="border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white"
                          >
                            Save
                          </button>
                        </form>

                        <form
                          action={
                            removeEventArtist
                          }
                        >
                          <input
                            type="hidden"
                            name="event_id"
                            value={
                              event.id
                            }
                          />

                          <input
                            type="hidden"
                            name="artist_id"
                            value={
                              row.artist_id
                            }
                          />

                          <button
                            type="submit"
                            className="h-full border-2 border-red-700 px-4 py-2 text-xs font-black uppercase text-red-700"
                          >
                            Remove
                          </button>
                        </form>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* ======================================
            DELETE
        ====================================== */}

        <section className="mt-14 border-2 border-red-700 bg-white p-6">
          <h2 className="text-xl font-black uppercase text-red-700">
            Delete Event
          </h2>

          <p className="mt-3 text-sm">
            Deleting this event also removes
            all artist lineup relationships.
          </p>

          <p className="mt-4 text-sm font-bold">
            Type{" "}
            <span className="font-black">
              {event.title}
            </span>{" "}
            exactly to confirm.
          </p>

          <form
            action={
              deleteEvent
            }
            className="mt-5"
          >
            <input
              type="hidden"
              name="event_id"
              value={
                event.id
              }
            />

            <input
              type="hidden"
              name="event_title"
              value={
                event.title
              }
            />

            <input
              name="delete_confirmation"
              required
              autoComplete="off"
              className="w-full border-2 border-red-700 px-3 py-2"
            />

            <button
              type="submit"
              className="mt-4 border-2 border-red-700 bg-red-700 px-5 py-3 text-sm font-bold uppercase text-white"
            >
              Permanently Delete Event
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}