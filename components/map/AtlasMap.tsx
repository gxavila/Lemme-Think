"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import mapboxgl, {
  type GeoJSONSource,
} from "mapbox-gl";

import { createClient } from "@/lib/supabase/client";

type MapMode =
  | "artists"
  | "events";

type AtlasMapProps = {
  mode?: MapMode;

  selectedGenres?: string[];
  selectedStatuses?: string[];
  selectedLocations?: string[];

  eraStarts?: number[];
  eraEnds?: number[];

  minListeners?: number | null;
  maxListeners?: number | null;

  eventLocations?: string[];
  eventGenres?: string[];

  eventStartBefore?:
    | string
    | null;

  eventNearLatitude?:
    | number
    | null;

  eventNearLongitude?:
    | number
    | null;

  eventRadiusMiles?:
    | number
    | null;

  locationFocusSlug?:
    | string
    | null;

  locationFocusToken?: number;

  nearMeFocusToken?: number;

  onResultsCountChange?:
    (
      count: number
    ) => void;

  onClearFilters?:
    () => void;

};

type ArtistGenre = {
  id?: string;
  name: string;
  slug?: string;
  is_primary?: boolean;
};

type MapArtist = {
  id: string;

  name?: string | null;
  artist_name?: string | null;

  slug?: string | null;
  artist_slug?: string | null;

  latitude?: number | null;
  longitude?: number | null;

  city?: string | null;
  region?: string | null;
  country?: string | null;

  bio_short?: string | null;

  image_url?: string | null;

  genres?:
    | ArtistGenre[]
    | string
    | null;
};

type EventLineupArtist = {
  id: string;
  name: string;
  slug: string;
  billing_role?: string | null;
  billing_order?: number | null;
};

type MapEvent = {
  id: string;

  title: string;
  slug: string;

  event_type?: string | null;
  status?: string | null;

  start_at: string;
  timezone?: string | null;

  ticket_url?: string | null;

  all_ages?: boolean | null;
  featured?: boolean | null;

  venue_id?: string | null;
  venue_name?: string | null;
  venue_slug?: string | null;

  location_id?: string | null;
  location_name?: string | null;
  location_slug?: string | null;

  city?: string | null;
  region?: string | null;
  country?: string | null;

  latitude?: number | null;
  longitude?: number | null;

  distance_miles?: number | null;

  lineup?:
    | EventLineupArtist[]
    | string
    | null;
};

type PointFeatureCollection = {
  type: "FeatureCollection";

  features: Array<{
    type: "Feature";

    geometry: {
      type: "Point";

      coordinates: [
        number,
        number,
      ];
    };

    properties:
      Record<
        string,
        string | number | boolean | null
      >;
  }>;
};

type RenderedPointFeature = {
  geometry: {
    type: string;
    coordinates?: number[];
  };

  properties?:
    | Record<
        string,
        unknown
      >
    | null;
};

const SOURCE_ID =
  "atlas-points";

const CLUSTER_LAYER_ID =
  "atlas-clusters";

const CLUSTER_COUNT_LAYER_ID =
  "atlas-cluster-count";

const POINT_LAYER_ID =
  "atlas-unclustered-point";

const USER_SOURCE_ID =
  "atlas-user-location";

const USER_OUTER_LAYER_ID =
  "atlas-user-location-outer";

const USER_INNER_LAYER_ID =
  "atlas-user-location-inner";

const RADIUS_SOURCE_ID =
  "atlas-search-radius";

const RADIUS_FILL_LAYER_ID =
  "atlas-search-radius-fill";

const RADIUS_OUTLINE_LAYER_ID =
  "atlas-search-radius-outline";

const OLD_MAP_STORAGE_KEY =
  "underground-atlas-map-state";

const DEFAULT_CENTER: [
  number,
  number,
] = [
  -119.4179,
  36.7783,
];

const DEFAULT_ZOOM =
  5;

const MIN_LATITUDE =
  -85;

const MAX_LATITUDE =
  85;

const MIN_ZOOM =
  2;

const MAX_ZOOM =
  18;

const OVERLAP_OFFSET =
  0.0018;

const EARTH_RADIUS_MILES =
  3958.7613;

// ============================================
// HELPERS
// ============================================

function escapeHtml(
  value: unknown
) {
  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

function safeExternalUrl(
  value: unknown
) {
  const raw =
    String(
      value ?? ""
    ).trim();

  if (!raw) {
    return "";
  }

  try {
    const parsed =
      new URL(
        raw
      );

    if (
      parsed.protocol !==
        "http:" &&
      parsed.protocol !==
        "https:"
    ) {
      return "";
    }

    return escapeHtml(
      parsed.toString()
    );
  } catch {
    return "";
  }
}

function normalizeArtists(
  data: unknown
): MapArtist[] {
  if (
    Array.isArray(
      data
    )
  ) {
    return data as MapArtist[];
  }

  if (
    typeof data ===
      "object" &&
    data !== null &&
    "artists" in data
  ) {
    const result =
      data as {
        artists?: MapArtist[];
      };

    if (
      Array.isArray(
        result.artists
      )
    ) {
      return result.artists;
    }
  }

  return [];
}

function normalizeEvents(
  data: unknown
): MapEvent[] {
  if (
    Array.isArray(
      data
    )
  ) {
    return data as MapEvent[];
  }

  if (
    typeof data ===
      "object" &&
    data !== null &&
    "events" in data
  ) {
    const result =
      data as {
        events?: MapEvent[];
      };

    if (
      Array.isArray(
        result.events
      )
    ) {
      return result.events;
    }
  }

  return [];
}

function normalizeGenres(
  value:
    | ArtistGenre[]
    | string
    | null
    | undefined
): ArtistGenre[] {
  if (
    Array.isArray(
      value
    )
  ) {
    return value;
  }

  if (
    typeof value ===
    "string"
  ) {
    try {
      const parsed =
        JSON.parse(
          value
        );

      return Array.isArray(
        parsed
      )
        ? parsed
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeLineup(
  value:
    | EventLineupArtist[]
    | string
    | null
    | undefined
): EventLineupArtist[] {
  if (
    Array.isArray(
      value
    )
  ) {
    return value;
  }

  if (
    typeof value ===
    "string"
  ) {
    try {
      const parsed =
        JSON.parse(
          value
        );

      return Array.isArray(
        parsed
      )
        ? parsed
        : [];
    } catch {
      return [];
    }
  }

  return [];
}

function isValidLatitude(
  value: number
) {
  return (
    Number.isFinite(
      value
    ) &&
    value >=
      MIN_LATITUDE &&
    value <=
      MAX_LATITUDE
  );
}

function isValidLongitude(
  value: number
) {
  return (
    Number.isFinite(
      value
    ) &&
    value >=
      -180 &&
    value <=
      180
  );
}

function formatEventDate(
  value: string,
  timeZone: string
) {
  try {
    return new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,
        weekday:
          "short",
        month:
          "short",
        day:
          "numeric",
        year:
          "numeric",
        hour:
          "numeric",
        minute:
          "2-digit",
      }
    ).format(
      new Date(
        value
      )
    );
  } catch {
    return new Date(
      value
    ).toLocaleString(
      "en-US"
    );
  }
}

function formatEventType(
  value: string
) {
  return value
    .replaceAll(
      "_",
      " "
    )
    .replace(
      /\b\w/g,
      (
        letter
      ) =>
        letter.toUpperCase()
    );
}

function formatDistance(
  value: unknown
) {
  if (
    value ===
      null ||
    value ===
      undefined ||
    value ===
      ""
  ) {
    return "";
  }

  const distance =
    Number(
      value
    );

  if (
    !Number.isFinite(
      distance
    )
  ) {
    return "";
  }

  if (
    distance <
    0.1
  ) {
    return "< 0.1 mile away";
  }

  if (
    distance <
    10
  ) {
    return `${distance.toFixed(
      1
    )} ${
      distance ===
      1
        ? "mile"
        : "miles"
    } away`;
  }

  const rounded =
    Math.round(
      distance
    );

  return `${rounded} ${
    rounded ===
    1
      ? "mile"
      : "miles"
  } away`;
}

// ============================================
// RADIUS GEOGRAPHY
// ============================================

function destinationPoint(
  latitude: number,
  longitude: number,
  distanceMiles: number,
  bearingDegrees: number
): [
  number,
  number,
] {
  const angularDistance =
    distanceMiles /
    EARTH_RADIUS_MILES;

  const bearing =
    bearingDegrees *
    Math.PI /
    180;

  const latitude1 =
    latitude *
    Math.PI /
    180;

  const longitude1 =
    longitude *
    Math.PI /
    180;

  const latitude2 =
    Math.asin(
      Math.sin(
        latitude1
      ) *
        Math.cos(
          angularDistance
        ) +
        Math.cos(
          latitude1
        ) *
          Math.sin(
            angularDistance
          ) *
          Math.cos(
            bearing
          )
    );

  const longitude2 =
    longitude1 +
    Math.atan2(
      Math.sin(
        bearing
      ) *
        Math.sin(
          angularDistance
        ) *
        Math.cos(
          latitude1
        ),
      Math.cos(
        angularDistance
      ) -
        Math.sin(
          latitude1
        ) *
          Math.sin(
            latitude2
          )
    );

  let longitudeDegrees =
    longitude2 *
    180 /
    Math.PI;

  longitudeDegrees =
    (
      (
        longitudeDegrees +
        540
      ) %
        360
    ) -
    180;

  return [
    longitudeDegrees,
    latitude2 *
      180 /
      Math.PI,
  ];
}

function buildRadiusGeoJson(
  latitude: number | null,
  longitude: number | null,
  radiusMiles: number | null
) {
  if (
    latitude ===
      null ||
    longitude ===
      null ||
    radiusMiles ===
      null
  ) {
    return {
      type:
        "FeatureCollection",
      features:
        [],
    };
  }

  const coordinates: Array<
    [
      number,
      number,
    ]
  > = [];

  const segments =
    96;

  for (
    let index = 0;
    index <=
    segments;
    index += 1
  ) {
    coordinates.push(
      destinationPoint(
        latitude,
        longitude,
        radiusMiles,
        (
          index /
          segments
        ) *
          360
      )
    );
  }

  return {
    type:
      "FeatureCollection",

    features: [
      {
        type:
          "Feature",

        properties: {},

        geometry: {
          type:
            "Polygon",

          coordinates: [
            coordinates,
          ],
        },
      },
    ],
  };
}

function getRadiusBounds(
  latitude: number,
  longitude: number,
  radiusMiles: number
) {
  const north =
    destinationPoint(
      latitude,
      longitude,
      radiusMiles,
      0
    );

  const east =
    destinationPoint(
      latitude,
      longitude,
      radiusMiles,
      90
    );

  const south =
    destinationPoint(
      latitude,
      longitude,
      radiusMiles,
      180
    );

  const west =
    destinationPoint(
      latitude,
      longitude,
      radiusMiles,
      270
    );

  return new mapboxgl.LngLatBounds(
    [
      west[0],
      south[1],
    ],
    [
      east[0],
      north[1],
    ]
  );
}

// ============================================
// OVERLAPPING POINTS
// ============================================

function offsetCoordinate(
  latitude: number,
  longitude: number,
  index: number,
  total: number
): [
  number,
  number,
] {
  if (
    total <=
    1
  ) {
    return [
      longitude,
      latitude,
    ];
  }

  const angle =
    (
      2 *
      Math.PI *
      index
    ) /
    total;

  const adjustedLatitude =
    latitude +
    Math.sin(
      angle
    ) *
      OVERLAP_OFFSET;

  const latitudeRadians =
    latitude *
    Math.PI /
    180;

  const longitudeScale =
    Math.max(
      Math.cos(
        latitudeRadians
      ),
      0.2
    );

  const adjustedLongitude =
    longitude +
    (
      Math.cos(
        angle
      ) *
      OVERLAP_OFFSET
    ) /
      longitudeScale;

  return [
    adjustedLongitude,
    adjustedLatitude,
  ];
}

// ============================================
// ARTIST GEOJSON
// ============================================

function buildArtistGeoJson(
  artists: MapArtist[]
): PointFeatureCollection {
  const groups =
    new Map<
      string,
      MapArtist[]
    >();

  artists.forEach(
    (
      artist
    ) => {
      if (
        artist.latitude ==
          null ||
        artist.longitude ==
          null
      ) {
        return;
      }

      const latitude =
        Number(
          artist.latitude
        );

      const longitude =
        Number(
          artist.longitude
        );

      if (
        !isValidLatitude(
          latitude
        ) ||
        !isValidLongitude(
          longitude
        )
      ) {
        return;
      }

      const key =
        `${latitude.toFixed(
          6
        )},${longitude.toFixed(
          6
        )}`;

      const group =
        groups.get(
          key
        ) ?? [];

      group.push(
        artist
      );

      groups.set(
        key,
        group
      );
    }
  );

  const features:
    PointFeatureCollection["features"] =
    [];

  groups.forEach(
    (
      group
    ) => {
      const sorted =
        [
          ...group,
        ].sort(
          (
            a,
            b
          ) => {
            const aName =
              a.name ??
              a.artist_name ??
              "";

            const bName =
              b.name ??
              b.artist_name ??
              "";

            return aName.localeCompare(
              bName
            );
          }
        );

      sorted.forEach(
        (
          artist,
          index
        ) => {
          const latitude =
            Number(
              artist.latitude
            );

          const longitude =
            Number(
              artist.longitude
            );

          const [
            adjustedLongitude,
            adjustedLatitude,
          ] =
            offsetCoordinate(
              latitude,
              longitude,
              index,
              sorted.length
            );

          features.push({
            type:
              "Feature",

            geometry: {
              type:
                "Point",

              coordinates: [
                adjustedLongitude,
                adjustedLatitude,
              ],
            },

            properties: {
              kind:
                "artist",

              id:
                artist.id,

              name:
                artist.name ??
                artist.artist_name ??
                "Artist",

              slug:
                artist.slug ??
                artist.artist_slug ??
                "",

              city:
                artist.city ??
                "",

              region:
                artist.region ??
                "",

              country:
                artist.country ??
                "",

              bio_short:
                artist.bio_short ??
                "",

              image_url:
                artist.image_url ??
                "",

              genres:
                JSON.stringify(
                  normalizeGenres(
                    artist.genres
                  )
                ),
            },
          });
        }
      );
    }
  );

  return {
    type:
      "FeatureCollection",

    features,
  };
}

// ============================================
// EVENT GEOJSON
// ============================================

function buildEventGeoJson(
  events: MapEvent[]
): PointFeatureCollection {
  const groups =
    new Map<
      string,
      MapEvent[]
    >();

  events.forEach(
    (
      event
    ) => {
      if (
        event.latitude ==
          null ||
        event.longitude ==
          null
      ) {
        return;
      }

      const latitude =
        Number(
          event.latitude
        );

      const longitude =
        Number(
          event.longitude
        );

      if (
        !isValidLatitude(
          latitude
        ) ||
        !isValidLongitude(
          longitude
        )
      ) {
        return;
      }

      const key =
        `${latitude.toFixed(
          6
        )},${longitude.toFixed(
          6
        )}`;

      const group =
        groups.get(
          key
        ) ?? [];

      group.push(
        event
      );

      groups.set(
        key,
        group
      );
    }
  );

  const features:
    PointFeatureCollection["features"] =
    [];

  groups.forEach(
    (
      group
    ) => {
      const sorted =
        [
          ...group,
        ].sort(
          (
            a,
            b
          ) => {
            const timeDifference =
              new Date(
                a.start_at
              ).getTime() -
              new Date(
                b.start_at
              ).getTime();

            if (
              timeDifference !==
              0
            ) {
              return timeDifference;
            }

            return a.title.localeCompare(
              b.title
            );
          }
        );

      sorted.forEach(
        (
          event,
          index
        ) => {
          const latitude =
            Number(
              event.latitude
            );

          const longitude =
            Number(
              event.longitude
            );

          const [
            adjustedLongitude,
            adjustedLatitude,
          ] =
            offsetCoordinate(
              latitude,
              longitude,
              index,
              sorted.length
            );

          features.push({
            type:
              "Feature",

            geometry: {
              type:
                "Point",

              coordinates: [
                adjustedLongitude,
                adjustedLatitude,
              ],
            },

            properties: {
              kind:
                "event",

              id:
                event.id,

              title:
                event.title,

              slug:
                event.slug,

              event_type:
                event.event_type ??
                "concert",

              status:
                event.status ??
                "scheduled",

              start_at:
                event.start_at,

              timezone:
                event.timezone ??
                "America/Los_Angeles",

              ticket_url:
                event.ticket_url ??
                "",

              venue_name:
                event.venue_name ??
                "",

              venue_slug:
                event.venue_slug ??
                "",

              location_name:
                event.location_name ??
                "",

              city:
                event.city ??
                "",

              region:
                event.region ??
                "",

              country:
                event.country ??
                "",

              distance_miles:
                event.distance_miles ??
                null,

              lineup:
                JSON.stringify(
                  normalizeLineup(
                    event.lineup
                  )
                ),
            },
          });
        }
      );
    }
  );

  return {
    type:
      "FeatureCollection",

    features,
  };
}

// ============================================
// ARTIST POPUP
// ============================================

function buildArtistPopup(
  properties:
    | Record<
        string,
        unknown
      >
    | null
) {
  if (!properties) {
    return "";
  }

  const name =
    escapeHtml(
      properties.name
    );

  const slug =
    encodeURIComponent(
      String(
        properties.slug ??
        ""
      )
    );

  const location =
    [
      properties.city,
      properties.region,
    ]
      .filter(
        Boolean
      )
      .map(
        escapeHtml
      )
      .join(
        ", "
      );

  const genres =
    normalizeGenres(
      properties.genres as
        | ArtistGenre[]
        | string
        | null
        | undefined
    ).slice(
      0,
      3
    );

  const bio =
    properties.bio_short
      ? escapeHtml(
          properties.bio_short
        )
      : "";

  const imageUrl =
    properties.image_url
      ? escapeHtml(
          properties.image_url
        )
      : "";

  return `
    <div style="
      min-width:250px;
      max-width:300px;
      font-family:Arial,Helvetica,sans-serif;
    ">
      ${
        imageUrl
          ? `
            <div style="
              width:100%;
              height:118px;
              margin-bottom:12px;
              overflow:hidden;
              border:1px solid #111;
              background:#111;
            ">
              <img
                src="${imageUrl}"
                alt="${name}"
                style="
                  display:block;
                  width:100%;
                  height:100%;
                  object-fit:cover;
                "
              />
            </div>
          `
          : ""
      }

      ${
        location
          ? `
            <div style="
              margin-bottom:7px;
              font-size:10px;
              font-weight:700;
              text-transform:uppercase;
              color:#666;
            ">
              ${location}
            </div>
          `
          : ""
      }

      <div style="
        font-size:20px;
        line-height:1.05;
        font-weight:800;
        color:#111;
      ">
        ${name}
      </div>

      ${
        genres.length
          ? `
            <div style="
              display:flex;
              flex-wrap:wrap;
              gap:5px;
              margin-top:10px;
            ">
              ${genres
                .map(
                  (
                    genre
                  ) => `
                    <span style="
                      border:1px solid #111;
                      padding:3px 5px;
                      font-size:9px;
                      font-weight:800;
                      text-transform:uppercase;
                    ">
                      ${escapeHtml(
                        genre.name
                      )}
                    </span>
                  `
                )
                .join("")}
            </div>
          `
          : ""
      }

      ${
        bio
          ? `
            <div style="
              display:-webkit-box;
              margin-top:11px;
              overflow:hidden;
              font-size:12px;
              line-height:1.5;
              color:#555;
              -webkit-box-orient:vertical;
              -webkit-line-clamp:3;
            ">
              ${bio}
            </div>
          `
          : ""
      }

      ${
        slug
          ? `
            <div style="
              margin-top:14px;
              padding-top:10px;
              border-top:1px solid #111;
            ">
              <a
                href="/artists/${slug}"
                style="
                  color:#111;
                  font-size:10px;
                  font-weight:800;
                  text-decoration:none;
                  text-transform:uppercase;
                "
              >
                Explore Artist →
              </a>
            </div>
          `
          : ""
      }
    </div>
  `;
}

// ============================================
// EVENT POPUP
// ============================================

function buildEventPopup(
  properties:
    | Record<
        string,
        unknown
      >
    | null
) {
  if (!properties) {
    return "";
  }

  const title =
    escapeHtml(
      properties.title
    );

  const eventSlug =
    encodeURIComponent(
      String(
        properties.slug ??
        ""
      )
    );

  const venueName =
    properties.venue_name
      ? escapeHtml(
          properties.venue_name
        )
      : "";

  const venueSlug =
    encodeURIComponent(
      String(
        properties.venue_slug ??
        ""
      )
    );

  const location =
    [
      properties.city,
      properties.region,
    ]
      .filter(
        Boolean
      )
      .map(
        escapeHtml
      )
      .join(
        ", "
      );

  const startAt =
    String(
      properties.start_at ??
      ""
    );

  const timeZone =
    String(
      properties.timezone ??
      "America/Los_Angeles"
    );

  const dateLabel =
    startAt
      ? escapeHtml(
          formatEventDate(
            startAt,
            timeZone
          )
        )
      : "";

  const eventType =
    escapeHtml(
      formatEventType(
        String(
          properties.event_type ??
          "concert"
        )
      )
    );

  const distance =
    formatDistance(
      properties.distance_miles
    );

  const lineup =
    normalizeLineup(
      properties.lineup as
        | EventLineupArtist[]
        | string
        | null
        | undefined
    )
      .sort(
        (
          a,
          b
        ) =>
          (
            a.billing_order ??
            0
          ) -
          (
            b.billing_order ??
            0
          )
      )
      .slice(
        0,
        4
      );

  const ticketUrl =
    safeExternalUrl(
      properties.ticket_url
    );

  return `
    <div style="
      min-width:240px;
      max-width:300px;
      font-family:Arial,Helvetica,sans-serif;
    ">
      <div style="
        margin-bottom:8px;
        font-size:9px;
        font-weight:800;
        text-transform:uppercase;
      ">
        ${eventType}
      </div>

      ${
        dateLabel
          ? `
            <div style="
              margin-bottom:7px;
              font-size:11px;
              font-weight:800;
              text-transform:uppercase;
              color:#555;
            ">
              ${dateLabel}
            </div>
          `
          : ""
      }

      <div style="
        font-size:20px;
        line-height:1.05;
        font-weight:800;
        text-transform:uppercase;
        color:#111;
      ">
        ${title}
      </div>

      ${
        venueName
          ? venueSlug
            ? `
              <div style="
                margin-top:10px;
              ">
                <a
                  href="/venues/${venueSlug}"
                  style="
                    color:#111;
                    font-size:12px;
                    font-weight:800;
                    text-decoration:none;
                    text-transform:uppercase;
                  "
                >
                  ${venueName} →
                </a>
              </div>
            `
            : `
              <div style="
                margin-top:10px;
                font-size:12px;
                font-weight:800;
                text-transform:uppercase;
              ">
                ${venueName}
              </div>
            `
          : ""
      }

      ${
        location
          ? `
            <div style="
              margin-top:3px;
              font-size:11px;
              font-weight:700;
              color:#666;
            ">
              ${location}
            </div>
          `
          : ""
      }

      ${
        distance
          ? `
            <div style="
              margin-top:6px;
              font-size:10px;
              font-weight:800;
              text-transform:uppercase;
            ">
              ${escapeHtml(
                distance
              )}
            </div>
          `
          : ""
      }

      ${
        lineup.length
          ? `
            <div style="
              margin-top:12px;
              padding-top:10px;
              border-top:1px solid #ccc;
            ">
              <div style="
                margin-bottom:6px;
                font-size:9px;
                font-weight:800;
                text-transform:uppercase;
                color:#777;
              ">
                Lineup
              </div>

              <div style="
                font-size:11px;
                font-weight:700;
                line-height:1.5;
              ">
                ${lineup
                  .map(
                    (
                      artist
                    ) =>
                      escapeHtml(
                        artist.name
                      )
                  )
                  .join(
                    " · "
                  )}
              </div>
            </div>
          `
          : ""
      }

      <div style="
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        margin-top:14px;
        padding-top:10px;
        border-top:1px solid #111;
      ">
        ${
          eventSlug
            ? `
              <a
                href="/events/${eventSlug}"
                style="
                  border:1px solid #111;
                  padding:7px 9px;
                  color:#111;
                  font-size:9px;
                  font-weight:800;
                  text-decoration:none;
                  text-transform:uppercase;
                "
              >
                View Event →
              </a>
            `
            : ""
        }

        ${
          ticketUrl
            ? `
              <a
                href="${ticketUrl}"
                target="_blank"
                rel="noopener noreferrer"
                style="
                  border:1px solid #111;
                  background:#111;
                  padding:7px 9px;
                  color:#fff;
                  font-size:9px;
                  font-weight:800;
                  text-decoration:none;
                  text-transform:uppercase;
                "
              >
                Tickets ↗
              </a>
            `
            : ""
        }
      </div>
    </div>
  `;
}

// ============================================
// COMPONENT
// ============================================

export default function AtlasMap({
  mode = "artists",

  selectedGenres = [],
  selectedStatuses = [],
  selectedLocations = [],

  eraStarts = [],
  eraEnds = [],

  minListeners = null,
  maxListeners = null,

  eventLocations = [],
  eventGenres = [],

  eventStartBefore = null,

  eventNearLatitude = null,
  eventNearLongitude = null,
  eventRadiusMiles = null,

  locationFocusSlug = null,
  locationFocusToken = 0,

  nearMeFocusToken = 0,

  onResultsCountChange,
  onClearFilters,
}: AtlasMapProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const mapRef =
    useRef<mapboxgl.Map | null>(
      null
    );

  const popupRef =
    useRef<mapboxgl.Popup | null>(
      null
    );

  const resizeObserverRef =
    useRef<ResizeObserver | null>(
      null
    );

  const resizeFrameRef =
    useRef<number | null>(
      null
    );

  const modeRef =
    useRef<MapMode>(
      mode
    );

  const genresRef =
    useRef(
      selectedGenres
    );

  const statusesRef =
    useRef(
      selectedStatuses
    );

  const locationsRef =
    useRef(
      selectedLocations
    );

  const eraStartsRef =
    useRef(
      eraStarts
    );

  const eraEndsRef =
    useRef(
      eraEnds
    );

  const minListenersRef =
    useRef(
      minListeners
    );

  const maxListenersRef =
    useRef(
      maxListeners
    );

  const eventLocationsRef =
    useRef(
      eventLocations
    );

  const eventGenresRef =
    useRef(
      eventGenres
    );

  const eventStartBeforeRef =
    useRef<
      string | null
    >(
      eventStartBefore
    );

  const nearLatitudeRef =
    useRef<
      number | null
    >(
      eventNearLatitude
    );

  const nearLongitudeRef =
    useRef<
      number | null
    >(
      eventNearLongitude
    );

  const radiusRef =
    useRef<
      number | null
    >(
      eventRadiusMiles
    );

  const supabaseRef =
    useRef(
      createClient()
    );

  const requestSequenceRef =
    useRef(0);

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(false);

  const [
    visibleResultCount,
    setVisibleResultCount,
  ] =
    useState(0);

  const [
    hasCompletedQuery,
    setHasCompletedQuery,
  ] =
    useState(false);

  const [
    showEmptyState,
    setShowEmptyState,
  ] =
    useState(false);

  const resultsCountCallbackRef =
    useRef(
      onResultsCountChange
    );

  useEffect(
    () => {
      resultsCountCallbackRef.current =
        onResultsCountChange;
    },
    [
      onResultsCountChange,
    ]
  );

  useEffect(
    () => {
      if (
        !hasCompletedQuery ||
        isLoading ||
        visibleResultCount !==
          0
      ) {
        setShowEmptyState(
          false
        );

        return;
      }

      const timer =
        window.setTimeout(
          () => {
            setShowEmptyState(
              true
            );
          },
          700
        );

      return () => {
        window.clearTimeout(
          timer
        );
      };
    },
    [
      hasCompletedQuery,
      isLoading,
      visibleResultCount,
    ]
  );

  // ============================================
  // POINT STYLE
  // ============================================

  function updatePointStyle(
    map: mapboxgl.Map
  ) {
    if (
      !map.getLayer(
        POINT_LAYER_ID
      )
    ) {
      return;
    }

    const events =
      modeRef.current ===
      "events";

    map.setPaintProperty(
      POINT_LAYER_ID,
      "circle-radius",
      events
        ? 9
        : 7
    );

    map.setPaintProperty(
      POINT_LAYER_ID,
      "circle-color",
      events
        ? "#ffffff"
        : "#111111"
    );

    map.setPaintProperty(
      POINT_LAYER_ID,
      "circle-stroke-color",
      events
        ? "#111111"
        : "#ffffff"
    );

    map.setPaintProperty(
      POINT_LAYER_ID,
      "circle-stroke-width",
      events
        ? 3
        : 2
    );
  }

  // ============================================
  // USER LOCATION + RADIUS
  // ============================================

  function updateLocationLayers(
    map: mapboxgl.Map
  ) {
    const userSource =
      map.getSource(
        USER_SOURCE_ID
      ) as
        | GeoJSONSource
        | undefined;

    if (
      userSource
    ) {
      userSource.setData({
        type:
          "FeatureCollection",

        features:
          nearLatitudeRef.current !==
            null &&
          nearLongitudeRef.current !==
            null
            ? [
                {
                  type:
                    "Feature",

                  properties: {},

                  geometry: {
                    type:
                      "Point",

                    coordinates: [
                      nearLongitudeRef.current,
                      nearLatitudeRef.current,
                    ],
                  },
                },
              ]
            : [],
      } as any);
    }

    const radiusSource =
      map.getSource(
        RADIUS_SOURCE_ID
      ) as
        | GeoJSONSource
        | undefined;

    if (
      radiusSource
    ) {
      radiusSource.setData(
        buildRadiusGeoJson(
          nearLatitudeRef.current,
          nearLongitudeRef.current,
          radiusRef.current
        ) as any
      );
    }
  }

  // ============================================
  // LOAD DATA
  // ============================================

  async function loadData(
    map: mapboxgl.Map
  ) {
    const source =
      map.getSource(
        SOURCE_ID
      ) as
        | GeoJSONSource
        | undefined;

    if (!source) {
      return;
    }

    const requestId =
      ++requestSequenceRef.current;

    setIsLoading(
      true
    );

    const requestedMode =
      modeRef.current;

    const bounds =
      map.getBounds();

    if (!bounds) {
      return;
    }

    const west =
      bounds.getWest();

    const south =
      bounds.getSouth();

    const east =
      bounds.getEast();

    const north =
      bounds.getNorth();

    if (
      !Number.isFinite(
        west
      ) ||
      !Number.isFinite(
        south
      ) ||
      !Number.isFinite(
        east
      ) ||
      !Number.isFinite(
        north
      )
    ) {
      return;
    }

    if (
      requestedMode ===
      "events"
    ) {
      const {
        data,
        error,
      } =
        await supabaseRef.current.rpc(
          "get_events_in_map_bounds",
          {
            min_long:
              west,

            min_lat:
              south,

            max_long:
              east,

            max_lat:
              north,

            location_slugs:
              eventLocationsRef.current.length
                ? eventLocationsRef.current
                : null,

            event_genre_slugs:
              eventGenresRef.current.length
                ? eventGenresRef.current
                : null,

            start_before:
              eventStartBeforeRef.current,

            near_lat:
              nearLatitudeRef.current,

            near_long:
              nearLongitudeRef.current,

            radius_miles:
              radiusRef.current,
          }
        );

      if (
        error
      ) {
        console.error(
          "Map event query failed:",
          {
            message:
              error.message,

            details:
              error.details,

            hint:
              error.hint,

            code:
              error.code,
          }
        );

        if (
          requestId ===
            requestSequenceRef.current
        ) {
          setIsLoading(false);
        }

        return;
      }

      if (
        requestId !==
          requestSequenceRef.current ||
        modeRef.current !==
          requestedMode
      ) {
        return;
      }

      const eventGeoJson =
        buildEventGeoJson(
          normalizeEvents(
            data
          )
        );

      source.setData(
        eventGeoJson as any
      );

      setVisibleResultCount(
        eventGeoJson.features.length
      );

      resultsCountCallbackRef.current?.(
        eventGeoJson.features.length
      );

      setHasCompletedQuery(
        true
      );

      setIsLoading(
        false
      );

      return;
    }

    const {
      data,
      error,
    } =
      await supabaseRef.current.rpc(
        "get_filtered_artists_in_map_bounds",
        {
          min_long:
            west,

          min_lat:
            south,

          max_long:
            east,

          max_lat:
            north,

          genre_slugs:
            genresRef.current.length
              ? genresRef.current
              : null,

          artist_statuses:
            statusesRef.current.length
              ? statusesRef.current
              : null,

          location_slugs:
            locationsRef.current.length
              ? locationsRef.current
              : null,

          era_starts:
            eraStartsRef.current.length
              ? eraStartsRef.current
              : null,

          era_ends:
            eraEndsRef.current.length
              ? eraEndsRef.current
              : null,

          min_listeners:
            minListenersRef.current,

          max_listeners:
            maxListenersRef.current,
        }
      );

    if (
      error
    ) {
      console.error(
        "Map artist query failed:",
        {
          message:
            error.message,

          details:
            error.details,

          hint:
            error.hint,

          code:
            error.code,
        }
      );

      if (
        requestId ===
          requestSequenceRef.current
      ) {
        setIsLoading(false);
      }

      return;
    }

    if (
      requestId !==
        requestSequenceRef.current ||
      modeRef.current !==
        requestedMode
    ) {
      return;
    }

    const artists =
      normalizeArtists(
        data
      );

    const artistIds =
      artists.map(
        (
          artist
        ) =>
          artist.id
      );

    if (
      artistIds.length
    ) {
      const {
        data:
          artistImageRows,
        error:
          artistImagesError,
      } =
        await supabaseRef.current
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
            "sort_order",
            {
              ascending:
                true,
            }
          );

      if (
        artistImagesError
      ) {
        console.error(
          "Map artist image query failed:",
          artistImagesError
        );
      } else if (
        artistImageRows
      ) {
        const imageByArtist =
          new Map<
            string,
            {
              storage_path:
                string;
              image_type:
                string | null;
              sort_order:
                number | null;
            }
          >();

        for (
          const row of
          artistImageRows
        ) {
          const existing =
            imageByArtist.get(
              row.artist_id
            );

          const currentRank =
            row.image_type ===
            "hero"
              ? 0
              : row.image_type ===
                  "profile"
                ? 1
                : 2;

          const existingRank =
            existing?.image_type ===
            "hero"
              ? 0
              : existing?.image_type ===
                  "profile"
                ? 1
                : 2;

          if (
            !existing ||
            currentRank <
              existingRank ||
            (
              currentRank ===
                existingRank &&
              (
                row.sort_order ??
                0
              ) <
                (
                  existing.sort_order ??
                  0
                )
            )
          ) {
            imageByArtist.set(
              row.artist_id,
              {
                storage_path:
                  row.storage_path,
                image_type:
                  row.image_type,
                sort_order:
                  row.sort_order,
              }
            );
          }
        }

        for (
          const artist of
          artists
        ) {
          const image =
            imageByArtist.get(
              artist.id
            );

          if (
            image?.storage_path
          ) {
            artist.image_url =
              supabaseRef.current.storage
                .from(
                  "artist-images"
                )
                .getPublicUrl(
                  image.storage_path
                ).data.publicUrl;
          }
        }
      }
    }

    if (
      requestId !==
        requestSequenceRef.current ||
      modeRef.current !==
        requestedMode
    ) {
      return;
    }

    const artistGeoJson =
      buildArtistGeoJson(
        artists
      );

    source.setData(
      artistGeoJson as any
    );

    setVisibleResultCount(
      artistGeoJson.features.length
    );

    resultsCountCallbackRef.current?.(
      artistGeoJson.features.length
    );

    setHasCompletedQuery(
      true
    );

    setIsLoading(
      false
    );
  }

  // ============================================
  // PROP CHANGES
  // ============================================

  useEffect(
    () => {
      const previousMode =
        modeRef.current;

      modeRef.current =
        mode;

      genresRef.current =
        selectedGenres;

      statusesRef.current =
        selectedStatuses;

      locationsRef.current =
        selectedLocations;

      eraStartsRef.current =
        eraStarts;

      eraEndsRef.current =
        eraEnds;

      minListenersRef.current =
        minListeners;

      maxListenersRef.current =
        maxListeners;

      eventLocationsRef.current =
        eventLocations;

      eventGenresRef.current =
        eventGenres;

      eventStartBeforeRef.current =
        eventStartBefore;

      nearLatitudeRef.current =
        eventNearLatitude;

      nearLongitudeRef.current =
        eventNearLongitude;

      radiusRef.current =
        eventRadiusMiles;

      const map =
        mapRef.current;

      if (!map) {
        return;
      }

      popupRef.current?.remove();

      updatePointStyle(
        map
      );

      updateLocationLayers(
        map
      );

      const source =
        map.getSource(
          SOURCE_ID
        ) as
          | GeoJSONSource
          | undefined;

      if (
        source
      ) {
        /*
         * Invalidate any request started with the
         * previous filters or map mode.
         */
        requestSequenceRef.current +=
          1;

        /*
         * A mode switch should never display the
         * previous mode's points while the new RPC
         * request is still in flight.
         */
        if (
          previousMode !==
          mode
        ) {
          source.setData({
            type:
              "FeatureCollection",
            features:
              [],
          } as any);
        }

        void loadData(
          map
        );
      }
    },
    [
      mode,
      selectedGenres,
      selectedStatuses,
      selectedLocations,
      eraStarts,
      eraEnds,
      minListeners,
      maxListeners,
      eventLocations,
      eventGenres,
      eventStartBefore,
      eventNearLatitude,
      eventNearLongitude,
      eventRadiusMiles,
    ]
  );

  // ============================================
  // LOCATION FILTER CAMERA FOCUS
  // ============================================

  useEffect(
    () => {
      if (
        !locationFocusSlug ||
        locationFocusToken <=
          0
      ) {
        return;
      }

      let cancelled =
        false;

      let retryTimer:
        ReturnType<
          typeof setTimeout
        > | null =
        null;

      async function focusLocation() {
        const {
          data,
          error,
        } =
          await supabaseRef.current
            .from(
              "locations"
            )
            .select(
              `
              slug,
              latitude,
              longitude
              `
            )
            .eq(
              "slug",
              locationFocusSlug
            )
            .maybeSingle();

        if (
          cancelled
        ) {
          return;
        }

        if (
          error
        ) {
          console.error(
            "location camera lookup error:",
            error
          );

          return;
        }

        if (
          !data ||
          data.latitude ===
            null ||
          data.longitude ===
            null
        ) {
          console.warn(
            "Location has no coordinates:",
            locationFocusSlug
          );

          return;
        }

        const latitude =
          Number(
            data.latitude
          );

        const longitude =
          Number(
            data.longitude
          );

        if (
          !isValidLatitude(
            latitude
          ) ||
          !isValidLongitude(
            longitude
          )
        ) {
          console.warn(
            "Invalid location coordinates:",
            locationFocusSlug,
            latitude,
            longitude
          );

          return;
        }

        const moveCamera =
          () => {
            if (
              cancelled
            ) {
              return;
            }

            const map =
              mapRef.current;

            /*
             * The location can be selected while
             * Mapbox is still initializing. Retry
             * briefly instead of dropping the
             * camera request.
             */
            if (!map) {
              retryTimer =
                setTimeout(
                  moveCamera,
                  50
                );

              return;
            }

            popupRef.current?.remove();

            popupRef.current =
              null;

            map.stop();

            map.flyTo({
              center: [
                longitude,
                latitude,
              ],

              zoom:
                11,

              duration:
                700,

              essential:
                true,
            });
          };

        moveCamera();
      }

      void focusLocation();

      return () => {
        cancelled =
          true;

        if (
          retryTimer !==
          null
        ) {
          clearTimeout(
            retryTimer
          );
        }
      };
    },
    [
      locationFocusSlug,
      locationFocusToken,
    ]
  );

  // ============================================
  // NEAR ME CAMERA FIT
  // ============================================

  useEffect(
    () => {
      if (
        nearMeFocusToken <=
          0 ||
        eventNearLatitude ===
          null ||
        eventNearLongitude ===
          null ||
        eventRadiusMiles ===
          null
      ) {
        return;
      }

      const map =
        mapRef.current;

      if (!map) {
        return;
      }

      map.fitBounds(
        getRadiusBounds(
          eventNearLatitude,
          eventNearLongitude,
          eventRadiusMiles
        ),
        {
          padding: {
            top:
              65,

            right:
              65,

            bottom:
              65,

            left:
              65,
          },

          maxZoom:
            13,

          duration:
            700,
        }
      );
    },
    [
      nearMeFocusToken,
      eventNearLatitude,
      eventNearLongitude,
      eventRadiusMiles,
    ]
  );

  // ============================================
  // MAP INITIALIZATION
  // ============================================

  useEffect(
    () => {
      const container =
        containerRef.current;

      if (
        !container ||
        mapRef.current
      ) {
        return;
      }

      /*
       * Keep a non-null local reference.
       * This prevents TypeScript from widening
       * containerRef.current back to null inside
       * nested callbacks.
       */
      const mapContainer:
        HTMLDivElement =
        container;

      try {
        window.sessionStorage.removeItem(
          OLD_MAP_STORAGE_KEY
        );
      } catch {
        // Ignore storage errors.
      }

      /*
       * Remove old camera query parameters
       * while preserving filters and mode.
       */
      const currentUrl =
        new URL(
          window.location.href
        );

      const hadCameraParams =
        currentUrl.searchParams.has(
          "lat"
        ) ||
        currentUrl.searchParams.has(
          "lng"
        ) ||
        currentUrl.searchParams.has(
          "zoom"
        );

      if (
        hadCameraParams
      ) {
        currentUrl.searchParams.delete(
          "lat"
        );

        currentUrl.searchParams.delete(
          "lng"
        );

        currentUrl.searchParams.delete(
          "zoom"
        );

        window.history.replaceState(
          {},
          "",
          `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
        );
      }

      const token =
        process.env
          .NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

      if (!token) {
        console.error(
          "NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is missing."
        );

        return;
      }

      mapboxgl.accessToken =
        token;

      let disposed =
        false;

      let map:
        | mapboxgl.Map
        | null =
        null;

      function initializeMap() {
        if (
          disposed ||
          mapRef.current
        ) {
          return;
        }

        /*
         * Avoid initializing Mapbox against
         * a zero-size container.
         */
        if (
          mapContainer.clientWidth <=
            0 ||
          mapContainer.clientHeight <=
            0
        ) {
          resizeFrameRef.current =
            window.requestAnimationFrame(
              initializeMap
            );

          return;
        }

        try {
          map =
            new mapboxgl.Map({
              container:
                mapContainer,

              style:
                "mapbox://styles/mapbox/light-v11",

              projection:
                "mercator",

              center:
                DEFAULT_CENTER,

              zoom:
                DEFAULT_ZOOM,

              minZoom:
                MIN_ZOOM,

              maxZoom:
                MAX_ZOOM,

              trackResize:
                true,
            });
        } catch (
          error
        ) {
          console.error(
            "Unable to initialize Mapbox:",
            error
          );

          return;
        }

        const activeMap =
          map;

        mapRef.current =
          activeMap;

        // ======================================
        // RESIZE OBSERVER
        // ======================================

        const resizeObserver =
          new ResizeObserver(
            () => {
              if (
                disposed
              ) {
                return;
              }

              if (
                resizeFrameRef.current !==
                null
              ) {
                window.cancelAnimationFrame(
                  resizeFrameRef.current
                );
              }

              resizeFrameRef.current =
                window.requestAnimationFrame(
                  () => {
                    if (
                      disposed
                    ) {
                      return;
                    }

                    if (
                      mapContainer.clientWidth >
                        0 &&
                      mapContainer.clientHeight >
                        0
                    ) {
                      try {
                        activeMap.resize();
                      } catch (
                        error
                      ) {
                        console.warn(
                          "Map resize failed:",
                          error
                        );
                      }
                    }
                  }
                );
            }
          );

        resizeObserver.observe(
          mapContainer
        );

        resizeObserverRef.current =
          resizeObserver;

        // ======================================
        // CONTROLS
        // ======================================

        activeMap.addControl(
          new mapboxgl.NavigationControl(),
          "top-right"
        );

        activeMap.on(
          "error",
          (
            event
          ) => {
            console.error(
              "Mapbox error:",
              event.error
            );
          }
        );

        // ======================================
        // MAP LOAD
        // ======================================

        activeMap.on(
          "load",
          () => {
            if (
              disposed
            ) {
              return;
            }

            // ==================================
            // MAIN DATA SOURCE
            // ==================================

            if (
              !activeMap.getSource(
                SOURCE_ID
              )
            ) {
              activeMap.addSource(
                SOURCE_ID,
                {
                  type:
                    "geojson",

                  data: {
                    type:
                      "FeatureCollection",

                    features:
                      [],
                  },

                  cluster:
                    false,

                  clusterRadius:
                    50,

                  clusterMaxZoom:
                    13,
                }
              );
            }

            // ==================================
            // SEARCH RADIUS SOURCE
            // ==================================

            if (
              !activeMap.getSource(
                RADIUS_SOURCE_ID
              )
            ) {
              activeMap.addSource(
                RADIUS_SOURCE_ID,
                {
                  type:
                    "geojson",

                  data: {
                    type:
                      "FeatureCollection",

                    features:
                      [],
                  },
                }
              );
            }

            // ==================================
            // RADIUS FILL
            // ==================================

            if (
              !activeMap.getLayer(
                RADIUS_FILL_LAYER_ID
              )
            ) {
              activeMap.addLayer({
                id:
                  RADIUS_FILL_LAYER_ID,

                type:
                  "fill",

                source:
                  RADIUS_SOURCE_ID,

                paint: {
                  "fill-color":
                    "#111111",

                  "fill-opacity":
                    0.06,
                },
              });
            }

            // ==================================
            // RADIUS OUTLINE
            // ==================================

            if (
              !activeMap.getLayer(
                RADIUS_OUTLINE_LAYER_ID
              )
            ) {
              activeMap.addLayer({
                id:
                  RADIUS_OUTLINE_LAYER_ID,

                type:
                  "line",

                source:
                  RADIUS_SOURCE_ID,

                paint: {
                  "line-color":
                    "#111111",

                  "line-width":
                    2,

                  "line-opacity":
                    0.5,

                  "line-dasharray": [
                    4,
                    3,
                  ],
                },
              });
            }

            // ==================================
            // CLUSTERS
            // ==================================

            if (
              !activeMap.getLayer(
                CLUSTER_LAYER_ID
              )
            ) {
              activeMap.addLayer({
                id:
                  CLUSTER_LAYER_ID,

                type:
                  "circle",

                source:
                  SOURCE_ID,

                filter: [
                  "has",
                  "point_count",
                ],

                paint: {
                  "circle-color":
                    "#111111",

                  "circle-radius": [
                    "step",

                    [
                      "get",
                      "point_count",
                    ],

                    18,

                    10,
                    22,

                    30,
                    28,
                  ],

                  "circle-stroke-color":
                    "#ffffff",

                  "circle-stroke-width":
                    2,
                },
              });
            }

            // ==================================
            // CLUSTER COUNT
            // ==================================

            if (
              !activeMap.getLayer(
                CLUSTER_COUNT_LAYER_ID
              )
            ) {
              activeMap.addLayer({
                id:
                  CLUSTER_COUNT_LAYER_ID,

                type:
                  "symbol",

                source:
                  SOURCE_ID,

                filter: [
                  "has",
                  "point_count",
                ],

                layout: {
                  "text-field":
                    "{point_count_abbreviated}",

                  "text-size":
                    12,
                },

                paint: {
                  "text-color":
                    "#ffffff",
                },
              });
            }

            // ==================================
            // ARTIST / EVENT POINTS
            // ==================================

            if (
              !activeMap.getLayer(
                POINT_LAYER_ID
              )
            ) {
              activeMap.addLayer({
                id:
                  POINT_LAYER_ID,

                type:
                  "circle",

                source:
                  SOURCE_ID,

                filter: [
                  "!",
                  [
                    "has",
                    "point_count",
                  ],
                ],

                paint: {
                  /*
                   * Default style is Artists.
                   * updatePointStyle handles
                   * mode changes afterward.
                   */
                  "circle-color":
                    "#111111",

                  "circle-radius":
                    7,

                  "circle-stroke-color":
                    "#ffffff",

                  "circle-stroke-width":
                    2,
                },
              });
            }

            // ==================================
            // USER LOCATION SOURCE
            // ==================================

            if (
              !activeMap.getSource(
                USER_SOURCE_ID
              )
            ) {
              activeMap.addSource(
                USER_SOURCE_ID,
                {
                  type:
                    "geojson",

                  data: {
                    type:
                      "FeatureCollection",

                    features:
                      [],
                  },
                }
              );
            }

            // ==================================
            // USER LOCATION OUTER MARKER
            // ==================================

            if (
              !activeMap.getLayer(
                USER_OUTER_LAYER_ID
              )
            ) {
              activeMap.addLayer({
                id:
                  USER_OUTER_LAYER_ID,

                type:
                  "circle",

                source:
                  USER_SOURCE_ID,

                paint: {
                  "circle-radius":
                    12,

                  "circle-color":
                    "#ffffff",

                  "circle-stroke-color":
                    "#111111",

                  "circle-stroke-width":
                    2,
                },
              });
            }

            // ==================================
            // USER LOCATION INNER MARKER
            // ==================================

            if (
              !activeMap.getLayer(
                USER_INNER_LAYER_ID
              )
            ) {
              activeMap.addLayer({
                id:
                  USER_INNER_LAYER_ID,

                type:
                  "circle",

                source:
                  USER_SOURCE_ID,

                paint: {
                  "circle-radius":
                    4,

                  "circle-color":
                    "#111111",
                },
              });
            }

            updatePointStyle(
              activeMap
            );

            updateLocationLayers(
              activeMap
            );

            /*
             * Load once after the style and
             * sources are completely ready.
             */
            activeMap.once(
              "idle",
              () => {
                if (
                  disposed
                ) {
                  return;
                }

                void loadData(
                  activeMap
                );
              }
            );
          }
        );

        // ======================================
        // PAN / ZOOM
        // ======================================

        activeMap.on(
          "moveend",
          () => {
            if (
              disposed
            ) {
              return;
            }

            if (
              !activeMap.getSource(
                SOURCE_ID
              )
            ) {
              return;
            }

            void loadData(
              activeMap
            );
          }
        );

        // ======================================
        // CLUSTER CLICK
        // ======================================

        activeMap.on(
          "click",
          CLUSTER_LAYER_ID,
          (
            event
          ) => {
            if (
              disposed
            ) {
              return;
            }

            const features =
              activeMap.queryRenderedFeatures(
                event.point,
                {
                  layers: [
                    CLUSTER_LAYER_ID,
                  ],
                }
              );

            const feature =
              features[0] as unknown as
                | RenderedPointFeature
                | undefined;

            if (
              !feature ||
              feature.geometry.type !==
                "Point" ||
              !feature.geometry.coordinates
            ) {
              return;
            }

            const source =
              activeMap.getSource(
                SOURCE_ID
              ) as
                | GeoJSONSource
                | undefined;

            if (!source) {
              return;
            }

            const clusterId =
              Number(
                feature.properties
                  ?.cluster_id
              );

            if (
              !Number.isFinite(
                clusterId
              )
            ) {
              return;
            }

            const longitude =
              Number(
                feature.geometry
                  .coordinates[0]
              );

            const latitude =
              Number(
                feature.geometry
                  .coordinates[1]
              );

            if (
              !isValidLongitude(
                longitude
              ) ||
              !isValidLatitude(
                latitude
              )
            ) {
              return;
            }

            const coordinates: [
              number,
              number,
            ] = [
              longitude,
              latitude,
            ];

            /*
             * Preserve callback API.
             */
            source.getClusterExpansionZoom(
              clusterId,
              (
                error,
                zoom
              ) => {
                if (
                  error ||
                  disposed
                ) {
                  if (
                    error
                  ) {
                    console.error(
                      "Unable to expand cluster:",
                      error
                    );
                  }

                  return;
                }

                if (
                  typeof zoom !==
                    "number" ||
                  !Number.isFinite(
                    zoom
                  )
                ) {
                  return;
                }

                activeMap.easeTo({
                  center:
                    coordinates,

                  zoom:
                    Math.max(
                      MIN_ZOOM,
                      Math.min(
                        MAX_ZOOM,
                        zoom
                      )
                    ),
                });
              }
            );
          }
        );

        // ======================================
        // ARTIST HOVER PREVIEW
        // ======================================

        let hoverOpenTimer:
          ReturnType<
            typeof setTimeout
          > | null =
          null;

        let hoverCloseTimer:
          ReturnType<
            typeof setTimeout
          > | null =
          null;

        const canHover =
          () =>
            window.matchMedia(
              "(hover: hover) and (pointer: fine)"
            ).matches;

        const clearHoverOpenTimer =
          () => {
            if (
              hoverOpenTimer
            ) {
              clearTimeout(
                hoverOpenTimer
              );

              hoverOpenTimer =
                null;
            }
          };

        const clearHoverCloseTimer =
          () => {
            if (
              hoverCloseTimer
            ) {
              clearTimeout(
                hoverCloseTimer
              );

              hoverCloseTimer =
                null;
            }
          };

        const scheduleHoverClose =
          () => {
            clearHoverCloseTimer();

            hoverCloseTimer =
              setTimeout(
                () => {
                  popupRef.current?.remove();
                },
                220
              );
          };

        const showArtistHoverPopup =
          (
            feature:
              RenderedPointFeature
          ) => {
            if (
              feature.geometry.type !==
                "Point" ||
              !feature.geometry.coordinates
            ) {
              return;
            }

            const longitude =
              Number(
                feature.geometry
                  .coordinates[0]
              );

            const latitude =
              Number(
                feature.geometry
                  .coordinates[1]
              );

            if (
              !isValidLongitude(
                longitude
              ) ||
              !isValidLatitude(
                latitude
              )
            ) {
              return;
            }

            const popupHtml =
              buildArtistPopup(
                feature.properties ??
                  null
              );

            popupRef.current?.remove();

            const popup =
              new mapboxgl.Popup({
                offset:
                  12,

                closeButton:
                  false,

                closeOnClick:
                  false,

                maxWidth:
                  "320px",
              })
                .setLngLat([
                  longitude,
                  latitude,
                ])
                .setHTML(
                  popupHtml
                )
                .addTo(
                  activeMap
                );

            popupRef.current =
              popup;

            const popupElement =
              popup.getElement();

            popupElement?.addEventListener(
  "mouseenter",
  clearHoverCloseTimer
);

popupElement?.addEventListener(
  "mouseleave",
  scheduleHoverClose
);
          };

        // ======================================
        // POINT CLICK
        // ======================================

        activeMap.on(
          "click",
          POINT_LAYER_ID,
          (
            event
          ) => {
            if (
              disposed
            ) {
              return;
            }

            const feature =
              event.features?.[0] as unknown as
                | RenderedPointFeature
                | undefined;

            if (
              !feature ||
              feature.geometry.type !==
                "Point" ||
              !feature.geometry.coordinates
            ) {
              return;
            }

            const longitude =
              Number(
                feature.geometry
                  .coordinates[0]
              );

            const latitude =
              Number(
                feature.geometry
                  .coordinates[1]
              );

            if (
              !isValidLongitude(
                longitude
              ) ||
              !isValidLatitude(
                latitude
              )
            ) {
              return;
            }

            const kind =
              String(
                feature.properties
                  ?.kind ??
                  "artist"
              );

            if (
              kind ===
                "artist" &&
              canHover()
            ) {
              const slug =
                String(
                  feature.properties
                    ?.slug ??
                    ""
                );

              if (
                slug
              ) {
                window.location.href =
                  `/artists/${encodeURIComponent(
                    slug
                  )}`;

                return;
              }
            }

            const popupHtml =
              kind ===
              "event"
                ? buildEventPopup(
                    feature.properties ??
                    null
                  )
                : buildArtistPopup(
                    feature.properties ??
                    null
                  );

            popupRef.current?.remove();

            popupRef.current =
              new mapboxgl.Popup({
                offset:
                  12,

                closeButton:
                  true,

                closeOnClick:
                  true,

                maxWidth:
                  "320px",
              })
                .setLngLat([
                  longitude,
                  latitude,
                ])
                .setHTML(
                  popupHtml
                )
                .addTo(
                  activeMap
                );
          }
        );

        // ======================================
        // CURSOR
        // ======================================

        activeMap.on(
          "mouseenter",
          CLUSTER_LAYER_ID,
          () => {
            activeMap.getCanvas().style.cursor =
              "pointer";
          }
        );

        activeMap.on(
          "mouseleave",
          CLUSTER_LAYER_ID,
          () => {
            activeMap.getCanvas().style.cursor =
              "";
          }
        );

        activeMap.on(
          "mouseenter",
          POINT_LAYER_ID,
          (
            event
          ) => {
            activeMap.getCanvas().style.cursor =
              "pointer";

            if (
              !canHover() ||
              modeRef.current !==
                "artists"
            ) {
              return;
            }

            const feature =
              event.features?.[0] as unknown as
                | RenderedPointFeature
                | undefined;

            if (
              !feature ||
              String(
                feature.properties
                  ?.kind ??
                  ""
              ) !==
                "artist"
            ) {
              return;
            }

            clearHoverCloseTimer();
            clearHoverOpenTimer();

            hoverOpenTimer =
              setTimeout(
                () => {
                  showArtistHoverPopup(
                    feature
                  );
                },
                180
              );
          }
        );

        activeMap.on(
          "mouseleave",
          POINT_LAYER_ID,
          () => {
            activeMap.getCanvas().style.cursor =
              "";

            if (
              !canHover() ||
              modeRef.current !==
                "artists"
            ) {
              return;
            }

            clearHoverOpenTimer();
            scheduleHoverClose();
          }
        );
      }

      initializeMap();

      // ========================================
      // CLEANUP
      // ========================================

      return () => {
        disposed =
          true;

        if (
          resizeFrameRef.current !==
          null
        ) {
          window.cancelAnimationFrame(
            resizeFrameRef.current
          );

          resizeFrameRef.current =
            null;
        }

        resizeObserverRef.current?.disconnect();

        resizeObserverRef.current =
          null;

        popupRef.current?.remove();

        popupRef.current =
          null;

        if (
          map
        ) {
          map.remove();
        }

        mapRef.current =
          null;
      };
    },
    []
  );

  function fitMapToResults() {
    const map =
      mapRef.current;

    if (!map) {
      return;
    }

    const source =
      map.getSource(
        SOURCE_ID
      ) as
        | GeoJSONSource
        | undefined;

    if (!source) {
      return;
    }

    const sourceData =
      (
        source as unknown as {
          _data?:
            | PointFeatureCollection
            | null;
        }
      )._data;

    if (
      !sourceData ||
      !Array.isArray(
        sourceData.features
      ) ||
      sourceData.features.length ===
        0
    ) {
      return;
    }

    const bounds =
      new mapboxgl.LngLatBounds();

    sourceData.features.forEach(
      (
        feature
      ) => {
        const [
          longitude,
          latitude,
        ] =
          feature.geometry.coordinates;

        if (
          !isValidLongitude(
            longitude
          ) ||
          !isValidLatitude(
            latitude
          )
        ) {
          return;
        }

        bounds.extend([
          longitude,
          latitude,
        ]);
      }
    );

    if (
      bounds.isEmpty()
    ) {
      return;
    }

    popupRef.current?.remove();

    popupRef.current =
      null;

    map.stop();

    const northEast =
      bounds.getNorthEast();

    const southWest =
      bounds.getSouthWest();

    if (
      northEast.lng ===
        southWest.lng &&
      northEast.lat ===
        southWest.lat
    ) {
      map.easeTo({
        center:
          bounds.getCenter(),

        zoom:
          11,

        duration:
          700,

        essential:
          true,
      });

      return;
    }

    map.fitBounds(
      bounds,
      {
        padding: {
          top:
            70,
          right:
            70,
          bottom:
            70,
          left:
            70,
        },

        maxZoom:
          13,

        duration:
          700,
      }
    );
  }

  function resetMapView() {
    const map =
      mapRef.current;

    if (!map) {
      return;
    }

    popupRef.current?.remove();

    popupRef.current =
      null;

    map.stop();

    map.easeTo({
      center:
        DEFAULT_CENTER,

      zoom:
        DEFAULT_ZOOM,

      duration:
        700,

      essential:
        true,
    });
  }

  return (
    <div className="relative w-full">
      <div
        ref={
          containerRef
        }
        className="h-[calc(100dvh-250px)] min-h-[430px] w-full sm:h-[calc(100dvh-210px)] sm:min-h-[500px] lg:h-[calc(100dvh-180px)]"
      />

      {/* ======================================
          MAP CONTROLS
      ====================================== */}

      <div className="pointer-events-none absolute left-2 top-2 z-10 flex max-w-[calc(100%-16px)] flex-wrap items-center gap-1.5 sm:left-4 sm:top-4 sm:max-w-[calc(100%-88px)] sm:gap-2">
        <div className="pointer-events-auto inline-flex min-h-9 items-center gap-1.5 border-2 border-black bg-white/95 px-2.5 py-1.5 backdrop-blur-sm sm:min-h-10 sm:gap-2 sm:px-3 sm:py-2">
          <span
            aria-hidden="true"
            className={
              mode ===
              "events"
                ? "h-3.5 w-3.5 shrink-0 rounded-full border-[3px] border-black bg-white"
                : "h-3.5 w-3.5 shrink-0 rounded-full border-2 border-white bg-black shadow-[0_0_0_1px_#000]"
            }
          />

          <span className="text-[10px] font-black uppercase tracking-[0.12em]">
            {mode ===
            "events"
              ? "Event"
              : "Artist"}
          </span>
        </div>

        <button
          type="button"
          onClick={
            fitMapToResults
          }
          disabled={
            !hasCompletedQuery ||
            visibleResultCount === 0
          }
          className="pointer-events-auto inline-flex min-h-9 items-center justify-center border-2 border-black bg-white/95 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] transition-colors enabled:hover:bg-black enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-35 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 sm:min-h-10 sm:px-3 sm:py-2 sm:text-[10px] sm:tracking-[0.12em]"
        >
          Fit Results
        </button>

        <button
          type="button"
          onClick={
            resetMapView
          }
          className="pointer-events-auto inline-flex min-h-9 items-center justify-center border-2 border-black bg-white/95 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 sm:min-h-10 sm:px-3 sm:py-2 sm:text-[10px] sm:tracking-[0.12em]"
        >
          Reset
        </button>
      </div>
      {/* ======================================
          EMPTY STATE
      ====================================== */}

      {showEmptyState && (
          <div className="pointer-events-none absolute inset-0 z-[9] flex items-center justify-center px-5">
            <div className="pointer-events-auto max-w-[calc(100vw-32px)] border-2 border-black bg-white/95 p-4 text-center backdrop-blur-sm sm:max-w-sm sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-black/45">
                No Results
              </p>

              <h3 className="mt-2 text-xl font-black uppercase leading-tight tracking-[-0.03em]">
                No {mode === "events" ? "events" : "artists"} found in this area
              </h3>

              <p className="mt-3 text-sm font-medium leading-6 text-black/60">
                Try changing your filters or moving the map to a different area.
              </p>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                {onClearFilters && (
                  <button
                    type="button"
                    onClick={
                      onClearFilters
                    }
                    className="min-h-10 border-2 border-black bg-black px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-white hover:text-black"
                  >
                    Clear Filters
                  </button>
                )}

                <button
                  type="button"
                  onClick={
                    resetMapView
                  }
                  className="min-h-10 border-2 border-black bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition-colors hover:bg-black hover:text-white"
                >
                  Reset View
                </button>
              </div>
            </div>
          </div>
        )}

    </div>
  );
}