import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

type ScenePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type SceneArtist = {
  id: string;
  name: string;
  slug: string;
  bio_short:
    | string
    | null;
  status:
    | string
    | null;
  artist_type:
    | string
    | null;
  year_started:
    | number
    | null;
  year_ended:
    | number
    | null;
  is_primary_scene: boolean;

  genres: {
    id: string;
    name: string;
    slug: string;
    is_primary: boolean;
  }[];

  location: {
    id: string;
    name: string;

    city:
      | string
      | null;

    region:
      | string
      | null;

    country: string;
  } | null;

  image_url:
    | string
    | null;
};

type SceneVenue = {
  id: string;
  name: string;
  slug: string;

  address_line_1:
    | string
    | null;

  address_line_2:
    | string
    | null;

  postal_code:
    | string
    | null;

  website_url:
    | string
    | null;

  active: boolean;

  upcoming_event_count:
    number;

  next_event:
    | {
        id: string;
        title: string;
        slug: string;
        start_at: string;

        timezone:
          | string
          | null;

        status:
          | string
          | null;
      }
    | null;
};

function formatEventDate(
  value: string,
  timezone: string
) {
  try {
    return new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          timezone,

        month:
          "short",

        day:
          "numeric",

        year:
          "numeric",
      }
    ).format(
      new Date(
        value
      )
    );
  } catch {
    return new Intl.DateTimeFormat(
      "en-US",
      {
        month:
          "short",

        day:
          "numeric",

        year:
          "numeric",
      }
    ).format(
      new Date(
        value
      )
    );
  }
}

export default async function ScenePage({
  params,
}: ScenePageProps) {
  const {
    slug,
  } =
    await params;

  const supabase =
    await createClient();

  // ============================================
  // SCENE
  // ============================================

  const {
    data: scene,
    error: sceneError,
  } = await supabase
    .from(
      "scenes"
    )
    .select(
      `
      id,
      name,
      slug,
      tagline,
      description_short,
      description_long,
      hero_image_url,
      hero_image_path,
      hero_position_x,
      hero_position_y,
      featured,
      published,
      location_id
      `
    )
    .eq(
      "slug",
      slug
    )
    .eq(
      "published",
      true
    )
    .single();

  if (
    sceneError ||
    !scene
  ) {
    notFound();
  }

  // ============================================
  // SCENE HERO IMAGE
  // ============================================

  let sceneHeroUrl:
    | string
    | null = null;

  if (
    scene.hero_image_path
  ) {
    const {
      data,
    } =
      supabase.storage
        .from(
          "scene-images"
        )
        .getPublicUrl(
          scene.hero_image_path
        );

    sceneHeroUrl =
      data.publicUrl;
  } else if (
    scene.hero_image_url
  ) {
    sceneHeroUrl =
      scene.hero_image_url;
  }

  const heroPositionX =
    scene.hero_position_x ??
    50;

  const heroPositionY =
    scene.hero_position_y ??
    50;

  // ============================================
  // SCENE LOCATION
  // ============================================

  let sceneLocation:
    | {
        id: string;
        name: string;

        city:
          | string
          | null;

        region:
          | string
          | null;

        country: string;

        country_code:
          | string
          | null;

        latitude:
          | number
          | null;

        longitude:
          | number
          | null;
      }
    | null = null;

  if (
    scene.location_id
  ) {
    const {
      data: location,
    } = await supabase
      .from(
        "locations"
      )
      .select(
        `
        id,
        name,
        city,
        region,
        country,
        country_code,
        latitude,
        longitude
        `
      )
      .eq(
        "id",
        scene.location_id
      )
      .maybeSingle();

    sceneLocation =
      location ??
      null;
  }

  // ============================================
  // ARTIST / SCENE RELATIONSHIPS
  // ============================================

  const {
    data:
      artistSceneRows,
    error:
      artistSceneRowsError,
  } = await supabase
    .from(
      "artist_scenes"
    )
    .select(
      `
      artist_id,
      is_primary
      `
    )
    .eq(
      "scene_id",
      scene.id
    );

  if (
    artistSceneRowsError
  ) {
    throw new Error(
      artistSceneRowsError.message
    );
  }

  const artistIds =
    artistSceneRows?.map(
      (
        row
      ) =>
        row.artist_id
    ) ??
    [];

  // ============================================
  // ARTISTS
  // ============================================

  let rawArtists:
    {
      id: string;
      name: string;
      slug: string;

      bio_short:
        | string
        | null;

      status:
        | string
        | null;

      artist_type:
        | string
        | null;

      year_started:
        | number
        | null;

      year_ended:
        | number
        | null;
    }[] = [];

  if (
    artistIds.length >
    0
  ) {
    const {
      data,
      error,
    } = await supabase
      .from(
        "artists"
      )
      .select(
        `
        id,
        name,
        slug,
        bio_short,
        status,
        artist_type,
        year_started,
        year_ended
        `
      )
      .in(
        "id",
        artistIds
      )
      .eq(
        "published",
        true
      )
      .order(
        "name"
      );

    if (
      error
    ) {
      throw new Error(
        error.message
      );
    }

    rawArtists =
      data ??
      [];
  }

  // ============================================
  // ARTIST GENRES
  // ============================================

  const {
    data:
      artistGenreRows,
  } = artistIds.length
    ? await supabase
        .from(
          "artist_genres"
        )
        .select(
          `
          artist_id,
          genre_id,
          is_primary
          `
        )
        .in(
          "artist_id",
          artistIds
        )
    : {
        data: [],
      };

  const genreIds = [
    ...new Set(
      (
        artistGenreRows ??
        []
      ).map(
        (
          row
        ) =>
          row.genre_id
      )
    ),
  ];

  const {
    data: genreRows,
  } = genreIds.length
    ? await supabase
        .from(
          "genres"
        )
        .select(
          `
          id,
          name,
          slug
          `
        )
        .in(
          "id",
          genreIds
        )
    : {
        data: [],
      };

  const genreMap =
    new Map(
      (
        genreRows ??
        []
      ).map(
        (
          genre
        ) => [
          genre.id,
          genre,
        ]
      )
    );

  // ============================================
  // ARTIST LOCATIONS
  // ============================================

  const {
    data:
      artistLocationRows,
  } = artistIds.length
    ? await supabase
        .from(
          "artist_locations"
        )
        .select(
          `
          artist_id,
          location_id,
          is_primary
          `
        )
        .in(
          "artist_id",
          artistIds
        )
        .eq(
          "is_primary",
          true
        )
    : {
        data: [],
      };

  const locationIds = [
    ...new Set(
      (
        artistLocationRows ??
        []
      ).map(
        (
          row
        ) =>
          row.location_id
      )
    ),
  ];

  const {
    data:
      artistLocationDetails,
  } = locationIds.length
    ? await supabase
        .from(
          "locations"
        )
        .select(
          `
          id,
          name,
          city,
          region,
          country
          `
        )
        .in(
          "id",
          locationIds
        )
    : {
        data: [],
      };

  const artistLocationMap =
    new Map(
      (
        artistLocationDetails ??
        []
      ).map(
        (
          location
        ) => [
          location.id,
          location,
        ]
      )
    );

  // ============================================
  // ARTIST IMAGES
  // ============================================

  const {
    data:
      artistImageRows,
  } = artistIds.length
    ? await supabase
        .from(
          "artist_images"
        )
        .select(
          `
          artist_id,
          storage_path,
          image_type,
          sort_order
          `
        )
        .in(
          "artist_id",
          artistIds
        )
        .order(
          "sort_order"
        )
    : {
        data: [],
      };

  // ============================================
  // ASSEMBLE ARTISTS
  // ============================================

  const artists:
    SceneArtist[] =
    rawArtists.map(
      (
        artist
      ) => {
        const sceneRelationship =
          artistSceneRows?.find(
            (
              row
            ) =>
              row.artist_id ===
              artist.id
          );

        const genres =
          (
            artistGenreRows ??
            []
          )
            .filter(
              (
                row
              ) =>
                row.artist_id ===
                artist.id
            )
            .map(
              (
                row
              ) => {
                const genre =
                  genreMap.get(
                    row.genre_id
                  );

                if (
                  !genre
                ) {
                  return null;
                }

                return {
                  ...genre,

                  is_primary:
                    row.is_primary,
                };
              }
            )
            .filter(
              (
                genre
              ): genre is {
                id: string;
                name: string;
                slug: string;
                is_primary: boolean;
              } =>
                genre !==
                null
            )
            .sort(
              (
                a,
                b
              ) =>
                Number(
                  b.is_primary
                ) -
                Number(
                  a.is_primary
                )
            );

        const locationRelationship =
          artistLocationRows?.find(
            (
              row
            ) =>
              row.artist_id ===
              artist.id
          );

        const location =
          locationRelationship
            ? artistLocationMap.get(
                locationRelationship
                  .location_id
              ) ??
              null
            : null;

        const artistImages =
          (
            artistImageRows ??
            []
          ).filter(
            (
              image
            ) =>
              image.artist_id ===
              artist.id
          );

        const image =
          artistImages.find(
            (
              item
            ) =>
              item.image_type ===
              "profile"
          ) ??
          artistImages.find(
            (
              item
            ) =>
              item.image_type ===
              "hero"
          ) ??
          artistImages[0];

        let imageUrl:
          | string
          | null = null;

        if (
          image?.storage_path
        ) {
          const {
            data,
          } =
            supabase.storage
              .from(
                "artist-images"
              )
              .getPublicUrl(
                image.storage_path
              );

          imageUrl =
            data.publicUrl;
        }

        return {
          ...artist,

          is_primary_scene:
            sceneRelationship
              ?.is_primary ??
            false,

          genres,

          location,

          image_url:
            imageUrl,
        };
      }
    );

  artists.sort(
    (
      a,
      b
    ) => {
      if (
        a.is_primary_scene !==
        b.is_primary_scene
      ) {
        return a.is_primary_scene
          ? -1
          : 1;
      }

      return a.name.localeCompare(
        b.name
      );
    }
  );

  // ============================================
  // VENUES AT THIS SCENE LOCATION
  // ============================================

  let venues:
    SceneVenue[] = [];

  if (
    scene.location_id
  ) {
    const {
      data:
        venueRows,
      error:
        venueError,
    } = await supabase
      .from(
        "venues"
      )
      .select(
        `
        id,
        name,
        slug,
        address_line_1,
        address_line_2,
        postal_code,
        website_url,
        active
        `
      )
      .eq(
        "location_id",
        scene.location_id
      )
      .eq(
        "active",
        true
      )
      .order(
        "name"
      );

    if (
      venueError
    ) {
      throw new Error(
        venueError.message
      );
    }

    const venueIds =
      (
        venueRows ??
        []
      ).map(
        (
          venue
        ) =>
          venue.id
      );

    let upcomingEvents:
      {
        id: string;
        title: string;
        slug: string;

        venue_id:
          | string
          | null;

        start_at: string;

        timezone:
          | string
          | null;

        status:
          | string
          | null;
      }[] = [];

    if (
      venueIds.length >
      0
    ) {
      const {
        data:
          eventRows,
        error:
          eventError,
      } = await supabase
        .from(
          "events"
        )
        .select(
          `
          id,
          title,
          slug,
          venue_id,
          start_at,
          timezone,
          status
          `
        )
        .in(
          "venue_id",
          venueIds
        )
        .eq(
          "published",
          true
        )
        .gte(
          "start_at",
          new Date().toISOString()
        )
        .in(
          "status",
          [
            "scheduled",
            "postponed",
          ]
        )
        .order(
          "start_at",
          {
            ascending:
              true,
          }
        );

      if (
        eventError
      ) {
        throw new Error(
          eventError.message
        );
      }

      upcomingEvents =
        eventRows ??
        [];
    }

    venues =
      (
        venueRows ??
        []
      ).map(
        (
          venue
        ) => {
        const venueEvents =
          upcomingEvents.filter(
            (
              event
            ) =>
              event.venue_id ===
              venue.id
          );

        return {
          ...venue,

          upcoming_event_count:
            venueEvents.length,

          next_event:
            venueEvents[0] ??
            null,
        };
      }
    );

    /*
     * Show venues with upcoming events first.
     * Remaining active venues stay alphabetical.
     */
    venues.sort(
      (
        a,
        b
      ) => {
        if (
          a.upcoming_event_count !==
          b.upcoming_event_count
        ) {
          return (
            b.upcoming_event_count -
            a.upcoming_event_count
          );
        }

        return a.name.localeCompare(
          b.name
        );
      }
    );
  }

  const locationLabel =
    sceneLocation
      ? [
          sceneLocation.city ??
            sceneLocation.name,

          sceneLocation.region,

          sceneLocation.country,
        ]
          .filter(
            Boolean
          )
          .join(
            ", "
          )
      : null;

  const sceneLocationName =
    sceneLocation?.city ??
    sceneLocation?.name ??
    "This Location";

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      {/* ========================================
          TOP BAR
      ======================================== */}

      <header className="border-b-2 border-black bg-white px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
          <Link
            href="/"
            className="text-xs font-black uppercase tracking-[0.18em] hover:underline"
          >
            ← Back to Atlas
          </Link>

          {locationLabel && (
            <span className="hidden text-xs font-black uppercase tracking-[0.18em] sm:block">
              {
                locationLabel
              }
            </span>
          )}
        </div>
      </header>

      {/* ========================================
          HERO
      ======================================== */}

      <section className="border-b-2 border-black">
        <div className="mx-auto grid max-w-6xl lg:grid-cols-[1.25fr_0.75fr]">
          {/* COPY */}

          <div className="flex flex-col justify-between border-black p-6 sm:p-10 lg:min-h-[620px] lg:border-r-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em]">
                Scene
              </p>

              {locationLabel && (
                <p className="mt-4 text-sm font-black uppercase tracking-[0.12em]">
                  {
                    locationLabel
                  }
                </p>
              )}
            </div>

            <div className="py-10 sm:py-12">
              <h1 className="max-w-4xl break-words text-[clamp(3rem,9vw,8rem)] font-black uppercase leading-[0.84] tracking-[-0.055em]">
                {
                  scene.name
                }
              </h1>

              {scene.tagline && (
                <p className="mt-8 max-w-2xl text-xl font-bold leading-8 sm:text-2xl">
                  {
                    scene.tagline
                  }
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/"
                className="inline-flex w-full items-center justify-center border-2 border-black bg-black px-5 py-3 text-xs font-black uppercase text-white transition-colors hover:bg-white hover:text-black sm:w-auto"
              >
                Explore on Map
              </Link>

              <a
                href="#artists"
                className="inline-flex w-full items-center justify-center border-2 border-black bg-white px-5 py-3 text-xs font-black uppercase transition-colors hover:bg-black hover:text-white sm:w-auto"
              >
                Explore Artists
              </a>

              {venues.length >
                0 && (
                <a
                  href="#venues"
                  className="inline-flex w-full items-center justify-center border-2 border-black bg-white px-5 py-3 text-xs font-black uppercase transition-colors hover:bg-black hover:text-white sm:w-auto"
                >
                  Explore Venues
                </a>
              )}
            </div>
          </div>

          {/* HERO IMAGE */}

          <div className="relative aspect-[4/3] overflow-hidden bg-black lg:aspect-auto lg:min-h-[620px]">
            {sceneHeroUrl ? (
              <>
                <img
                  src={
                    sceneHeroUrl
                  }
                  alt={
                    scene.name
                  }
                  className="absolute inset-0 h-full w-full object-cover"
                  style={{
                    objectPosition:
                      `${heroPositionX}% ${heroPositionY}%`,
                  }}
                />

                <div className="absolute inset-0 bg-black/15" />
              </>
            ) : (
              <div className="flex h-full flex-col justify-end p-8 text-white lg:min-h-[620px]">
                <p className="text-xs font-black uppercase tracking-[0.2em]">
                  Underground Atlas
                </p>

                <p className="mt-3 max-w-sm text-4xl font-black uppercase leading-[0.9]">
                  {
                    scene.name
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ========================================
          ABOUT
      ======================================== */}

      <section className="border-b-2 border-black">
        <div className="mx-auto grid max-w-6xl lg:grid-cols-[240px_1fr]">
          <div className="border-black p-6 sm:p-8 lg:border-r-2">
            <p className="text-xs font-black uppercase tracking-[0.2em]">
              About the Scene
            </p>
          </div>

          <div className="p-6 sm:p-10">
            {scene.description_long ? (
              <p className="max-w-3xl whitespace-pre-line text-lg leading-8">
                {
                  scene.description_long
                }
              </p>
            ) : scene.description_short ? (
              <p className="max-w-3xl text-lg leading-8">
                {
                  scene.description_short
                }
              </p>
            ) : (
              <p className="text-lg text-black/55">
                Scene description coming soon.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ========================================
          ARTISTS
      ======================================== */}

      <section
        id="artists"
        className="border-b-2 border-black"
      >
        <div className="mx-auto max-w-6xl px-6 py-12 sm:px-10 sm:py-16">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em]">
                Artists
              </p>

              <h2 className="mt-2 text-4xl font-black uppercase sm:text-5xl">
                In This Scene
              </h2>
            </div>

            <p className="text-sm font-bold uppercase">
              {
                artists.length
              }{" "}
              {artists.length ===
              1
                ? "Artist"
                : "Artists"}
            </p>
          </div>

          {!artists.length ? (
            <div className="mt-8 border-2 border-black bg-white p-8">
              <p className="font-bold">
                No published artists are currently assigned to this scene.
              </p>
            </div>
          ) : (
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {artists.map(
                (
                  artist
                ) => (
                  <article
                    key={
                      artist.id
                    }
                    className="group border-2 border-black bg-white"
                  >
                    <Link
                      href={`/artists/${artist.slug}`}
                      className="block"
                    >
                      <div className="relative aspect-[4/3] overflow-hidden border-b-2 border-black bg-black">
                        {artist.image_url ? (
                          <img
                            src={
                              artist.image_url
                            }
                            alt={
                              artist.name
                            }
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
                          />
                        ) : (
                          <div className="flex h-full items-end p-6 text-white">
                            <p className="text-3xl font-black uppercase">
                              {
                                artist.name
                              }
                            </p>
                          </div>
                        )}

                        {artist.is_primary_scene && (
                          <span className="absolute left-3 top-3 border-2 border-black bg-[#f3efe4] px-2 py-1 text-[9px] font-black uppercase">
                            Primary Scene
                          </span>
                        )}
                      </div>
                    </Link>

                    <div className="p-5">
                      <Link
                        href={`/artists/${artist.slug}`}
                        className="inline-block"
                      >
                        <h3 className="text-2xl font-black uppercase hover:underline">
                          {
                            artist.name
                          }
                        </h3>
                      </Link>

                      {artist.location && (
                        <p className="mt-2 text-xs font-bold uppercase tracking-[0.1em] text-black/60">
                          {[
                            artist
                              .location
                              .city ??
                              artist
                                .location
                                .name,

                            artist
                              .location
                              .region,
                          ]
                            .filter(
                              Boolean
                            )
                            .join(
                              ", "
                            )}
                        </p>
                      )}

                      {artist.genres.length >
                        0 && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          {artist.genres.map(
                            (
                              genre
                            ) => (
                              <span
                                key={
                                  genre.id
                                }
                                className={
                                  genre.is_primary
                                    ? "border-2 border-black bg-black px-2 py-1 text-[10px] font-black uppercase text-white"
                                    : "border-2 border-black px-2 py-1 text-[10px] font-black uppercase"
                                }
                              >
                                {
                                  genre.name
                                }
                              </span>
                            )
                          )}
                        </div>
                      )}

                      {artist.bio_short && (
                        <p className="mt-5 line-clamp-3 text-sm leading-6 text-black/70">
                          {
                            artist.bio_short
                          }
                        </p>
                      )}

                      <div className="mt-6 border-t-2 border-black pt-4">
                        <Link
                          href={`/artists/${artist.slug}`}
                          className="text-xs font-black uppercase tracking-[0.15em] hover:underline"
                        >
                          Explore Artist →
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </div>
      </section>

      {/* ========================================
          VENUES
      ======================================== */}

      {sceneLocation && (
        <section
          id="venues"
          className="border-b-2 border-black bg-white"
        >
          <div className="mx-auto max-w-6xl px-6 py-12 sm:px-10 sm:py-16">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em]">
                  Places
                </p>

                <h2 className="mt-2 text-4xl font-black uppercase sm:text-5xl">
                  Venues in{" "}
                  {
                    sceneLocationName
                  }
                </h2>

                <p className="mt-4 max-w-2xl text-sm leading-6 text-black/60">
                  Active Atlas venues connected to the{" "}
                  {
                    sceneLocationName
                  }{" "}
                  area.
                </p>
              </div>

              <p className="text-sm font-bold uppercase">
                {
                  venues.length
                }{" "}
                {venues.length ===
                1
                  ? "Venue"
                  : "Venues"}
              </p>
            </div>

            {!venues.length ? (
              <div className="mt-8 border-2 border-black bg-[#f3efe4] p-8">
                <p className="font-bold">
                  No active Atlas venues are currently listed for this location.
                </p>
              </div>
            ) : (
              <div className="mt-8 grid gap-5 md:grid-cols-2">
                {venues.map(
                  (
                    venue
                  ) => (
                    <article
                      key={
                        venue.id
                      }
                      className="border-2 border-black bg-[#f3efe4]"
                    >
                      <div className="p-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
                              Venue
                            </p>

                            <Link
                              href={`/venues/${venue.slug}`}
                              className="mt-2 inline-block"
                            >
                              <h3 className="text-2xl font-black uppercase leading-tight hover:underline">
                                {
                                  venue.name
                                }
                              </h3>
                            </Link>
                          </div>

                          <span className="border-2 border-black bg-white px-2.5 py-2 text-[9px] font-black uppercase">
                            {
                              venue.upcoming_event_count
                            }{" "}
                            {venue.upcoming_event_count ===
                            1
                              ? "Show"
                              : "Shows"}
                          </span>
                        </div>

                        {venue.address_line_1 && (
                          <p className="mt-4 text-sm font-bold">
                            {
                              venue.address_line_1
                            }
                          </p>
                        )}

                        {venue.next_event && (
                          <div className="mt-6 border-t-2 border-black pt-5">
                            <p className="text-[9px] font-black uppercase tracking-[0.16em] text-black/45">
                              Next Show
                            </p>

                            <Link
                              href={`/events/${venue.next_event.slug}`}
                              className="group mt-2 block"
                            >
                              <p className="text-lg font-black uppercase group-hover:underline">
                                {
                                  venue.next_event.title
                                }
                              </p>

                              <p className="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-black/55">
                                {formatEventDate(
                                  venue.next_event.start_at,
                                  venue.next_event.timezone ??
                                    "America/Los_Angeles"
                                )}
                              </p>
                            </Link>
                          </div>
                        )}

                        <div className="mt-6 flex flex-col gap-2 border-t-2 border-black pt-4 sm:flex-row sm:flex-wrap">
                          <Link
                            href={`/venues/${venue.slug}`}
                            className="inline-flex w-full items-center justify-center border-2 border-black bg-black px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-white transition-colors hover:bg-white hover:text-black sm:w-auto"
                          >
                            Explore Venue →
                          </Link>

                          {venue.website_url && (
                            <a
                              href={
                                venue.website_url
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex w-full items-center justify-center border-2 border-black bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white sm:w-auto"
                            >
                              Website ↗
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  )
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ========================================
          LOCATION
      ======================================== */}

      {sceneLocation && (
        <section className="bg-white">
          <div className="mx-auto grid max-w-6xl lg:grid-cols-[1fr_0.7fr]">
            <div className="border-black p-6 sm:p-10 lg:border-r-2">
              <p className="text-xs font-black uppercase tracking-[0.2em]">
                Location
              </p>

              <h2 className="mt-3 text-4xl font-black uppercase sm:text-5xl">
                {
                  sceneLocation.city ??
                  sceneLocation.name
                }
              </h2>

              <p className="mt-3 text-lg font-bold">
                {[
                  sceneLocation.region,
                  sceneLocation.country,
                ]
                  .filter(
                    Boolean
                  )
                  .join(
                    ", "
                  )}
              </p>
            </div>

            <div className="flex flex-col justify-between gap-8 bg-[#f3efe4] p-6 sm:p-10">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em]">
                  Keep Exploring
                </p>

                <p className="mt-4 max-w-md text-lg leading-7">
                  Return to the atlas to explore artists and scenes around{" "}
                  {
                    sceneLocation.city ??
                    sceneLocation.name
                  }
                  .
                </p>
              </div>

              <Link
                href="/"
                className="inline-flex w-full items-center justify-center border-2 border-black bg-black px-5 py-3 text-xs font-black uppercase text-white transition-colors hover:bg-white hover:text-black sm:w-fit"
              >
                Explore on Map →
              </Link>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}