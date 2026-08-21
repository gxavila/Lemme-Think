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
    trackId: string;
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

async function addTrackLink(formData: FormData) {
  "use server";

  const supabase =
    await requireContentManager();

  const artistId = String(
    formData.get("artist_id") ?? ""
  );

  const trackId = String(
    formData.get("track_id") ?? ""
  );

  const platform = String(
    formData.get("platform") ?? ""
  );

  const url = String(
    formData.get("url") ?? ""
  ).trim();

  const label = String(
    formData.get("label") ?? ""
  ).trim();

  if (!artistId || !trackId || !platform || !url) {
    throw new Error(
      "Track, platform, and URL are required."
    );
  }

  const { error } = await supabase
    .from("track_links")
    .insert({
      track_id: trackId,
      platform,
      url,
      label: label || null,
      sort_order: 0,
    });

  if (error) {
    throw new Error(error.message);
  }

  redirect(
    `/admin/artists/${artistId}/tracks/${trackId}`
  );
}

async function deleteTrackLink(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const artistId = String(
    formData.get("artist_id") ?? ""
  );

  const trackId = String(
    formData.get("track_id") ?? ""
  );

  const linkId = String(
    formData.get("link_id") ?? ""
  );

  const { error } = await supabase
    .from("track_links")
    .delete()
    .eq("id", linkId)
    .eq("track_id", trackId);

  if (error) {
    throw new Error(error.message);
  }

  redirect(
    `/admin/artists/${artistId}/tracks/${trackId}`
  );
}

export default async function TrackPage({
  params,
}: PageProps) {
  const { id, trackId } = await params;

  const supabase =
    await requireContentManager();

  const { data: artist } =
    await supabase
      .from("artists")
      .select("id, name")
      .eq("id", id)
      .single();

  if (!artist) {
    notFound();
  }

  const {
    data: track,
    error: trackError,
  } = await supabase
    .from("tracks")
    .select(
      `
      id,
      title,
      release_id
      `
    )
    .eq("id", trackId)
    .eq("artist_id", id)
    .single();

  if (trackError || !track) {
    notFound();
  }

  const { data: links } =
    await supabase
      .from("track_links")
      .select(
        `
        id,
        platform,
        url,
        label,
        sort_order
        `
      )
      .eq("track_id", trackId)
      .order("sort_order");

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      <header className="border-b-2 border-black px-6 py-5">
        <div className="mx-auto max-w-4xl">
          {track.release_id ? (
            <Link
              href={`/admin/artists/${artist.id}/releases/${track.release_id}`}
              className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
            >
              ← Release
            </Link>
          ) : (
            <Link
              href={`/admin/artists/${artist.id}`}
              className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
            >
              ← Artist
            </Link>
          )}

          <h1 className="mt-2 text-3xl font-black uppercase">
            {track.title}
          </h1>

          <p className="mt-1 text-xs font-bold uppercase">
            {artist.name}
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-4xl space-y-10 px-6 py-10">
        <section className="border-2 border-black bg-white p-6">
          <h2 className="text-xl font-black uppercase">
            Add Track Link
          </h2>

          <form
            action={addTrackLink}
            className="mt-6 grid gap-5 sm:grid-cols-2"
          >
            <input
              type="hidden"
              name="artist_id"
              value={artist.id}
            />

            <input
              type="hidden"
              name="track_id"
              value={track.id}
            />

            <select
              name="platform"
              defaultValue="bandcamp"
              className="border-2 border-black px-3 py-2"
            >
              <option value="spotify">
                Spotify
              </option>

              <option value="bandcamp">
                Bandcamp
              </option>

              <option value="apple_music">
                Apple Music
              </option>

              <option value="youtube">
                YouTube
              </option>

              <option value="soundcloud">
                SoundCloud
              </option>

              <option value="official">
                Official
              </option>

              <option value="other">
                Other
              </option>
            </select>

            <input
              type="url"
              name="url"
              required
              placeholder="https://..."
              className="border-2 border-black px-3 py-2"
            />

            <input
              name="label"
              placeholder="Optional label"
              className="border-2 border-black px-3 py-2"
            />

            <button
              type="submit"
              className="border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white"
            >
              Add Link
            </button>
          </form>
        </section>

        <section className="border-2 border-black bg-white p-6">
          <h2 className="text-xl font-black uppercase">
            Current Links
          </h2>

          {!links?.length ? (
            <p className="mt-5 text-black/60">
              No track links added yet.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex flex-col justify-between gap-3 border-2 border-black p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-black uppercase">
                      {link.label ??
                        link.platform.replaceAll(
                          "_",
                          " "
                        )}
                    </p>

                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-sm underline"
                    >
                      {link.url}
                    </a>
                  </div>

                  <form
                    action={deleteTrackLink}
                  >
                    <input
                      type="hidden"
                      name="artist_id"
                      value={artist.id}
                    />

                    <input
                      type="hidden"
                      name="track_id"
                      value={track.id}
                    />

                    <input
                      type="hidden"
                      name="link_id"
                      value={link.id}
                    />

                    <button
                      className="border-2 border-red-700 px-3 py-2 text-xs font-bold uppercase text-red-700"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}