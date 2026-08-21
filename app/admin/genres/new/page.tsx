import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

async function requireContentManager() {
  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

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

async function createGenre(
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

  const parentGenreId = String(
    formData.get("parent_genre_id") ?? ""
  );

  const description = String(
    formData.get("description") ?? ""
  ).trim();

  const active =
    formData.get("active") === "on";

  if (!name) {
    throw new Error(
      "Genre name is required."
    );
  }

  if (!slug) {
    throw new Error(
      "Genre slug is required."
    );
  }

  const {
    data: genre,
    error,
  } = await supabase
    .from("genres")
    .insert({
      name,
      slug,
      parent_genre_id:
        parentGenreId || null,
      description:
        description || null,
      active,
    })
    .select("id")
    .single();

  if (error || !genre) {
    throw new Error(
      error?.message ??
        "Unable to create genre."
    );
  }

  redirect(
    `/admin/genres/${genre.id}`
  );
}

export default async function NewGenrePage() {
  const supabase =
    await requireContentManager();

  const {
    data: genres,
    error,
  } = await supabase
    .from("genres")
    .select(
      `
      id,
      name,
      slug,
      active
      `
    )
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      {/* HEADER */}

      <header className="border-b-2 border-black px-6 py-5">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/admin/genres"
            className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
          >
            ← Genres
          </Link>

          <h1 className="mt-2 text-3xl font-black uppercase">
            Add Genre
          </h1>

          <p className="mt-2 max-w-xl text-sm text-black/60">
            Add a genre or subgenre used for artist
            classification and atlas filtering.
          </p>
        </div>
      </header>

      {/* FORM */}

      <section className="mx-auto max-w-4xl px-6 py-10">
        <form
          action={createGenre}
          className="space-y-10"
        >
          {/* BASIC INFORMATION */}

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Genre Information
            </h2>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Genre Name
                </span>

                <input
                  name="name"
                  required
                  placeholder="Noise Rock"
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
                  placeholder="noise-rock"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>
            </div>

            <label className="mt-6 block">
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Parent Genre
              </span>

              <select
                name="parent_genre_id"
                defaultValue=""
                className="mt-2 w-full border-2 border-black px-3 py-2"
              >
                <option value="">
                  No parent genre
                </option>

                {genres?.map(
                  (genre) => (
                    <option
                      key={genre.id}
                      value={genre.id}
                    >
                      {genre.name}
                      {!genre.active
                        ? " (Inactive)"
                        : ""}
                    </option>
                  )
                )}
              </select>

              <p className="mt-2 text-xs text-black/50">
                Use this for subgenres. For example,
                Garage Rock could have Rock as its parent.
              </p>
            </label>

            <label className="mt-6 block">
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Description
              </span>

              <textarea
                name="description"
                rows={5}
                placeholder="Short editorial description of the genre."
                className="mt-2 w-full border-2 border-black px-3 py-2"
              />
            </label>
          </section>

          {/* STATUS */}

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Status
            </h2>

            <label className="mt-6 flex items-center gap-3">
              <input
                type="checkbox"
                name="active"
                defaultChecked
              />

              <span className="font-bold">
                Active
              </span>
            </label>

            <p className="mt-3 max-w-2xl text-sm text-black/60">
              Active genres can be assigned to artists and
              appear in atlas filtering. Inactive genres remain
              in the database but should not be used for new
              classifications.
            </p>
          </section>

          {/* ACTIONS */}

          <div className="flex flex-wrap justify-end gap-3">
            <Link
              href="/admin/genres"
              className="border-2 border-black bg-white px-5 py-3 text-sm font-bold uppercase"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="border-2 border-black bg-black px-5 py-3 text-sm font-bold uppercase text-white transition-colors hover:bg-white hover:text-black"
            >
              Create Genre
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}