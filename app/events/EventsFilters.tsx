"use client";

import {
  useEffect,
  useState,
  useTransition,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

type Genre = {
  id: string;
  name: string;
  slug: string;
};

type LocationOption = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  region: string | null;
  country: string;
};

type DateWindow =
  | "7-days"
  | "30-days"
  | "90-days"
  | "any";

type EventsFiltersProps = {
  genres: Genre[];
  locations: LocationOption[];
  selectedWindow: DateWindow;
  selectedGenres: string[];
  selectedLocations: string[];
};

const DATE_WINDOWS: {
  value: DateWindow;
  label: string;
}[] = [
  {
    value: "7-days",
    label: "Next 7 Days",
  },
  {
    value: "30-days",
    label: "Next 30 Days",
  },
  {
    value: "90-days",
    label: "Next 90 Days",
  },
  {
    value: "any",
    label: "Any Upcoming Date",
  },
];

function buildLocationOptionLabel(
  location: LocationOption
) {
  return [
    location.city ??
      location.name,
    location.region,
  ]
    .filter(Boolean)
    .join(", ");
}

export default function EventsFilters({
  genres,
  locations,
  selectedWindow,
  selectedGenres,
  selectedLocations,
}: EventsFiltersProps) {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [
    localWindow,
    setLocalWindow,
  ] = useState<DateWindow>(
    selectedWindow
  );

  const [
    localGenres,
    setLocalGenres,
  ] = useState<string[]>(
    selectedGenres
  );

  const [
    localLocations,
    setLocalLocations,
  ] = useState<string[]>(
    selectedLocations
  );

  const [
    mobileFiltersOpen,
    setMobileFiltersOpen,
  ] = useState(false);

  // Keep local controls synchronized with
  // browser back / forward navigation.
  useEffect(
    () => {
      setLocalWindow(
        selectedWindow
      );

      setLocalGenres(
        selectedGenres
      );

      setLocalLocations(
        selectedLocations
      );
    },
    [
      selectedWindow,
      selectedGenres,
      selectedLocations,
    ]
  );

  function updateUrl(
    nextWindow: DateWindow,
    nextGenres: string[],
    nextLocations: string[]
  ) {
    const params =
      new URLSearchParams();

    /*
     * Keep the date parameter explicit so the
     * browse page and Event map share the exact
     * same state.
     */
    params.set(
      "event_window",
      nextWindow
    );

    nextGenres.forEach(
      (
        genre
      ) => {
        params.append(
          "event_genres",
          genre
        );
      }
    );

    nextLocations.forEach(
      (
        location
      ) => {
        params.append(
          "event_locations",
          location
        );
      }
    );

    const query =
      params.toString();

    startTransition(
      () => {
        router.replace(
          query
            ? `${pathname}?${query}`
            : pathname,
          {
            scroll: false,
          }
        );
      }
    );
  }

  function handleWindowChange(
    nextWindow: DateWindow
  ) {
    setLocalWindow(
      nextWindow
    );

    updateUrl(
      nextWindow,
      localGenres,
      localLocations
    );
  }

  function handleGenreChange(
    slug: string
  ) {
    const nextGenres =
      localGenres.includes(
        slug
      )
        ? localGenres.filter(
            (
              item
            ) =>
              item !==
              slug
          )
        : [
            ...localGenres,
            slug,
          ];

    setLocalGenres(
      nextGenres
    );

    updateUrl(
      localWindow,
      nextGenres,
      localLocations
    );
  }

  function handleLocationChange(
    slug: string
  ) {
    const nextLocations =
      localLocations.includes(
        slug
      )
        ? localLocations.filter(
            (
              item
            ) =>
              item !==
              slug
          )
        : [
            ...localLocations,
            slug,
          ];

    setLocalLocations(
      nextLocations
    );

    updateUrl(
      localWindow,
      localGenres,
      nextLocations
    );
  }

  function clearFilters() {
    setLocalWindow(
      "30-days"
    );

    setLocalGenres(
      []
    );

    setLocalLocations(
      []
    );

    startTransition(
      () => {
        router.replace(
          pathname,
          {
            scroll: false,
          }
        );
      }
    );
  }

  const activeFilterCount =
    localGenres.length +
    localLocations.length +
    (
      localWindow !==
      "30-days"
        ? 1
        : 0
    );

  return (
    <section className="border-b-2 border-black bg-white">
      <div className="mx-auto max-w-6xl">
        {/* ========================================
            MOBILE FILTER HEADER
        ======================================== */}

        <div className="flex items-center justify-between gap-4 border-b-2 border-black px-6 py-5 sm:hidden">
          <button
            type="button"
            onClick={() =>
              setMobileFiltersOpen(
                (current) =>
                  !current
              )
            }
            aria-expanded={
              mobileFiltersOpen
            }
            className="inline-flex min-h-11 items-center border-2 border-black bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.12em] transition-colors hover:bg-black hover:text-white"
          >
            {mobileFiltersOpen
              ? "Hide Filters"
              : "Show Filters"}
          </button>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-black/45">
              Active Filters
            </span>

            <span className="flex h-8 min-w-8 items-center justify-center border-2 border-black bg-white px-2 text-xs font-black">
              {
                activeFilterCount
              }
            </span>
          </div>
        </div>

        <div
          className={
            mobileFiltersOpen
              ? "block"
              : "hidden sm:block"
          }
        >
          {/* ========================================
              DATE
          ======================================== */}

          <div className="border-b-2 border-black px-6 py-6 sm:px-10">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="md:w-[180px]">
                <p className="text-xs font-black uppercase tracking-[0.2em]">
                  Date
                </p>

                <p className="mt-2 text-xs leading-5 text-black/50">
                  Choose how far ahead you want to browse.
                </p>
              </div>

              <div className="flex flex-1 flex-wrap gap-2">
                {DATE_WINDOWS.map(
                  (
                    option
                  ) => {
                    const selected =
                      localWindow ===
                      option.value;

                    return (
                      <button
                        key={
                          option.value
                        }
                        type="button"
                        onClick={
                          () =>
                            handleWindowChange(
                              option.value
                            )
                        }
                        aria-pressed={
                          selected
                        }
                        className={
                          selected
                            ? "inline-flex border-2 border-black bg-black px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-white transition-colors"
                            : "inline-flex border-2 border-black bg-white px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white"
                        }
                      >
                        {
                          option.label
                        }
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </div>

          {/* ========================================
              GENRES
          ======================================== */}

          <div className="border-b-2 border-black px-6 py-6 sm:px-10">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="md:w-[180px]">
                <p className="text-xs font-black uppercase tracking-[0.2em]">
                  Genre
                </p>

                <p className="mt-2 text-xs leading-5 text-black/50">
                  Select one or more sounds.
                </p>
              </div>

              <div className="flex flex-1 flex-wrap gap-2">
                {genres.map(
                  (
                    genre
                  ) => {
                    const selected =
                      localGenres.includes(
                        genre.slug
                      );

                    return (
                      <button
                        key={
                          genre.id
                        }
                        type="button"
                        onClick={
                          () =>
                            handleGenreChange(
                              genre.slug
                            )
                        }
                        aria-pressed={
                          selected
                        }
                        className={
                          selected
                            ? "inline-flex border-2 border-black bg-black px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-white transition-colors"
                            : "inline-flex border-2 border-black bg-white px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white"
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
            </div>
          </div>

          {/* ========================================
              LOCATIONS
          ======================================== */}

          <div className="border-b-2 border-black px-6 py-6 sm:px-10">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="md:w-[180px]">
                <p className="text-xs font-black uppercase tracking-[0.2em]">
                  Location
                </p>

                <p className="mt-2 text-xs leading-5 text-black/50">
                  Narrow the list by Atlas location.
                </p>
              </div>

              <div className="flex flex-1 flex-wrap gap-2">
                {locations.map(
                  (
                    location
                  ) => {
                    const selected =
                      localLocations.includes(
                        location.slug
                      );

                    return (
                      <button
                        key={
                          location.id
                        }
                        type="button"
                        onClick={
                          () =>
                            handleLocationChange(
                              location.slug
                            )
                        }
                        aria-pressed={
                          selected
                        }
                        className={
                          selected
                            ? "inline-flex border-2 border-black bg-black px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-white transition-colors"
                            : "inline-flex border-2 border-black bg-white px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white"
                        }
                      >
                        {buildLocationOptionLabel(
                          location
                        )}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </div>

          {/* ========================================
              FILTER STATUS
          ======================================== */}

          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 sm:px-10">
            <div className="flex flex-wrap items-center gap-3">
              {activeFilterCount >
                0 && (
                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                  className="border-2 border-black bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.12em] transition-colors hover:bg-black hover:text-white"
                >
                  Clear Filters
                </button>
              )}

              {isPending && (
                <span className="text-[10px] font-black uppercase tracking-[0.14em] text-black/45">
                  Updating…
                </span>
              )}
            </div>

            <div className="hidden items-center gap-3 sm:flex">
              <span className="text-[10px] font-black uppercase tracking-[0.15em] text-black/45">
                Active Filters
              </span>

              <span className="flex h-8 min-w-8 items-center justify-center border-2 border-black bg-white px-2 text-xs font-black">
                {
                  activeFilterCount
                }
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}