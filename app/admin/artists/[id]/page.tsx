import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

type EditArtistPageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function requireContentManager() {
  const supabase =
    await createClient();

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
    !["admin", "editor"].includes(
      profile.role
    )
  ) {
    redirect("/");
  }

  return supabase;
}

async function updateArtist(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const artistId = String(
    formData.get("artist_id") ?? ""
  );

  const name = String(
    formData.get("name") ?? ""
  ).trim();

  const slug = String(
    formData.get("slug") ?? ""
  ).trim();

  const status = String(
    formData.get("status") ?? "active"
  );

  const artistType = String(
    formData.get("artist_type") ?? "band"
  );

  const bioShort = String(
    formData.get("bio_short") ?? ""
  ).trim();

  const bioLong = String(
    formData.get("bio_long") ?? ""
  ).trim();

  const yearStartedRaw = String(
    formData.get("year_started") ?? ""
  ).trim();

  const yearEndedRaw = String(
    formData.get("year_ended") ?? ""
  ).trim();

  const locationId = String(
    formData.get("location_id") ?? ""
  );

  // ============================================
  // MULTIPLE SCENES
  // ============================================

  const sceneIds = formData
    .getAll("scene_ids")
    .map((value) => String(value));

  const primarySceneId = String(
    formData.get("primary_scene_id") ?? ""
  );

  // ============================================
  // GENRES
  // ============================================

  const genreIds = formData
    .getAll("genre_ids")
    .map((value) => String(value));

  const primaryGenreId = String(
    formData.get("primary_genre_id") ?? ""
  );

  const published =
    formData.get("published") === "on";

  const featured =
    formData.get("featured") === "on";

  if (
    !artistId ||
    !name ||
    !slug
  ) {
    throw new Error(
      "Artist ID, name, and slug are required."
    );
  }

  // ============================================
  // VALIDATE PRIMARY SCENE
  // ============================================

  if (
    primarySceneId &&
    !sceneIds.includes(primarySceneId)
  ) {
    throw new Error(
      "The primary scene must also be selected as an associated scene."
    );
  }

  // ============================================
  // VALIDATE PRIMARY GENRE
  // ============================================

  if (
    primaryGenreId &&
    !genreIds.includes(primaryGenreId)
  ) {
    throw new Error(
      "The primary genre must also be selected as an artist genre."
    );
  }

  // ============================================
  // UPDATE ARTIST
  // ============================================

  const {
    error: artistError,
  } = await supabase
    .from("artists")
    .update({
      name,
      slug,
      status,
      artist_type: artistType,
      bio_short:
        bioShort || null,
      bio_long:
        bioLong || null,
      year_started:
        yearStartedRaw
          ? Number(yearStartedRaw)
          : null,
      year_ended:
        yearEndedRaw
          ? Number(yearEndedRaw)
          : null,
      published,
      featured,
    })
    .eq("id", artistId);

  if (artistError) {
    throw new Error(
      artistError.message
    );
  }

  // ============================================
  // REPLACE PRIMARY LOCATION
  // ============================================

  const {
    error: deleteLocationsError,
  } = await supabase
    .from("artist_locations")
    .delete()
    .eq(
      "artist_id",
      artistId
    );

  if (deleteLocationsError) {
    throw new Error(
      deleteLocationsError.message
    );
  }

  if (locationId) {
    const {
      error: locationError,
    } = await supabase
      .from("artist_locations")
      .insert({
        artist_id: artistId,
        location_id: locationId,
        relationship: "based_in",
        is_primary: true,
      });

    if (locationError) {
      throw new Error(
        locationError.message
      );
    }
  }

  // ============================================
  // REPLACE SCENE RELATIONSHIPS
  // ============================================

  const {
    error: deleteScenesError,
  } = await supabase
    .from("artist_scenes")
    .delete()
    .eq(
      "artist_id",
      artistId
    );

  if (deleteScenesError) {
    throw new Error(
      deleteScenesError.message
    );
  }

  if (sceneIds.length > 0) {
    const sceneRows =
      sceneIds.map(
        (sceneId) => ({
          artist_id: artistId,
          scene_id: sceneId,
          is_primary:
            sceneId ===
            primarySceneId,
        })
      );

    const {
      error: scenesError,
    } = await supabase
      .from("artist_scenes")
      .insert(sceneRows);

    if (scenesError) {
      throw new Error(
        scenesError.message
      );
    }
  }

  // ============================================
  // REPLACE GENRES
  // ============================================

  const {
    error: deleteGenresError,
  } = await supabase
    .from("artist_genres")
    .delete()
    .eq(
      "artist_id",
      artistId
    );

  if (deleteGenresError) {
    throw new Error(
      deleteGenresError.message
    );
  }

  if (genreIds.length > 0) {
    const genreRows =
      genreIds.map(
        (genreId) => ({
          artist_id: artistId,
          genre_id: genreId,
          is_primary:
            genreId ===
            primaryGenreId,
        })
      );

    const {
      error: genresError,
    } = await supabase
      .from("artist_genres")
      .insert(genreRows);

    if (genresError) {
      throw new Error(
        genresError.message
      );
    }
  }

  redirect(
    `/admin/artists/${artistId}`
  );
}

async function deleteArtist(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const artistId = String(
    formData.get("artist_id") ?? ""
  );

  const artistName = String(
    formData.get("artist_name") ?? ""
  );

  const confirmation = String(
    formData.get(
      "delete_confirmation"
    ) ?? ""
  ).trim();

  if (!artistId) {
    throw new Error(
      "Artist ID is missing."
    );
  }

  if (
    confirmation !==
    artistName
  ) {
    throw new Error(
      "Artist name confirmation does not match."
    );
  }

  const { error } =
    await supabase
      .from("artists")
      .delete()
      .eq(
        "id",
        artistId
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  redirect(
    "/admin/artists"
  );
}

export default async function EditArtistPage({
  params,
}: EditArtistPageProps) {
  const { id } =
    await params;

  const supabase =
    await requireContentManager();

  // ============================================
  // ARTIST
  // ============================================

  const {
    data: artist,
    error: artistError,
  } = await supabase
    .from("artists")
    .select(
      `
      id,
      name,
      slug,
      bio_short,
      bio_long,
      year_started,
      year_ended,
      status,
      artist_type,
      published,
      featured
      `
    )
    .eq(
      "id",
      id
    )
    .single();

  if (
    artistError ||
    !artist
  ) {
    notFound();
  }

  // ============================================
  // CURRENT LOCATION
  // ============================================

  const {
    data: artistLocation,
  } = await supabase
    .from(
      "artist_locations"
    )
    .select(
      "location_id"
    )
    .eq(
      "artist_id",
      id
    )
    .eq(
      "is_primary",
      true
    )
    .maybeSingle();

  // ============================================
  // CURRENT SCENES
  // ============================================

  const {
    data: artistScenes,
    error: artistScenesError,
  } = await supabase
    .from(
      "artist_scenes"
    )
    .select(
      `
      scene_id,
      is_primary
      `
    )
    .eq(
      "artist_id",
      id
    );

  if (artistScenesError) {
    throw new Error(
      artistScenesError.message
    );
  }

  const selectedSceneIds =
    artistScenes?.map(
      (scene) =>
        scene.scene_id
    ) ?? [];

  const primarySceneId =
    artistScenes?.find(
      (scene) =>
        scene.is_primary
    )?.scene_id ?? "";

  // ============================================
  // CURRENT GENRES
  // ============================================

  const {
    data: artistGenres,
  } = await supabase
    .from(
      "artist_genres"
    )
    .select(
      `
      genre_id,
      is_primary
      `
    )
    .eq(
      "artist_id",
      id
    );

  const selectedGenreIds =
    artistGenres?.map(
      (genre) =>
        genre.genre_id
    ) ?? [];

  const primaryGenreId =
    artistGenres?.find(
      (genre) =>
        genre.is_primary
    )?.genre_id ?? "";

  // ============================================
  // LOCATIONS
  // ============================================

  const {
    data: locations,
  } = await supabase
    .from("locations")
    .select(
      `
      id,
      name,
      city,
      region,
      country
      `
    )
    .order("name");

  // ============================================
  // SCENES
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
      location_id,
      published
      `
    )
    .order("name");

  if (scenesError) {
    throw new Error(
      scenesError.message
    );
  }

  // ============================================
  // GENRES
  // ============================================

  const {
    data: genres,
  } = await supabase
    .from("genres")
    .select(
      `
      id,
      name,
      slug
      `
    )
    .eq(
      "active",
      true
    )
    .order("name");

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      {/* ========================================
          HEADER
      ======================================== */}

      <header className="border-b-2 border-black px-6 py-5">
        <div className="mx-auto flex max-w-4xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/admin/artists"
              className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
            >
              ← Artists
            </Link>

            <h1 className="mt-2 text-3xl font-black uppercase">
              Edit{" "}
              {artist.name}
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/artists/${artist.id}/links`}
              className="border-2 border-black bg-white px-3 py-2 text-xs font-bold uppercase transition-colors hover:bg-black hover:text-white"
            >
              Manage Links
            </Link>

            <Link
              href={`/admin/artists/${artist.id}/images`}
              className="border-2 border-black bg-white px-3 py-2 text-xs font-bold uppercase transition-colors hover:bg-black hover:text-white"
            >
              Manage Images
            </Link>

            <Link
              href={`/admin/artists/${artist.id}/releases`}
              className="border-2 border-black bg-white px-3 py-2 text-xs font-bold uppercase transition-colors hover:bg-black hover:text-white"
            >
              Manage Music
            </Link>

            {artist.published && (
              <Link
                href={`/artists/${artist.slug}`}
                className="border-2 border-black bg-black px-3 py-2 text-xs font-bold uppercase text-white transition-colors hover:bg-white hover:text-black"
              >
                View Artist →
              </Link>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-10">
        <form
          action={
            updateArtist
          }
          className="space-y-10"
        >
          <input
            type="hidden"
            name="artist_id"
            value={
              artist.id
            }
          />

          {/* ==================================
              BASIC INFORMATION
          ================================== */}

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Basic Information
            </h2>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Artist Name
                </span>

                <input
                  name="name"
                  required
                  defaultValue={
                    artist.name
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
                    artist.slug
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Status
                </span>

                <select
                  name="status"
                  defaultValue={
                    artist.status
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                >
                  <option value="active">
                    Active
                  </option>

                  <option value="inactive">
                    Inactive
                  </option>

                  <option value="hiatus">
                    Hiatus
                  </option>

                  <option value="unknown">
                    Unknown
                  </option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Artist Type
                </span>

                <select
                  name="artist_type"
                  defaultValue={
                    artist.artist_type ??
                    "band"
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                >
                  <option value="band">
                    Band
                  </option>

                  <option value="solo">
                    Solo
                  </option>

                  <option value="duo">
                    Duo
                  </option>

                  <option value="collective">
                    Collective
                  </option>

                  <option value="project">
                    Project
                  </option>

                  <option value="other">
                    Other
                  </option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Year Started
                </span>

                <input
                  name="year_started"
                  type="number"
                  min="1900"
                  max="2100"
                  defaultValue={
                    artist.year_started ??
                    ""
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Year Ended
                </span>

                <input
                  name="year_ended"
                  type="number"
                  min="1900"
                  max="2100"
                  defaultValue={
                    artist.year_ended ??
                    ""
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>
            </div>
          </section>

          {/* ==================================
              BIOGRAPHY
          ================================== */}

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Biography
            </h2>

            <label className="mt-6 block">
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Short Bio
              </span>

              <textarea
                name="bio_short"
                rows={3}
                defaultValue={
                  artist.bio_short ??
                  ""
                }
                className="mt-2 w-full border-2 border-black px-3 py-2"
              />
            </label>

            <label className="mt-6 block">
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Long Bio
              </span>

              <textarea
                name="bio_long"
                rows={8}
                defaultValue={
                  artist.bio_long ??
                  ""
                }
                className="mt-2 w-full border-2 border-black px-3 py-2"
              />
            </label>
          </section>

          {/* ==================================
              LOCATION
          ================================== */}

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Location
            </h2>

            <p className="mt-2 text-sm text-black/60">
              The primary location controls where the artist appears on the map.
            </p>

            <label className="mt-6 block">
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Primary Location
              </span>

              <select
                name="location_id"
                defaultValue={
                  artistLocation?.location_id ??
                  ""
                }
                className="mt-2 w-full border-2 border-black px-3 py-2"
              >
                <option value="">
                  No location
                </option>

                {locations?.map(
                  (location) => (
                    <option
                      key={
                        location.id
                      }
                      value={
                        location.id
                      }
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
          </section>

          {/* ==================================
              SCENES
          ================================== */}

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Scenes
            </h2>

            <p className="mt-2 text-sm text-black/60">
              An artist can belong to multiple scenes. Select all that apply and designate one primary scene.
            </p>

            {!scenes?.length ? (
              <p className="mt-6 text-sm text-black/60">
                No scenes available.
              </p>
            ) : (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {scenes.map(
                  (scene) => (
                    <label
                      key={
                        scene.id
                      }
                      className="flex items-center gap-3 border-2 border-black p-3"
                    >
                      <input
                        type="checkbox"
                        name="scene_ids"
                        value={
                          scene.id
                        }
                        defaultChecked={selectedSceneIds.includes(
                          scene.id
                        )}
                      />

                      <span className="font-bold">
                        {scene.name}

                        {!scene.published && (
                          <span className="ml-2 text-xs font-normal uppercase text-black/50">
                            Draft
                          </span>
                        )}
                      </span>
                    </label>
                  )
                )}
              </div>
            )}

            <label className="mt-6 block">
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Primary Scene
              </span>

              <select
                name="primary_scene_id"
                defaultValue={
                  primarySceneId
                }
                className="mt-2 w-full border-2 border-black px-3 py-2"
              >
                <option value="">
                  None
                </option>

                {scenes?.map(
                  (scene) => (
                    <option
                      key={
                        scene.id
                      }
                      value={
                        scene.id
                      }
                    >
                      {scene.name}
                    </option>
                  )
                )}
              </select>
            </label>

            <p className="mt-2 text-xs text-black/55">
              The primary scene should also be selected above.
            </p>
          </section>

          {/* ==================================
              GENRES
          ================================== */}

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Genres
            </h2>

            <p className="mt-2 text-sm text-black/65">
              Select all genres that apply, then choose one primary genre.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {genres?.map(
                (genre) => (
                  <label
                    key={
                      genre.id
                    }
                    className="flex items-center gap-3 border-2 border-black p-3"
                  >
                    <input
                      type="checkbox"
                      name="genre_ids"
                      value={
                        genre.id
                      }
                      defaultChecked={selectedGenreIds.includes(
                        genre.id
                      )}
                    />

                    <span className="font-bold">
                      {
                        genre.name
                      }
                    </span>
                  </label>
                )
              )}
            </div>

            <label className="mt-6 block">
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Primary Genre
              </span>

              <select
                name="primary_genre_id"
                defaultValue={
                  primaryGenreId
                }
                className="mt-2 w-full border-2 border-black px-3 py-2"
              >
                <option value="">
                  None
                </option>

                {genres?.map(
                  (genre) => (
                    <option
                      key={
                        genre.id
                      }
                      value={
                        genre.id
                      }
                    >
                      {
                        genre.name
                      }
                    </option>
                  )
                )}
              </select>
            </label>
          </section>

          {/* ==================================
              PUBLISHING
          ================================== */}

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
                    artist.published
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
                    artist.featured
                  }
                />

                <span className="font-bold">
                  Featured
                </span>
              </label>
            </div>
          </section>

          <div className="flex flex-wrap justify-end gap-3">
            <Link
              href="/admin/artists"
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

        {/* ======================================
            DELETE ARTIST
        ====================================== */}

        <section className="mt-16 border-2 border-red-700 bg-white p-6">
          <h2 className="text-xl font-black uppercase text-red-700">
            Delete Artist
          </h2>

          <p className="mt-3 max-w-2xl text-sm">
            Permanently deleting this artist will remove the artist and related records from the database.
          </p>

          <p className="mt-4 text-sm font-bold">
            Type{" "}
            <span className="font-black">
              {artist.name}
            </span>{" "}
            exactly to confirm.
          </p>

          <form
            action={
              deleteArtist
            }
            className="mt-5"
          >
            <input
              type="hidden"
              name="artist_id"
              value={
                artist.id
              }
            />

            <input
              type="hidden"
              name="artist_name"
              value={
                artist.name
              }
            />

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Confirm Artist Name
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
              Permanently Delete Artist
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}