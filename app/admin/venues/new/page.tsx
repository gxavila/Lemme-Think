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

function parseCoordinate(
  value: FormDataEntryValue | null
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

async function createVenue(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

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
    data: venue,
    error,
  } = await supabase
    .from("venues")
    .insert({
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
    .select(
      "id"
    )
    .single();

  if (
    error ||
    !venue
  ) {
    throw new Error(
      error?.message ??
        "Unable to create venue."
    );
  }

  redirect(
    `/admin/venues/${venue.id}`
  );
}

export default async function NewVenuePage() {
  const supabase =
    await requireContentManager();

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

  if (locationsError) {
    throw new Error(
      locationsError.message
    );
  }

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      {/* ======================================
          HEADER
      ====================================== */}

      <header className="border-b-2 border-black px-6 py-5">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/admin/venues"
            className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
          >
            ← Venues
          </Link>

          <h1 className="mt-2 text-3xl font-black uppercase">
            Add Venue
          </h1>

          <p className="mt-2 max-w-xl text-sm text-black/60">
            Create a physical venue that can
            be assigned to events.
          </p>
        </div>
      </header>

      {/* ======================================
          FORM
      ====================================== */}

      <section className="mx-auto max-w-4xl px-6 py-10">
        <form
          action={
            createVenue
          }
          className="space-y-10"
        >
          {/* ==================================
              BASIC INFORMATION
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
                  placeholder="moes-alley"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />

                <p className="mt-2 text-xs text-black/50">
                  Lowercase URL-safe identifier.
                </p>
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Location
                </span>

                <select
                  name="location_id"
                  required
                  defaultValue=""
                  className="mt-2 w-full border-2 border-black bg-white px-3 py-2"
                >
                  <option
                    value=""
                    disabled
                  >
                    Select Location
                  </option>

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

                {!locations?.length && (
                  <p className="mt-2 text-xs font-bold text-red-700">
                    Create a location before adding a venue.
                  </p>
                )}
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Website URL
                </span>

                <input
                  name="website_url"
                  type="url"
                  placeholder="https://"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="flex items-start gap-3 sm:col-span-2">
                <input
                  name="active"
                  type="checkbox"
                  defaultChecked
                  className="mt-1 h-5 w-5 border-2 border-black"
                />

                <span>
                  <span className="block text-xs font-bold uppercase tracking-[0.15em]">
                    Active
                  </span>

                  <span className="mt-1 block text-xs text-black/50">
                    Active venues can be displayed publicly.
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
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Address Line 2
                </span>

                <input
                  name="address_line_2"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Postal Code
                </span>

                <input
                  name="postal_code"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>
            </div>
          </section>

          {/* ==================================
              COORDINATES
          ================================== */}

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Map Coordinates
            </h2>

            <p className="mt-2 max-w-2xl text-sm text-black/60">
              Optional precise coordinates for
              the venue. These will later power
              event markers on the atlas.
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
              disabled={
                !locations?.length
              }
              className="border-2 border-black bg-black px-5 py-3 text-sm font-bold uppercase text-white transition-colors hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              Create Venue
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}