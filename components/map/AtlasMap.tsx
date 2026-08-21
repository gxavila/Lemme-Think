"use client";

import {
  useEffect,
  useRef,
} from "react";

import mapboxgl, {
  type GeoJSONSource,
} from "mapbox-gl";

import { createClient } from "@/lib/supabase/client";

type AtlasMapProps = {
  selectedGenres?: string[];
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

  genres?:
    | ArtistGenre[]
    | string
    | null;
};

/*
 * Local GeoJSON types.
 *
 * This avoids relying on a global
 * GeoJSON namespace, which is what
 * caused TS2503 during production build.
 */
type PointGeometry = {
  type: "Point";
  coordinates: [
    number,
    number,
  ];
};

type PointFeatureProperties =
  Record<
    string,
    string | number | boolean | null
  >;

type PointFeature = {
  type: "Feature";
  geometry: PointGeometry;
  properties: PointFeatureProperties;
};

type PointFeatureCollection = {
  type: "FeatureCollection";
  features: PointFeature[];
};

/*
 * Mapbox's rendered feature typing is
 * intentionally broad. We only need
 * Point features from our own layers.
 */
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
  "artists";

const CLUSTER_LAYER_ID =
  "clusters";

const CLUSTER_COUNT_LAYER_ID =
  "cluster-count";

const ARTIST_LAYER_ID =
  "unclustered-point";

const OLD_MAP_STORAGE_KEY =
  "underground-atlas-map-state";

const DEFAULT_CENTER: [
  number,
  number,
] = [
  -119.4179,
  36.7783,
];

const DEFAULT_ZOOM = 5;

const MIN_LATITUDE = -85;
const MAX_LATITUDE = 85;
const MIN_ZOOM = 2;
const MAX_ZOOM = 18;

/* =========================================
   HELPERS
========================================= */

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

function getArtistName(
  artist: MapArtist
) {
  return (
    artist.name ??
    artist.artist_name ??
    "Artist"
  );
}

function getArtistSlug(
  artist: MapArtist
) {
  return (
    artist.slug ??
    artist.artist_slug ??
    ""
  );
}

function normalizeArtists(
  data: unknown
): MapArtist[] {
  if (!data) {
    return [];
  }

  if (
    Array.isArray(data)
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

function normalizeGenres(
  value:
    | ArtistGenre[]
    | string
    | null
    | undefined
): ArtistGenre[] {
  if (!value) {
    return [];
  }

  if (
    Array.isArray(value)
  ) {
    return value;
  }

  if (
    typeof value ===
    "string"
  ) {
    try {
      const parsed =
        JSON.parse(value);

      if (
        Array.isArray(
          parsed
        )
      ) {
        return parsed as ArtistGenre[];
      }
    } catch {
      return [];
    }
  }

  return [];
}

function isValidLatitude(
  value: unknown
): value is number {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(value) &&
    value >=
      MIN_LATITUDE &&
    value <=
      MAX_LATITUDE
  );
}

function isValidLongitude(
  value: unknown
): value is number {
  return (
    typeof value ===
      "number" &&
    Number.isFinite(value) &&
    value >= -180 &&
    value <= 180
  );
}

function clampZoom(
  value: number
) {
  return Math.max(
    MIN_ZOOM,
    Math.min(
      MAX_ZOOM,
      value
    )
  );
}

/* =========================================
   GEOJSON
========================================= */

function buildGeoJson(
  artists: MapArtist[]
): PointFeatureCollection {
  /*
   * Artists can share the exact same
   * city-level coordinates.
   *
   * Group them so their map markers can
   * receive a small display-only offset.
   */
  const coordinateGroups =
    new Map<
      string,
      MapArtist[]
    >();

  artists.forEach(
    (artist) => {
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
        console.warn(
          "Skipping artist with invalid map coordinates:",
          {
            id:
              artist.id,

            name:
              getArtistName(
                artist
              ),

            latitude,
            longitude,
          }
        );

        return;
      }

      const key =
        `${latitude.toFixed(
          6
        )},${longitude.toFixed(
          6
        )}`;

      const group =
        coordinateGroups.get(
          key
        ) ?? [];

      group.push(
        artist
      );

      coordinateGroups.set(
        key,
        group
      );
    }
  );

  const features: PointFeature[] =
    [];

  coordinateGroups.forEach(
    (
      group,
      coordinateKey
    ) => {
      const [
        latitudeText,
        longitudeText,
      ] =
        coordinateKey.split(
          ","
        );

      const baseLatitude =
        Number(
          latitudeText
        );

      const baseLongitude =
        Number(
          longitudeText
        );

      /*
       * Deterministic ordering prevents
       * marker positions from changing
       * between data reloads.
       */
      const sortedGroup = [
        ...group,
      ].sort(
        (a, b) =>
          getArtistName(
            a
          ).localeCompare(
            getArtistName(
              b
            )
          )
      );

      sortedGroup.forEach(
        (
          artist,
          index
        ) => {
          let latitude =
            baseLatitude;

          let longitude =
            baseLongitude;

          if (
            sortedGroup.length >
            1
          ) {
            const angle =
              (2 *
                Math.PI *
                index) /
              sortedGroup.length;

            /*
             * Small visual offset around
             * the real city-level point.
             *
             * Database coordinates are not
             * changed.
             */
            const offset =
              0.0018;

            latitude =
              baseLatitude +
              Math.sin(
                angle
              ) *
                offset;

            const latitudeRadians =
              (baseLatitude *
                Math.PI) /
              180;

            const longitudeScale =
              Math.max(
                Math.cos(
                  latitudeRadians
                ),
                0.2
              );

            longitude =
              baseLongitude +
              (Math.cos(
                angle
              ) *
                offset) /
                longitudeScale;
          }

          const genres =
            normalizeGenres(
              artist.genres
            );

          features.push({
            type:
              "Feature",

            geometry: {
              type:
                "Point",

              coordinates: [
                longitude,
                latitude,
              ],
            },

            properties: {
              id:
                artist.id,

              name:
                getArtistName(
                  artist
                ),

              slug:
                getArtistSlug(
                  artist
                ),

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

              genres:
                JSON.stringify(
                  genres
                ),

              location_latitude:
                baseLatitude,

              location_longitude:
                baseLongitude,
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

/* =========================================
   POPUP
========================================= */

function buildPopup(
  properties:
    | Record<
        string,
        unknown
      >
    | null
    | undefined
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

  const city =
    properties.city
      ? escapeHtml(
          properties.city
        )
      : "";

  const region =
    properties.region
      ? escapeHtml(
          properties.region
        )
      : "";

  const location = [
    city,
    region,
  ]
    .filter(Boolean)
    .join(", ");

  const bio =
    properties.bio_short
      ? escapeHtml(
          properties.bio_short
        )
      : "";

  const genres =
    normalizeGenres(
      properties.genres as
        | string
        | ArtistGenre[]
        | null
        | undefined
    ).slice(0, 3);

  return `
    <div style="
      min-width: 230px;
      max-width: 280px;
      font-family: Arial, Helvetica, sans-serif;
    ">
      ${
        location
          ? `
            <div style="
              margin-bottom: 7px;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 0.09em;
              text-transform: uppercase;
              color: #666;
            ">
              ${location}
            </div>
          `
          : ""
      }

      <div style="
        font-size: 20px;
        line-height: 1.05;
        font-weight: 800;
        color: #111;
      ">
        ${name}
      </div>

      ${
        genres.length
          ? `
            <div style="
              display: flex;
              flex-wrap: wrap;
              gap: 5px;
              margin-top: 10px;
            ">
              ${genres
                .map(
                  (
                    genre
                  ) => `
                    <span style="
                      display: inline-block;
                      border: 1px solid #111;
                      padding: 3px 5px;
                      font-size: 9px;
                      font-weight: 800;
                      line-height: 1;
                      letter-spacing: 0.05em;
                      text-transform: uppercase;
                      background: ${
                        genre.is_primary
                          ? "#111"
                          : "#fff"
                      };
                      color: ${
                        genre.is_primary
                          ? "#fff"
                          : "#111"
                      };
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
              margin-top: 11px;
              font-size: 12px;
              line-height: 1.5;
              color: #555;
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
              margin-top: 14px;
              padding-top: 10px;
              border-top: 1px solid #111;
            ">
              <a
                href="/artists/${slug}"
                style="
                  color: #111;
                  font-size: 10px;
                  font-weight: 800;
                  letter-spacing: 0.08em;
                  text-decoration: none;
                  text-transform: uppercase;
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

/* =========================================
   COMPONENT
========================================= */

export default function AtlasMap({
  selectedGenres = [],
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

  const genresRef =
    useRef<string[]>(
      selectedGenres
    );

  const supabaseRef =
    useRef(
      createClient()
    );

  /* =========================================
     LOAD ARTISTS
  ========================================= */

  async function loadArtists(
    targetMap?: mapboxgl.Map
  ) {
    const map =
      targetMap ??
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

    const bounds =
      map.getBounds();

    /*
     * Mapbox typings allow getBounds()
     * to return null in some lifecycle
     * states.
     */
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
      console.warn(
        "Skipping artist query because map bounds are invalid."
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
            null,

          min_listeners:
            null,

          max_listeners:
            null,
        }
      );

    if (error) {
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

      return;
    }

    const artists =
      normalizeArtists(
        data
      );

    const geoJson =
      buildGeoJson(
        artists
      );

    /*
     * Re-fetch the source because the
     * component could have unmounted
     * while awaiting Supabase.
     */
    const currentSource =
      map.getSource(
        SOURCE_ID
      ) as
        | GeoJSONSource
        | undefined;

    if (
      currentSource
    ) {
      /*
       * The object is structurally valid
       * GeoJSON. "any" is used here only
       * because this project does not have
       * the standalone @types/geojson
       * namespace installed.
       */
      currentSource.setData(
        geoJson as any
      );
    }
  }

  /* =========================================
     GENRE FILTER CHANGES
  ========================================= */

  useEffect(() => {
    genresRef.current =
      selectedGenres;

    const map =
      mapRef.current;

    if (!map) {
      return;
    }

    popupRef.current?.remove();

    if (
      map.getSource(
        SOURCE_ID
      )
    ) {
      void loadArtists(
        map
      );
    }
  }, [selectedGenres]);

  /* =========================================
     MAP INITIALIZATION
  ========================================= */

  useEffect(() => {
    /*
     * Narrow this once and retain the
     * non-null reference throughout
     * the effect.
     */
  const mapContainer =
  containerRef.current as HTMLDivElement;

if (
  !mapContainer ||
  mapRef.current
) {
  return;
}

    /*
     * Remove the old camera-state behavior.
     */
    try {
      window.sessionStorage.removeItem(
        OLD_MAP_STORAGE_KEY
      );
    } catch {
      // Ignore storage failures.
    }

    /*
     * Remove legacy lat/lng/zoom query
     * parameters while preserving genres
     * or other future query parameters.
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
      | null = null;

    function initializeMap() {
      if (
        disposed ||
        mapRef.current
      ) {
        return;
      }

      /*
       * Prevent Mapbox from initializing
       * against a zero-size container.
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
      } catch (error) {
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

      /* =====================================
         RESIZE
      ===================================== */

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

      /* =====================================
         CONTROLS
      ===================================== */

      activeMap.addControl(
        new mapboxgl.NavigationControl(),
        "top-right"
      );

      activeMap.on(
        "error",
        (event) => {
          console.error(
            "Mapbox error:",
            event.error
          );
        }
      );

      /* =====================================
         MAP LOAD
      ===================================== */

      activeMap.on(
        "load",
        () => {
          if (
            disposed
          ) {
            return;
          }

          try {
            activeMap.resize();
          } catch (
            error
          ) {
            console.warn(
              "Initial map resize failed:",
              error
            );
          }

          /* ------------------------------
             SOURCE
          ------------------------------ */

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
                  true,

                clusterMaxZoom:
                  13,

                clusterRadius:
                  50,
              }
            );
          }

          /* ------------------------------
             CLUSTERS
          ------------------------------ */

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

          /* ------------------------------
             CLUSTER COUNT
          ------------------------------ */

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

          /* ------------------------------
             ARTIST MARKERS
          ------------------------------ */

          if (
            !activeMap.getLayer(
              ARTIST_LAYER_ID
            )
          ) {
            activeMap.addLayer({
              id:
                ARTIST_LAYER_ID,

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

          /*
           * Wait until Mapbox completes its
           * first render before querying
           * visible bounds.
           */
          activeMap.once(
            "idle",
            () => {
              if (
                disposed
              ) {
                return;
              }

              void loadArtists(
                activeMap
              );
            }
          );
        }
      );

      /* =====================================
         PAN / ZOOM
      ===================================== */

      activeMap.on(
        "moveend",
        () => {
          if (
            disposed
          ) {
            return;
          }

          if (
            activeMap.getSource(
              SOURCE_ID
            )
          ) {
            void loadArtists(
              activeMap
            );
          }
        }
      );

      /* =====================================
         CLUSTER CLICK
      ===================================== */

      activeMap.on(
        "click",
        CLUSTER_LAYER_ID,
        (event) => {
          if (
            disposed
          ) {
            return;
          }

          const rawFeatures =
            activeMap.queryRenderedFeatures(
              event.point,
              {
                layers: [
                  CLUSTER_LAYER_ID,
                ],
              }
            );

          const feature =
  rawFeatures[0] as unknown as
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

          const clusterId =
            feature.properties
              ?.cluster_id;

          if (
            clusterId ==
            null
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

          source.getClusterExpansionZoom(
            Number(
              clusterId
            ),
            (
              error,
              zoom
            ) => {
              if (
                error ||
                disposed
              ) {
                if (error) {
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
                  clampZoom(
                    zoom
                  ),
              });
            }
          );
        }
      );

      /* =====================================
         ARTIST CLICK
      ===================================== */

      activeMap.on(
        "click",
        ARTIST_LAYER_ID,
        (event) => {
          if (
            disposed
          ) {
            return;
          }

          const rawFeature =
            event.features?.[0];

          const feature =
  rawFeature as unknown as
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

          const coordinates: [
            number,
            number,
          ] = [
            longitude,
            latitude,
          ];

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
                "300px",
            })
              .setLngLat(
                coordinates
              )
              .setHTML(
                buildPopup(
                  feature.properties
                )
              )
              .addTo(
                activeMap
              );
        }
      );

      /* =====================================
         CURSOR
      ===================================== */

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
        ARTIST_LAYER_ID,
        () => {
          activeMap.getCanvas().style.cursor =
            "pointer";
        }
      );

      activeMap.on(
        "mouseleave",
        ARTIST_LAYER_ID,
        () => {
          activeMap.getCanvas().style.cursor =
            "";
        }
      );
    }

    initializeMap();

    /* =====================================
       CLEANUP
    ===================================== */

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

      if (map) {
        map.remove();
      }

      mapRef.current =
        null;
    };
  }, []);

  return (
    <div
      ref={
        containerRef
      }
      className="h-[580px] w-full sm:h-[620px] lg:h-[680px]"
    />
  );
}