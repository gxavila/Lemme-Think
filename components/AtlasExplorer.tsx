"use client";

import {
  useEffect,
  useState,
} from "react";

import AtlasMap from "@/components/map/AtlasMap";

type Genre = {
  id: string;
  name: string;
  slug: string;
};

type AtlasExplorerProps = {
  genres: Genre[];
};

const GENRE_STORAGE_KEY =
  "underground-atlas-genres";

function readInitialGenres(): string[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  /*
   * URL state takes priority.
   */

  const params =
    new URLSearchParams(
      window.location.search
    );

  const genresFromUrl =
    params.get("genres");

  if (genresFromUrl) {
    return genresFromUrl
      .split(",")
      .map((genre) =>
        genre.trim()
      )
      .filter(Boolean);
  }

  /*
   * If the user returned through a
   * plain "/" link, restore the most
   * recent filters from sessionStorage.
   */

  try {
    const stored =
      window.sessionStorage.getItem(
        GENRE_STORAGE_KEY
      );

    if (!stored) {
      return [];
    }

    const parsed =
      JSON.parse(stored);

    if (
      Array.isArray(parsed)
    ) {
      return parsed.filter(
        (value) =>
          typeof value ===
          "string"
      );
    }
  } catch {
    return [];
  }

  return [];
}

function updateGenreUrl(
  genres: string[]
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const url =
    new URL(
      window.location.href
    );

  if (genres.length) {
    url.searchParams.set(
      "genres",
      genres.join(",")
    );
  } else {
    url.searchParams.delete(
      "genres"
    );
  }

  window.history.replaceState(
    {},
    "",
    `${url.pathname}${url.search}${url.hash}`
  );
}

export default function AtlasExplorer({
  genres,
}: AtlasExplorerProps) {
  const [
    selectedGenres,
    setSelectedGenres,
  ] = useState<string[]>([]);

  const [
    hydrated,
    setHydrated,
  ] = useState(false);

  /*
   * Restore genres once the client
   * has mounted.
   */

  useEffect(() => {
    const restored =
      readInitialGenres();

    /*
     * Remove any stale genre slug that
     * no longer exists or is inactive.
     */

    const validSlugs =
      new Set(
        genres.map(
          (genre) =>
            genre.slug
        )
      );

    const validRestored =
      restored.filter(
        (slug) =>
          validSlugs.has(
            slug
          )
      );

    setSelectedGenres(
      validRestored
    );

    /*
     * If state came from storage rather
     * than the URL, reflect it in the URL.
     */

    updateGenreUrl(
      validRestored
    );

    setHydrated(true);
  }, [genres]);

  /*
   * Keep URL + session state synchronized
   * after filters change.
   */

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    updateGenreUrl(
      selectedGenres
    );

    try {
      window.sessionStorage.setItem(
        GENRE_STORAGE_KEY,
        JSON.stringify(
          selectedGenres
        )
      );
    } catch {
      /*
       * Storage can be unavailable in
       * restrictive browser modes.
       * URL persistence still works.
       */
    }
  }, [
    selectedGenres,
    hydrated,
  ]);

  function toggleGenre(
    slug: string
  ) {
    setSelectedGenres(
      (current) => {
        if (
          current.includes(
            slug
          )
        ) {
          return current.filter(
            (genre) =>
              genre !== slug
          );
        }

        return [
          ...current,
          slug,
        ];
      }
    );
  }

  function clearFilters() {
    setSelectedGenres([]);
  }

  const hasFilters =
    selectedGenres.length >
    0;

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10 lg:px-10">
      {/* ======================================
          DISCOVERY HEADER
      ====================================== */}

      <div className="mb-5 flex flex-col gap-4 sm:mb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em]">
            Explore the Atlas
          </p>

          <h2 className="mt-2 text-3xl font-black uppercase sm:text-4xl">
            Find Music by Geography
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/65 sm:text-base">
            Move around the map, refine the results by genre,
            then select a marker to discover an artist.
          </p>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={
              clearFilters
            }
            className="w-fit min-h-11 border-2 border-black bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.12em] transition-colors hover:bg-black hover:text-white"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* ======================================
          FILTER PANEL
      ====================================== */}

      <section className="border-2 border-black bg-white">
        <div className="flex flex-col gap-3 border-b-2 border-black p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em]">
              Filter by Genre
            </p>

            <p className="mt-1 text-xs text-black/55">
              Select one or more genres.
            </p>
          </div>

          <div className="text-xs font-black uppercase tracking-[0.12em]">
            {hasFilters ? (
              <span>
                {
                  selectedGenres.length
                }{" "}
                {selectedGenres.length ===
                1
                  ? "Filter"
                  : "Filters"}{" "}
                Active
              </span>
            ) : (
              <span className="text-black/45">
                All Genres
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 p-3 sm:p-5">
          {genres.map(
            (genre) => {
              const selected =
                selectedGenres.includes(
                  genre.slug
                );

              return (
                <button
                  key={
                    genre.id
                  }
                  type="button"
                  onClick={() =>
                    toggleGenre(
                      genre.slug
                    )
                  }
                  aria-pressed={
                    selected
                  }
                  className={
                    selected
                      ? "min-h-11 border-2 border-black bg-black px-3 py-2 text-xs font-black uppercase text-white"
                      : "min-h-11 border-2 border-black bg-[#f3efe4] px-3 py-2 text-xs font-black uppercase transition-colors hover:bg-black hover:text-white"
                  }
                >
                  {
                    genre.name
                  }
                </button>
              );
            }
          )}
        </div>
      </section>

      {/* ======================================
          ACTIVE FILTER SUMMARY
      ====================================== */}

      {hasFilters && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[10px] font-black uppercase tracking-[0.16em] text-black/50">
            Showing
          </span>

          {selectedGenres.map(
            (slug) => {
              const genre =
                genres.find(
                  (item) =>
                    item.slug ===
                    slug
                );

              if (!genre) {
                return null;
              }

              return (
                <button
                  key={
                    genre.id
                  }
                  type="button"
                  onClick={() =>
                    toggleGenre(
                      genre.slug
                    )
                  }
                  className="min-h-10 border-2 border-black bg-black px-2.5 py-1.5 text-[10px] font-black uppercase text-white"
                  title={`Remove ${genre.name}`}
                >
                  {genre.name} ×
                </button>
              );
            }
          )}
        </div>
      )}

      {/* ======================================
          MAP
      ====================================== */}

      <div className="mt-5 sm:mt-6">
        <AtlasMap
          selectedGenres={
            selectedGenres
          }
        />
      </div>

      {/* ======================================
          MAP INSTRUCTIONS
      ====================================== */}

      <div className="grid border-x-2 border-b-2 border-black bg-white sm:grid-cols-2">
        <div className="border-black p-4 sm:border-r-2 sm:p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/50">
            Discover
          </p>

          <p className="mt-2 text-sm font-bold">
            Select an artist marker to learn more.
          </p>
        </div>

        <div className="border-t-2 border-black p-4 sm:border-t-0 sm:p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/50">
            Explore
          </p>

          <p className="mt-2 text-sm font-bold">
            Pan and zoom to uncover music in other places.
          </p>
        </div>
      </div>
    </section>
  );
}