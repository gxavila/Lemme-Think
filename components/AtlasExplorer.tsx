"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

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

  const isArtistMode =
    mapMode ===
    "artists";

  const activeFilterCount =
    isArtistMode
      ? activeArtistFilterCount
      : activeEventFilterCount;

  const hasActiveFilters =
    activeFilterCount >
    0;

  return (
    <section className="w-full">
      {/* ======================================
          EXPLORER BAR
      ====================================== */}

      <div className="sticky top-[64px] z-40 border-y-2 border-black bg-white shadow-[0_1px_0_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-2 px-3 py-2.5 sm:px-6 sm:py-3 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div className="min-w-0 max-w-3xl">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/50">
              Explore the Atlas
            </p>

            <h2 className="mt-0.5 text-lg font-black uppercase tracking-[-0.03em] sm:mt-1 sm:text-2xl">
              Find Music by Geography
            </h2>

            <p className="mt-2 hidden max-w-2xl text-sm font-medium leading-6 text-black/65 sm:block">
              Discover artists, scenes, and events through
              the places where underground music is happening.
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 sm:hidden">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-black/50">
              <span aria-live="polite">
                {resultCount}{" "}
                {isArtistMode
                  ? resultCount ===
                    1
                    ? "artist"
                    : "artists"
                  : resultCount ===
                      1
                    ? "event"
                    : "events"}
              </span>

              <span className="mx-2 text-black/25">
                •
              </span>

              <span>
                {activeFilterCount}{" "}
                {activeFilterCount ===
                1
                  ? "filter"
                  : "filters"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setMobileFiltersCollapsed(
                  (current) =>
                    !current
                );

                setActiveFilterTab(
                  null
                );
              }}
              className="min-h-9 shrink-0 border-2 border-black bg-white px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white"
              aria-expanded={
                !mobileFiltersCollapsed
              }
            >
              {mobileFiltersCollapsed
                ? "Show Filters"
                : "Hide Filters"}
            </button>
          </div>

          <div className="w-full sm:w-auto">
            <div className="grid grid-cols-3 text-center">
              <p className="col-span-2 mb-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-black/45">
                View on Map
              </p>

              <p className="mb-1.5 pl-3 text-[9px] font-black uppercase tracking-[0.16em] text-black/45">
                Explore
              </p>
            </div>

            <div className="grid grid-cols-3 border-2 border-black bg-white">
              <button
                type="button"
                onClick={
                  selectArtistMode
                }
                aria-pressed={
                  isArtistMode
                }
                className={
                  isArtistMode
                    ? "h-9 bg-black px-2 text-[9px] font-black uppercase tracking-[0.1em] text-white sm:h-10 sm:px-5 sm:text-xs sm:tracking-[0.14em]"
                    : "h-9 bg-white px-2 text-[9px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white sm:h-10 sm:px-5 sm:text-xs sm:tracking-[0.14em]"
                }
              >
                Artists
              </button>

              <button
                type="button"
                onClick={
                  selectEventMode
                }
                aria-pressed={
                  !isArtistMode
                }
                className={
                  !isArtistMode
                    ? "h-9 border-l-2 border-black bg-black px-2 text-[9px] font-black uppercase tracking-[0.1em] text-white sm:h-10 sm:px-5 sm:text-xs sm:tracking-[0.14em]"
                    : "h-9 border-l-2 border-black bg-white px-2 text-[9px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white sm:h-10 sm:px-5 sm:text-xs sm:tracking-[0.14em]"
                }
              >
                Events
              </button>

              <Link
                href="/scenes"
                className="flex h-9 items-center justify-center border-l-2 border-black bg-white px-2 text-center text-[9px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white sm:h-10 sm:px-5 sm:text-xs sm:tracking-[0.14em]"
              >
                Scenes →
              </Link>
            </div>
          </div>
        </div>

        {/* ====================================
            FILTER TABS
        ==================================== */}

        <div
          className={
            mobileFiltersCollapsed
              ? "hidden sm:block"
              : "block"
          }
        >
        <div className="border-t-2 border-black bg-white">
          <div className="overflow-x-auto overscroll-x-contain">
            <div className="flex min-w-max snap-x snap-mandatory px-1 sm:px-4 lg:px-6">
              {(isArtistMode
                ? [
                    {
                      value:
                        "location",
                      label:
                        "Geography",
                    },
                    {
                      value:
                        "genre",
                      label:
                        "Genre",
                    },
                    {
                      value:
                        "era",
                      label:
                        "Era",
                    },
                    {
                      value:
                        "status",
                      label:
                        "Status",
                    },
                    {
                      value:
                        "listeners",
                      label:
                        "Listeners",
                    },
                    {
                      value:
                        "places",
                      label:
                        "Places",
                    },
                  ]
                : [
                    {
                      value:
                        "date",
                      label:
                        "Date",
                    },
                    {
                      value:
                        "genre",
                      label:
                        "Genre",
                    },
                    {
                      value:
                        "location",
                      label:
                        "Geography",
                    },
                    {
                      value:
                        "near-me",
                      label:
                        "Near Me",
                    },
                    {
                      value:
                        "places",
                      label:
                        "Places",
                    },
                  ]
              ).map(
                (tab) => {
                  const active =
                    activeFilterTab ===
                    tab.value;

                  return (
                    <button
                      key={
                        tab.value
                      }
                      type="button"
                      onClick={() => {
                        const nextTab =
                          active
                            ? null
                            : (tab.value as
                                | "location"
                                | "genre"
                                | "era"
                                | "status"
                                | "listeners"
                                | "date"
                                | "near-me"
                                | "places");

                        setActiveFilterTab(
                          nextTab
                        );

                        if (
                          nextTab !==
                            "places"
                        ) {
                          setMapSearchOpen(
                            false
                          );
                        }
                      }}
                      aria-expanded={
                        active
                      }
                      className={
                        active
                          ? "min-h-10 snap-start border-b-[3px] border-black bg-[#f3efe4] px-3 py-2 text-[9px] font-black uppercase tracking-[0.11em] text-black sm:px-4 sm:text-[10px] sm:tracking-[0.14em]"
                          : "min-h-10 snap-start border-b-[3px] border-transparent px-3 py-2 text-[9px] font-black uppercase tracking-[0.11em] text-black/60 transition-colors hover:border-black hover:text-black sm:px-4 sm:text-[10px] sm:tracking-[0.14em]"
                      }
                    >
                      {
                        tab.label
                      }
                    </button>
                  );
                }
              )}

              <div className="ml-2 flex items-center gap-3">
                <span
                  className="hidden border-l border-black/15 pl-3 text-[9px] font-black uppercase tracking-[0.1em] text-black/40 md:inline"
                  aria-live="polite"
                >
                  {resultCount}{" "}
                  {isArtistMode
                    ? resultCount ===
                      1
                      ? "artist shown"
                      : "artists shown"
                    : resultCount ===
                        1
                      ? "event shown"
                      : "events shown"}
                </span>

                <span className="hidden text-[10px] font-black uppercase tracking-[0.12em] text-black/45 lg:inline">
                  {activeFilterCount}{" "}
                  {activeFilterCount ===
                  1
                    ? "filter active"
                    : "filters active"}
                </span>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={
                      isArtistMode
                        ? clearArtistFilters
                        : clearEventFilters
                    }
                    className="min-h-10 px-3 py-2 text-[9px] font-black uppercase tracking-[0.1em] text-black/45 hover:text-black hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ====================================
            ACTIVE FILTER PANEL
        ==================================== */}

        {activeFilterTab && (
          <div className="border-t border-black bg-[#f3efe4]">
            <div className="px-3 py-2.5 sm:px-6 lg:px-8">
              {/* ARTIST LOCATION */}

              {isArtistMode &&
                activeFilterTab ===
                  "location" && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/50">
                      Geography
                    </p>

                    <p className="mt-1 text-xs text-black/50">
                      Filter by continent or country. Individual places remain available under Places.
                    </p>

                    {availableContinents.length >
                      0 && (
                      <div className="mt-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-black/45">
                          Continent
                        </p>

                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {availableContinents.map(
                            (
                              continent
                            ) => {
                              const selected =
                                selectedContinents.includes(
                                  continent
                                );

                              return (
                                <button
                                  key={
                                    continent
                                  }
                                  type="button"
                                  onClick={() =>
                                    toggleArtistContinent(
                                      continent
                                    )
                                  }
                                  className={
                                    selected
                                      ? "min-h-10 border-2 border-black bg-black px-3 py-1.5 text-[11px] font-black uppercase text-white"
                                      : "min-h-10 border-2 border-black bg-white px-3 py-1.5 text-[11px] font-black uppercase transition-colors hover:bg-black hover:text-white"
                                  }
                                >
                                  {
                                    continent
                                  }
                                </button>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )}

                    {availableCountries.length >
                      0 && (
                      <div className="mt-4">
                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-black/45">
                          Country
                        </p>

                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {availableCountries.map(
                            (
                              country
                            ) => {
                              const selected =
                                selectedCountries.includes(
                                  country.value
                                );

                              return (
                                <button
                                  key={
                                    country.value
                                  }
                                  type="button"
                                  onClick={() =>
                                    toggleArtistCountry(
                                      country.value
                                    )
                                  }
                                  className={
                                    selected
                                      ? "min-h-10 border-2 border-black bg-black px-3 py-1.5 text-[11px] font-black uppercase text-white"
                                      : "min-h-10 border-2 border-black bg-white px-3 py-1.5 text-[11px] font-black uppercase transition-colors hover:bg-black hover:text-white"
                                  }
                                >
                                  {
                                    country.label
                                  }
                                </button>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {/* ARTIST / EVENT GENRE */}

              {activeFilterTab ===
                "genre" && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/50">
                    Genre
                  </p>

                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {genres.map(
                      (
                        genre
                      ) => {
                        const selected =
                          isArtistMode
                            ? selectedGenres.includes(
                                genre.slug
                              )
                            : selectedEventGenres.includes(
                                genre.slug
                              );

                        return (
                          <button
                            key={
                              genre.id
                            }
                            type="button"
                            onClick={() =>
                              isArtistMode
                                ? toggleGenre(
                                    genre.slug
                                  )
                                : toggleEventGenre(
                                    genre.slug
                                  )
                            }
                            className={
                              selected
                                ? "min-h-10 border-2 border-black bg-black px-3 py-1.5 text-[11px] font-black uppercase text-white"
                                : "min-h-10 border-2 border-black bg-white px-3 py-1.5 text-[11px] font-black uppercase transition-colors hover:bg-black hover:text-white"
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
              )}

              {/* ARTIST ERA */}

              {isArtistMode &&
                activeFilterTab ===
                  "era" && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/50">
                      Era
                    </p>

                    <div className="mt-1.5 flex flex-wrap gap-2">
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
                                  ? "min-h-10 border-2 border-black bg-black px-3 py-1.5 text-[11px] font-black uppercase text-white"
                                  : "min-h-10 border-2 border-black bg-white px-3 py-1.5 text-[11px] font-black uppercase transition-colors hover:bg-black hover:text-white"
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
                )}

              {/* ARTIST STATUS */}

              {isArtistMode &&
                activeFilterTab ===
                  "status" && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/50">
                      Status
                    </p>

                    <div className="mt-1.5 flex flex-wrap gap-2">
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
                                  ? "min-h-10 border-2 border-black bg-black px-3 py-1.5 text-[11px] font-black uppercase text-white"
                                  : "min-h-10 border-2 border-black bg-white px-3 py-1.5 text-[11px] font-black uppercase transition-colors hover:bg-black hover:text-white"
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
                )}

              {/* ARTIST LISTENERS */}

              {isArtistMode &&
                activeFilterTab ===
                  "listeners" && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/50">
                      Monthly Listeners
                    </p>

                    <div className="mt-1.5 flex flex-wrap gap-2">
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
                                  ? "min-h-10 border-2 border-black bg-black px-3 py-1.5 text-[11px] font-black uppercase text-white"
                                  : "min-h-10 border-2 border-black bg-white px-3 py-1.5 text-[11px] font-black uppercase transition-colors hover:bg-black hover:text-white"
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
                )}

              {/* PLACES */}

              {activeFilterTab ===
                "places" && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/50">
                    Places
                  </p>

                  <p className="mt-0.5 text-[11px] text-black/45">
                    Jump to a city or place without changing your active filters.
                  </p>

                  <div className="mt-2 grid gap-3 lg:grid-cols-[minmax(280px,0.9fr)_minmax(0,1.1fr)] lg:items-end">
                    <div className="relative">
                      <label
                        htmlFor="atlas-map-search"
                        className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.16em] text-black/45"
                      >
                        Jump to a Place
                      </label>

                      <div className="flex border-2 border-black bg-white">
                        <input
                          id="atlas-map-search"
                          type="search"
                          value={
                            mapSearchQuery
                          }
                          onFocus={() => {
                            setMapSearchOpen(
                              true
                            );
                          }}
                          onChange={(
                            event
                          ) => {
                            setMapSearchQuery(
                              event.target.value
                            );

                            setMapSearchOpen(
                              true
                            );
                          }}
                          onKeyDown={(
                            event
                          ) => {
                            if (
                              event.key ===
                                "Escape"
                            ) {
                              setMapSearchOpen(
                                false
                              );

                              event.currentTarget.blur();
                            }

                            if (
                              event.key ===
                                "Enter" &&
                              mapSearchResults.length >
                                0
                            ) {
                              event.preventDefault();

                              jumpToLocation(
                                mapSearchResults[0].slug
                              );
                            }
                          }}
                          placeholder="Search a city or place..."
                          autoComplete="off"
                          className="min-h-9 min-w-0 flex-1 bg-white px-3 py-1 text-base font-bold outline-none placeholder:font-medium placeholder:text-black/35 sm:text-sm"
                        />

                        {mapSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setMapSearchQuery(
                                ""
                              );

                              setMapSearchOpen(
                                false
                              );
                            }}
                            className="min-h-9 border-l-2 border-black px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] transition-colors hover:bg-black hover:text-white"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {mapSearchOpen &&
                        mapSearchQuery.trim() && (
                          <div className="absolute inset-x-0 top-full z-50 mt-1 border-2 border-black bg-white">
                            {mapSearchResults.length >
                            0 ? (
                              <div>
                                {mapSearchResults.map(
                                  (
                                    location
                                  ) => {
                                    const placeLabel =
                                      [
                                        location.city,
                                        location.region,
                                        location.country,
                                      ]
                                        .filter(Boolean)
                                        .join(", ");

                                    return (
                                      <button
                                        key={
                                          location.id
                                        }
                                        type="button"
                                        onClick={() => {
                                          jumpToLocation(
                                            location.slug
                                          );
                                        }}
                                        className="flex min-h-10 w-full items-center justify-between gap-4 border-b border-black/15 px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-[#f3efe4]"
                                      >
                                        <span className="min-w-0">
                                          <span className="block truncate text-xs font-black uppercase tracking-[0.08em]">
                                            {location.name}
                                          </span>

                                          {placeLabel && (
                                            <span className="mt-0.5 block truncate text-[10px] font-bold text-black/45">
                                              {placeLabel}
                                            </span>
                                          )}
                                        </span>

                                        <span
                                          aria-hidden="true"
                                          className="shrink-0 text-sm font-black"
                                        >
                                          →
                                        </span>
                                      </button>
                                    );
                                  }
                                )}
                              </div>
                            ) : (
                              <div className="px-3 py-3 text-xs font-bold text-black/50">
                                No matching places.
                              </div>
                            )}
                          </div>
                        )}
                    </div>

                    {featuredLocations.length >
                      0 && (
                      <div>
                        <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-black/45">
                          Quick Jumps
                        </p>

                        <div className="overflow-x-auto">
                          <div className="flex w-max flex-nowrap gap-2 lg:w-auto lg:flex-wrap">
                            {featuredLocations.map(
                              (
                                location
                              ) => (
                                <button
                                  key={
                                    location.id
                                  }
                                  type="button"
                                  onClick={() => {
                                    jumpToLocation(
                                      location.slug
                                    );
                                  }}
                                  className="min-h-9 shrink-0 border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white"
                                >
                                  {location.city ??
                                    location.name}
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* EVENT DATE */}

              {!isArtistMode &&
                activeFilterTab ===
                  "date" && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/50">
                      Date
                    </p>

                    <div className="mt-1.5 flex flex-wrap gap-2">
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
                                  ? "min-h-10 border-2 border-black bg-black px-3 py-1.5 text-[11px] font-black uppercase text-white"
                                  : "min-h-10 border-2 border-black bg-white px-3 py-1.5 text-[11px] font-black uppercase transition-colors hover:bg-black hover:text-white"
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
                )}

              {/* EVENT LOCATION */}

              {!isArtistMode &&
                activeFilterTab ===
                  "location" && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/50">
                      Geography
                    </p>

                    <p className="mt-1 text-xs text-black/50">
                      Filter events by continent or country. Use Places to jump to a specific city.
                    </p>

                    {availableContinents.length >
                      0 && (
                      <div className="mt-3">
                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-black/45">
                          Continent
                        </p>

                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {availableContinents.map(
                            (
                              continent
                            ) => {
                              const selected =
                                selectedEventContinents.includes(
                                  continent
                                );

                              return (
                                <button
                                  key={
                                    continent
                                  }
                                  type="button"
                                  onClick={() =>
                                    toggleEventContinent(
                                      continent
                                    )
                                  }
                                  className={
                                    selected
                                      ? "min-h-10 border-2 border-black bg-black px-3 py-1.5 text-[11px] font-black uppercase text-white"
                                      : "min-h-10 border-2 border-black bg-white px-3 py-1.5 text-[11px] font-black uppercase transition-colors hover:bg-black hover:text-white"
                                  }
                                >
                                  {
                                    continent
                                  }
                                </button>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )}

                    {availableCountries.length >
                      0 && (
                      <div className="mt-4">
                        <p className="text-[9px] font-black uppercase tracking-[0.16em] text-black/45">
                          Country
                        </p>

                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {availableCountries.map(
                            (
                              country
                            ) => {
                              const selected =
                                selectedEventCountries.includes(
                                  country.value
                                );

                              return (
                                <button
                                  key={
                                    country.value
                                  }
                                  type="button"
                                  onClick={() =>
                                    toggleEventCountry(
                                      country.value
                                    )
                                  }
                                  className={
                                    selected
                                      ? "min-h-10 border-2 border-black bg-black px-3 py-1.5 text-[11px] font-black uppercase text-white"
                                      : "min-h-10 border-2 border-black bg-white px-3 py-1.5 text-[11px] font-black uppercase transition-colors hover:bg-black hover:text-white"
                                  }
                                >
                                  {
                                    country.label
                                  }
                                </button>
                              );
                            }
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              {/* EVENT NEAR ME */}

              {!isArtistMode &&
                activeFilterTab ===
                  "near-me" && (
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/50">
                      Near Me
                    </p>

                    <p className="mt-1 text-xs text-black/50">
                      Use your current position to find upcoming events nearby.
                    </p>

                    <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
                            ? "min-h-10 w-full border-2 border-black bg-black px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] text-white sm:w-auto"
                            : "min-h-10 w-full border-2 border-black bg-white px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white disabled:opacity-50 sm:w-auto"
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
                          className="min-h-10 w-full border-2 border-black bg-white px-4 py-1.5 text-[11px] font-black uppercase sm:w-auto"
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
                      <div className="mt-2.5 border-t border-black/15 pt-2.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.18em]">
                          Radius
                        </p>

                        <div className="mt-1.5 flex flex-wrap gap-2">
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
                                      ? "min-h-10 border-2 border-black bg-black px-3 py-1.5 text-[11px] font-black uppercase text-white"
                                      : "min-h-10 border-2 border-black bg-white px-3 py-1.5 text-[11px] font-black uppercase"
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
                )}
            </div>
          </div>
        )}
        </div>
      </div>

      {/* ======================================
          ACTIVE FILTER CHIPS
      ====================================== */}

      {!isArtistMode &&
        hasEventFilters && (
          <div className={mobileFiltersCollapsed ? "hidden sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:border-b-2 sm:border-black sm:bg-white sm:px-6 sm:py-1.5 lg:px-8" : "flex flex-wrap items-center gap-2 border-b-2 border-black bg-white px-4 py-1.5 sm:px-6 lg:px-8"}>
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
                    className="min-h-9 border-2 border-black bg-black px-2.5 py-1 text-[10px] font-black uppercase text-white"
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
                className="min-h-9 border-2 border-black bg-black px-2.5 py-1 text-[10px] font-black uppercase text-white"
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
                className="min-h-9 border-2 border-black bg-white px-2.5 py-1 text-[10px] font-black uppercase"
              >
                {
                  selectedEventRange.label
                }{" "}
                ×
              </button>
            )}

            {selectedEventContinents.map(
              (
                continent
              ) => (
                <button
                  key={`event-continent-${continent}`}
                  type="button"
                  onClick={() =>
                    toggleEventContinent(
                      continent
                    )
                  }
                  className="min-h-9 border-2 border-black bg-black px-2.5 py-1 text-[10px] font-black uppercase text-white"
                >
                  {continent} ×
                </button>
              )
            )}

            {selectedEventCountries.map(
              (
                value
              ) => {
                const country =
                  availableCountries.find(
                    (
                      item
                    ) =>
                      item.value ===
                      value
                  );

                if (
                  !country
                ) {
                  return null;
                }

                return (
                  <button
                    key={`event-country-${country.value}`}
                    type="button"
                    onClick={() =>
                      toggleEventCountry(
                        country.value
                      )
                    }
                    className="min-h-9 border-2 border-black bg-black px-2.5 py-1 text-[10px] font-black uppercase text-white"
                  >
                    {country.label} ×
                  </button>
                );
              }
            )}

            <button
              type="button"
              onClick={
                clearEventFilters
              }
              className="min-h-9 px-2.5 py-1 text-[10px] font-black uppercase text-black/50 hover:text-black hover:underline"
            >
              Clear All
            </button>
          </div>
        )}

      {isArtistMode &&
        hasArtistFilters && (
          <div className={mobileFiltersCollapsed ? "hidden sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:border-b-2 sm:border-black sm:bg-white sm:px-6 sm:py-1.5 lg:px-8" : "flex flex-wrap items-center gap-2 border-b-2 border-black bg-white px-4 py-1.5 sm:px-6 lg:px-8"}>
            <span className="mr-1 text-[10px] font-black uppercase tracking-[0.16em] text-black/50">
              Active Filters
            </span>

            {selectedContinents.map(
              (
                continent
              ) => (
                <button
                  key={`artist-continent-${continent}`}
                  type="button"
                  onClick={() =>
                    toggleArtistContinent(
                      continent
                    )
                  }
                  className="min-h-9 border-2 border-black bg-black px-2.5 py-1 text-[10px] font-black uppercase text-white"
                >
                  {continent} ×
                </button>
              )
            )}

            {selectedCountries.map(
              (
                value
              ) => {
                const country =
                  availableCountries.find(
                    (
                      item
                    ) =>
                      item.value ===
                      value
                  );

                if (
                  !country
                ) {
                  return null;
                }

                return (
                  <button
                    key={`artist-country-${country.value}`}
                    type="button"
                    onClick={() =>
                      toggleArtistCountry(
                        country.value
                      )
                    }
                    className="min-h-9 border-2 border-black bg-black px-2.5 py-1 text-[10px] font-black uppercase text-white"
                  >
                    {country.label} ×
                  </button>
                );
              }
            )}

            {selectedGenres.map(
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
                    key={`artist-genre-${genre.id}`}
                    type="button"
                    onClick={() =>
                      toggleGenre(
                        genre.slug
                      )
                    }
                    className="min-h-9 border-2 border-black bg-black px-2.5 py-1 text-[10px] font-black uppercase text-white"
                  >
                    {
                      genre.name
                    }{" "}
                    ×
                  </button>
                );
              }
            )}

            {selectedEras.map(
              (
                value
              ) => {
                const era =
                  ERA_RANGES.find(
                    (
                      item
                    ) =>
                      item.value ===
                      value
                  );

                if (!era) {
                  return null;
                }

                return (
                  <button
                    key={`artist-era-${era.value}`}
                    type="button"
                    onClick={() =>
                      toggleEra(
                        era.value
                      )
                    }
                    className="min-h-9 border-2 border-black bg-white px-2.5 py-1 text-[10px] font-black uppercase"
                  >
                    {
                      era.label
                    }{" "}
                    ×
                  </button>
                );
              }
            )}

            {selectedStatuses.map(
              (
                value
              ) => {
                const status =
                  ARTIST_STATUSES.find(
                    (
                      item
                    ) =>
                      item.value ===
                      value
                  );

                if (
                  !status
                ) {
                  return null;
                }

                return (
                  <button
                    key={`artist-status-${status.value}`}
                    type="button"
                    onClick={() =>
                      toggleStatus(
                        status.value
                      )
                    }
                    className="min-h-9 border-2 border-black bg-white px-2.5 py-1 text-[10px] font-black uppercase"
                  >
                    {
                      status.label
                    }{" "}
                    ×
                  </button>
                );
              }
            )}

            {selectedListenerRange &&
              listenerRange && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedListenerRange(
                      ""
                    )
                  }
                  className="min-h-9 border-2 border-black bg-white px-2.5 py-1 text-[10px] font-black uppercase"
                >
                  {
                    listenerRange.label
                  }{" "}
                  ×
                </button>
              )}

            <button
              type="button"
              onClick={
                clearArtistFilters
              }
              className="min-h-9 px-2.5 py-1 text-[10px] font-black uppercase text-black/50 hover:text-black hover:underline"
            >
              Clear All
            </button>
          </div>
        )}

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
        />
      </div>

      {/* ======================================
          MAP FOOTER
      ====================================== */}

      <div className="hidden border-y-2 border-black bg-white sm:grid sm:grid-cols-2">
        <div className="border-black p-4 sm:border-r-2 sm:px-6">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/50">
            Discover
          </p>

          <p className="mt-2 text-sm font-bold">
            {isArtistMode
              ? "Select an artist marker to learn more."
              : "Select an event marker to see the show, venue, lineup, and distance."}
          </p>
        </div>

        <div className="border-t-2 border-black p-4 sm:border-t-0 sm:px-6">
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
