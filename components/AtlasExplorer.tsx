"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import AtlasMap from "@/components/map/AtlasMap";
import { createClient } from "@/lib/supabase/client";

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
  country_code: string | null;
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

type AtlasVisibleResult = {
  kind: "artist" | "event";
  id: string;
  name: string;
  slug: string;
  subtitle?: string;
  startAt?: string;
  latitude?: number | null;
  longitude?: number | null;
};

type ResultScope =
  | "filtered"
  | "map";

type EssentialTrackLink = {
  platform: string;
  url: string;
  label: string | null;
};

type EssentialTrackResult = {
  playlist_id: string;
  playlist_name: string;
  playlist_slug: string;
  playlist_description: string | null;
  playlist_position: number;
  editorial_note: string | null;
  track_id: string;
  track_title: string;
  artist_id: string;
  artist_name: string;
  artist_slug: string;
  release_title: string | null;
  latitude: number | null;
  longitude: number | null;
  links: EssentialTrackLink[] | null;
};

const GENRE_STORAGE_KEY =
  "underground-atlas-genres";

const STATUS_STORAGE_KEY =
  "underground-atlas-statuses";

const LISTENER_STORAGE_KEY =
  "underground-atlas-listener-range";

const LOCATION_STORAGE_KEY =
  "underground-atlas-locations";

const CONTINENT_STORAGE_KEY =
  "underground-atlas-continents";

const COUNTRY_STORAGE_KEY =
  "underground-atlas-countries";

const ERA_STORAGE_KEY =
  "underground-atlas-eras";

const EVENT_LOCATION_STORAGE_KEY =
  "underground-atlas-event-locations";

const EVENT_CONTINENT_STORAGE_KEY =
  "underground-atlas-event-continents";

const EVENT_COUNTRY_STORAGE_KEY =
  "underground-atlas-event-countries";

const EVENT_GENRE_STORAGE_KEY =
  "underground-atlas-event-genres";

const EVENT_WINDOW_STORAGE_KEY =
  "underground-atlas-event-window";

const EVENT_RADIUS_STORAGE_KEY =
  "underground-atlas-event-radius";

type ContinentName =
  | "Africa"
  | "Asia"
  | "Europe"
  | "North America"
  | "Oceania"
  | "South America";

const CONTINENT_CODE_GROUPS: Record<
  ContinentName,
  string[]
> = {
  Africa: [
    "DZ", "AO", "BJ", "BW", "BF", "BI", "CV", "CM",
    "CF", "TD", "KM", "CG", "CD", "CI", "DJ", "EG",
    "GQ", "ER", "SZ", "ET", "GA", "GM", "GH", "GN",
    "GW", "KE", "LS", "LR", "LY", "MG", "MW", "ML",
    "MR", "MU", "YT", "MA", "MZ", "NA", "NE", "NG",
    "RE", "RW", "SH", "ST", "SN", "SC", "SL", "SO",
    "ZA", "SS", "SD", "TZ", "TG", "TN", "UG", "EH",
    "ZM", "ZW",
  ],
  Asia: [
    "AF", "AM", "AZ", "BH", "BD", "BT", "BN", "KH",
    "CN", "CY", "GE", "HK", "IN", "ID", "IR", "IQ",
    "IL", "JP", "JO", "KZ", "KW", "KG", "LA", "LB",
    "MO", "MY", "MV", "MN", "MM", "NP", "KP", "OM",
    "PK", "PS", "PH", "QA", "SA", "SG", "KR", "LK",
    "SY", "TW", "TJ", "TH", "TL", "TR", "TM", "AE",
    "UZ", "VN", "YE",
  ],
  Europe: [
    "AX", "AL", "AD", "AT", "BY", "BE", "BA", "BG",
    "HR", "CZ", "DK", "EE", "FO", "FI", "FR", "DE",
    "GI", "GR", "GG", "VA", "HU", "IS", "IE", "IM",
    "IT", "JE", "LV", "LI", "LT", "LU", "MT", "MD",
    "MC", "ME", "NL", "MK", "NO", "PL", "PT", "RO",
    "RU", "SM", "RS", "SK", "SI", "ES", "SJ", "SE",
    "CH", "UA", "GB", "XK",
  ],
  "North America": [
    "AI", "AG", "AW", "BS", "BB", "BZ", "BM", "BQ",
    "VG", "CA", "KY", "CR", "CU", "CW", "DM", "DO",
    "SV", "GL", "GD", "GP", "GT", "HT", "HN", "JM",
    "MQ", "MX", "MS", "NI", "PA", "PR", "BL", "KN",
    "LC", "MF", "PM", "VC", "SX", "TT", "TC", "US",
    "VI",
  ],
  Oceania: [
    "AS", "AU", "CK", "FJ", "PF", "GU", "KI", "MH",
    "FM", "NR", "NC", "NZ", "NU", "NF", "MP", "PW",
    "PG", "PN", "WS", "SB", "TK", "TO", "TV", "VU",
    "WF",
  ],
  "South America": [
    "AR", "BO", "BR", "CL", "CO", "EC", "FK", "GF",
    "GY", "PY", "PE", "SR", "UY", "VE",
  ],
};

const COUNTRY_CODE_TO_CONTINENT =
  Object.entries(
    CONTINENT_CODE_GROUPS
  ).reduce(
    (
      result,
      [continent, codes]
    ) => {
      codes.forEach(
        (code) => {
          result[code] =
            continent as ContinentName;
        }
      );

      return result;
    },
    {} as Record<
      string,
      ContinentName
    >
  );

function normalizeCountryCode(
  value: string | null
) {
  return value
    ?.trim()
    .toUpperCase() ?? "";
}

function countryKey(
  location: Location
) {
  const code =
    normalizeCountryCode(
      location.country_code
    );

  return code
    ? code
    : `country:${location.country
        .trim()
        .toLowerCase()}`;
}

function continentForLocation(
  location: Location
): ContinentName | null {
  const code =
    normalizeCountryCode(
      location.country_code
    );

  return code
    ? COUNTRY_CODE_TO_CONTINENT[
        code
      ] ?? null
    : null;
}

function resolveGeographicLocationSlugs(
  locations: Location[],
  continents: string[],
  countries: string[]
) {
  if (
    continents.length === 0 &&
    countries.length === 0
  ) {
    return [];
  }

  return locations
    .filter(
      (location) => {
        const continent =
          continentForLocation(
            location
          );

        const country =
          countryKey(
            location
          );

        return (
          (
            continent !==
              null &&
            continents.includes(
              continent
            )
          ) ||
          countries.includes(
            country
          )
        );
      }
    )
    .map(
      (location) =>
        location.slug
    );
}

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

function readInitialArtistSlug() {
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
      "artist"
    )?.trim() ?? ""
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

function readInitialContinents() {
  const fromUrl =
    readUrlArray(
      "continents"
    );

  return fromUrl.length
    ? fromUrl
    : readStoredArray(
        CONTINENT_STORAGE_KEY
      );
}

function readInitialCountries() {
  const fromUrl =
    readUrlArray(
      "countries"
    );

  return fromUrl.length
    ? fromUrl
    : readStoredArray(
        COUNTRY_STORAGE_KEY
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
  /*
   * The homepage always opens in Artist mode.
   * Event mode is an interaction state, not a
   * persisted initial state.
   */
  return "artists";
}

function readInitialEventContinents() {
  const fromUrl =
    readUrlArray(
      "event_continents"
    );

  return fromUrl.length
    ? fromUrl
    : readStoredArray(
        EVENT_CONTINENT_STORAGE_KEY
      );
}

function readInitialEventCountries() {
  const fromUrl =
    readUrlArray(
      "event_countries"
    );

  return fromUrl.length
    ? fromUrl
    : readStoredArray(
        EVENT_COUNTRY_STORAGE_KEY
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
  continents: string[],
  countries: string[],
  eras: string[],
  mode: MapMode,
  eventLocations: string[],
  eventContinents: string[],
  eventCountries: string[],
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

  url.searchParams.delete(
    "locations"
  );

  if (continents.length) {
    url.searchParams.set(
      "continents",
      continents.join(",")
    );
  } else {
    url.searchParams.delete(
      "continents"
    );
  }

  if (countries.length) {
    url.searchParams.set(
      "countries",
      countries.join(",")
    );
  } else {
    url.searchParams.delete(
      "countries"
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

    url.searchParams.delete(
      "event_locations"
    );

    if (
      eventContinents.length
    ) {
      url.searchParams.set(
        "event_continents",
        eventContinents.join(",")
      );
    } else {
      url.searchParams.delete(
        "event_continents"
      );
    }

    if (
      eventCountries.length
    ) {
      url.searchParams.set(
        "event_countries",
        eventCountries.join(",")
      );
    } else {
      url.searchParams.delete(
        "event_countries"
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
      "event_continents"
    );

    url.searchParams.delete(
      "event_countries"
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
    selectedContinents,
    setSelectedContinents,
  ] =
    useState<string[]>(
      []
    );

  const [
    selectedCountries,
    setSelectedCountries,
  ] =
    useState<string[]>(
      []
    );

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
    selectedEventContinents,
    setSelectedEventContinents,
  ] =
    useState<string[]>(
      []
    );

  const [
    selectedEventCountries,
    setSelectedEventCountries,
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
    activeFilterTab,
    setActiveFilterTab,
  ] =
    useState<
      | "location"
      | "genre"
      | "era"
      | "status"
      | "listeners"
      | "date"
      | "near-me"
      | "places"
      | null
    >(null);

  const [
    resultCount,
    setResultCount,
  ] =
    useState(0);

  const [
    visibleResults,
    setVisibleResults,
  ] =
    useState<AtlasVisibleResult[]>([]);

  const [
    filterResults,
    setFilterResults,
  ] =
    useState<AtlasVisibleResult[]>([]);

  const [
    filterResultsLoading,
    setFilterResultsLoading,
  ] =
    useState(false);

  const [
    essentialTracks,
    setEssentialTracks,
  ] =
    useState<EssentialTrackResult[]>(
      []
    );

  const [
    essentialTracksLoading,
    setEssentialTracksLoading,
  ] =
    useState(false);

  const [
    filterFitToken,
    setFilterFitToken,
  ] =
    useState(0);

  const [
    resultScope,
    setResultScope,
  ] =
    useState<ResultScope>(
      "map"
    );

  const [
    resultFocusLatitude,
    setResultFocusLatitude,
  ] =
    useState<number | null>(
      null
    );

  const [
    resultFocusLongitude,
    setResultFocusLongitude,
  ] =
    useState<number | null>(
      null
    );

  const [
    resultFocusToken,
    setResultFocusToken,
  ] =
    useState(0);

  const [
    artistFocusSlug,
    setArtistFocusSlug,
  ] =
    useState<string | null>(
      null
    );

  const [
    artistFocusHandled,
    setArtistFocusHandled,
  ] =
    useState(false);

  const supabase =
    useMemo(
      () =>
        createClient(),
      []
    );

  const [
    drawerOpen,
    setDrawerOpen,
  ] =
    useState(false);

  const [
    mobileFiltersCollapsed,
    setMobileFiltersCollapsed,
  ] =
    useState(false);

  const [
    mapSearchQuery,
    setMapSearchQuery,
  ] =
    useState("");

  const [
    mapSearchOpen,
    setMapSearchOpen,
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

  const availableCountries =
    useMemo(
      () => {
        const byKey =
          new Map<
            string,
            {
              value: string;
              label: string;
              continent:
                | ContinentName
                | null;
            }
          >();

        locations.forEach(
          (location) => {
            const value =
              countryKey(
                location
              );

            if (
              byKey.has(
                value
              )
            ) {
              return;
            }

            byKey.set(
              value,
              {
                value,
                label:
                  location.country,
                continent:
                  continentForLocation(
                    location
                  ),
              }
            );
          }
        );

        return Array.from(
          byKey.values()
        ).sort(
          (
            a,
            b
          ) =>
            a.label.localeCompare(
              b.label
            )
        );
      },
      [
        locations,
      ]
    );

  const availableContinents =
    useMemo(
      () => {
        const values =
          new Set<
            ContinentName
          >();

        availableCountries.forEach(
          (
            country
          ) => {
            if (
              country.continent
            ) {
              values.add(
                country.continent
              );
            }
          }
        );

        return Array.from(
          values
        ).sort(
          (
            a,
            b
          ) =>
            a.localeCompare(
              b
            )
        );
      },
      [
        availableCountries,
      ]
    );

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

      const validContinents =
        new Set(
          availableContinents
        );

      const validCountries =
        new Set(
          availableCountries.map(
            (
              country
            ) =>
              country.value
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

      const restoredContinents =
        readInitialContinents().filter(
          (
            continent
          ) =>
            validContinents.has(
              continent as ContinentName
            )
        );

      const restoredCountries =
        readInitialCountries().filter(
          (
            country
          ) =>
            validCountries.has(
              country
            )
        );

      const restoredLocations =
        resolveGeographicLocationSlugs(
          locations,
          restoredContinents,
          restoredCountries
        );

      const restoredEras =
        readInitialEras().filter(
          (era) =>
            validEraValues.has(
              era
            )
        );

      const restoredEventContinents =
        readInitialEventContinents().filter(
          (
            continent
          ) =>
            validContinents.has(
              continent as ContinentName
            )
        );

      const restoredEventCountries =
        readInitialEventCountries().filter(
          (
            country
          ) =>
            validCountries.has(
              country
            )
        );

      const restoredEventLocations =
        resolveGeographicLocationSlugs(
          locations,
          restoredEventContinents,
          restoredEventCountries
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

      const restoredArtistFocusSlug =
        readInitialArtistSlug();

      setArtistFocusSlug(
        restoredArtistFocusSlug ||
        null
      );

      setArtistFocusHandled(
        false
      );

      setSelectedGenres(
        restoredGenres
      );

      setSelectedStatuses(
        restoredStatuses
      );

      setSelectedListenerRange(
        restoredListenerRange
      );

      setSelectedContinents(
        restoredContinents
      );

      setSelectedCountries(
        restoredCountries
      );

      setSelectedLocations(
        restoredLocations
      );

      setSelectedEras(
        restoredEras
      );

      setSelectedEventContinents(
        restoredEventContinents
      );

      setSelectedEventCountries(
        restoredEventCountries
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
        restoredContinents,
        restoredCountries,
        restoredEras,
        restoredMode,
        restoredEventLocations,
        restoredEventContinents,
        restoredEventCountries,
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
      availableContinents,
      availableCountries,
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
        selectedContinents,
        selectedCountries,
        selectedEras,
        mapMode,
        selectedEventLocations,
        selectedEventContinents,
        selectedEventCountries,
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
          CONTINENT_STORAGE_KEY,
          JSON.stringify(
            selectedContinents
          )
        );

        window.sessionStorage.setItem(
          COUNTRY_STORAGE_KEY,
          JSON.stringify(
            selectedCountries
          )
        );

        window.sessionStorage.removeItem(
          LOCATION_STORAGE_KEY
        );

        window.sessionStorage.setItem(
          ERA_STORAGE_KEY,
          JSON.stringify(
            selectedEras
          )
        );

        window.sessionStorage.setItem(
          EVENT_CONTINENT_STORAGE_KEY,
          JSON.stringify(
            selectedEventContinents
          )
        );

        window.sessionStorage.setItem(
          EVENT_COUNTRY_STORAGE_KEY,
          JSON.stringify(
            selectedEventCountries
          )
        );

        window.sessionStorage.removeItem(
          EVENT_LOCATION_STORAGE_KEY
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
      selectedContinents,
      selectedCountries,
      selectedEras,
      mapMode,
      selectedEventLocations,
      selectedEventContinents,
      selectedEventCountries,
      selectedEventGenres,
      selectedEventWindow,
      selectedRadius,
      hydrated,
    ]
  );

  function selectArtistMode() {
    setResultCount(
      0
    );

    setMapMode(
      "artists"
    );

    setActiveFilterTab(
      null
    );
  }

  function selectEventMode() {
    setResultCount(
      0
    );

    setMapMode(
      "events"
    );

    setActiveFilterTab(
      null
    );
  }

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

  function focusFirstGeographicMatch(
    continents: string[],
    countries: string[]
  ) {
    const match =
      locations.find(
        (
          location
        ) => {
          const continent =
            continentForLocation(
              location
            );

          return (
            (
              continent !==
                null &&
              continents.includes(
                continent
              )
            ) ||
            countries.includes(
              countryKey(
                location
              )
            )
          );
        }
      );

    if (!match) {
      return;
    }

    setLocationFocusSlug(
      match.slug
    );

    setLocationFocusToken(
      (
        current
      ) =>
        current + 1
    );
  }

  function toggleArtistContinent(
    continent: string
  ) {
    const isSelected =
      selectedContinents.includes(
        continent
      );

    const nextContinents =
      isSelected
        ? selectedContinents.filter(
            (
              item
            ) =>
              item !==
              continent
          )
        : [
            ...selectedContinents,
            continent,
          ];

    setSelectedContinents(
      nextContinents
    );

    setSelectedLocations(
      resolveGeographicLocationSlugs(
        locations,
        nextContinents,
        selectedCountries
      )
    );

    if (!isSelected) {
      focusFirstGeographicMatch(
        [
          continent,
        ],
        []
      );
    }
  }

  function toggleArtistCountry(
    country: string
  ) {
    const isSelected =
      selectedCountries.includes(
        country
      );

    const nextCountries =
      isSelected
        ? selectedCountries.filter(
            (
              item
            ) =>
              item !==
              country
          )
        : [
            ...selectedCountries,
            country,
          ];

    setSelectedCountries(
      nextCountries
    );

    setSelectedLocations(
      resolveGeographicLocationSlugs(
        locations,
        selectedContinents,
        nextCountries
      )
    );

    if (!isSelected) {
      focusFirstGeographicMatch(
        [],
        [
          country,
        ]
      );
    }
  }

  function clearNearMeForGeography() {
    if (
      !nearMeActive
    ) {
      return;
    }

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

  function toggleEventContinent(
    continent: string
  ) {
    const isSelected =
      selectedEventContinents.includes(
        continent
      );

    const nextContinents =
      isSelected
        ? selectedEventContinents.filter(
            (
              item
            ) =>
              item !==
              continent
          )
        : [
            ...selectedEventContinents,
            continent,
          ];

    clearNearMeForGeography();

    setSelectedEventContinents(
      nextContinents
    );

    setSelectedEventLocations(
      resolveGeographicLocationSlugs(
        locations,
        nextContinents,
        selectedEventCountries
      )
    );

    if (!isSelected) {
      focusFirstGeographicMatch(
        [
          continent,
        ],
        []
      );
    }
  }

  function toggleEventCountry(
    country: string
  ) {
    const isSelected =
      selectedEventCountries.includes(
        country
      );

    const nextCountries =
      isSelected
        ? selectedEventCountries.filter(
            (
              item
            ) =>
              item !==
              country
          )
        : [
            ...selectedEventCountries,
            country,
          ];

    clearNearMeForGeography();

    setSelectedEventCountries(
      nextCountries
    );

    setSelectedEventLocations(
      resolveGeographicLocationSlugs(
        locations,
        selectedEventContinents,
        nextCountries
      )
    );

    if (!isSelected) {
      focusFirstGeographicMatch(
        [],
        [
          country,
        ]
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
    setSelectedContinents([]);
    setSelectedCountries([]);
    setSelectedLocations([]);
    setSelectedEras([]);
    setActiveFilterTab(null);
    setResultScope("map");
    setFilterResults([]);
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
    setSelectedEventContinents(
      []
    );

    setSelectedEventCountries(
      []
    );

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
    setActiveFilterTab(null);
    setResultScope("map");
    setFilterResults([]);
  }

  function resetExploreMenu() {
    if (
      isArtistMode
    ) {
      clearArtistFilters();
    } else {
      clearEventFilters();
    }

    setMapSearchQuery(
      ""
    );

    setMapSearchOpen(
      false
    );

    setLocationFocusSlug(
      null
    );

    setResultFocusLatitude(
      null
    );

    setResultFocusLongitude(
      null
    );

    setArtistFocusSlug(
      null
    );

    setArtistFocusHandled(
      true
    );

    if (
      typeof window !==
      "undefined"
    ) {
      const url =
        new URL(
          window.location.href
        );

      url.searchParams.delete(
        "artist"
      );

      window.history.replaceState(
        {},
        "",
        `${url.pathname}${url.search}${url.hash}`
      );
    }

    setResultScope(
      "map"
    );
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
        setSelectedEventContinents(
          []
        );

        setSelectedEventCountries(
          []
        );

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

  const isArtistMode =
    mapMode ===
    "artists";

  const activeArtistFilterCount =
    selectedGenres.length +
    selectedStatuses.length +
    selectedContinents.length +
    selectedCountries.length +
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
    selectedEventContinents.length +
    selectedEventCountries.length +
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

  const hasActiveFilters =
    isArtistMode
      ? hasArtistFilters
      : hasEventFilters;

  // Keep SSR and the first client render identical. URL/session-backed
  // filter state is restored in an effect after hydration.
  const hydratedHasActiveFilters =
    hydrated &&
    hasActiveFilters;

  useEffect(
    () => {
      if (
        !hydrated
      ) {
        return;
      }

      if (
        !hasActiveFilters
      ) {
        setFilterResults([]);
        setFilterResultsLoading(false);
        setResultScope("map");
        return;
      }

      let cancelled =
        false;

      async function loadFilterResults() {
        setFilterResultsLoading(
          true
        );

        if (
          isArtistMode
        ) {
          const {
            data,
            error,
          } =
            await supabase.rpc(
              "get_filtered_artists_in_map_bounds",
              {
                min_long:
                  -180,
                min_lat:
                  -90,
                max_long:
                  180,
                max_lat:
                  90,
                genre_slugs:
                  selectedGenres.length
                    ? selectedGenres
                    : null,
                artist_statuses:
                  selectedStatuses.length
                    ? selectedStatuses
                    : null,
                location_slugs:
                  selectedLocations.length
                    ? selectedLocations
                    : null,
                era_starts:
                  eraStarts.length
                    ? eraStarts
                    : null,
                era_ends:
                  eraEnds.length
                    ? eraEnds
                    : null,
                min_listeners:
                  listenerRange?.min ??
                  null,
                max_listeners:
                  listenerRange?.max ??
                  null,
              }
            );

          if (
            cancelled
          ) {
            return;
          }

          if (
            error
          ) {
            console.error(
              "Filter artist query failed:",
              error
            );

            setFilterResults(
              []
            );

            setFilterResultsLoading(
              false
            );

            return;
          }

          const rawArtists =
            Array.isArray(
              data
            )
              ? data
              : (
                  data &&
                  typeof data ===
                    "object" &&
                  "artists" in data &&
                  Array.isArray(
                    (
                      data as {
                        artists?: unknown[];
                      }
                    ).artists
                  )
                    ? (
                        data as {
                          artists: unknown[];
                        }
                      ).artists
                    : []
                );

          const results =
            rawArtists
              .map(
                (
                  raw
                ) => {
                  const artist =
                    raw as Record<
                      string,
                      unknown
                    >;

                  const id =
                    String(
                      artist.id ??
                      ""
                    );

                  const name =
                    String(
                      artist.name ??
                      artist.artist_name ??
                      "Artist"
                    );

                  const slug =
                    String(
                      artist.slug ??
                      artist.artist_slug ??
                      ""
                    );

                  const latitude =
                    artist.latitude ==
                    null
                      ? null
                      : Number(
                          artist.latitude
                        );

                  const longitude =
                    artist.longitude ==
                    null
                      ? null
                      : Number(
                          artist.longitude
                        );

                  return {
                    kind:
                      "artist" as const,
                    id,
                    name,
                    slug,
                    subtitle: [
                      artist.city,
                      artist.region,
                      artist.country,
                    ]
                      .filter(
                        Boolean
                      )
                      .map(
                        String
                      )
                      .join(
                        " · "
                      ),
                    latitude:
                      Number.isFinite(
                        latitude
                      )
                        ? latitude
                        : null,
                    longitude:
                      Number.isFinite(
                        longitude
                      )
                        ? longitude
                        : null,
                  };
                }
              )
              .filter(
                (
                  result
                ) =>
                  Boolean(
                    result.id &&
                    result.slug
                  )
              )
              .sort(
                (
                  a,
                  b
                ) =>
                  a.name.localeCompare(
                    b.name
                  )
              );

          setFilterResults(
            results
          );

          setFilterResultsLoading(
            false
          );

          return;
        }

        const {
          data,
          error,
        } =
          await supabase.rpc(
            "get_events_in_map_bounds",
            {
              min_long:
                -180,
              min_lat:
                -90,
              max_long:
                180,
              max_lat:
                90,
              location_slugs:
                selectedEventLocations.length
                  ? selectedEventLocations
                  : null,
              event_genre_slugs:
                selectedEventGenres.length
                  ? selectedEventGenres
                  : null,
              start_before:
                eventStartBefore,
              near_lat:
                nearLatitude,
              near_long:
                nearLongitude,
              radius_miles:
                nearMeActive
                  ? selectedRadius
                  : null,
            }
          );

        if (
          cancelled
        ) {
          return;
        }

        if (
          error
        ) {
          console.error(
            "Filter event query failed:",
            error
          );

          setFilterResults(
            []
          );

          setFilterResultsLoading(
            false
          );

          return;
        }

        const rawEvents =
          Array.isArray(
            data
          )
            ? data
            : (
                data &&
                typeof data ===
                  "object" &&
                "events" in data &&
                Array.isArray(
                  (
                    data as {
                      events?: unknown[];
                    }
                  ).events
                )
                  ? (
                      data as {
                        events: unknown[];
                      }
                    ).events
                  : []
              );

        const results =
          rawEvents
            .map(
              (
                raw
              ) => {
                const event =
                  raw as Record<
                    string,
                    unknown
                  >;

                const latitude =
                  event.latitude ==
                  null
                    ? null
                    : Number(
                        event.latitude
                      );

                const longitude =
                  event.longitude ==
                  null
                    ? null
                    : Number(
                        event.longitude
                      );

                return {
                  kind:
                    "event" as const,
                  id:
                    String(
                      event.id ??
                      ""
                    ),
                  name:
                    String(
                      event.title ??
                      "Event"
                    ),
                  slug:
                    String(
                      event.slug ??
                      ""
                    ),
                  subtitle: [
                    event.venue_name,
                    event.city,
                    event.region,
                  ]
                    .filter(
                      Boolean
                    )
                    .map(
                      String
                    )
                    .join(
                      " · "
                    ),
                  startAt:
                    String(
                      event.start_at ??
                      ""
                    ),
                  latitude:
                    Number.isFinite(
                      latitude
                    )
                      ? latitude
                      : null,
                  longitude:
                    Number.isFinite(
                      longitude
                    )
                      ? longitude
                      : null,
                };
              }
            )
            .filter(
              (
                result
              ) =>
                Boolean(
                  result.id &&
                  result.slug
                )
            )
            .sort(
              (
                a,
                b
              ) => {
                const aTime =
                  a.startAt
                    ? new Date(
                        a.startAt
                      ).getTime()
                    : 0;

                const bTime =
                  b.startAt
                    ? new Date(
                        b.startAt
                      ).getTime()
                    : 0;

                return (
                  aTime -
                  bTime
                );
              }
            );

        setFilterResults(
          results
        );

        if (
          results.length >
          0
        ) {
          setFilterFitToken(
            (current) =>
              current + 1
          );
        }

        setFilterResultsLoading(
          false
        );
      }

      setResultScope(
        "filtered"
      );

      void loadFilterResults();

      return () => {
        cancelled =
          true;
      };
    },
    [
      hydrated,
      hasActiveFilters,
      isArtistMode,
      supabase,
      selectedGenres,
      selectedStatuses,
      selectedLocations,
      selectedEras,
      selectedListenerRange,
      listenerRange?.min,
      listenerRange?.max,
      eraStarts.join(","),
      eraEnds.join(","),
      selectedEventLocations,
      selectedEventGenres,
      selectedEventWindow,
      eventStartBefore,
      nearLatitude,
      nearLongitude,
      nearMeActive,
      selectedRadius,
    ]
  );

  const selectedEssentialGenre =
    useMemo(
      () => {
        if (
          !isArtistMode ||
          selectedGenres.length !==
            1
        ) {
          return null;
        }

        return (
          genres.find(
            (genre) =>
              genre.slug ===
              selectedGenres[0]
          ) ?? null
        );
      },
      [
        isArtistMode,
        selectedGenres,
        genres,
      ]
    );

  useEffect(
    () => {
      if (
        !hydrated ||
        !selectedEssentialGenre
      ) {
        setEssentialTracks([]);
        setEssentialTracksLoading(
          false
        );
        return;
      }

      const genreSlug =
        selectedEssentialGenre.slug;

      let cancelled =
        false;

      async function loadEssentialTracks() {
        setEssentialTracksLoading(
          true
        );

        const {
          data,
          error,
        } =
          await supabase.rpc(
            "get_genre_essential_playlist",
            {
              genre_slug:
                genreSlug,
            }
          );

        if (cancelled) {
          return;
        }

        if (error) {
          console.error(
            "Essential playlist query failed:",
            error
          );

          setEssentialTracks([]);
          setEssentialTracksLoading(
            false
          );
          return;
        }

        setEssentialTracks(
          Array.isArray(data)
            ? (
                data as EssentialTrackResult[]
              )
            : []
        );

        setEssentialTracksLoading(
          false
        );
      }

      void loadEssentialTracks();

      return () => {
        cancelled =
          true;
      };
    },
    [
      hydrated,
      selectedEssentialGenre,
      supabase,
    ]
  );

  const displayedResults =
    resultScope ===
      "filtered" &&
    hasActiveFilters
      ? filterResults
      : visibleResults;

  const displayedResultCount =
    resultScope ===
      "filtered" &&
    hasActiveFilters
      ? filterResults.length
      : visibleResults.length;

  function locateResult(
    result: AtlasVisibleResult
  ) {
    if (
      result.latitude ===
        null ||
      result.latitude ===
        undefined ||
      result.longitude ===
        null ||
      result.longitude ===
        undefined
    ) {
      return;
    }

    setResultFocusLatitude(
      result.latitude
    );

    setResultFocusLongitude(
      result.longitude
    );

    setResultFocusToken(
      (
        current
      ) =>
        current + 1
    );

    setDrawerOpen(
      false
    );
  }

  function locateEssentialTrack(
    track: EssentialTrackResult
  ) {
    locateResult({
      kind: "artist",
      id: track.artist_id,
      name: track.artist_name,
      slug: track.artist_slug,
      subtitle:
        track.release_title ??
        undefined,
      latitude:
        track.latitude,
      longitude:
        track.longitude,
    });
  }

  useEffect(
    () => {
      if (
        !hydrated ||
        !isArtistMode ||
        !artistFocusSlug ||
        artistFocusHandled
      ) {
        return;
      }

      const focusResult =
        filterResults.find(
          (result) =>
            result.kind ===
              "artist" &&
            result.slug ===
              artistFocusSlug &&
            result.latitude !=
              null &&
            result.longitude !=
              null
        ) ??
        visibleResults.find(
          (result) =>
            result.kind ===
              "artist" &&
            result.slug ===
              artistFocusSlug &&
            result.latitude !=
              null &&
            result.longitude !=
              null
        );

      if (
        !focusResult
      ) {
        return;
      }

      setResultFocusLatitude(
        focusResult.latitude ??
        null
      );

      setResultFocusLongitude(
        focusResult.longitude ??
        null
      );

      setResultFocusToken(
        (current) =>
          current + 1
      );

      setDrawerOpen(
        false
      );

      setArtistFocusHandled(
        true
      );
    },
    [
      hydrated,
      isArtistMode,
      artistFocusSlug,
      artistFocusHandled,
      filterResults,
      visibleResults,
    ]
  );

  const featuredLocations =
    useMemo(
      () => {
        const preferredSlugs =
          [
            "santa-cruz-ca-us",
            "los-angeles-ca-us",
          ];

        const preferred =
          preferredSlugs
            .map(
              (slug) =>
                locations.find(
                  (location) =>
                    location.slug ===
                    slug
                )
            )
            .filter(
              (
                location
              ): location is Location =>
                Boolean(
                  location
                )
            );

        const remaining =
          locations.filter(
            (location) =>
              !preferred.some(
                (item) =>
                  item.id ===
                  location.id
              )
          );

        return [
          ...preferred,
          ...remaining,
        ].slice(
          0,
          5
        );
      },
      [
        locations,
      ]
    );

  const mapSearchResults =
    useMemo(
      () => {
        const query =
          mapSearchQuery
            .trim()
            .toLowerCase();

        if (!query) {
          return [];
        }

        return locations
          .filter(
            (location) => {
              const searchable =
                [
                  location.name,
                  location.city,
                  location.region,
                  location.country,
                ]
                  .filter(Boolean)
                  .join(" ")
                  .toLowerCase();

              return searchable.includes(
                query
              );
            }
          )
          .slice(
            0,
            6
          );
      },
      [
        locations,
        mapSearchQuery,
      ]
    );

  function jumpToLocation(
    slug: string
  ) {
    setLocationFocusSlug(
      slug
    );

    setLocationFocusToken(
      (current) =>
        current + 1
    );

    setMapSearchQuery(
      ""
    );

    setMapSearchOpen(
      false
    );
  }

  const activeFilterCount =
    isArtistMode
      ? activeArtistFilterCount
      : activeEventFilterCount;

  return (
    <section className="w-full">
      {/* ======================================
          EXPLORE DRAWER TRIGGER
      ====================================== */}

      <button
        type="button"
        onClick={() =>
          setDrawerOpen(true)
        }
        className="fixed left-3 top-[88px] z-40 flex min-h-12 items-center gap-2 border-2 border-black bg-black px-3.5 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-white shadow-[4px_4px_0_#fff,6px_6px_0_#000] transition-transform hover:-translate-y-0.5 sm:left-4 sm:top-[92px]"
        aria-expanded={drawerOpen}
        aria-controls="atlas-explore-drawer"
      >
        <span aria-hidden="true" className="text-sm">☰</span>
        <span>Explore</span>
        <span className="flex h-6 min-w-6 items-center justify-center border border-white bg-white px-1.5 text-[9px] text-black">
          {hasActiveFilters
            ? filterResults.length
            : resultCount}
        </span>
      </button>

      {drawerOpen && (
        <button
          type="button"
          aria-label="Close Explore drawer"
          onClick={() =>
            setDrawerOpen(false)
          }
          className="fixed inset-0 top-[64px] z-40 bg-black/20 md:hidden"
        />
      )}

      <aside
        id="atlas-explore-drawer"
        className={`fixed bottom-0 left-0 top-[64px] z-50 flex w-[min(90vw,390px)] flex-col border-r-2 border-black bg-[#f3efe4] shadow-[8px_0_0_rgba(0,0,0,0.08)] transition-transform duration-200 ${
          drawerOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b-2 border-black bg-white px-4 py-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black/45">
              Explore the Atlas
            </p>
            <p className="mt-0.5 text-lg font-black uppercase tracking-[-0.03em]">
              Find Music
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={
                resetExploreMenu
              }
              className="min-h-9 border-2 border-black bg-white px-3 py-2 text-[9px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={() =>
                setDrawerOpen(false)
              }
              className="flex h-9 w-9 items-center justify-center border-2 border-black bg-black text-lg font-black text-white transition-colors hover:bg-white hover:text-black"
              aria-label="Close Explore drawer"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* VIEW */}
          <section className="border-b-2 border-black bg-white p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-black/45">
              View
            </p>

            <div className="mt-2 grid grid-cols-3 border-2 border-black">
              <button
                type="button"
                onClick={selectArtistMode}
                className={
                  isArtistMode
                    ? "min-h-10 bg-black px-2 text-[10px] font-black uppercase tracking-[0.1em] text-white"
                    : "min-h-10 bg-white px-2 text-[10px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white"
                }
              >
                Artists
              </button>

              <button
                type="button"
                onClick={selectEventMode}
                className={
                  !isArtistMode
                    ? "min-h-10 border-l-2 border-black bg-black px-2 text-[10px] font-black uppercase tracking-[0.1em] text-white"
                    : "min-h-10 border-l-2 border-black bg-white px-2 text-[10px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white"
                }
              >
                Events
              </button>

              <Link
                href="/scenes"
                className="flex min-h-10 items-center justify-center border-l-2 border-black bg-white px-2 text-[10px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white"
              >
                Scenes →
              </Link>
            </div>
          </section>

          {/* FILTERS */}
          <section className="border-b-2 border-black p-4">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-black/45">
              Filters
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {(
                isArtistMode
                  ? [
                      ["location", "Geography"],
                      ["genre", "Genre"],
                      ["era", "Era"],
                      ["status", "Status"],
                      ["listeners", "Listeners"],
                      ["places", "Places"],
                    ]
                  : [
                      ["date", "Date"],
                      ["genre", "Genre"],
                      ["location", "Geography"],
                      ["near-me", "Near Me"],
                      ["places", "Places"],
                    ]
              ).map(([value, label]) => {
                const active =
                  activeFilterTab === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setActiveFilterTab(
                        active
                          ? null
                          : (value as typeof activeFilterTab)
                      )
                    }
                    className={
                      active
                        ? "min-h-10 border-2 border-black bg-black px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.1em] text-white"
                        : "min-h-10 border-2 border-black bg-white px-3 py-2 text-left text-[10px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white"
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {activeFilterTab && (
              <div className="mt-4 border-t-2 border-black pt-4">
                {activeFilterTab === "location" && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.16em] text-black/45">
                      Continent
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {availableContinents.map((continent) => {
                        const selected = isArtistMode
                          ? selectedContinents.includes(continent)
                          : selectedEventContinents.includes(continent);
                        return (
                          <button
                            key={continent}
                            type="button"
                            onClick={() =>
                              isArtistMode
                                ? toggleArtistContinent(continent)
                                : toggleEventContinent(continent)
                            }
                            className={selected
                              ? "border-2 border-black bg-black px-2.5 py-2 text-[9px] font-black uppercase text-white"
                              : "border-2 border-black bg-white px-2.5 py-2 text-[9px] font-black uppercase hover:bg-black hover:text-white"}
                          >
                            {continent}
                          </button>
                        );
                      })}
                    </div>

                    <p className="mt-4 text-[9px] font-black uppercase tracking-[0.16em] text-black/45">
                      Country
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {availableCountries.map((country) => {
                        const selected = isArtistMode
                          ? selectedCountries.includes(country.value)
                          : selectedEventCountries.includes(country.value);
                        return (
                          <button
                            key={country.value}
                            type="button"
                            onClick={() =>
                              isArtistMode
                                ? toggleArtistCountry(country.value)
                                : toggleEventCountry(country.value)
                            }
                            className={selected
                              ? "border-2 border-black bg-black px-2.5 py-2 text-[9px] font-black uppercase text-white"
                              : "border-2 border-black bg-white px-2.5 py-2 text-[9px] font-black uppercase hover:bg-black hover:text-white"}
                          >
                            {country.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeFilterTab === "genre" && (
                  <div className="flex flex-wrap gap-2">
                    {genres.map((genre) => {
                      const selected = isArtistMode
                        ? selectedGenres.includes(genre.slug)
                        : selectedEventGenres.includes(genre.slug);
                      return (
                        <button
                          key={genre.id}
                          type="button"
                          onClick={() =>
                            isArtistMode
                              ? toggleGenre(genre.slug)
                              : toggleEventGenre(genre.slug)
                          }
                          className={selected
                            ? "border-2 border-black bg-black px-2.5 py-2 text-[9px] font-black uppercase text-white"
                            : "border-2 border-black bg-white px-2.5 py-2 text-[9px] font-black uppercase hover:bg-black hover:text-white"}
                        >
                          {genre.name}
                        </button>
                      );
                    })}
                  </div>
                )}

                {isArtistMode && activeFilterTab === "era" && (
                  <div className="flex flex-wrap gap-2">
                    {ERA_RANGES.map((era) => {
                      const selected = selectedEras.includes(era.value);
                      return (
                        <button
                          key={era.value}
                          type="button"
                          onClick={() => toggleEra(era.value)}
                          className={selected
                            ? "border-2 border-black bg-black px-2.5 py-2 text-[9px] font-black uppercase text-white"
                            : "border-2 border-black bg-white px-2.5 py-2 text-[9px] font-black uppercase hover:bg-black hover:text-white"}
                        >
                          {era.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {isArtistMode && activeFilterTab === "status" && (
                  <div className="flex flex-wrap gap-2">
                    {ARTIST_STATUSES.map((status) => {
                      const selected = selectedStatuses.includes(status.value);
                      return (
                        <button
                          key={status.value}
                          type="button"
                          onClick={() => toggleStatus(status.value)}
                          className={selected
                            ? "border-2 border-black bg-black px-2.5 py-2 text-[9px] font-black uppercase text-white"
                            : "border-2 border-black bg-white px-2.5 py-2 text-[9px] font-black uppercase hover:bg-black hover:text-white"}
                        >
                          {status.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {isArtistMode && activeFilterTab === "listeners" && (
                  <div className="flex flex-wrap gap-2">
                    {LISTENER_RANGES.map((range) => (
                      <button
                        key={range.value}
                        type="button"
                        onClick={() => toggleListenerRange(range.value)}
                        className={selectedListenerRange === range.value
                          ? "border-2 border-black bg-black px-2.5 py-2 text-[9px] font-black uppercase text-white"
                          : "border-2 border-black bg-white px-2.5 py-2 text-[9px] font-black uppercase hover:bg-black hover:text-white"}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                )}

                {!isArtistMode && activeFilterTab === "date" && (
                  <div className="flex flex-wrap gap-2">
                    {EVENT_WINDOWS.map((range) => (
                      <button
                        key={range.value}
                        type="button"
                        onClick={() => setSelectedEventWindow(range.value)}
                        className={selectedEventWindow === range.value
                          ? "border-2 border-black bg-black px-2.5 py-2 text-[9px] font-black uppercase text-white"
                          : "border-2 border-black bg-white px-2.5 py-2 text-[9px] font-black uppercase hover:bg-black hover:text-white"}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                )}

                {!isArtistMode && activeFilterTab === "near-me" && (
                  <div>
                    <button
                      type="button"
                      disabled={nearMeLoading}
                      onClick={activateNearMe}
                      className={nearMeActive
                        ? "w-full border-2 border-black bg-black px-3 py-2 text-[10px] font-black uppercase text-white"
                        : "w-full border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase hover:bg-black hover:text-white"}
                    >
                      {nearMeLoading ? "Finding You..." : nearMeActive ? "Near Me Active" : "Use My Location"}
                    </button>

                    {nearMeActive && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {RADIUS_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => changeRadius(option.value)}
                            className={selectedRadius === option.value
                              ? "border-2 border-black bg-black px-2.5 py-2 text-[9px] font-black uppercase text-white"
                              : "border-2 border-black bg-white px-2.5 py-2 text-[9px] font-black uppercase hover:bg-black hover:text-white"}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}

                    {nearMeError && (
                      <p className="mt-2 text-xs font-bold text-red-700">
                        {nearMeError}
                      </p>
                    )}
                  </div>
                )}

                {activeFilterTab === "places" && (
                  <div>
                    <p className="text-xs text-black/55">
                      Jump to a place without changing filters.
                    </p>
                    <div className="relative mt-2">
                      <input
                        type="search"
                        value={mapSearchQuery}
                        onFocus={() => setMapSearchOpen(true)}
                        onChange={(event) => {
                          setMapSearchQuery(event.target.value);
                          setMapSearchOpen(true);
                        }}
                        placeholder="Search city or place..."
                        className="min-h-10 w-full border-2 border-black bg-white px-3 text-sm font-bold outline-none"
                      />

                      {mapSearchOpen && mapSearchQuery.trim() && (
                        <div className="absolute inset-x-0 top-full z-20 mt-1 max-h-52 overflow-y-auto border-2 border-black bg-white">
                          {mapSearchResults.length > 0 ? (
                            mapSearchResults.map((location) => (
                              <button
                                key={location.id}
                                type="button"
                                onClick={() => jumpToLocation(location.slug)}
                                className="block w-full border-b border-black/15 px-3 py-2 text-left last:border-b-0 hover:bg-[#f3efe4]"
                              >
                                <span className="block text-[10px] font-black uppercase">
                                  {location.name}
                                </span>
                                <span className="mt-0.5 block text-[9px] font-bold uppercase text-black/45">
                                  {[location.city, location.region, location.country].filter(Boolean).join(", ")}
                                </span>
                              </button>
                            ))
                          ) : (
                            <p className="px-3 py-3 text-xs font-bold text-black/45">
                              No matching places.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {featuredLocations.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {featuredLocations.map((location) => (
                          <button
                            key={location.id}
                            type="button"
                            onClick={() => jumpToLocation(location.slug)}
                            className="border-2 border-black bg-white px-2.5 py-2 text-[9px] font-black uppercase hover:bg-black hover:text-white"
                          >
                            {location.city ?? location.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {isArtistMode &&
            selectedEssentialGenre && (
              <section className="border-t-2 border-black bg-[#f3efe4] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-black/45">
                      Essential Tracks
                    </p>

                    <h3 className="mt-1 truncate text-lg font-black uppercase tracking-[-0.03em]">
                      {
                        selectedEssentialGenre.name
                      }
                    </h3>
                  </div>

                  <Link
                    href={`/genres/${selectedEssentialGenre.slug}`}
                    onClick={() =>
                      setDrawerOpen(
                        false
                      )
                    }
                    className="shrink-0 text-[8px] font-black uppercase tracking-[0.1em] hover:underline"
                  >
                    Full List →
                  </Link>
                </div>

                {essentialTracksLoading ? (
                  <p className="mt-3 text-xs font-bold text-black/45">
                    Loading Essential Tracks...
                  </p>
                ) : essentialTracks.length >
                  0 ? (
                  <div className="mt-3 border-y-2 border-black bg-white">
                    {essentialTracks
                      .slice(0, 8)
                      .map(
                        (track) => {
                          const links =
                            Array.isArray(
                              track.links
                            )
                              ? track.links
                              : [];

                          const primaryLink =
                            links[0] ??
                            null;

                          const canLocate =
                            track.latitude !=
                              null &&
                            track.longitude !=
                              null;

                          return (
                            <div
                              key={track.track_id}
                              className="grid grid-cols-[28px_minmax(0,1fr)] gap-2 border-b border-black/20 px-1 py-3 last:border-b-0"
                            >
                              <span className="pt-0.5 text-[9px] font-black tabular-nums text-black/35">
                                {String(
                                  track.playlist_position
                                ).padStart(
                                  2,
                                  "0"
                                )}
                              </span>

                              <div className="min-w-0">
                                <Link
                                  href={`/artists/${track.artist_slug}`}
                                  onClick={() =>
                                    setDrawerOpen(
                                      false
                                    )
                                  }
                                  className="group block min-w-0"
                                >
                                  <span className="block truncate text-xs font-black uppercase tracking-[-0.01em] group-hover:underline">
                                    {
                                      track.track_title
                                    }
                                  </span>

                                  <span className="mt-0.5 block truncate text-[8px] font-bold uppercase tracking-[0.06em] text-black/45">
                                    {
                                      track.artist_name
                                    }
                                    {track.release_title
                                      ? ` · ${track.release_title}`
                                      : ""}
                                  </span>
                                </Link>

                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {primaryLink && (
                                    <a
                                      href={
                                        primaryLink.url
                                      }
                                      target="_blank"
                                      rel="noreferrer"
                                      className="border border-black px-2 py-1 text-[7px] font-black uppercase tracking-[0.08em] hover:bg-black hover:text-white"
                                    >
                                      Listen ↗
                                    </a>
                                  )}

                                  {canLocate && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        locateEssentialTrack(
                                          track
                                        )
                                      }
                                      className="border border-black px-2 py-1 text-[7px] font-black uppercase tracking-[0.08em] hover:bg-black hover:text-white"
                                    >
                                      Locate
                                    </button>
                                  )}

                                  <Link
                                    href={`/artists/${track.artist_slug}`}
                                    onClick={() =>
                                      setDrawerOpen(
                                        false
                                      )
                                    }
                                    className="border border-black px-2 py-1 text-[7px] font-black uppercase tracking-[0.08em] hover:bg-black hover:text-white"
                                  >
                                    Artist →
                                  </Link>
                                </div>
                              </div>
                            </div>
                          );
                        }
                      )}
                  </div>
                ) : (
                  <p className="mt-3 text-xs font-bold text-black/45">
                    No published Essential Tracks yet.
                  </p>
                )}

                {essentialTracks.length >
                  8 && (
                  <Link
                    href={`/genres/${selectedEssentialGenre.slug}`}
                    onClick={() =>
                      setDrawerOpen(
                        false
                      )
                    }
                    className="mt-3 inline-flex text-[8px] font-black uppercase tracking-[0.1em] hover:underline"
                  >
                    View all {essentialTracks.length} tracks →
                  </Link>
                )}
              </section>
            )}

          {/* RESULTS */}
          <section className="bg-white p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-black/45">
                  Results
                </p>

                <p className="mt-1 text-2xl font-black uppercase tracking-[-0.04em]">
                  {hasActiveFilters
                    ? `${filterResults.length} ${
                        isArtistMode
                          ? filterResults.length === 1
                            ? "Artist"
                            : "Artists"
                          : filterResults.length === 1
                            ? "Event"
                            : "Events"
                      }`
                    : `${visibleResults.length} ${
                        isArtistMode
                          ? visibleResults.length === 1
                            ? "Artist"
                            : "Artists"
                          : visibleResults.length === 1
                            ? "Event"
                            : "Events"
                      }`}
                </p>
              </div>

              {hasActiveFilters && (
                <p className="text-right text-[9px] font-black uppercase leading-4 tracking-[0.1em] text-black/40">
                  {visibleResults.length} on map
                </p>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 border-2 border-black">
              <button
                type="button"
                disabled={
                  hydrated
                    ? !hasActiveFilters
                    : false
                }
                onClick={() =>
                  setResultScope(
                    "filtered"
                  )
                }
                className={
                  resultScope ===
                    "filtered" &&
                  hydratedHasActiveFilters
                    ? "min-h-10 bg-black px-2 text-[9px] font-black uppercase tracking-[0.08em] text-white"
                    : "min-h-10 bg-white px-2 text-[9px] font-black uppercase tracking-[0.08em] transition-colors enabled:hover:bg-black enabled:hover:text-white disabled:cursor-not-allowed disabled:text-black/25"
                }
              >
                Matches
              </button>

              <button
                type="button"
                disabled={
                  hydrated &&
                  hasActiveFilters &&
                  visibleResults.length === 0
                }
                onClick={() =>
                  setResultScope(
                    "map"
                  )
                }
                className={
                  resultScope ===
                    "map" ||
                  !hydratedHasActiveFilters
                    ? "min-h-10 border-l-2 border-black bg-black px-2 text-[9px] font-black uppercase tracking-[0.08em] text-white disabled:cursor-not-allowed disabled:bg-black/20 disabled:text-black/35"
                    : "min-h-10 border-l-2 border-black bg-white px-2 text-[9px] font-black uppercase tracking-[0.08em] transition-colors enabled:hover:bg-black enabled:hover:text-white disabled:cursor-not-allowed disabled:text-black/25"
                }
              >
                On Map {visibleResults.length}
              </button>
            </div>

            <div className="mt-3">
              <div className="max-h-[42vh] overflow-y-auto border-y-2 border-black">
                {filterResultsLoading &&
                resultScope ===
                  "filtered" ? (
                  <p className="py-4 text-xs font-bold text-black/45">
                    Loading matching results...
                  </p>
                ) : displayedResults.length >
                  0 ? (
                  displayedResults
                    .slice(
                      0,
                      50
                    )
                    .map(
                      (
                        result
                      ) => (
                        <div
                          key={`${result.kind}-${result.id}`}
                          className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-black/20 px-1 py-3 last:border-b-0"
                        >
                          <Link
                            href={
                              result.kind ===
                              "artist"
                                ? `/artists/${result.slug}`
                                : `/events/${result.slug}`
                            }
                            onClick={() =>
                              setDrawerOpen(
                                false
                              )
                            }
                            className="group min-w-0"
                          >
                            <span className="block truncate text-sm font-black uppercase tracking-[-0.01em] group-hover:underline">
                              {result.name}
                            </span>

                            {(result.subtitle ||
                              result.startAt) && (
                              <span className="mt-0.5 block truncate text-[9px] font-bold uppercase tracking-[0.06em] text-black/45">
                                {result.startAt
                                  ? `${new Date(
                                      result.startAt
                                    ).toLocaleDateString(
                                      "en-US",
                                      {
                                        month:
                                          "short",
                                        day:
                                          "numeric",
                                      }
                                    )}${
                                      result.subtitle
                                        ? ` · ${result.subtitle}`
                                        : ""
                                    }`
                                  : result.subtitle}
                              </span>
                            )}
                          </Link>

                          <div className="flex items-center gap-1.5">
                            {result.latitude !=
                              null &&
                              result.longitude !=
                                null && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    locateResult(
                                      result
                                    )
                                  }
                                  className="border border-black px-2 py-1.5 text-[8px] font-black uppercase tracking-[0.08em] transition-colors hover:bg-black hover:text-white"
                                >
                                  Locate
                                </button>
                              )}

                            <Link
                              href={
                                result.kind ===
                                "artist"
                                  ? `/artists/${result.slug}`
                                  : `/events/${result.slug}`
                              }
                              onClick={() =>
                                setDrawerOpen(
                                  false
                                )
                              }
                              className="flex h-7 w-7 items-center justify-center text-sm font-black hover:bg-black hover:text-white"
                              aria-label={`Open ${result.name}`}
                            >
                              →
                            </Link>
                          </div>
                        </div>
                      )
                    )
                ) : (
                  <p className="py-4 text-xs font-bold text-black/45">
                    {resultScope ===
                      "filtered" &&
                    hasActiveFilters
                      ? "No results match the selected filters."
                      : "No results in the current map view."}
                  </p>
                )}
              </div>

              {displayedResults.length >
                50 && (
                <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.08em] text-black/40">
                  Showing first 50 of{" "}
                  {
                    displayedResults.length
                  }{" "}
                  results.
                </p>
              )}
            </div>

            <div className="mt-4 border-t border-black/20 pt-3">
              <p className="text-[9px] font-black uppercase tracking-[0.1em] text-black/40">
                {activeFilterCount}{" "}
                {activeFilterCount ===
                1
                  ? "filter active"
                  : "filters active"}
              </p>
            </div>
          </section>
        </div>
      </aside>

      {/* ======================================
          MAP
      ====================================== */}

      <div className="w-full">
        <AtlasMap
          mode={
            mapMode
          }

          onResultsCountChange={
            setResultCount
          }

          onResultsChange={
            setVisibleResults
          }

          onClearFilters={
            isArtistMode
              ? clearArtistFilters
              : clearEventFilters
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

          resultFocusLatitude={
            resultFocusLatitude
          }

          resultFocusLongitude={
            resultFocusLongitude
          }

          resultFocusToken={
            resultFocusToken
          }

          filterFitResults={
            hasActiveFilters
              ? filterResults
              : []
          }

          filterFitToken={
            filterFitToken
          }
        />
      </div>

    </section>
  );
}
