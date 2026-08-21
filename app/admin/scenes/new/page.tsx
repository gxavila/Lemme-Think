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

async function createScene(
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

  const locationId = String(
    formData.get("location_id") ?? ""
  );

  const tagline = String(
    formData.get("tagline") ?? ""
  ).trim();

  const descriptionShort =
    String(
      formData.get(
        "description_short"
      ) ?? ""
    ).trim();

  const descriptionLong =
    String(
      formData.get(
        "description_long"
      ) ?? ""
    ).trim();

  const published =
    formData.get("published") === "on";

  const featured =
    formData.get("featured") === "on";

  if (!name || !slug) {
    throw new Error(
      "Scene name and slug are required."
    );
  }

  const {
    data: scene,
    error,
  } = await supabase
    .from("scenes")
    .insert({
      name,
      slug,
      location_id:
        locationId || null,
      tagline:
        tagline || null,
      description_short:
        descriptionShort || null,
      description_long:
        descriptionLong || null,
      published,
      featured,
    })
    .select("id")
    .single();

  if (error || !scene) {
    throw new Error(
      error?.message ??
        "Unable to create scene."
    );
  }

  redirect(
    `/admin/scenes/${scene.id}`
  );
}

export default async function NewScenePage() {
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
      region,
      country
      `
    )
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      <header className="border-b-2 border-black px-6 py-5">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/admin/scenes"
            className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
          >
            ← Scenes
          </Link>

          <h1 className="mt-2 text-3xl font-black uppercase">
            Add Scene
          </h1>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-10">
        <form
          action={createScene}
          className="space-y-10"
        >
          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Scene Information
            </h2>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Scene Name
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
                  placeholder="santa-cruz"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>
            </div>

            <label className="mt-6 block">
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Location
              </span>

              <select
                name="location_id"
                defaultValue=""
                className="mt-2 w-full border-2 border-black px-3 py-2"
              >
                <option value="">
                  No location
                </option>

                {locations?.map(
                  (location) => (
                    <option
                      key={location.id}
                      value={location.id}
                    >
                      {[
                        location.name,
                        location.region,
                        location.country,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="mt-6 block">
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Tagline
              </span>

              <input
                name="tagline"
                placeholder="A short description of the scene"
                className="mt-2 w-full border-2 border-black px-3 py-2"
              />
            </label>
          </section>

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Editorial Content
            </h2>

            <label className="mt-6 block">
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Short Description
              </span>

              <textarea
                name="description_short"
                rows={3}
                className="mt-2 w-full border-2 border-black px-3 py-2"
              />
            </label>

            <label className="mt-6 block">
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Long Description
              </span>

              <textarea
                name="description_long"
                rows={8}
                className="mt-2 w-full border-2 border-black px-3 py-2"
              />
            </label>
          </section>

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Publishing
            </h2>

            <div className="mt-6 space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="published"
                />

                <span className="font-bold">
                  Published
                </span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="featured"
                />

                <span className="font-bold">
                  Featured
                </span>
              </label>
            </div>
          </section>

          <div className="flex justify-end gap-3">
            <Link
              href="/admin/scenes"
              className="border-2 border-black bg-white px-5 py-3 text-sm font-bold uppercase"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="border-2 border-black bg-black px-5 py-3 text-sm font-bold uppercase text-white"
            >
              Create Scene
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}