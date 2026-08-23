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

function parseCoordinate(
  value:
    | FormDataEntryValue
    | null
) {
  const raw =
    String(
      value ?? ""
    ).trim();

  if (!raw) {
    return null;
  }

  const parsed =
    Number(raw);

  if (
    Number.isNaN(
      parsed
    )
  ) {
    return NaN;
  }

  return parsed;
}

async function updateVenue(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const venueId =
    String(
      formData.get(
        "venue_id"
      ) ?? ""
    ).trim();

  const name =
    String(
      formData.get(
        "name"
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

  const locationId =
    String(
      formData.get(
        "location_id"
      ) ?? ""
    ).trim();

  const addressLine1 =
    String(
      formData.get(
        "address_line_1"
      ) ?? ""
    ).trim();

  const addressLine2 =
    String(
      formData.get(
        "address_line_2"
      ) ?? ""
    ).trim();

  const postalCode =
    String(
      formData.get(
        "postal_code"
      ) ?? ""
    ).trim();

  const websiteUrl =
    String(
      formData.get(
        "website_url"
      ) ?? ""
    ).trim();

  const latitude =
    parseCoordinate(
      formData.get(
        "latitude"
      )
    );

  const longitude =
    parseCoordinate(
      formData.get(
        "longitude"
      )
    );

  const active =
    formData.get(
      "active"
    ) === "on";

  if (!venueId) {
    throw new Error(
      "Venue ID is required."
    );
  }

  if (!name) {
    throw new Error(
      "Venue name is required."
    );
  }

  if (!slug) {
    throw new Error(
      "Venue slug is required."
    );
  }

  if (!locationId) {
    throw new Error(
      "Location is required."
    );
  }

  if (
    latitude !== null &&
    (
      Number.isNaN(
        latitude
      ) ||
      latitude < -90 ||
      latitude > 90
    )
  ) {
    throw new Error(
      "Latitude must be between -90 and 90."
    );
  }

  if (
    longitude !== null &&
    (
      Number.isNaN(
        longitude
      ) ||
      longitude < -180 ||
      longitude > 180
    )
  ) {
    throw new Error(
      "Longitude must be between -180 and 180."
    );
  }

  if (
    (
      latitude === null &&
      longitude !== null
    ) ||
    (
      latitude !== null &&
      longitude === null
    )
  ) {
    throw new Error(
      "Latitude and longitude must both be entered."
    );
  }

  const {
    error,
  } = await supabase
    .from("venues")
    .update({
      name,
      slug,

      location_id:
        locationId,

      address_line_1:
        addressLine1 ||
        null,

      address_line_2:
        addressLine2 ||
        null,

      postal_code:
        postalCode ||
        null,

      latitude,
      longitude,

      website_url:
        websiteUrl ||
        null,

      active,
    })
    .eq(
      "id",
      venueId
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  redirect(
    `/admin/venues/${venueId}`
  );
}

async function deleteVenue(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const venueId =
    String(
      formData.get(
        "venue_id"
      ) ?? ""
    ).trim();

  const venueName =
    String(
      formData.get(
        "venue_name"
      ) ?? ""
    );

  const confirmation =
    String(
      formData.get(
        "delete_confirmation"
      ) ?? ""
    ).trim();

  if (!venueId) {
    throw new Error(
      "Venue ID is required."
    );
  }

  if (
    confirmation !==
    venueName
  ) {
    throw new Error(
      "Venue name confirmation does not match."
    );
  }

  const {
    count: eventCount,
    error: eventCountError,
  } = await supabase
    .from("events")
    .select(
      "*",
      {
        count:
          "exact",
        head:
          true,
      }
    )
    .eq(
      "venue_id",
      venueId
    );

  if (
    eventCountError
  ) {
    throw new Error(
      eventCountError.message
    );
  }

  if (
    (eventCount ?? 0) >
    0
  ) {
    throw new Error(
      "This venue cannot be deleted because events are still assigned here."
    );
  }

  const {
    error,
  } = await supabase
    .from("venues")
    .delete()
    .eq(
      "id",
      venueId
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  redirect(
    "/admin/venues"
  );
}

export default async function EditVenuePage({
  params,
}: PageProps) {
  const {
    id,
  } = await params;

  const supabase =
    await requireContentManager();

  // ============================================
  // VENUE
  // ============================================

  const {
    data: venue,
    error: venueError,
  } = await supabase
    .from("venues")
    .select(
      `
      id,
      name,
      slug,
      location_id,
      address_line_1,
      address_line_2,
      postal_code,
      latitude,
      longitude,
      website_url,
      active,
      created_at,
      updated_at
      `
    )
    .eq(
      "id",
      id
    )
    .single();

  if (
    venueError ||
    !venue
  ) {
    notFound();
  }

  // ============================================
  // LOCATIONS
  // ============================================

  const {
    data: locations,
    error: locationsError,
  } = await supabase
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
    .order("name");

  if (
    locationsError
  ) {
    throw new Error(
      locationsError.message
    );
  }

  // ============================================
  // EVENTS USING VENUE
  // ============================================

  const {
    data: events,
    error: eventsError,
  } = await supabase
    .from("events")
    .select(
      `
      id,
      title,
      slug,
      start_at,
      status,
      published
      `
    )
    .eq(
      "venue_id",
      id
    )
    .order(
      "start_at",
      {
        ascending:
          false,
      }
    );

  if (
    eventsError
  ) {
    throw new Error(
      eventsError.message
    );
  }

  const hasDependencies =
    (events?.length ?? 0) >
    0;

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      {/* ======================================
          HEADER
      ====================================== */}

      <header className="border-b-2 border-black px-6 py-5">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin/venues"
              className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
            >
              ← Venues
            </Link>

            <h1 className="mt-2 text-3xl font-black uppercase">
              Edit{" "}
              {venue.name}
            </h1>
          </div>

          <span
            className={
              venue.active
                ? "border-2 border-black bg-black px-3 py-2 text-xs font-black uppercase text-white"
                : "border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase"
            }
          >
            {venue.active
              ? "Active"
              : "Inactive"}
          </span>
        </div>
      </header>

      {/* ======================================
          CONTENT
      ====================================== */}

      <section className="mx-auto max-w-4xl px-6 py-10">
        <form
          action={
            updateVenue
          }
          className="space-y-10"
        >
          <input
            type="hidden"
            name="venue_id"
            value={
              venue.id
            }
          />

          {/* ==================================
              VENUE INFORMATION
          ================================== */}

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Venue Information
            </h2>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Venue Name
                </span>

                <input
                  name="name"
                  required
                  defaultValue={
                    venue.name
                  }
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
                  defaultValue={
                    venue.slug
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Location
                </span>

                <select
                  name="location_id"
                  required
                  defaultValue={
                    venue.location_id
                  }
                  className="mt-2 w-full border-2 border-black bg-white px-3 py-2"
                >
                  {locations?.map(
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

              <label className="block sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Website URL
                </span>

                <input
                  name="website_url"
                  type="url"
                  defaultValue={
                    venue.website_url ??
                    ""
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="flex items-start gap-3 sm:col-span-2">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked={
                    venue.active
                  }
                  className="mt-1 h-5 w-5 border-2 border-black"
                />

                <span>
                  <span className="block text-xs font-bold uppercase tracking-[0.15em]">
                    Active
                  </span>

                  <span className="mt-1 block text-xs text-black/50">
                    Active venues may appear
                    in public event information.
                  </span>
                </span>
              </label>
            </div>
          </section>

          {/* ==================================
              ADDRESS
          ================================== */}

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Address
            </h2>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Address Line 1
                </span>

                <input
                  name="address_line_1"
                  defaultValue={
                    venue.address_line_1 ??
                    ""
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Address Line 2
                </span>

                <input
                  name="address_line_2"
                  defaultValue={
                    venue.address_line_2 ??
                    ""
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Postal Code
                </span>

                <input
                  name="postal_code"
                  defaultValue={
                    venue.postal_code ??
                    ""
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>
            </div>
          </section>

          {/* ==================================
              MAP COORDINATES
          ================================== */}

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Map Coordinates
            </h2>

            <p className="mt-2 max-w-2xl text-sm text-black/60">
              Optional precise coordinates for
              event-map placement.
            </p>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Latitude
                </span>

                <input
                  name="latitude"
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  defaultValue={
                    venue.latitude ??
                    ""
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Longitude
                </span>

                <input
                  name="longitude"
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  defaultValue={
                    venue.longitude ??
                    ""
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>
            </div>
          </section>

          {/* ==================================
              SAVE
          ================================== */}

          <div className="flex flex-wrap justify-end gap-3">
            <Link
              href="/admin/venues"
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
            EVENTS USING VENUE
        ====================================== */}

        <section className="mt-14 border-2 border-black bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black uppercase">
              Events at this Venue
            </h2>

            <span className="border-2 border-black px-2 py-1 text-xs font-black">
              {
                events?.length ??
                0
              }
            </span>
          </div>

          {!events?.length ? (
            <p className="mt-5 text-sm text-black/60">
              No events currently use this venue.
            </p>
          ) : (
            <div className="mt-6 divide-y-2 divide-black border-y-2 border-black">
              {events.map(
                (event) => {
                  const eventDate =
                    new Date(
                      event.start_at
                    );

                  return (
                    <div
                      key={
                        event.id
                      }
                      className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-black uppercase">
                          {
                            event.title
                          }
                        </p>

                        <p className="mt-1 text-sm">
                          {eventDate.toLocaleDateString(
                            "en-US",
                            {
                              year:
                                "numeric",
                              month:
                                "short",
                              day:
                                "numeric",
                            }
                          )}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold uppercase text-black/50">
                          <span>
                            {
                              event.status
                            }
                          </span>

                          <span>
                            •{" "}
                            {event.published
                              ? "Published"
                              : "Draft"}
                          </span>
                        </div>
                      </div>

                      <span className="border-2 border-black px-3 py-2 text-xs font-black uppercase">
                        Event Admin Next
                      </span>
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
            Delete Venue
          </h2>

          {hasDependencies ? (
            <>
              <p className="mt-3 text-sm">
                This venue cannot currently be
                deleted because one or more
                events are assigned here.
              </p>

              <div className="mt-5 border-2 border-red-700 bg-red-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-red-700">
                  Venue in use
                </p>

                <p className="mt-2 text-sm">
                  Reassign or delete the connected
                  events before deleting this venue.
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm">
                This permanently deletes the venue.
              </p>

              <p className="mt-4 text-sm font-bold">
                Type{" "}
                <span className="font-black">
                  {venue.name}
                </span>{" "}
                exactly to confirm.
              </p>

              <form
                action={
                  deleteVenue
                }
                className="mt-5"
              >
                <input
                  type="hidden"
                  name="venue_id"
                  value={
                    venue.id
                  }
                />

                <input
                  type="hidden"
                  name="venue_name"
                  value={
                    venue.name
                  }
                />

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.15em]">
                    Confirm Venue Name
                  </span>

                  <input
                    name="delete_confirmation"
                    required
                    autoComplete="off"
                    className="mt-2 w-full border-2 border-red-700 px-3 py-2"
                  />
                </label>

                <button
                  type="submit"
                  className="mt-4 border-2 border-red-700 bg-red-700 px-5 py-3 text-sm font-bold uppercase text-white"
                >
                  Permanently Delete Venue
                </button>
              </form>
            </>
          )}
        </section>
      </section>
    </main>
  );
}