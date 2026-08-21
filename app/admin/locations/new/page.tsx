import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

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

async function createLocation(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

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

  const {
    data: location,
    error,
  } = await supabase
    .from("locations")
    .insert({
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
    .select("id")
    .single();

  if (error || !location) {
    throw new Error(
      error?.message ??
        "Unable to create location."
    );
  }

  redirect(
    `/admin/locations/${location.id}`
  );
}

export default async function NewLocationPage() {
  await requireContentManager();

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      {/* HEADER */}

      <header className="border-b-2 border-black px-6 py-5">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/admin/locations"
            className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
          >
            ← Locations
          </Link>

          <h1 className="mt-2 text-3xl font-black uppercase">
            Add Location
          </h1>

          <p className="mt-2 max-w-xl text-sm text-black/60">
            Add a geographic location for artists,
            scenes, and map discovery.
          </p>
        </div>
      </header>

      {/* FORM */}

      <section className="mx-auto max-w-4xl px-6 py-10">
        <form
          action={createLocation}
          className="space-y-10"
        >
          {/* BASIC */}

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
                  placeholder="Santa Cruz"
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
                  placeholder="santa-cruz-ca-us"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  City
                </span>

                <input
                  name="city"
                  placeholder="Santa Cruz"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Region / State
                </span>

                <input
                  name="region"
                  placeholder="California"
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
                  placeholder="United States"
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
                  placeholder="US"
                  className="mt-2 w-full border-2 border-black px-3 py-2 uppercase"
                />

                <p className="mt-2 text-xs text-black/50">
                  Two-letter ISO country code.
                </p>
              </label>
            </div>
          </section>

          {/* COORDINATES */}

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Map Coordinates
            </h2>

            <p className="mt-2 max-w-2xl text-sm text-black/60">
              Latitude and longitude determine where the
              location appears on the atlas map.
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
                  placeholder="36.9741"
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
                  placeholder="-122.0308"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>
            </div>

            <div className="mt-6 border-2 border-black bg-[#f3efe4] p-4">
              <p className="text-xs font-black uppercase tracking-[0.15em]">
                Important
              </p>

              <p className="mt-2 text-sm">
                Enter both latitude and longitude or leave both
                blank. Your existing database trigger will create
                the PostGIS geography point automatically.
              </p>
            </div>
          </section>

          {/* ACTIONS */}

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
              Create Location
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}