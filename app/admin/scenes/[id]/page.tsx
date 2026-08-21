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

async function updateScene(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const sceneId = String(
    formData.get("scene_id") ?? ""
  );

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

  if (
    !sceneId ||
    !name ||
    !slug
  ) {
    throw new Error(
      "Scene ID, name, and slug are required."
    );
  }

  const { error } =
    await supabase
      .from("scenes")
      .update({
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
      .eq("id", sceneId);

  if (error) {
    throw new Error(error.message);
  }

  redirect(
    `/admin/scenes/${sceneId}`
  );
}

async function deleteScene(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const sceneId = String(
    formData.get("scene_id") ?? ""
  );

  const sceneName = String(
    formData.get("scene_name") ?? ""
  );

  const confirmation = String(
    formData.get(
      "delete_confirmation"
    ) ?? ""
  ).trim();

  if (!sceneId) {
    throw new Error(
      "Scene ID is missing."
    );
  }

  if (
    confirmation !== sceneName
  ) {
    throw new Error(
      "Scene name confirmation does not match."
    );
  }

  const { error } =
    await supabase
      .from("scenes")
      .delete()
      .eq("id", sceneId);

  if (error) {
    throw new Error(error.message);
  }

  redirect("/admin/scenes");
}

export default async function EditScenePage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase =
    await requireContentManager();

  const {
    data: scene,
    error: sceneError,
  } = await supabase
    .from("scenes")
    .select(
      `
      id,
      name,
      slug,
      location_id,
      tagline,
      description_short,
      description_long,
      published,
      featured,
      hero_image_url,
      hero_image_path
      `
    )
    .eq("id", id)
    .single();

  if (
    sceneError ||
    !scene
  ) {
    notFound();
  }

  const {
    data: locations,
    error: locationsError,
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

  if (locationsError) {
    throw new Error(
      locationsError.message
    );
  }

  const {
    data: sceneArtists,
  } = await supabase
    .from("artist_scenes")
    .select(
      `
      artist_id,
      is_primary
      `
    )
    .eq("scene_id", id);

  let artists:
    | {
        id: string;
        name: string;
        slug: string;
        published: boolean;
      }[]
    | null = null;

  if (sceneArtists?.length) {
    const artistIds =
      sceneArtists.map(
        (row) => row.artist_id
      );

    const {
      data,
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

    artists = data;
  }

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      {/* HEADER */}

      <header className="border-b-2 border-black px-6 py-5">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/admin/scenes"
              className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
            >
              ← Scenes
            </Link>

            <h1 className="mt-2 text-3xl font-black uppercase">
              Edit {scene.name}
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/scenes/${scene.id}/images`}
              className="border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase transition-colors hover:bg-black hover:text-white"
            >
              Manage Image
            </Link>

            {scene.published && (
              <Link
                href={`/scenes/${scene.slug}`}
                className="border-2 border-black bg-black px-3 py-2 text-xs font-black uppercase text-white transition-colors hover:bg-white hover:text-black"
              >
                View Scene →
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-10">
        <form
          action={updateScene}
          className="space-y-10"
        >
          <input
            type="hidden"
            name="scene_id"
            value={scene.id}
          />

          {/* SCENE INFORMATION */}

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Scene Information
            </h2>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <label>
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Scene Name
                </span>

                <input
                  name="name"
                  required
                  defaultValue={scene.name}
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
                  defaultValue={scene.slug}
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
                defaultValue={
                  scene.location_id ?? ""
                }
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
                defaultValue={
                  scene.tagline ?? ""
                }
                className="mt-2 w-full border-2 border-black px-3 py-2"
              />
            </label>
          </section>

          {/* EDITORIAL CONTENT */}

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
                defaultValue={
                  scene.description_short ??
                  ""
                }
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
                defaultValue={
                  scene.description_long ??
                  ""
                }
                className="mt-2 w-full border-2 border-black px-3 py-2"
              />
            </label>
          </section>

          {/* IMAGE STATUS */}

          <section className="border-2 border-black bg-white p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black uppercase">
                  Hero Image
                </h2>

                <p className="mt-2 text-sm text-black/60">
                  {scene.hero_image_path
                    ? "A scene hero image is currently configured."
                    : scene.hero_image_url
                      ? "This scene is using a legacy hero image URL."
                      : "No hero image is currently configured."}
                </p>
              </div>

              <Link
                href={`/admin/scenes/${scene.id}/images`}
                className="w-fit border-2 border-black bg-black px-4 py-3 text-xs font-black uppercase text-white transition-colors hover:bg-white hover:text-black"
              >
                Manage Image
              </Link>
            </div>
          </section>

          {/* PUBLISHING */}

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Publishing
            </h2>

            <div className="mt-6 space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="published"
                  defaultChecked={
                    scene.published
                  }
                />

                <span className="font-bold">
                  Published
                </span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="featured"
                  defaultChecked={
                    scene.featured
                  }
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
              Save Changes
            </button>
          </div>
        </form>

        {/* ARTISTS IN SCENE */}

        <section className="mt-14 border-2 border-black bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black uppercase">
              Artists in this Scene
            </h2>

            <span className="border-2 border-black px-2 py-1 text-xs font-black">
              {artists?.length ?? 0}
            </span>
          </div>

          {!artists?.length ? (
            <p className="mt-5 text-black/60">
              No artists are assigned to this scene.
            </p>
          ) : (
            <div className="mt-6 divide-y-2 divide-black border-y-2 border-black">
              {artists.map(
                (artist) => {
                  const relationship =
                    sceneArtists?.find(
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

                        <div className="mt-1 flex flex-wrap gap-2 text-xs font-bold uppercase text-black/55">
                          <span>
                            {artist.published
                              ? "Published"
                              : "Draft"}
                          </span>

                          {relationship?.is_primary && (
                            <span>
                              • Primary Scene
                            </span>
                          )}
                        </div>
                      </div>

                      <Link
                        href={`/admin/artists/${artist.id}`}
                        className="border-2 border-black px-3 py-2 text-xs font-bold uppercase transition-colors hover:bg-black hover:text-white"
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

        {/* DELETE */}

        <section className="mt-14 border-2 border-red-700 bg-white p-6">
          <h2 className="text-xl font-black uppercase text-red-700">
            Delete Scene
          </h2>

          <p className="mt-3 text-sm">
            This permanently deletes the scene. Artists will not be deleted.
          </p>

          <p className="mt-4 text-sm font-bold">
            Type{" "}
            <span className="font-black">
              {scene.name}
            </span>{" "}
            exactly to confirm.
          </p>

          <form
            action={deleteScene}
            className="mt-5"
          >
            <input
              type="hidden"
              name="scene_id"
              value={scene.id}
            />

            <input
              type="hidden"
              name="scene_name"
              value={scene.name}
            />

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Confirm Scene Name
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
              Permanently Delete Scene
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}