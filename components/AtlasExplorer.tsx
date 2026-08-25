"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import AtlasMap from "@/components/map/AtlasMap";

type Genre = {
  id: string;
  name: string;
  slug: string;
};

type Location = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  region: string | null;
  country: string;
};

type AtlasExplorerProps = {
  genres: Genre[];
  locations: Location[];
};

type ArtistStatus = {
  value: string;
  label: string;
};

type ListenerRange = {
  value: string;
  label: string;
  min: number | null;
  max: number | null;
};

type EraRange = {
  value: string;
  label: string;
  start: number;
  end: number;
};

type EventWindow = {
  value: string;
  label: string;
  days: number | null;
};

type RadiusOption = {
  value: number;
  label: string;
};

type MapMode =
  | "artists"
  | "events";

const GENRE_STORAGE_KEY =
  "underground-atlas-genres";

const STATUS_STORAGE_KEY =
  "underground-atlas-statuses";

const LISTENER_STORAGE_KEY =
  "underground-atlas-listener-range";

const LOCATION_STORAGE_KEY =
  "underground-atlas-locations";

const ERA_STORAGE_KEY =
  "underground-atlas-eras";

const MAP_MODE_STORAGE_KEY =
  "underground-atlas-map-mode";

const EVENT_LOCATION_STORAGE_KEY =
  "underground-atlas-event-locations";

const EVENT_GENRE_STORAGE_KEY =
  "underground-atlas-event-genres";

const EVENT_WINDOW_STORAGE_KEY =
  "underground-atlas-event-window";

const EVENT_RADIUS_STORAGE_KEY =
  "underground-atlas-event-radius";

const ARTIST_STATUSES: ArtistStatus[] = [
  {
    value: "active",
    label: "Active",
  },
  {
    value: "hiatus",
    label: "Hiatus",
  },
  {
    value: "inactive",
    label: "Inactive",
  },
  {
    value: "unknown",
    label: "Unknown",
  },
];

const LISTENER_RANGES: ListenerRange[] = [
  {
    value: "under-1k",
    label: "Under 1K",
    min: null,
    max: 999,
  },
  {
    value: "1k-10k",
    label: "1K–10K",
    min: 1000,
    max: 9999,
  },
  {
    value: "10k-50k",
    label: "10K–50K",
    min: 10000,
    max: 49999,
  },
  {
    value: "50k-plus",
    label: "50K+",
    min: 50000,
    max: null,
  },
];

const ERA_RANGES: EraRange[] = [
  {
    value: "2020s",
    label: "2020s",
    start: 2020,
    end: 2029,
  },
  {
    value: "2010s",
    label: "2010s",
    start: 2010,
    end: 2019,
  },
  {
    value: "2000s",
    label: "2000s",
    start: 2000,
    end: 2009,
  },
  {
    value: "1990s",
    label: "1990s",
    start: 1990,
    end: 1999,
  },
  {
    value: "earlier",
    label: "Earlier",
    start: 0,
    end: 1989,
  },
];

const EVENT_WINDOWS: EventWindow[] = [
  {
    value: "7-days",
    label: "Next 7 Days",
    days: 7,
  },
  {
    value: "30-days",
    label: "Next 30 Days",
    days: 30,
  },
  {
    value: "90-days",
    label: "Next 90 Days",
    days: 90,
  },
  {
    value: "any",
    label: "Any Upcoming Date",
    days: null,
  },
];

const RADIUS_OPTIONS: RadiusOption[] = [
  {
    value: 10,
    label: "10 mi",
  },
  {
    value: 25,
    label: "25 mi",
  },
  {
    value: 50,
    label: "50 mi",
  },
  {
    value: 100,
    label: "100 mi",
  },
];

function readStoredArray(
  key: string
): string[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  try {
    const value =
      window.sessionStorage.getItem(
        key
      );

    if (!value) {
      return [];
    }

    const parsed =
      JSON.parse(value);

    if (
      Array.isArray(parsed)
    ) {
      return parsed.filter(
        (item) =>
          typeof item ===
          "string"
      );
    }
  } catch {
    return [];
  }

  return [];
}

function readStoredString(
  key: string
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  try {
    return (
      window.sessionStorage.getItem(
        key
      ) ?? ""
    );
  } catch {
    return "";
  }
}

function readUrlArray(
  key: string
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  const params =
    new URLSearchParams(
      window.location.search
    );

  const value =
    params.get(key);

  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map(
      (item) =>
        item.trim()
    )
    .filter(Boolean);
}

function readInitialGenres() {
  const fromUrl =
    readUrlArray(
      "genres"
    );

  return fromUrl.length
    ? fromUrl
    : readStoredArray(
        GENRE_STORAGE_KEY
      );
}

function readInitialStatuses() {
  const fromUrl =
    readUrlArray(
      "statuses"
    );

  return fromUrl.length
    ? fromUrl
    : readStoredArray(
        STATUS_STORAGE_KEY
      );
}

function readInitialLocations() {
  const fromUrl =
    readUrlArray(
      "locations"
    );

  return fromUrl.length
    ? fromUrl
    : readStoredArray(
        LOCATION_STORAGE_KEY
      );
}

function readInitialEras() {
  const fromUrl =
    readUrlArray(
      "eras"
    );

  return fromUrl.length
    ? fromUrl
    : readStoredArray(
        ERA_STORAGE_KEY
      );
}

function readInitialListenerRange() {
  if (
    typeof window ===
    "undefined"
  ) {
    return "";
  }

  const params =
    new URLSearchParams(
      window.location.search
    );

  return (
    params.get(
      "listeners"
    ) ??
    readStoredString(
      LISTENER_STORAGE_KEY
    )
  );
}

function readInitialMapMode(): MapMode {
  if (
    typeof window ===
    "undefined"
  ) {
    return "artists";
  }

  const params =
    new URLSearchParams(
      window.location.search
    );

  if (
    params.get(
      "mode"
    ) === "events"
  ) {
    return "events";
  }

  return readStoredString(
    MAP_MODE_STORAGE_KEY
  ) === "events"
    ? "events"
    : "artists";
}

function readInitialEventLocations() {
  const fromUrl =
    readUrlArray(
      "event_locations"
    );

  return fromUrl.length
    ? fromUrl
    : readStoredArray(
        EVENT_LOCATION_STORAGE_KEY
      );
}

function readInitialEventGenres() {
  const fromUrl =
    readUrlArray(
      "event_genres"
    );

  return fromUrl.length
    ? fromUrl
    : readStoredArray(
        EVENT_GENRE_STORAGE_KEY
      );
}

function readInitialEventWindow() {
  if (
    typeof window ===
    "undefined"
  ) {
    return "30-days";
  }

  const params =
    new URLSearchParams(
      window.location.search
    );

  return (
    params.get(
      "event_window"
    ) ??
    readStoredString(
      EVENT_WINDOW_STORAGE_KEY
    ) ??
    "30-days"
  );
}

function readInitialRadius() {
  const stored =
    Number(
      readStoredString(
        EVENT_RADIUS_STORAGE_KEY
      )
    );

  return RADIUS_OPTIONS.some(
    (option) =>
      option.value ===
      stored
  )
    ? stored
    : 25;
}

function updateUrl(
  genres: string[],
  statuses: string[],
  listenerRange: string,
  locations: string[],
  eras: string[],
  mode: MapMode,
  eventLocations: string[],
  eventGenres: string[],
  eventWindow: string
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

  if (statuses.length) {
    url.searchParams.set(
      "statuses",
      statuses.join(",")
    );
  } else {
    url.searchParams.delete(
      "statuses"
    );
  }

  if (listenerRange) {
    url.searchParams.set(
      "listeners",
      listenerRange
    );
  } else {
    url.searchParams.delete(
      "listeners"
    );
  }

  if (locations.length) {
    url.searchParams.set(
      "locations",
      locations.join(",")
    );
  } else {
    url.searchParams.delete(
      "locations"
    );
  }

  if (eras.length) {
    url.searchParams.set(
      "eras",
      eras.join(",")
    );
  } else {
    url.searchParams.delete(
      "eras"
    );
  }

  if (
    mode ===
    "events"
  ) {
    url.searchParams.set(
      "mode",
      "events"
    );

    if (
      eventLocations.length
    ) {
      url.searchParams.set(
        "event_locations",
        eventLocations.join(",")
      );
    } else {
      url.searchParams.delete(
        "event_locations"
      );
    }

    if (
      eventGenres.length
    ) {
      url.searchParams.set(
        "event_genres",
        eventGenres.join(",")
      );
    } else {
      url.searchParams.delete(
        "event_genres"
      );
    }

    if (
      eventWindow !==
      "30-days"
    ) {
      url.searchParams.set(
        "event_window",
        eventWindow
      );
    } else {
      url.searchParams.delete(
        "event_window"
      );
    }
  } else {
    url.searchParams.delete(
      "mode"
    );

    url.searchParams.delete(
      "event_locations"
    );

    url.searchParams.delete(
      "event_genres"
    );

    url.searchParams.delete(
      "event_window"
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
  locations,
}: AtlasExplorerProps) {
  const [
    mapMode,
    setMapMode,
  ] =
    useState<MapMode>(
      "artists"
    );

  const [
    selectedGenres,
    setSelectedGenres,
  ] =
    useState<string[]>(
      []
    );

  const [
    selectedStatuses,
    setSelectedStatuses,
  ] =
    useState<string[]>(
      []
    );

  const [
    selectedListenerRange,
    setSelectedListenerRange,
  ] =
    useState("");

  const [
    selectedLocations,
    setSelectedLocations,
  ] =
    useState<string[]>(
      []
    );

  const [
    selectedEras,
    setSelectedEras,
  ] =
    useState<string[]>(
      []
    );

  const [
    selectedEventLocations,
    setSelectedEventLocations,
  ] =
    useState<string[]>(
      []
    );

  const [
    selectedEventGenres,
    setSelectedEventGenres,
  ] =
    useState<string[]>(
      []
    );

  const [
    selectedEventWindow,
    setSelectedEventWindow,
  ] =
    useState(
      "30-days"
    );

  const [
    selectedRadius,
    setSelectedRadius,
  ] =
    useState(
      25
    );

  const [
    nearLatitude,
    setNearLatitude,
  ] =
    useState<
      number | null
    >(
      null
    );

  const [
    nearLongitude,
    setNearLongitude,
  ] =
    useState<
      number | null
    >(
      null
    );

  const [
    nearMeLoading,
    setNearMeLoading,
  ] =
    useState(false);

  const [
    nearMeError,
    setNearMeError,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    nearMeFocusToken,
    setNearMeFocusToken,
  ] =
    useState(0);

  const [
    hydrated,
    setHydrated,
  ] =
    useState(false);

  const [
    mobileFiltersOpen,
    setMobileFiltersOpen,
  ] =
    useState(false);

  const [
    locationFocusSlug,
    setLocationFocusSlug,
  ] =
    useState<string | null>(
      null
    );

  const [
    locationFocusToken,
    setLocationFocusToken,
  ] =
    useState(0);

  const nearMeActive =
    nearLatitude !==
      null &&
    nearLongitude !==
      null;

  useEffect(
    () => {
      const validGenreSlugs =
        new Set(
          genres.map(
            (genre) =>
              genre.slug
          )
        );

      const validStatusValues =
        new Set(
          ARTIST_STATUSES.map(
            (status) =>
              status.value
          )
        );

      const validListenerValues =
        new Set(
          LISTENER_RANGES.map(
            (range) =>
              range.value
          )
        );

      const validLocationSlugs =
        new Set(
          locations.map(
            (location) =>
              location.slug
          )
        );

      const validEraValues =
        new Set(
          ERA_RANGES.map(
            (era) =>
              era.value
          )
        );

      const validEventWindows =
        new Set(
          EVENT_WINDOWS.map(
            (range) =>
              range.value
          )
        );

      const restoredGenres =
        readInitialGenres().filter(
          (slug) =>
            validGenreSlugs.has(
              slug
            )
        );

      const restoredStatuses =
        readInitialStatuses().filter(
          (status) =>
            validStatusValues.has(
              status
            )
        );

      const listenerValue =
        readInitialListenerRange();

      const restoredListenerRange =
        validListenerValues.has(
          listenerValue
        )
          ? listenerValue
          : "";

      const restoredLocations =
        readInitialLocations().filter(
          (slug) =>
            validLocationSlugs.has(
              slug
            )
        );

      const restoredEras =
        readInitialEras().filter(
          (era) =>
            validEraValues.has(
              era
            )
        );

      const restoredEventLocations =
        readInitialEventLocations().filter(
          (slug) =>
            validLocationSlugs.has(
              slug
            )
        );

      const restoredEventGenres =
        readInitialEventGenres().filter(
          (slug) =>
            validGenreSlugs.has(
              slug
            )
        );

      const eventWindowValue =
        readInitialEventWindow();

      const restoredEventWindow =
        validEventWindows.has(
          eventWindowValue
        )
          ? eventWindowValue
          : "30-days";

      const restoredMode =
        readInitialMapMode();

      setSelectedGenres(
        restoredGenres
      );

      setSelectedStatuses(
        restoredStatuses
      );

      setSelectedListenerRange(
        restoredListenerRange
      );

      setSelectedLocations(
        restoredLocations
      );

      setSelectedEras(
        restoredEras
      );

      setSelectedEventLocations(
        restoredEventLocations
      );

      setSelectedEventGenres(
        restoredEventGenres
      );

      setSelectedEventWindow(
        restoredEventWindow
      );

      setSelectedRadius(
        readInitialRadius()
      );

      setMapMode(
        restoredMode
      );

      updateUrl(
        restoredGenres,
        restoredStatuses,
        restoredListenerRange,
        restoredLocations,
        restoredEras,
        restoredMode,
        restoredEventLocations,
        restoredEventGenres,
        restoredEventWindow
      );

      setHydrated(
        true
      );
    },
    [
      genres,
      locations,
    ]
  );

  useEffect(
    () => {
      if (
        !hydrated
      ) {
        return;
      }

      updateUrl(
        selectedGenres,
        selectedStatuses,
        selectedListenerRange,
        selectedLocations,
        selectedEras,
        mapMode,
        selectedEventLocations,
        selectedEventGenres,
        selectedEventWindow
      );

      try {
        window.sessionStorage.setItem(
          GENRE_STORAGE_KEY,
          JSON.stringify(
            selectedGenres
          )
        );

        window.sessionStorage.setItem(
          STATUS_STORAGE_KEY,
          JSON.stringify(
            selectedStatuses
          )
        );

        window.sessionStorage.setItem(
          LOCATION_STORAGE_KEY,
          JSON.stringify(
            selectedLocations
          )
        );

        window.sessionStorage.setItem(
          ERA_STORAGE_KEY,
          JSON.stringify(
            selectedEras
          )
        );

        window.sessionStorage.setItem(
          MAP_MODE_STORAGE_KEY,
          mapMode
        );

        window.sessionStorage.setItem(
          EVENT_LOCATION_STORAGE_KEY,
          JSON.stringify(
            selectedEventLocations
          )
        );

        window.sessionStorage.setItem(
          EVENT_GENRE_STORAGE_KEY,
          JSON.stringify(
            selectedEventGenres
          )
        );

        window.sessionStorage.setItem(
          EVENT_WINDOW_STORAGE_KEY,
          selectedEventWindow
        );

        window.sessionStorage.setItem(
          EVENT_RADIUS_STORAGE_KEY,
          String(
            selectedRadius
          )
        );

        if (
          selectedListenerRange
        ) {
          window.sessionStorage.setItem(
            LISTENER_STORAGE_KEY,
            selectedListenerRange
          );
        } else {
          window.sessionStorage.removeItem(
            LISTENER_STORAGE_KEY
          );
        }
      } catch {
        // URL persistence still works.
      }
    },
    [
      selectedGenres,
      selectedStatuses,
      selectedListenerRange,
      selectedLocations,
      selectedEras,
      mapMode,
      selectedEventLocations,
      selectedEventGenres,
      selectedEventWindow,
      selectedRadius,
      hydrated,
    ]
  );

  function toggleGenre(
    slug: string
  ) {
    setSelectedGenres(
      (current) =>
        current.includes(
          slug
        )
          ? current.filter(
              (item) =>
                item !==
                slug
            )
          : [
              ...current,
              slug,
            ]
    );
  }

  function toggleEventGenre(
    slug: string
  ) {
    setSelectedEventGenres(
      (current) =>
        current.includes(
          slug
        )
          ? current.filter(
              (item) =>
                item !==
                slug
            )
          : [
              ...current,
              slug,
            ]
    );
  }

  function toggleStatus(
    status: string
  ) {
    setSelectedStatuses(
      (current) =>
        current.includes(
          status
        )
          ? current.filter(
              (item) =>
                item !==
                status
            )
          : [
              ...current,
              status,
            ]
    );
  }

  function toggleLocation(
    slug: string
  ) {
    const isSelected =
      selectedLocations.includes(
        slug
      );

    setSelectedLocations(
      (current) =>
        current.includes(
          slug
        )
          ? current.filter(
              (item) =>
                item !==
                slug
            )
          : [
              ...current,
              slug,
            ]
    );

    if (!isSelected) {
      setLocationFocusSlug(
        slug
      );

      setLocationFocusToken(
        (current) =>
          current + 1
      );
    }
  }

  function toggleEventLocation(
    slug: string
  ) {
    const isSelected =
      selectedEventLocations.includes(
        slug
      );

    if (
      nearMeActive
    ) {
      setNearLatitude(
        null
      );

      setNearLongitude(
        null
      );

      setNearMeError(
        null
      );
    }

    setSelectedEventLocations(
      (current) =>
        current.includes(
          slug
        )
          ? current.filter(
              (item) =>
                item !==
                slug
            )
          : [
              ...current,
              slug,
            ]
    );

    if (!isSelected) {
      setLocationFocusSlug(
        slug
      );

      setLocationFocusToken(
        (current) =>
          current + 1
      );
    }
  }

  function toggleEra(
    value: string
  ) {
    setSelectedEras(
      (current) =>
        current.includes(
          value
        )
          ? current.filter(
              (item) =>
                item !==
                value
            )
          : [
              ...current,
              value,
            ]
    );
  }

  function toggleListenerRange(
    value: string
  ) {
    setSelectedListenerRange(
      (current) =>
        current ===
        value
          ? ""
          : value
    );
  }

  function clearArtistFilters() {
    setSelectedGenres([]);
    setSelectedStatuses([]);
    setSelectedListenerRange("");
    setSelectedLocations([]);
    setSelectedEras([]);
  }

  function disableNearMe() {
    setNearLatitude(
      null
    );

    setNearLongitude(
      null
    );

    setNearMeError(
      null
    );
  }

  function clearEventFilters() {
    setSelectedEventLocations(
      []
    );

    setSelectedEventGenres(
      []
    );

    setSelectedEventWindow(
      "30-days"
    );

    setSelectedRadius(
      25
    );

    disableNearMe();
  }

  function changeRadius(
    radius: number
  ) {
    setSelectedRadius(
      radius
    );

    if (
      nearMeActive
    ) {
      setNearMeFocusToken(
        (current) =>
          current + 1
      );
    }
  }

  function activateNearMe() {
    if (
      typeof navigator ===
        "undefined" ||
      !navigator.geolocation
    ) {
      setNearMeError(
        "Location services are not available in this browser."
      );

      return;
    }

    setNearMeLoading(
      true
    );

    setNearMeError(
      null
    );

    navigator.geolocation.getCurrentPosition(
      (
        position
      ) => {
        setSelectedEventLocations(
          []
        );

        setNearLatitude(
          position.coords
            .latitude
        );

        setNearLongitude(
          position.coords
            .longitude
        );

        setNearMeLoading(
          false
        );

        setNearMeError(
          null
        );

        setNearMeFocusToken(
          (current) =>
            current + 1
        );
      },
      (
        error
      ) => {
        setNearMeLoading(
          false
        );

        if (
          error.code ===
          error.PERMISSION_DENIED
        ) {
          setNearMeError(
            "Location access was denied. Enable location access in your browser to use Near Me."
          );

          return;
        }

        if (
          error.code ===
          error.POSITION_UNAVAILABLE
        ) {
          setNearMeError(
            "Your location could not be determined."
          );

          return;
        }

        if (
          error.code ===
          error.TIMEOUT
        ) {
          setNearMeError(
            "Location lookup timed out. Try again."
          );

          return;
        }

        setNearMeError(
          "Unable to get your location."
        );
      },
      {
        enableHighAccuracy:
          false,
        timeout:
          10000,
        maximumAge:
          300000,
      }
    );
  }

  const listenerRange =
    useMemo(
      () =>
        LISTENER_RANGES.find(
          (range) =>
            range.value ===
            selectedListenerRange
        ) ?? null,
      [
        selectedListenerRange,
      ]
    );

  const selectedEraRanges =
    useMemo(
      () =>
        ERA_RANGES.filter(
          (era) =>
            selectedEras.includes(
              era.value
            )
        ),
      [
        selectedEras,
      ]
    );

  const selectedEventRange =
    useMemo(
      () =>
        EVENT_WINDOWS.find(
          (range) =>
            range.value ===
            selectedEventWindow
        ) ??
        EVENT_WINDOWS[1],
      [
        selectedEventWindow,
      ]
    );

  const eventStartBefore =
    useMemo(
      () => {
        if (
          selectedEventRange.days ===
          null
        ) {
          return null;
        }

        const date =
          new Date();

        date.setDate(
          date.getDate() +
            selectedEventRange.days
        );

        return date.toISOString();
      },
      [
        selectedEventRange,
      ]
    );

  const eraStarts =
    selectedEraRanges.map(
      (era) =>
        era.start
    );

  const eraEnds =
    selectedEraRanges.map(
      (era) =>
        era.end
    );

  const activeArtistFilterCount =
    selectedGenres.length +
    selectedStatuses.length +
    selectedLocations.length +
    selectedEras.length +
    (
      selectedListenerRange
        ? 1
        : 0
    );

  const hasArtistFilters =
    activeArtistFilterCount >
    0;

  const activeEventFilterCount =
    selectedEventLocations.length +
    selectedEventGenres.length +
    (
      selectedEventWindow !==
        "30-days"
        ? 1
        : 0
    ) +
    (
      nearMeActive
        ? 1
        : 0
    );

  const hasEventFilters =
    activeEventFilterCount >
    0;

  const isArtistMode =
    mapMode ===
    "artists";

  return (
    <section className="mx-auto max-w-7xl px-3 py-6 sm:px-8 sm:py-10 lg:px-10">
      <div className="mb-5 flex flex-col gap-5 sm:mb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em]">
            Explore the Atlas
          </p>

          <h2 className="mt-2 text-3xl font-black uppercase sm:text-4xl">
            {isArtistMode
              ? "Find Music by Geography"
              : "Find Live Music by Geography"}
          </h2>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-black/65 sm:text-base">
            {isArtistMode
              ? "Move around the map, refine results by location, genre, era, artist status, or audience size, then select a marker to discover an artist."
              : "Explore upcoming shows by genre, location, date, or distance from your current position."}
          </p>
        </div>

        <div className="flex w-full border-2 border-black bg-white sm:w-fit">
          <button
            type="button"
            onClick={() =>
              setMapMode(
                "artists"
              )
            }
            aria-pressed={
              isArtistMode
            }
            className={
              isArtistMode
                ? "min-h-11 flex-1 bg-black px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white sm:flex-none"
                : "min-h-11 flex-1 bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.14em] transition-colors hover:bg-black hover:text-white sm:flex-none"
            }
          >
            Artists
          </button>

          <button
            type="button"
            onClick={() =>
              setMapMode(
                "events"
              )
            }
            aria-pressed={
              !isArtistMode
            }
            className={
              !isArtistMode
                ? "min-h-11 flex-1 border-l-2 border-black bg-black px-5 py-3 text-xs font-black uppercase tracking-[0.14em] text-white sm:flex-none"
                : "min-h-11 flex-1 border-l-2 border-black bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.14em] transition-colors hover:bg-black hover:text-white sm:flex-none"
            }
          >
            Events
          </button>
        </div>
      </div>

      {isArtistMode ? (
        <section className="border-2 border-black bg-white">
          <div className="flex flex-col gap-3 border-b-2 border-black p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em]">
                Refine the Map
              </p>

              <p className="mt-1 text-xs text-black/55">
                Combine location, genre, era, status, and listener filters.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="text-xs font-black uppercase tracking-[0.12em]">
                {hasArtistFilters
                  ? `${activeArtistFilterCount} ${
                      activeArtistFilterCount ===
                      1
                        ? "Filter"
                        : "Filters"
                    } Active`
                  : "All Artists"}
              </div>

              {hasArtistFilters && (
                <button
                  type="button"
                  onClick={
                    clearArtistFilters
                  }
                  className="min-h-10 border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition-colors hover:bg-black hover:text-white"
                >
                  Clear Filters
                </button>
              )}

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
                className="min-h-10 border-2 border-black bg-black px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white sm:hidden"
              >
                {mobileFiltersOpen
                  ? "Hide Filters"
                  : "Show Filters"}
              </button>
            </div>
          </div>

          <div
            className={
              mobileFiltersOpen
                ? "block"
                : "hidden sm:block"
            }
          >
            <div className="border-b-2 border-black">
              <div className="border-b border-black/20 px-4 py-3 sm:px-5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em]">
                  Location
                </p>
              </div>

              <div className="flex flex-wrap gap-2 p-3 sm:p-5">
                {locations.map(
                  (
                    location
                  ) => {
                    const selected =
                      selectedLocations.includes(
                        location.slug
                      );

                    return (
                      <button
                        key={
                          location.id
                        }
                        type="button"
                        onClick={() =>
                          toggleLocation(
                            location.slug
                          )
                        }
                        className={
                          selected
                            ? "min-h-11 border-2 border-black bg-black px-3 py-2 text-xs font-black uppercase text-white"
                            : "min-h-11 border-2 border-black bg-[#f3efe4] px-3 py-2 text-xs font-black uppercase transition-colors hover:bg-black hover:text-white"
                        }
                      >
                        {[
                          location.name,
                          location.region,
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            ", "
                          )}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="border-b-2 border-black">
              <div className="border-b border-black/20 px-4 py-3 sm:px-5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em]">
                  Genre
                </p>
              </div>

              <div className="flex flex-wrap gap-2 p-3 sm:p-5">
                {genres.map(
                  (
                    genre
                  ) => {
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
            </div>

            <div className="border-b-2 border-black">
              <div className="border-b border-black/20 px-4 py-3 sm:px-5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em]">
                  Era
                </p>
              </div>

              <div className="flex flex-wrap gap-2 p-3 sm:p-5">
                {ERA_RANGES.map(
                  (
                    era
                  ) => {
                    const selected =
                      selectedEras.includes(
                        era.value
                      );

                    return (
                      <button
                        key={
                          era.value
                        }
                        type="button"
                        onClick={() =>
                          toggleEra(
                            era.value
                          )
                        }
                        className={
                          selected
                            ? "min-h-11 border-2 border-black bg-black px-3 py-2 text-xs font-black uppercase text-white"
                            : "min-h-11 border-2 border-black bg-[#f3efe4] px-3 py-2 text-xs font-black uppercase transition-colors hover:bg-black hover:text-white"
                        }
                      >
                        {
                          era.label
                        }
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="border-b-2 border-black">
              <div className="border-b border-black/20 px-4 py-3 sm:px-5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em]">
                  Artist Status
                </p>
              </div>

              <div className="flex flex-wrap gap-2 p-3 sm:p-5">
                {ARTIST_STATUSES.map(
                  (
                    status
                  ) => {
                    const selected =
                      selectedStatuses.includes(
                        status.value
                      );

                    return (
                      <button
                        key={
                          status.value
                        }
                        type="button"
                        onClick={() =>
                          toggleStatus(
                            status.value
                          )
                        }
                        className={
                          selected
                            ? "min-h-11 border-2 border-black bg-black px-3 py-2 text-xs font-black uppercase text-white"
                            : "min-h-11 border-2 border-black bg-[#f3efe4] px-3 py-2 text-xs font-black uppercase transition-colors hover:bg-black hover:text-white"
                        }
                      >
                        {
                          status.label
                        }
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div>
              <div className="border-b border-black/20 px-4 py-3 sm:px-5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em]">
                  Monthly Listeners
                </p>
              </div>

              <div className="flex flex-wrap gap-2 p-3 sm:p-5">
                {LISTENER_RANGES.map(
                  (
                    range
                  ) => {
                    const selected =
                      selectedListenerRange ===
                      range.value;

                    return (
                      <button
                        key={
                          range.value
                        }
                        type="button"
                        onClick={() =>
                          toggleListenerRange(
                            range.value
                          )
                        }
                        className={
                          selected
                            ? "min-h-11 border-2 border-black bg-black px-3 py-2 text-xs font-black uppercase text-white"
                            : "min-h-11 border-2 border-black bg-[#f3efe4] px-3 py-2 text-xs font-black uppercase transition-colors hover:bg-black hover:text-white"
                        }
                      >
                        {
                          range.label
                        }
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="border-2 border-black bg-white">
          <div className="flex flex-col gap-3 border-b-2 border-black p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em]">
                Refine Upcoming Events
              </p>

              <p className="mt-1 text-xs text-black/55">
                Filter live events by genre, date, place, or distance.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="text-xs font-black uppercase tracking-[0.12em]">
                {hasEventFilters
                  ? `${activeEventFilterCount} ${
                      activeEventFilterCount ===
                      1
                        ? "Filter"
                        : "Filters"
                    } Active`
                  : "Next 30 Days"}
              </div>

              {hasEventFilters && (
                <button
                  type="button"
                  onClick={
                    clearEventFilters
                  }
                  className="min-h-10 border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition-colors hover:bg-black hover:text-white"
                >
                  Clear Filters
                </button>
              )}

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
                className="min-h-10 border-2 border-black bg-black px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white sm:hidden"
              >
                {mobileFiltersOpen
                  ? "Hide Filters"
                  : "Show Filters"}
              </button>
            </div>
          </div>

          <div
            className={
              mobileFiltersOpen
                ? "block"
                : "hidden sm:block"
            }
          >
            {/* DATE */}

            <div className="border-b-2 border-black">
              <div className="border-b border-black/20 px-4 py-3 sm:px-5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em]">
                  Date
                </p>

                <p className="mt-1 text-xs text-black/50">
                  Choose how far ahead to explore.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 p-3 sm:p-5">
                {EVENT_WINDOWS.map(
                  (
                    range
                  ) => {
                    const selected =
                      selectedEventWindow ===
                      range.value;

                    return (
                      <button
                        key={
                          range.value
                        }
                        type="button"
                        onClick={() =>
                          setSelectedEventWindow(
                            range.value
                          )
                        }
                        className={
                          selected
                            ? "min-h-11 border-2 border-black bg-black px-3 py-2 text-xs font-black uppercase text-white"
                            : "min-h-11 border-2 border-black bg-[#f3efe4] px-3 py-2 text-xs font-black uppercase transition-colors hover:bg-black hover:text-white"
                        }
                      >
                        {
                          range.label
                        }
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* EVENT GENRE */}

            <div className="border-b-2 border-black">
              <div className="border-b border-black/20 px-4 py-3 sm:px-5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em]">
                  Genre
                </p>

                <p className="mt-1 text-xs text-black/50">
                  Match shows containing at least one artist in the selected genres.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 p-3 sm:p-5">
                {genres.map(
                  (
                    genre
                  ) => {
                    const selected =
                      selectedEventGenres.includes(
                        genre.slug
                      );

                    return (
                      <button
                        key={
                          genre.id
                        }
                        type="button"
                        onClick={() =>
                          toggleEventGenre(
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
            </div>

            {/* NEAR ME */}

            <div className="border-b-2 border-black">
              <div className="border-b border-black/20 px-4 py-3 sm:px-5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em]">
                  Near Me
                </p>

                <p className="mt-1 text-xs text-black/50">
                  Find events within a radius of your current location.
                </p>
              </div>

              <div className="p-3 sm:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <button
                    type="button"
                    disabled={
                      nearMeLoading
                    }
                    onClick={
                      activateNearMe
                    }
                    className={
                      nearMeActive
                        ? "min-h-11 w-full border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase tracking-[0.1em] text-white sm:w-auto"
                        : "min-h-11 w-full border-2 border-black bg-[#f3efe4] px-4 py-2 text-xs font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white disabled:opacity-50 sm:w-auto"
                    }
                  >
                    {nearMeLoading
                      ? "Finding Location..."
                      : nearMeActive
                        ? "Using My Location"
                        : "Use My Location"}
                  </button>

                  {nearMeActive && (
                    <button
                      type="button"
                      onClick={
                        disableNearMe
                      }
                      className="min-h-11 w-full border-2 border-black bg-white px-4 py-2 text-xs font-black uppercase sm:w-auto"
                    >
                      Turn Off
                    </button>
                  )}
                </div>

                {nearMeError && (
                  <p className="mt-3 text-xs font-bold text-red-700">
                    {
                      nearMeError
                    }
                  </p>
                )}

                {nearMeActive && (
                  <div className="mt-5 border-t border-black/20 pt-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em]">
                      Radius
                    </p>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {RADIUS_OPTIONS.map(
                        (
                          option
                        ) => {
                          const selected =
                            selectedRadius ===
                            option.value;

                          return (
                            <button
                              key={
                                option.value
                              }
                              type="button"
                              onClick={() =>
                                changeRadius(
                                  option.value
                                )
                              }
                              className={
                                selected
                                  ? "min-h-11 border-2 border-black bg-black px-3 py-2 text-xs font-black uppercase text-white"
                                  : "min-h-11 border-2 border-black bg-[#f3efe4] px-3 py-2 text-xs font-black uppercase"
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
                )}
              </div>
            </div>

            {/* LOCATION */}

            <div>
              <div className="border-b border-black/20 px-4 py-3 sm:px-5">
                <p className="text-[10px] font-black uppercase tracking-[0.18em]">
                  Location
                </p>

                <p className="mt-1 text-xs text-black/50">
                  Or select one or more Atlas locations.
                </p>
              </div>

              <div className="flex flex-wrap gap-2 p-3 sm:p-5">
                {locations.map(
                  (
                    location
                  ) => {
                    const selected =
                      selectedEventLocations.includes(
                        location.slug
                      );

                    return (
                      <button
                        key={
                          location.id
                        }
                        type="button"
                        onClick={() =>
                          toggleEventLocation(
                            location.slug
                          )
                        }
                        className={
                          selected
                            ? "min-h-11 border-2 border-black bg-black px-3 py-2 text-xs font-black uppercase text-white"
                            : "min-h-11 border-2 border-black bg-[#f3efe4] px-3 py-2 text-xs font-black uppercase"
                        }
                      >
                        {[
                          location.name,
                          location.region,
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            ", "
                          )}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ACTIVE EVENT FILTERS */}

      {!isArtistMode &&
        hasEventFilters && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[10px] font-black uppercase tracking-[0.16em] text-black/50">
              Showing
            </span>

            {selectedEventGenres.map(
              (
                slug
              ) => {
                const genre =
                  genres.find(
                    (
                      item
                    ) =>
                      item.slug ===
                      slug
                  );

                if (
                  !genre
                ) {
                  return null;
                }

                return (
                  <button
                    key={`event-genre-${genre.id}`}
                    type="button"
                    onClick={() =>
                      toggleEventGenre(
                        genre.slug
                      )
                    }
                    className="min-h-10 border-2 border-black bg-black px-2.5 py-1.5 text-[10px] font-black uppercase text-white"
                  >
                    {
                      genre.name
                    }{" "}
                    ×
                  </button>
                );
              }
            )}

            {nearMeActive && (
              <button
                type="button"
                onClick={
                  disableNearMe
                }
                className="min-h-10 border-2 border-black bg-black px-2.5 py-1.5 text-[10px] font-black uppercase text-white"
              >
                Near Me ·{" "}
                {
                  selectedRadius
                }{" "}
                mi ×
              </button>
            )}

            {selectedEventWindow !==
              "30-days" && (
              <button
                type="button"
                onClick={() =>
                  setSelectedEventWindow(
                    "30-days"
                  )
                }
                className="min-h-10 border-2 border-black bg-white px-2.5 py-1.5 text-[10px] font-black uppercase"
              >
                {
                  selectedEventRange.label
                }{" "}
                ×
              </button>
            )}

            {selectedEventLocations.map(
              (
                slug
              ) => {
                const location =
                  locations.find(
                    (
                      item
                    ) =>
                      item.slug ===
                      slug
                  );

                if (
                  !location
                ) {
                  return null;
                }

                return (
                  <button
                    key={`event-location-${location.id}`}
                    type="button"
                    onClick={() =>
                      toggleEventLocation(
                        location.slug
                      )
                    }
                    className="min-h-10 border-2 border-black bg-black px-2.5 py-1.5 text-[10px] font-black uppercase text-white"
                  >
                    {
                      location.name
                    }{" "}
                    ×
                  </button>
                );
              }
            )}
          </div>
        )}

      {/* ACTIVE ARTIST FILTERS */}

      {isArtistMode &&
        hasArtistFilters && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[10px] font-black uppercase tracking-[0.16em] text-black/50">
              Showing
            </span>

            <button
              type="button"
              onClick={
                clearArtistFilters
              }
              className="min-h-10 border-2 border-black bg-white px-2.5 py-1.5 text-[10px] font-black uppercase"
            >
              Clear All ×
            </button>
          </div>
        )}

      {/* MAP */}

      <div className="mt-5 sm:mt-6">
        <AtlasMap
          mode={
            mapMode
          }

          selectedGenres={
            selectedGenres
          }

          selectedStatuses={
            selectedStatuses
          }

          selectedLocations={
            selectedLocations
          }

          eraStarts={
            eraStarts
          }

          eraEnds={
            eraEnds
          }

          minListeners={
            listenerRange?.min ??
            null
          }

          maxListeners={
            listenerRange?.max ??
            null
          }

          eventLocations={
            selectedEventLocations
          }

          eventGenres={
            selectedEventGenres
          }

          eventStartBefore={
            eventStartBefore
          }

          eventNearLatitude={
            nearLatitude
          }

          eventNearLongitude={
            nearLongitude
          }

          eventRadiusMiles={
            nearMeActive
              ? selectedRadius
              : null
          }

          locationFocusSlug={
            locationFocusSlug
          }

          locationFocusToken={
            locationFocusToken
          }

          nearMeFocusToken={
            nearMeFocusToken
          }
        />
      </div>

      <div className="grid border-x-2 border-b-2 border-black bg-white sm:grid-cols-2">
        <div className="border-black p-4 sm:border-r-2 sm:p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/50">
            Discover
          </p>

          <p className="mt-2 text-sm font-bold">
            {isArtistMode
              ? "Select an artist marker to learn more."
              : "Select an event marker to see the show, venue, lineup, and distance."}
          </p>
        </div>

        <div className="border-t-2 border-black p-4 sm:border-t-0 sm:p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/50">
            Explore
          </p>

          <p className="mt-2 text-sm font-bold">
            {nearMeActive &&
            !isArtistMode
              ? `Showing upcoming events within ${selectedRadius} miles of your location.`
              : "Pan and zoom to uncover music and events in other places."}
          </p>
        </div>
      </div>
    </section>
  );
}