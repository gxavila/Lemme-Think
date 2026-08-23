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

export default async function AdminVenuesPage() {
  const supabase =
    await requireContentManager();

  const {
    data: venues,
    error,
  } = await supabase
    .from("venues")
    .select(
      `
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
      updated_at,
      location:locations (
        id,
        name,
        city,
        region,
        country
      )
      `
    )
    .order(
      "name"
    );

  if (error) {
    throw new Error(
      error.message
    );
  }

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      {/* ======================================
          HEADER
      ====================================== */}

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
              Venues
            </h1>

            <p className="mt-2 max-w-xl text-sm text-black/60">
              Manage the venues used by concerts,
              festivals, showcases, and other events.
            </p>
          </div>

          <Link
            href="/admin/venues/new"
            className="border-2 border-black bg-black px-4 py-3 text-xs font-black uppercase text-white transition-colors hover:bg-white hover:text-black"
          >
            Add Venue
          </Link>
        </div>
      </header>

      {/* ======================================
          CONTENT
      ====================================== */}

      <section className="mx-auto max-w-6xl px-6 py-10">
        {!venues?.length ? (
          <div className="border-2 border-black bg-white p-6">
            <p className="font-bold">
              No venues found.
            </p>

            <p className="mt-2 text-sm text-black/60">
              Add your first venue before creating
              venue-based events.
            </p>
          </div>
        ) : (
          <div className="border-2 border-black bg-white">
            {venues.map(
              (venue) => {
                const location =
                  Array.isArray(
                    venue.location
                  )
                    ? venue.location[0]
                    : venue.location;

                const locationText =
                  [
                    location?.city ??
                      location?.name,
                    location?.region,
                    location?.country,
                  ]
                    .filter(Boolean)
                    .join(", ");

                return (
                  <article
                    key={
                      venue.id
                    }
                    className="grid gap-5 border-b-2 border-black p-5 last:border-b-0 md:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-black uppercase">
                          {
                            venue.name
                          }
                        </h2>

                        <span
                          className={
                            venue.active
                              ? "border-2 border-black bg-black px-2 py-1 text-[10px] font-black uppercase text-white"
                              : "border-2 border-black bg-white px-2 py-1 text-[10px] font-black uppercase"
                          }
                        >
                          {venue.active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </div>

                      {locationText && (
                        <p className="mt-2 text-sm">
                          {
                            locationText
                          }
                        </p>
                      )}

                      {venue.address_line_1 && (
                        <p className="mt-1 text-sm text-black/60">
                          {
                            venue.address_line_1
                          }
                        </p>
                      )}

                      <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-black/50">
                        {
                          venue.slug
                        }
                      </p>

                      {venue.latitude !=
                        null &&
                        venue.longitude !=
                          null && (
                          <p className="mt-3 text-xs text-black/60">
                            {
                              venue.latitude
                            }
                            ,{" "}
                            {
                              venue.longitude
                            }
                          </p>
                        )}
                    </div>

                    <div className="flex items-center">
                      <Link
                        href={`/admin/venues/${venue.id}`}
                        className="border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white transition-colors hover:bg-white hover:text-black"
                      >
                        Edit
                      </Link>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>
    </main>
  );
}