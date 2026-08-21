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

  const { data: profile } =
    await supabase
      .from("profiles")
      .select("role, active")
      .eq("id", userId)
      .single();

  if (
    !profile ||
    !profile.active ||
    !["admin", "editor"].includes(profile.role)
  ) {
    redirect("/");
  }

  return supabase;
}

export default async function AdminScenesPage() {
  const supabase =
    await requireContentManager();

  const {
    data: scenes,
    error,
  } = await supabase
    .from("scenes")
    .select(
      `
      id,
      name,
      slug,
      tagline,
      published,
      featured,
      updated_at,
      location_id
      `
    )
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  const {
    data: locations,
  } = await supabase
    .from("locations")
    .select(
      `
      id,
      name,
      region,
      country
      `
    );

  const locationMap =
    new Map(
      (locations ?? []).map(
        (location) => [
          location.id,
          location,
        ]
      )
    );

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
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
              Scenes
            </h1>
          </div>

          <Link
            href="/admin/scenes/new"
            className="border-2 border-black bg-black px-4 py-3 text-xs font-black uppercase text-white"
          >
            Add Scene
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-10">
        {!scenes?.length ? (
          <div className="border-2 border-black bg-white p-6">
            <p className="font-bold">
              No scenes found.
            </p>
          </div>
        ) : (
          <div className="border-2 border-black bg-white">
            {scenes.map((scene) => {
              const location =
                scene.location_id
                  ? locationMap.get(
                      scene.location_id
                    )
                  : null;

              return (
                <article
                  key={scene.id}
                  className="flex flex-col gap-5 border-b-2 border-black p-5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <h2 className="text-xl font-black uppercase">
                      {scene.name}
                    </h2>

                    {location && (
                      <p className="mt-1 text-sm">
                        {[
                          location.name,
                          location.region,
                          location.country,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}

                    {scene.tagline && (
                      <p className="mt-2 max-w-2xl text-sm text-black/65">
                        {scene.tagline}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold uppercase">
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

                  <div className="flex flex-wrap gap-2">
                    {scene.published && (
                      <Link
                        href={`/scenes/${scene.slug}`}
                        className="border-2 border-black px-3 py-2 text-xs font-bold uppercase"
                      >
                        View
                      </Link>
                    )}

                    <Link
                      href={`/admin/scenes/${scene.id}`}
                      className="border-2 border-black bg-black px-3 py-2 text-xs font-bold uppercase text-white"
                    >
                      Edit
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}