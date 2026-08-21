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

async function updateGenre(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const genreId = String(
    formData.get("genre_id") ?? ""
  );

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

  if (!genreId) {
    throw new Error(
      "Genre ID is required."
    );
  }

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

  if (
    parentGenreId &&
    parentGenreId === genreId
  ) {
    throw new Error(
      "A genre cannot be its own parent."
    );
  }

  const { error } = await supabase
    .from("genres")
    .update({
      name,
      slug,
      parent_genre_id:
        parentGenreId || null,
      description:
        description || null,
      active,
    })
    .eq("id", genreId);

  if (error) {
    throw new Error(error.message);
  }

  redirect(
    `/admin/genres/${genreId}`
  );
}

async function deleteGenre(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const genreId = String(
    formData.get("genre_id") ?? ""
  );

  const genreName = String(
    formData.get("genre_name") ?? ""
  );

  const confirmation = String(
    formData.get(
      "delete_confirmation"
    ) ?? ""
  ).trim();

  if (!genreId) {
    throw new Error(
      "Genre ID is missing."
    );
  }

  if (
    confirmation !== genreName
  ) {
    throw new Error(
      "Genre name confirmation does not match."
    );
  }

  const {
    count: artistCount,
    error: artistCountError,
  } = await supabase
    .from("artist_genres")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq(
      "genre_id",
      genreId
    );

  if (artistCountError) {
    throw new Error(
      artistCountError.message
    );
  }

  const {
    count: childGenreCount,
    error: childGenreCountError,
  } = await supabase
    .from("genres")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq(
      "parent_genre_id",
      genreId
    );

  if (childGenreCountError) {
    throw new Error(
      childGenreCountError.message
    );
  }

  if (
    (artistCount ?? 0) > 0 ||
    (childGenreCount ?? 0) > 0
  ) {
    throw new Error(
      "This genre cannot be deleted because artists or child genres still depend on it."
    );
  }

  const { error } = await supabase
    .from("genres")
    .delete()
    .eq(
      "id",
      genreId
    );

  if (error) {
    throw new Error(error.message);
  }

  redirect("/admin/genres");
}

export default async function EditGenrePage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase =
    await requireContentManager();

  const {
    data: genre,
    error: genreError,
  } = await supabase
    .from("genres")
    .select(
      `
      id,
      name,
      slug,
      parent_genre_id,
      description,
      active,
      created_at,
      updated_at
      `
    )
    .eq("id", id)
    .single();

  if (
    genreError ||
    !genre
  ) {
    notFound();
  }

  const {
    data: genres,
    error: genresError,
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
    .neq("id", id)
    .order("name");

  if (genresError) {
    throw new Error(
      genresError.message
    );
  }

  const {
    data: artistGenreRows,
    error: artistGenreRowsError,
  } = await supabase
    .from("artist_genres")
    .select(
      `
      artist_id,
      is_primary
      `
    )
    .eq(
      "genre_id",
      id
    );

  if (artistGenreRowsError) {
    throw new Error(
      artistGenreRowsError.message
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

  if (artistGenreRows?.length) {
    const artistIds =
      artistGenreRows.map(
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

  const {
    data: childGenres,
    error: childGenresError,
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
    .eq(
      "parent_genre_id",
      id
    )
    .order("name");

  if (childGenresError) {
    throw new Error(
      childGenresError.message
    );
  }

  const hasDependencies =
    (artists?.length ?? 0) > 0 ||
    (childGenres?.length ?? 0) > 0;

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      {/* HEADER */}

      <header className="border-b-2 border-black px-6 py-5">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin/genres"
              className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
            >
              ← Genres
            </Link>

            <h1 className="mt-2 text-3xl font-black uppercase">
              Edit {genre.name}
            </h1>
          </div>

          <span
            className={
              genre.active
                ? "border-2 border-black bg-black px-3 py-2 text-xs font-black uppercase text-white"
                : "border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase text-black/50"
            }
          >
            {genre.active
              ? "Active"
              : "Inactive"}
          </span>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-10">
        {/* EDIT FORM */}

        <form
          action={updateGenre}
          className="space-y-10"
        >
          <input
            type="hidden"
            name="genre_id"
            value={genre.id}
          />

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
                  defaultValue={
                    genre.name
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
                    genre.slug
                  }
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
                defaultValue={
                  genre.parent_genre_id ??
                  ""
                }
                className="mt-2 w-full border-2 border-black px-3 py-2"
              >
                <option value="">
                  No parent genre
                </option>

                {genres?.map(
                  (parentGenre) => (
                    <option
                      key={
                        parentGenre.id
                      }
                      value={
                        parentGenre.id
                      }
                    >
                      {parentGenre.name}
                      {!parentGenre.active
                        ? " (Inactive)"
                        : ""}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="mt-6 block">
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Description
              </span>

              <textarea
                name="description"
                rows={5}
                defaultValue={
                  genre.description ??
                  ""
                }
                className="mt-2 w-full border-2 border-black px-3 py-2"
              />
            </label>
          </section>

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Status
            </h2>

            <label className="mt-6 flex items-center gap-3">
              <input
                type="checkbox"
                name="active"
                defaultChecked={
                  genre.active
                }
              />

              <span className="font-bold">
                Active
              </span>
            </label>

            <p className="mt-3 text-sm text-black/60">
              Inactive genres remain attached to existing
              artists but are not shown as available choices
              for new artist classifications.
            </p>
          </section>

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
              Save Changes
            </button>
          </div>
        </form>

        {/* ARTISTS */}

        <section className="mt-14 border-2 border-black bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black uppercase">
              Artists Using this Genre
            </h2>

            <span className="border-2 border-black px-2 py-1 text-xs font-black">
              {artists?.length ?? 0}
            </span>
          </div>

          {!artists?.length ? (
            <p className="mt-5 text-sm text-black/60">
              No artists currently use this genre.
            </p>
          ) : (
            <div className="mt-6 divide-y-2 divide-black border-y-2 border-black">
              {artists.map(
                (artist) => {
                  const relationship =
                    artistGenreRows?.find(
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

                          {relationship?.is_primary && (
                            <span>
                              • Primary Genre
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

        {/* CHILD GENRES */}

        <section className="mt-8 border-2 border-black bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black uppercase">
              Child Genres
            </h2>

            <span className="border-2 border-black px-2 py-1 text-xs font-black">
              {childGenres?.length ?? 0}
            </span>
          </div>

          {!childGenres?.length ? (
            <p className="mt-5 text-sm text-black/60">
              No genres currently use this genre as their parent.
            </p>
          ) : (
            <div className="mt-6 divide-y-2 divide-black border-y-2 border-black">
              {childGenres.map(
                (childGenre) => (
                  <div
                    key={childGenre.id}
                    className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-black uppercase">
                        {childGenre.name}
                      </p>

                      <p className="mt-1 text-xs font-bold uppercase text-black/50">
                        {childGenre.active
                          ? "Active"
                          : "Inactive"}
                      </p>
                    </div>

                    <Link
                      href={`/admin/genres/${childGenre.id}`}
                      className="border-2 border-black px-3 py-2 text-xs font-black uppercase transition-colors hover:bg-black hover:text-white"
                    >
                      Edit Genre
                    </Link>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {/* DELETE */}

        <section className="mt-14 border-2 border-red-700 bg-white p-6">
          <h2 className="text-xl font-black uppercase text-red-700">
            Delete Genre
          </h2>

          {hasDependencies ? (
            <>
              <p className="mt-3 text-sm">
                This genre cannot currently be deleted because
                artists or child genres still depend on it.
              </p>

              <div className="mt-5 border-2 border-red-700 bg-red-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.15em] text-red-700">
                  Genre in use
                </p>

                <p className="mt-2 text-sm">
                  If the genre should no longer be used, uncheck
                  Active instead of deleting it.
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm">
                This permanently deletes the genre.
              </p>

              <p className="mt-4 text-sm font-bold">
                Type{" "}
                <span className="font-black">
                  {genre.name}
                </span>{" "}
                exactly to confirm.
              </p>

              <form
                action={deleteGenre}
                className="mt-5"
              >
                <input
                  type="hidden"
                  name="genre_id"
                  value={genre.id}
                />

                <input
                  type="hidden"
                  name="genre_name"
                  value={genre.name}
                />

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.15em]">
                    Confirm Genre Name
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
                  Permanently Delete Genre
                </button>
              </form>
            </>
          )}
        </section>
      </section>
    </main>
  );
}