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

function formatEventDate(
  value: string,
  timeZone: string
) {
  try {
    return new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,
        year:
          "numeric",
        month:
          "short",
        day:
          "numeric",
        hour:
          "numeric",
        minute:
          "2-digit",
      }
    ).format(
      new Date(value)
    );
  } catch {
    return new Date(
      value
    ).toLocaleString(
      "en-US"
    );
  }
}

export default async function AdminEventsPage() {
  const supabase =
    await requireContentManager();

  const {
    data: events,
    error,
  } = await supabase
    .from("events")
    .select(
      `
      id,
      title,
      slug,
      event_type,
      status,
      start_at,
      timezone,
      published,
      featured,
      venue:venues (
        id,
        name
      ),
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
      "start_at",
      {
        ascending:
          true,
      }
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
              Events
            </h1>

            <p className="mt-2 max-w-xl text-sm text-black/60">
              Manage concerts, festivals, showcases,
              livestreams, and other artist events.
            </p>
          </div>

          <Link
            href="/admin/events/new"
            className="border-2 border-black bg-black px-4 py-3 text-xs font-black uppercase text-white transition-colors hover:bg-white hover:text-black"
          >
            Add Event
          </Link>
        </div>
      </header>

      {/* ======================================
          CONTENT
      ====================================== */}

      <section className="mx-auto max-w-6xl px-6 py-10">
        {!events?.length ? (
          <div className="border-2 border-black bg-white p-6">
            <p className="font-bold">
              No events found.
            </p>

            <p className="mt-2 text-sm text-black/60">
              Create the first event and then
              add artists to its lineup.
            </p>
          </div>
        ) : (
          <div className="border-2 border-black bg-white">
            {events.map(
              (event) => {
                const venue =
                  Array.isArray(
                    event.venue
                  )
                    ? event.venue[0]
                    : event.venue;

                const location =
                  Array.isArray(
                    event.location
                  )
                    ? event.location[0]
                    : event.location;

                const locationText =
                  [
                    location?.city ??
                      location?.name,
                    location?.region,
                  ]
                    .filter(Boolean)
                    .join(", ");

                return (
                  <article
                    key={
                      event.id
                    }
                    className="grid gap-5 border-b-2 border-black p-5 last:border-b-0 md:grid-cols-[1fr_auto]"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-black uppercase">
                          {
                            event.title
                          }
                        </h2>

                        <span
                          className={
                            event.published
                              ? "border-2 border-black bg-black px-2 py-1 text-[10px] font-black uppercase text-white"
                              : "border-2 border-black px-2 py-1 text-[10px] font-black uppercase"
                          }
                        >
                          {event.published
                            ? "Published"
                            : "Draft"}
                        </span>

                        {event.featured && (
                          <span className="border-2 border-black px-2 py-1 text-[10px] font-black uppercase">
                            Featured
                          </span>
                        )}
                      </div>

                      <p className="mt-2 font-bold">
                        {formatEventDate(
                          event.start_at,
                          event.timezone ??
                            "America/Los_Angeles"
                        )}
                      </p>

                      <p className="mt-2 text-sm">
                        {venue?.name ??
                          locationText ??
                          "No physical venue"}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold uppercase tracking-[0.1em] text-black/50">
                        <span>
                          {
                            event.event_type
                          }
                        </span>

                        <span>
                          {
                            event.status
                          }
                        </span>

                        <span>
                          {
                            event.slug
                          }
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Link
                        href={`/admin/events/${event.id}`}
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