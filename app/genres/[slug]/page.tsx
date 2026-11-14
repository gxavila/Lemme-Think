import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import UndergroundAtlasHeader from "@/components/UndergroundAtlasHeader";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type TrackLink = {
  platform: string;
  url: string;
  label: string | null;
};

type EssentialTrack = {
  playlist_id: string;
  playlist_name: string;
  playlist_slug: string;
  playlist_description: string | null;
  playlist_position: number;
  editorial_note: string | null;
  track_id: string;
  track_title: string;
  track_number: number | null;
  duration_seconds: number | null;
  recommendation_type: string | null;
  featured: boolean | null;
  release_id: string | null;
  release_title: string | null;
  release_cover_image_path: string | null;
  artist_id: string;
  artist_name: string;
  artist_slug: string;
  location_name: string | null;
  location_city: string | null;
  location_region: string | null;
  location_country: string | null;
  latitude: number | null;
  longitude: number | null;
  links: TrackLink[] | null;
};

type GenreArtist = {
  id: string;
  name: string;
  slug: string;
  bio_short: string | null;
  status: string | null;
  year_started: number | null;
  image_url: string | null;
  location_label: string | null;
};

function formatDuration(seconds: number | null) {
  if (seconds == null || Number.isNaN(seconds)) return null;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function formatLocation(
  city: string | null,
  region: string | null,
  country: string | null,
  fallback: string | null = null
) {
  const parts = [city, region, country].filter(Boolean);
  return parts.length ? [...new Set(parts)].join(", ") : fallback;
}

function platformLabel(platform: string, label: string | null) {
  if (label) return label;
  const normalized = platform.trim().toLowerCase();
  const known: Record<string, string> = {
    spotify: "Spotify",
    bandcamp: "Bandcamp",
    youtube: "YouTube",
    soundcloud: "SoundCloud",
    apple_music: "Apple Music",
    "apple-music": "Apple Music",
    applemusic: "Apple Music",
  };
  return known[normalized] ?? platform;
}

function imageUrl(
  supabaseUrl: string,
  storagePath: string | null
) {
  if (!storagePath) return null;
  if (
    storagePath.startsWith("http://") ||
    storagePath.startsWith("https://")
  ) {
    return storagePath;
  }
  return `${supabaseUrl}/storage/v1/object/public/artist-images/${storagePath}`;
}

async function getGenre(slug: string) {
  const supabase = await createClient();

  const { data: genre, error } = await supabase
    .from("genres")
    .select(`
      id,
      name,
      slug,
      active
    `)
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return genre;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const genre = await getGenre(slug);

  if (!genre) {
    return {
      title: "Genre Not Found | Underground Atlas",
    };
  }

  const title = `${genre.name} | Underground Atlas`;
  const description =
    `Explore essential ${genre.name} tracks, artists, and scenes from across the Underground Atlas.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/genres/${genre.slug}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `/genres/${genre.slug}`,
    },
  };
}

export default async function GenrePage({
  params,
}: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const genre = await getGenre(slug);

  if (!genre) {
    notFound();
  }

  const [playlistResult, artistGenreResult] =
    await Promise.all([
      supabase.rpc("get_genre_essential_playlist", {
        genre_slug: genre.slug,
      }),
      supabase
        .from("artist_genres")
        .select(`
          artist_id,
          is_primary
        `)
        .eq("genre_id", genre.id),
    ]);

  if (playlistResult.error) {
    throw new Error(playlistResult.error.message);
  }

  if (artistGenreResult.error) {
    throw new Error(artistGenreResult.error.message);
  }

  const essentialTracks =
    (playlistResult.data ?? []) as EssentialTrack[];

  const artistGenreRows = artistGenreResult.data ?? [];
  const artistIds = [
    ...new Set(artistGenreRows.map((row) => row.artist_id)),
  ];

  let artists: GenreArtist[] = [];

  if (artistIds.length) {
    const [artistsResult, locationsResult, imagesResult] =
      await Promise.all([
        supabase
          .from("artists")
          .select(`
            id,
            name,
            slug,
            bio_short,
            status,
            year_started,
            published
          `)
          .in("id", artistIds)
          .eq("published", true)
          .order("name"),

        supabase
          .from("artist_locations")
          .select(`
            artist_id,
            location_id,
            is_primary
          `)
          .in("artist_id", artistIds)
          .eq("is_primary", true),

        supabase
          .from("artist_images")
          .select(`
            artist_id,
            storage_path,
            image_type,
            sort_order
          `)
          .in("artist_id", artistIds)
          .order("sort_order"),
      ]);

    if (artistsResult.error) throw new Error(artistsResult.error.message);
    if (locationsResult.error) throw new Error(locationsResult.error.message);
    if (imagesResult.error) throw new Error(imagesResult.error.message);

    const artistRows = artistsResult.data ?? [];
    const artistLocationRows = locationsResult.data ?? [];
    const artistImageRows = imagesResult.data ?? [];

    const locationIds = [
      ...new Set(artistLocationRows.map((row) => row.location_id)),
    ];

    const { data: locationRows, error: locationError } =
      locationIds.length
        ? await supabase
            .from("locations")
            .select(`
              id,
              name,
              city,
              region,
              country
            `)
            .in("id", locationIds)
        : { data: [], error: null };

    if (locationError) {
      throw new Error(locationError.message);
    }

    const locationMap = new Map(
      (locationRows ?? []).map((location) => [
        location.id,
        location,
      ])
    );

    const primaryLocationByArtist = new Map(
      artistLocationRows.map((row) => [
        row.artist_id,
        locationMap.get(row.location_id) ?? null,
      ])
    );

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

    artists = artistRows.map((artist) => {
      const location =
        primaryLocationByArtist.get(artist.id);

      const images = artistImageRows.filter(
        (image) => image.artist_id === artist.id
      );

      const preferredImage =
        images.find((image) => image.image_type === "hero") ??
        images.find((image) => image.image_type === "profile") ??
        images[0] ??
        null;

      return {
        id: artist.id,
        name: artist.name,
        slug: artist.slug,
        bio_short: artist.bio_short,
        status: artist.status,
        year_started: artist.year_started,
        image_url: imageUrl(
          supabaseUrl,
          preferredImage?.storage_path ?? null
        ),
        location_label: location
          ? formatLocation(
              location.city,
              location.region,
              location.country,
              location.name
            )
          : null,
      };
    });
  }

  const playlistName =
    essentialTracks[0]?.playlist_name ??
    `Essential ${genre.name}`;

  const playlistDescription =
    essentialTracks[0]?.playlist_description ??
    `A curated selection of essential ${genre.name} tracks from artists in the Atlas.`;

  const mapHref =
    `/?genres=${encodeURIComponent(genre.slug)}`;

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      <UndergroundAtlasHeader
        actionHref={mapHref}
        actionLabel="Explore on Map →"
      />

      <section className="border-b-2 border-black bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-black/45">
            Genre
          </p>

          <h1 className="mt-3 text-5xl font-black uppercase leading-[0.86] tracking-[-0.06em] sm:text-6xl lg:text-8xl">
            {genre.name}
          </h1>

          <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs font-black uppercase tracking-[0.12em]">
            <span>
              {artists.length} {artists.length === 1 ? "Artist" : "Artists"}
            </span>

            <span>
              {essentialTracks.length} Essential{" "}
              {essentialTracks.length === 1 ? "Track" : "Tracks"}
            </span>
          </div>

          <Link
            href={mapHref}
            className="mt-7 inline-flex border-2 border-black bg-black px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-black"
          >
            Explore {genre.name} on the Map →
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <div className="border-b-2 border-black pb-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/45">
                Curated by Underground Atlas
              </p>

              <h2 className="mt-2 text-3xl font-black uppercase tracking-[-0.04em] sm:text-4xl">
                {playlistName}
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-black/65">
                {playlistDescription}
              </p>
            </div>

            {!essentialTracks.length ? (
              <div className="border-b-2 border-black bg-white px-5 py-10">
                <p className="font-black uppercase">
                  Essential Tracks coming soon.
                </p>
              </div>
            ) : (
              <div className="border-b-2 border-black">
                {essentialTracks.map((track) => {
                  const location = formatLocation(
                    track.location_city,
                    track.location_region,
                    track.location_country,
                    track.location_name
                  );

                  const duration =
                    formatDuration(track.duration_seconds);

                  const links = Array.isArray(track.links)
                    ? track.links
                    : [];

                  const coverUrl = imageUrl(
                    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
                    track.release_cover_image_path
                  );

                  const trackMapHref =
                    `/?genres=${encodeURIComponent(
                      genre.slug
                    )}&artist=${encodeURIComponent(
                      track.artist_slug
                    )}`;

                  const canLocate =
                    track.latitude != null &&
                    track.longitude != null;

                  return (
                    <article
                      key={track.track_id}
                      className="grid border-t-2 border-black bg-white first:border-t-0 sm:grid-cols-[72px_96px_minmax(0,1fr)]"
                    >
                      <div className="flex items-center justify-center bg-black p-4 text-2xl font-black text-white">
                        {String(track.playlist_position).padStart(2, "0")}
                      </div>

                      <div className="relative hidden min-h-24 border-r-2 border-black bg-black sm:block">
                        {coverUrl ? (
                          <Image
                            src={coverUrl}
                            alt={track.release_title ?? track.track_title}
                            fill
                            sizes="96px"
                            className="object-contain"
                          />
                        ) : null}
                      </div>

                      <div className="p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-black/45">
                          <Link
                            href={`/artists/${track.artist_slug}`}
                            className="hover:underline"
                          >
                            {track.artist_name}
                          </Link>

                          {location ? ` · ${location}` : ""}
                        </p>

                        <h3 className="mt-1 text-2xl font-black uppercase">
                          {track.track_title}
                        </h3>

                        <div className="mt-2 flex flex-wrap gap-3 text-[10px] font-bold uppercase text-black/45">
                          {track.release_title && (
                            <span>{track.release_title}</span>
                          )}

                          {duration && (
                            <span>{duration}</span>
                          )}
                        </div>

                        {track.editorial_note && (
                          <p className="mt-4 border-l-2 border-black pl-4 text-sm leading-6 text-black/70">
                            {track.editorial_note}
                          </p>
                        )}

                        {(links.length > 0 || canLocate) && (
                          <div className="mt-5 flex flex-wrap gap-2">
                            {canLocate && (
                              <Link
                                href={trackMapHref}
                                className="border-2 border-black bg-black px-3 py-2 text-[10px] font-black uppercase text-white transition-colors hover:bg-white hover:text-black"
                              >
                                Locate on Map →
                              </Link>
                            )}

                            {links.map((link, index) => (
                              <a
                                key={`${track.track_id}-${link.platform}-${index}`}
                                href={link.url}
                                target="_blank"
                                rel="noreferrer"
                                className="border-2 border-black px-3 py-2 text-[10px] font-black uppercase hover:bg-black hover:text-white"
                              >
                                Listen on{" "}
                                {platformLabel(link.platform, link.label)} ↗
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="space-y-5">
            <section className="border-2 border-black bg-black p-5 text-white">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/55">
                About the List
              </p>

              <p className="mt-3 text-sm leading-6 text-white/80">
                Essential Tracks are curated selections, not paid rankings.
              </p>
            </section>

            <section className="border-2 border-black bg-white p-5">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-black/45">
                Geography
              </p>

              <h3 className="mt-2 text-xl font-black uppercase">
                Hear It. Find It.
              </h3>

              <p className="mt-3 text-sm leading-6 text-black/60">
                Use the map to see where {genre.name} artists are based.
              </p>

              <Link
                href={mapHref}
                className="mt-5 inline-flex text-[10px] font-black uppercase hover:underline"
              >
                Open Map →
              </Link>
            </section>
          </aside>
        </div>
      </section>

      <section className="border-t-2 border-black bg-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="flex items-end justify-between border-b-2 border-black pb-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/45">
                In the Atlas
              </p>

              <h2 className="mt-2 text-3xl font-black uppercase sm:text-4xl">
                {genre.name} Artists
              </h2>
            </div>
          </div>

          <div className="grid border-b-2 border-black sm:grid-cols-2 lg:grid-cols-3">
            {artists.map((artist) => (
              <Link
                key={artist.id}
                href={`/artists/${artist.slug}`}
                className="group border-t-2 border-black p-5 hover:bg-black hover:text-white"
              >
                <div className="flex gap-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden border-2 border-black bg-black">
                    {artist.image_url ? (
                      <Image
                        src={artist.image_url}
                        alt={artist.name}
                        fill
                        sizes="80px"
                        className="object-contain"
                      />
                    ) : null}
                  </div>

                  <div>
                    <h3 className="text-lg font-black uppercase">
                      {artist.name}
                    </h3>

                    {artist.location_label && (
                      <p className="mt-1 text-[9px] font-black uppercase opacity-50">
                        {artist.location_label}
                      </p>
                    )}

                    <span className="mt-4 inline-block text-[9px] font-black uppercase">
                      Artist →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
