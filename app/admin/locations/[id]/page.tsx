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
  const supabase = await createClient();

  const { data: claimsData } =
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
    .select("role, active")
    .eq("id", userId)
    .single();

  if (
    profileError ||
    !profile ||
    !profile.active ||
    !["admin", "editor"].includes(profile.role)
  ) {
    redirect("/");
  }

  return supabase;
}

async function updateLocation(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const locationId = String(
    formData.get("location_id") ?? ""
  );

  const name = String(
    formData.get("name") ?? ""
  ).trim();

  const slug = String(
    formData.get("slug") ?? ""
  ).trim();

  const city = String(
    formData.get("city") ?? ""
  ).trim();

  const region = String(
    formData.get("region") ?? ""
  ).trim();

  const country = String(
    formData.get("country") ?? ""
  ).trim();

  const countryCode = String(
    formData.get("country_code") ?? ""
  )
    .trim()
    .toUpperCase();

  const latitudeRaw = String(
    formData.get("latitude") ?? ""
  ).trim();

  const longitudeRaw = String(
    formData.get("longitude") ?? ""
  ).trim();

  if (!locationId) {
    throw new Error(
      "Location ID is required."
    );
  }

  if (!name) {
    throw new Error(
      "Location name is required."
    );
  }

  if (!slug) {
    throw new Error(
      "Location slug is required."
    );
  }

  if (!country) {
    throw new Error(
      "Country is required."
    );
  }

  if (
    countryCode &&
    countryCode.length !== 2
  ) {
    throw new Error(
      "Country code must contain two letters."
    );
  }

  const latitude =
    latitudeRaw !== ""
      ? Number(latitudeRaw)
      : null;

  const longitude =
    longitudeRaw !== ""
      ? Number(longitudeRaw)
      : null;

  if (
    latitude !== null &&
    (
      Number.isNaN(latitude) ||
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
      Number.isNaN(longitude) ||
      longitude < -180 ||
      longitude > 180
    )
  ) {
    throw new Error(
      "Longitude must be between -180 and 180."
    );
  }

  if (
    (latitude === null &&
      longitude !== null) ||
    (latitude !== null &&
      longitude === null)
  ) {
    throw new Error(
      "Latitude and longitude must both be entered."
    );
  }

  const { error } = await supabase
    .from("locations")
    .update({
      name,
      slug,
      city: city || null,
      region: region || null,
      country,
      country_code:
        countryCode || null,
      latitude,
      longitude,
    })
    .eq("id", locationId);

  if (error) {
    throw new Error(error.message);
  }

  redirect(
    `/admin/locations/${locationId}`
  );
}

async function deleteLocation(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const locationId = String(
    formData.get("location_id") ?? ""
  );

  const locationName = String(
    formData.get("location_name") ?? ""
  );

  const confirmation = String(
    formData.get(
      "delete_confirmation"
    ) ?? ""
  ).trim();

  if (!locationId) {
    throw new Error(
      "Location ID is missing."
    );
  }

  if (
    confirmation !== locationName
  ) {
    throw new Error(
      "Location name confirmation does not match."
    );
  }

  // Check for artists using the location.

  const {
    count: artistCount,
    error: artistCountError,
  } = await supabase
    .from("artist_locations")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq(
      "location_id",
      locationId
    );

  if (artistCountError) {
    throw new Error(
      artistCountError.message
    );
  }

  // Check for scenes using the location.

  const {
    count: sceneCount,
    error: sceneCountError,
  } = await supabase
    .from("scenes")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq(
      "location_id",
      locationId
    );

  if (sceneCountError) {
    throw new Error(
      sceneCountError.message
    );
  }

  if (
    (artistCount ?? 0) > 0 ||
    (sceneCount ?? 0) > 0
  ) {
    throw new Error(
      "This location cannot be deleted because it is still assigned to artists or scenes."
    );
  }

  const { error } = await supabase
    .from("locations")
    .delete()
    .eq(
      "id",
      locationId
    );

  if (error) {
    throw new Error(error.message);
  }

  redirect(
    "/admin/locations"
  );
}

export default async function EditLocationPage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase =
    await requireContentManager();

  // ============================================
  // LOCATION
  // ============================================

  const {
    data: location,
    error: locationError,
  } = await supabase
    .from("locations")
    .select(
      `
      id,
      name,
      slug,
      city,
      region,
      country,
      country_code,
      latitude,
      longitude,
      created_at,
      updated_at
      `
    )
    .eq("id", id)
    .single();

  if (
    locationError ||
    !location
  ) {
    notFound();
  }

  // ============================================
  // ARTISTS USING LOCATION
  // ============================================

  const {
    data: artistLocationRows,
    error: artistLocationsError,
  } = await supabase
    .from("artist_locations")
    .select(
      `
      artist_id,
      relationship,
      is_primary
      `
    )
    .eq(
      "location_id",
      id
    );

  if (artistLocationsError) {
    throw new Error(
      artistLocationsError.message
    );
  }

  let artists:
    | {
        id: string;
        name: string;
        slug: string;
        published: boolean;
      }[]
    | null = null;

  if (artistLocationRows?.length) {
    const artistIds =
      artistLocationRows.map(
        (row) => row.artist_id
      );

    const {
      data,
      error,
    } = await supabase
      .from("artists")
      .select(
        `
        id,
        name,
        slug,
        published
        `
      )
      .in(
        "id",
        artistIds
      )
      .order("name");

    if (error) {
      throw new Error(
        error.message
      );
    }

    artists = data;
  }

  // ============================================
  // SCENES USING LOCATION
  // ============================================

  const {
    data: scenes,
    error: scenesError,
  } = await supabase
    .from("scenes")
    .select(
      `
      id,
      name,
      slug,
      published,
      featured
      `
    )
    .eq(
      "location_id",
      id
    )
    .order("name");

  if (scenesError) {
    throw new Error(
      scenesError.message
    );
  }

  const hasDependencies =
    (artists?.length ?? 0) > 0 ||
    (scenes?.length ?? 0) > 0;

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      {/* HEADER */}

      <header className="border-b-2 border-black px-6 py-5">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin/locations"
              className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
            >
              ← Locations
            </Link>

            <h1 className="mt-2 text-3xl font-black uppercase">
              Edit {location.name}
            </h1>
          </div>

          <div className="border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase">
            {location.country_code ??
              location.country}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-10">
        {/* ======================================
            EDIT FORM
        ====================================== */}

        <form
          action={updateLocation}
          className="space-y-10"
        >
          <input
            type="hidden"
            name="location_id"
            value={location.id}
          />

          {/* BASIC INFORMATION */}

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Location Information
            </h2>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Location Name
                </span>

                <input
                  name="name"
                  required
                  defaultValue={
                    location.name
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
                    location.slug
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  City
                </span>

                <input
                  name="city"
                  defaultValue={
                    location.city ?? ""
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Region / State
                </span>

                <input
                  name="region"
                  defaultValue={
                    location.region ?? ""
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Country
                </span>

                <input
                  name="country"
                  required
                  defaultValue={
                    location.country
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Country Code
                </span>

                <input
                  name="country_code"
                  maxLength={2}
                  defaultValue={
                    location.country_code ??
                    ""
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2 uppercase"
                />

                <p className="mt-2 text-xs text-black/50">
                  Two-letter ISO country code.
                </p>
              </label>
            </div>
          </section>

          {/* MAP COORDINATES */}

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Map Coordinates
            </h2>

            <p className="mt-2 max-w-2xl text-sm text-black/60">
              Updating these values automatically updates the
              PostGIS geography point through the existing
              database trigger.
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
                    location.latitude ??
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
                    location.longitude ??
                    ""
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>
            </div>
          </section>

          {/* SAVE */}

          <div className="flex flex-wrap justify-end gap-3">
            <Link
              href="/admin/locations"
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
            ARTISTS
        ====================================== */}

        <section className="mt-14 border-2 border-black bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black uppercase">
              Artists at this Location
            </h2>

            <span className="border-2 border-black px-2 py-1 text-xs font-black">
              {artists?.length ?? 0}
            </span>
          </div>

          {!artists?.length ? (
            <p className="mt-5 text-sm text-black/60">
              No artists currently use this location.
            </p>
          ) : (
            <div className="mt-6 divide-y-2 divide-black border-y-2 border-black">
              {artists.map(
                (artist) => {
                  const relationship =
                    artistLocationRows?.find(
                      (row) =>
                        row.artist_id ===
                        artist.id
                    );

                  return (
                    <div
                      key={artist.id}
                      className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-black uppercase">
                          {artist.name}
                        </p>

                        <div className="mt-1 flex flex-wrap gap-2 text-xs font-bold uppercase text-black/50">
                          <span>
                            {artist.published
                              ? "Published"
                              : "Draft"}
                          </span>

                          {relationship?.relationship && (
                            <span>
                              •{" "}
                              {
                                relationship.relationship
                              }
                            </span>
                          )}

                          {relationship?.is_primary && (
                            <span>
                              • Primary
                            </span>
                          )}
                        </div>
                      </div>

                      <Link
                        href={`/admin/artists/${artist.id}`}
                        className="border-2 border-black px-3 py-2 text-xs font-black uppercase transition-colors hover:bg-black hover:text-white"
                      >
                        Edit Artist
                      </Link>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        {/* ======================================
            SCENES
        ====================================== */}

        <section className="mt-8 border-2 border-black bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black uppercase">
              Scenes at this Location
            </h2>

            <span className="border-2 border-black px-2 py-1 text-xs font-black">
              {scenes?.length ?? 0}
            </span>
          </div>

          {!scenes?.length ? (
            <p className="mt-5 text-sm text-black/60">
              No scenes currently use this location.
            </p>
          ) : (
            <div className="mt-6 divide-y-2 divide-black border-y-2 border-black">
              {scenes.map(
                (scene) => (
                  <div
                    key={scene.id}
                    className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-black uppercase">
                        {scene.name}
                      </p>

                      <div className="mt-1 flex flex-wrap gap-2 text-xs font-bold uppercase text-black/50">
                        <span>
                          {scene.published
                            ? "Published"
                            : "Draft"}
                        </span>

                        {scene.featured && (
                          <span>
                            • Featured
                          </span>
                        )}
                      </div>
                    </div>

                    <Link
                      href={`/admin/scenes/${scene.id}`}
                      className="border-2 border-black px-3 py-2 text-xs font-black uppercase transition-colors hover:bg-black hover:text-white"
                    >
                      Edit Scene
                    </Link>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* ======================================
            DELETE
        ====================================== */}

        <section className="mt-14 border-2 border-red-700 bg-white p-6">
          <h2 className="text-xl font-black uppercase text-red-700">
            Delete Location
          </h2>

          {hasDependencies ? (
            <>
              <p className="mt-3 text-sm">
                This location cannot currently be deleted because
                artists or scenes are still assigned here.
              </p>

              <div className="mt-5 border-2 border-red-700 bg-red-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-red-700">
                  Location in use
                </p>

                <p className="mt-2 text-sm">
                  Reassign the connected artists and scenes before
                  deleting this location.
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm">
                This permanently deletes the location.
              </p>

              <p className="mt-4 text-sm font-bold">
                Type{" "}
                <span className="font-black">
                  {location.name}
                </span>{" "}
                exactly to confirm.
              </p>

              <form
                action={deleteLocation}
                className="mt-5"
              >
                <input
                  type="hidden"
                  name="location_id"
                  value={location.id}
                />

                <input
                  type="hidden"
                  name="location_name"
                  value={location.name}
                />

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.15em]">
                    Confirm Location Name
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
                  Permanently Delete Location
                </button>
              </form>
            </>
          )}
        </section>
      </section>
    </main>
  );
}