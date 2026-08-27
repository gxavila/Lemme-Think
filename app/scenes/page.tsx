import Link from "next/link";

import SceneCard from "@/components/scenes/SceneCard";
import UndergroundAtlasHeader from "@/components/UndergroundAtlasHeader";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

type SceneRow = {
  id: string;
  name: string;
  slug: string;

  tagline:
    | string
    | null;

  description_short:
    | string
    | null;

  hero_image_url:
    | string
    | null;

  hero_image_path:
    | string
    | null;

  hero_position_x:
    | number
    | null;

  hero_position_y:
    | number
    | null;

  featured:
    | boolean
    | null;

  location_id:
    | string
    | null;
};

type LocationRow = {
  id: string;
  name: string;

  city:
    | string
    | null;

  region:
    | string
    | null;

  country: string;
};

export default async function ScenesPage() {
  const supabase =
    await createClient();

  const {
    data: scenesData,
    error: scenesError,
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
      hero_image_url,
      hero_image_path,
      hero_position_x,
      hero_position_y,
      featured,
      location_id
      `
    )
    .eq(
      "published",
      true
    )
    .order(
      "featured",
      {
        ascending:
          false,
      }
    )
    .order(
      "name"
    );

  if (
    scenesError
  ) {
    throw new Error(
      scenesError.message
    );
  }

  const scenes =
    (
      scenesData ??
      []
    ) as SceneRow[];

  const locationIds = [
    ...new Set(
      scenes
        .map(
          (scene) =>
            scene.location_id
        )
        .filter(
          (
            id
          ): id is string =>
            Boolean(
              id
            )
        )
    ),
  ];

  const {
    data: locationRows,
    error: locationsError,
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
        data:
          [] as LocationRow[],
        error:
          null,
      };

  if (
    locationsError
  ) {
    throw new Error(
      locationsError.message
    );
  }

  const locationMap =
    new Map(
      (
        locationRows ??
        []
      ).map(
        (
          location
        ) => [
          location.id,
          location as LocationRow,
        ]
      )
    );

  const sceneIds =
    scenes.map(
      (
        scene
      ) =>
        scene.id
    );

  const {
    data:
      artistSceneRows,
    error:
      artistSceneError,
  } = sceneIds.length
    ? await supabase
        .from(
          "artist_scenes"
        )
        .select(
          `
          scene_id,
          artist_id
          `
        )
        .in(
          "scene_id",
          sceneIds
        )
    : {
        data: [],
        error: null,
      };

  if (
    artistSceneError
  ) {
    throw new Error(
      artistSceneError.message
    );
  }

  const artistIds = [
    ...new Set(
      (
        artistSceneRows ??
        []
      ).map(
        (
          row
        ) =>
          row.artist_id
      )
    ),
  ];

  const {
    data:
      publishedArtists,
    error:
      artistsError,
  } = artistIds.length
    ? await supabase
        .from(
          "artists"
        )
        .select(
          `
          id
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
    : {
        data: [],
        error: null,
      };

  if (
    artistsError
  ) {
    throw new Error(
      artistsError.message
    );
  }

  const publishedArtistIds =
    new Set(
      (
        publishedArtists ??
        []
      ).map(
        (
          artist
        ) =>
          artist.id
      )
    );

  const sceneArtistMap =
    new Map<
      string,
      string[]
    >();

  (
    artistSceneRows ??
    []
  ).forEach(
    (
      row
    ) => {
      if (
        !publishedArtistIds.has(
          row.artist_id
        )
      ) {
        return;
      }

      const current =
        sceneArtistMap.get(
          row.scene_id
        ) ??
        [];

      current.push(
        row.artist_id
      );

      sceneArtistMap.set(
        row.scene_id,
        current
      );
    }
  );

  const {
    data:
      artistGenreRows,
    error:
      artistGenreError,
  } = publishedArtistIds.size
    ? await supabase
        .from(
          "artist_genres"
        )
        .select(
          `
          artist_id,
          genre_id
          `
        )
        .in(
          "artist_id",
          [
            ...publishedArtistIds,
          ]
        )
    : {
        data: [],
        error: null,
      };

  if (
    artistGenreError
  ) {
    throw new Error(
      artistGenreError.message
    );
  }

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
    data:
      genreRows,
    error:
      genresError,
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
        error: null,
      };

  if (
    genresError
  ) {
    throw new Error(
      genresError.message
    );
  }

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

  const cards =
    scenes.map(
      (
        scene
      ) => {
        const location =
          scene.location_id
            ? locationMap.get(
                scene.location_id
              ) ??
              null
            : null;

        const locationLabel =
          location
            ? [
                location.city ??
                  location.name,
                location.region,
              ]
                .filter(
                  Boolean
                )
                .join(
                  ", "
                )
            : null;

        const sceneArtistIds =
          sceneArtistMap.get(
            scene.id
          ) ??
          [];

        const genreCounts =
          new Map<
            string,
            number
          >();

        (
          artistGenreRows ??
          []
        ).forEach(
          (
            row
          ) => {
            if (
              !sceneArtistIds.includes(
                row.artist_id
              )
            ) {
              return;
            }

            genreCounts.set(
              row.genre_id,
              (
                genreCounts.get(
                  row.genre_id
                ) ??
                0
              ) +
                1
            );
          }
        );

        const genres =
          [
            ...genreCounts.entries(),
          ]
            .sort(
              (
                a,
                b
              ) =>
                b[1] -
                a[1]
            )
            .slice(
              0,
              4
            )
            .map(
              (
                [
                  genreId,
                ]
              ) =>
                genreMap.get(
                  genreId
                )
            )
            .filter(
              (
                genre
              ): genre is {
                id: string;
                name: string;
                slug: string;
              } =>
                Boolean(
                  genre
                )
            );

        let heroUrl:
          | string
          | null =
          scene.hero_image_url;

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

          heroUrl =
            data.publicUrl;
        }

        return {
          id:
            scene.id,

          name:
            scene.name,

          slug:
            scene.slug,

          tagline:
            scene.tagline,

          description:
            scene.description_short,

          heroUrl,

          heroPositionX:
            scene.hero_position_x ??
            50,

          heroPositionY:
            scene.hero_position_y ??
            50,

          featured:
            Boolean(
              scene.featured
            ),

          artistCount:
            sceneArtistIds.length,

          locationLabel,

          genres,
        };
      }
    );

  const featuredScenes =
    cards.filter(
      (
        scene
      ) =>
        scene.featured
    );

  const allScenes =
    cards;

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      {/* ======================================
          HEADER
      ====================================== */}

      <UndergroundAtlasHeader
        actionHref="/"
        actionLabel="Back to Map →"
      />

      {/* ======================================
          HERO
      ====================================== */}

      <section className="border-b-2 border-black">
        <div className="px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-12">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-black/45">
            Explore Scenes
          </p>

          <h1 className="mt-3 max-w-5xl break-words text-[clamp(2.4rem,13vw,6rem)] font-black uppercase leading-[0.87] tracking-[-0.055em]">
            Local Music Ecosystems
          </h1>

          <p className="mt-5 max-w-2xl text-base font-medium leading-7 text-black/65 sm:text-lg">
            Discover the places where underground music takes shape,
            and the artists, genres, and venues that define each scene.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em]">
            <span className="border-2 border-black bg-white px-3 py-2">
              {cards.length}{" "}
              {cards.length ===
              1
                ? "Scene"
                : "Scenes"}
            </span>

            <span className="border-2 border-black bg-black px-3 py-2 text-white">
              {cards.reduce(
                (
                  total,
                  scene
                ) =>
                  total +
                  scene.artistCount,
                0
              )}{" "}
              Artist Connections
            </span>
          </div>
        </div>
      </section>

      {/* ======================================
          FEATURED
      ====================================== */}

      {featuredScenes.length >
        0 && (
        <section className="border-b-2 border-black bg-white">
          <div className="px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-12">
            <div className="flex items-end justify-between gap-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
                  Featured
                </p>

                <h2 className="mt-1 text-[clamp(2rem,4vw,3.25rem)] font-black uppercase leading-[0.92] tracking-[-0.04em]">
                  Featured Scenes
                </h2>
              </div>

              <p className="hidden text-[10px] font-black uppercase tracking-[0.12em] text-black/45 sm:block">
                Start Here
              </p>
            </div>

            <div className="mt-7 grid gap-5 lg:grid-cols-2">
              {featuredScenes.map(
                (
                  scene
                ) => (
                  <SceneCard
                    key={
                      scene.id
                    }
                    scene={
                      scene
                    }
                  />
                )
              )}
            </div>
          </div>
        </section>
      )}

      {/* ======================================
          ALL SCENES
      ====================================== */}

      <section>
        <div className="px-4 py-7 sm:px-6 sm:py-9 lg:px-8 lg:py-12">
          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
                Directory
              </p>

              <h2 className="mt-1 text-[clamp(2rem,4vw,3.25rem)] font-black uppercase leading-[0.92] tracking-[-0.04em]">
                All Scenes
              </h2>
            </div>

            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-black/45">
              {allScenes.length} Total
            </span>
          </div>

          {!allScenes.length ? (
            <div className="mt-7 border-2 border-black bg-white p-5 sm:p-8">
              <p className="font-bold">
                No published scenes are available yet.
              </p>
            </div>
          ) : (
            <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {allScenes.map(
                (
                  scene
                ) => (
                  <SceneCard
                    key={
                      scene.id
                    }
                    scene={
                      scene
                    }
                  />
                )
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
