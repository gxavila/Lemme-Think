import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

async function createArtist(formData: FormData) {
  "use server";

  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
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

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();

  const status = String(formData.get("status") ?? "active");
  const artistType = String(formData.get("artist_type") ?? "band");

  const bioShort = String(formData.get("bio_short") ?? "").trim();
  const bioLong = String(formData.get("bio_long") ?? "").trim();

  const yearStartedRaw = String(
    formData.get("year_started") ?? ""
  ).trim();

  const yearEndedRaw = String(
    formData.get("year_ended") ?? ""
  ).trim();

  const locationId = String(
    formData.get("location_id") ?? ""
  ).trim();

  const sceneId = String(
    formData.get("scene_id") ?? ""
  ).trim();

  const genreIds = formData
    .getAll("genre_ids")
    .map((value) => String(value));

  const primaryGenreId = String(
    formData.get("primary_genre_id") ?? ""
  ).trim();

  const published = formData.get("published") === "on";
  const featured = formData.get("featured") === "on";

  if (!name || !slug) {
    throw new Error("Artist name and slug are required.");
  }

  // ============================================
  // CREATE ARTIST
  // ============================================

  const { data: artist, error: artistError } = await supabase
    .from("artists")
    .insert({
      name,
      slug,
      status,
      artist_type: artistType,
      bio_short: bioShort || null,
      bio_long: bioLong || null,
      year_started: yearStartedRaw
        ? Number(yearStartedRaw)
        : null,
      year_ended: yearEndedRaw
        ? Number(yearEndedRaw)
        : null,
      published,
      featured,
    })
    .select("id")
    .single();

  if (artistError || !artist) {
    throw new Error(
      artistError?.message ?? "Unable to create artist."
    );
  }

  // ============================================
  // PRIMARY LOCATION
  // ============================================

  if (locationId) {
    const { error } = await supabase
      .from("artist_locations")
      .insert({
        artist_id: artist.id,
        location_id: locationId,
        relationship: "based_in",
        is_primary: true,
      });

    if (error) {
      throw new Error(error.message);
    }
  }

  // ============================================
  // PRIMARY SCENE
  // ============================================

  if (sceneId) {
    const { error } = await supabase
      .from("artist_scenes")
      .insert({
        artist_id: artist.id,
        scene_id: sceneId,
        is_primary: true,
      });

    if (error) {
      throw new Error(error.message);
    }
  }

  // ============================================
  // GENRES
  // ============================================

  if (genreIds.length > 0) {
    const genreRows = genreIds.map((genreId) => ({
      artist_id: artist.id,
      genre_id: genreId,
      is_primary: genreId === primaryGenreId,
    }));

    const { error } = await supabase
      .from("artist_genres")
      .insert(genreRows);

    if (error) {
      throw new Error(error.message);
    }
  }

  redirect("/admin/artists");
}

export default async function NewArtistPage() {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
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

  const { data: locations } = await supabase
    .from("locations")
    .select("id, name, city, region, country")
    .order("name");

  const { data: scenes } = await supabase
    .from("scenes")
    .select("id, name")
    .order("name");

  const { data: genres } = await supabase
    .from("genres")
    .select("id, name, slug")
    .eq("active", true)
    .order("name");

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      <header className="border-b-2 border-black px-6 py-5">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <Link
              href="/admin/artists"
              className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
            >
              ← Artists
            </Link>

            <h1 className="mt-2 text-3xl font-black uppercase">
              Add Artist
            </h1>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-10">
        <form action={createArtist} className="space-y-10">
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
                  placeholder="artist-name"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Status
                </span>

                <select
                  name="status"
                  defaultValue="active"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="hiatus">Hiatus</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Artist Type
                </span>

                <select
                  name="artist_type"
                  defaultValue="band"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                >
                  <option value="band">Band</option>
                  <option value="solo">Solo</option>
                  <option value="duo">Duo</option>
                  <option value="collective">Collective</option>
                  <option value="project">Project</option>
                  <option value="other">Other</option>
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
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>
            </div>
          </section>

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
                className="mt-2 w-full border-2 border-black px-3 py-2"
              />
            </label>
          </section>

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Geography
            </h2>

            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Primary Location
                </span>

                <select
                  name="location_id"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                  defaultValue=""
                >
                  <option value="">
                    Select location
                  </option>

                  {locations?.map((location) => (
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
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-bold uppercase tracking-[0.15em]">
                  Primary Scene
                </span>

                <select
                  name="scene_id"
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                  defaultValue=""
                >
                  <option value="">
                    Select scene
                  </option>

                  {scenes?.map((scene) => (
                    <option
                      key={scene.id}
                      value={scene.id}
                    >
                      {scene.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="border-2 border-black bg-white p-6">
            <h2 className="text-xl font-black uppercase">
              Genres
            </h2>

            <p className="mt-2 text-sm">
              Select all that apply, then choose the primary genre.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {genres?.map((genre) => (
                <label
                  key={genre.id}
                  className="flex items-center gap-3 border-2 border-black p-3"
                >
                  <input
                    type="checkbox"
                    name="genre_ids"
                    value={genre.id}
                  />

                  <span className="font-bold">
                    {genre.name}
                  </span>
                </label>
              ))}
            </div>

            <label className="mt-6 block">
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Primary Genre
              </span>

              <select
                name="primary_genre_id"
                defaultValue=""
                className="mt-2 w-full border-2 border-black px-3 py-2"
              >
                <option value="">
                  None
                </option>

                {genres?.map((genre) => (
                  <option
                    key={genre.id}
                    value={genre.id}
                  >
                    {genre.name}
                  </option>
                ))}
              </select>
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
              href="/admin/artists"
              className="border-2 border-black bg-white px-5 py-3 text-sm font-bold uppercase"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="border-2 border-black bg-black px-5 py-3 text-sm font-bold uppercase text-white"
            >
              Create Artist
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}