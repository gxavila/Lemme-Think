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

export default async function AdminLocationsPage() {
  const supabase =
    await requireContentManager();

  const {
    data: locations,
    error,
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
      updated_at
      `
    )
    .order("country")
    .order("region")
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      {/* HEADER */}

      <header className="border-b-2 border-black px-6 py-5">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin"
              className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
            >
              ← Admin
            </Link>

            <h1 className="mt-2 text-3xl font-black uppercase">
              Locations
            </h1>

            <p className="mt-2 max-w-xl text-sm text-black/60">
              Manage the geographic locations used by artists,
              scenes, and the atlas map.
            </p>
          </div>

          <Link
            href="/admin/locations/new"
            className="border-2 border-black bg-black px-4 py-3 text-xs font-black uppercase text-white transition-colors hover:bg-white hover:text-black"
          >
            Add Location
          </Link>
        </div>
      </header>

      {/* CONTENT */}

      <section className="mx-auto max-w-6xl px-6 py-10">
        {!locations?.length ? (
          <div className="border-2 border-black bg-white p-6">
            <p className="font-bold">
              No locations found.
            </p>
          </div>
        ) : (
          <div className="border-2 border-black bg-white">
            {locations.map((location) => (
              <article
                key={location.id}
                className="grid gap-5 border-b-2 border-black p-5 last:border-b-0 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-black uppercase">
                      {location.name}
                    </h2>

                    {location.country_code && (
                      <span className="border-2 border-black px-2 py-1 text-[10px] font-black uppercase">
                        {location.country_code}
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm">
                    {[
                      location.city,
                      location.region,
                      location.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>

                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-black/50">
                    {location.slug}
                  </p>

                  {location.latitude != null &&
                    location.longitude != null && (
                      <p className="mt-3 text-xs text-black/60">
                        {location.latitude},{" "}
                        {location.longitude}
                      </p>
                    )}
                </div>

                <div className="flex items-center">
                  <Link
                    href={`/admin/locations/${location.id}`}
                    className="border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white transition-colors hover:bg-white hover:text-black"
                  >
                    Edit
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}