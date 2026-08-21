import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type ArtistLinksPageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function requireContentManager() {
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

  return supabase;
}

async function addArtistLink(formData: FormData) {
  "use server";

  const supabase = await requireContentManager();

  const artistId = String(formData.get("artist_id") ?? "");
  const platform = String(formData.get("platform") ?? "");
  const url = String(formData.get("url") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const sortOrderRaw = String(formData.get("sort_order") ?? "0");

  if (!artistId || !platform || !url) {
    throw new Error("Artist, platform, and URL are required.");
  }

  const { error } = await supabase
    .from("artist_links")
    .insert({
      artist_id: artistId,
      platform,
      url,
      label: label || null,
      sort_order: Number(sortOrderRaw) || 0,
    });

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/admin/artists/${artistId}/links`);
}

async function deleteArtistLink(formData: FormData) {
  "use server";

  const supabase = await requireContentManager();

  const artistId = String(formData.get("artist_id") ?? "");
  const linkId = String(formData.get("link_id") ?? "");

  if (!artistId || !linkId) {
    throw new Error("Missing artist or link ID.");
  }

  const { error } = await supabase
    .from("artist_links")
    .delete()
    .eq("id", linkId)
    .eq("artist_id", artistId);

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/admin/artists/${artistId}/links`);
}

function formatPlatform(platform: string) {
  return platform
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function ArtistLinksPage({
  params,
}: ArtistLinksPageProps) {
  const { id } = await params;

  const supabase = await requireContentManager();

  const { data: artist, error: artistError } = await supabase
    .from("artists")
    .select("id, name, slug")
    .eq("id", id)
    .single();

  if (artistError || !artist) {
    notFound();
  }

  const { data: links, error: linksError } = await supabase
    .from("artist_links")
    .select(
      `
      id,
      platform,
      url,
      label,
      sort_order
      `
    )
    .eq("artist_id", id)
    .order("sort_order")
    .order("platform");

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      <header className="border-b-2 border-black px-6 py-5">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <Link
              href={`/admin/artists/${artist.id}`}
              className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
            >
              ← Edit Artist
            </Link>

            <h1 className="mt-2 text-3xl font-black uppercase">
              {artist.name} Links
            </h1>
          </div>

          <Link
            href={`/artists/${artist.slug}`}
            className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
          >
            View Artist →
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-10">
        <section className="border-2 border-black bg-white p-6">
          <h2 className="text-xl font-black uppercase">
            Add Link
          </h2>

          <form
            action={addArtistLink}
            className="mt-6 grid gap-6"
          >
            <input
              type="hidden"
              name="artist_id"
              value={artist.id}
            />

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Platform
              </span>

              <select
                name="platform"
                defaultValue="official"
                className="mt-2 w-full border-2 border-black px-3 py-2"
              >
                <option value="official">Official Website</option>
                <option value="spotify">Spotify</option>
                <option value="bandcamp">Bandcamp</option>
                <option value="apple_music">Apple Music</option>
                <option value="youtube">YouTube</option>
                <option value="soundcloud">SoundCloud</option>
                <option value="instagram">Instagram</option>
                <option value="tiktok">TikTok</option>
                <option value="facebook">Facebook</option>
                <option value="bluesky">Bluesky</option>
                <option value="x">X</option>
                <option value="other">Other</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                URL
              </span>

              <input
                type="url"
                name="url"
                required
                placeholder="https://..."
                className="mt-2 w-full border-2 border-black px-3 py-2"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Custom Label
              </span>

              <input
                name="label"
                placeholder="Optional"
                className="mt-2 w-full border-2 border-black px-3 py-2"
              />
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Sort Order
              </span>

              <input
                type="number"
                name="sort_order"
                defaultValue="0"
                className="mt-2 w-full border-2 border-black px-3 py-2"
              />
            </label>

            <div>
              <button
                type="submit"
                className="border-2 border-black bg-black px-5 py-3 text-sm font-bold uppercase text-white"
              >
                Add Link
              </button>
            </div>
          </form>
        </section>

        <section className="mt-10 border-2 border-black bg-white p-6">
          <h2 className="text-xl font-black uppercase">
            Current Links
          </h2>

          {linksError ? (
            <p className="mt-5 text-red-700">
              {linksError.message}
            </p>
          ) : links && links.length > 0 ? (
            <div className="mt-6 space-y-4">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex flex-col gap-4 border-2 border-black p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-black uppercase">
                      {link.label ??
                        formatPlatform(link.platform)}
                    </p>

                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block break-all text-sm underline"
                    >
                      {link.url}
                    </a>

                    <p className="mt-2 text-xs uppercase">
                      Sort: {link.sort_order}
                    </p>
                  </div>

                  <form action={deleteArtistLink}>
                    <input
                      type="hidden"
                      name="artist_id"
                      value={artist.id}
                    />

                    <input
                      type="hidden"
                      name="link_id"
                      value={link.id}
                    />

                    <button
                      type="submit"
                      className="border-2 border-red-700 px-3 py-2 text-xs font-bold uppercase text-red-700"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-black/60">
              No links added yet.
            </p>
          )}
        </section>
      </section>
    </main>
  );
}