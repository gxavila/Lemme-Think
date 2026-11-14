import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";
import {
  revalidatePath,
} from "next/cache";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

async function requireContentManager() {
  const supabase =
    await createClient();

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    redirect(
      "/auth/login"
    );
  }

  const {
    data: profile,
  } =
    await supabase
      .from(
        "profiles"
      )
      .select(
        "role, active"
      )
      .eq(
        "id",
        userId
      )
      .single();

  if (
    !profile ||
    !profile.active ||
    ![
      "admin",
      "editor",
    ].includes(
      profile.role
    )
  ) {
    redirect(
      "/"
    );
  }

  return supabase;
}

async function updatePlaylist(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const playlistId =
    String(
      formData.get(
        "playlist_id"
      ) ?? ""
    );

  const name =
    String(
      formData.get(
        "name"
      ) ?? ""
    ).trim();

  const slug =
    String(
      formData.get(
        "slug"
      ) ?? ""
    ).trim();

  const description =
    String(
      formData.get(
        "description"
      ) ?? ""
    ).trim();

  const genreId =
    String(
      formData.get(
        "genre_id"
      ) ?? ""
    );

  const isPublished =
    formData.get(
      "is_published"
    ) === "on";

  if (
    !playlistId ||
    !name ||
    !slug ||
    !genreId
  ) {
    throw new Error(
      "Playlist name, slug, and genre are required."
    );
  }

  const {
    data: current,
    error:
      currentError,
  } =
    await supabase
      .from(
        "playlists"
      )
      .select(
        "is_published, published_at"
      )
      .eq(
        "id",
        playlistId
      )
      .single();

  if (
    currentError
  ) {
    throw new Error(
      currentError.message
    );
  }

  const publishedAt =
    isPublished
      ? current?.published_at ??
        new Date().toISOString()
      : null;

  const {
    error,
  } =
    await supabase
      .from(
        "playlists"
      )
      .update({
        name,
        slug,
        description:
          description ||
          null,
        genre_id:
          genreId,
        is_published:
          isPublished,
        published_at:
          publishedAt,
      })
      .eq(
        "id",
        playlistId
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidatePath(
    `/admin/playlists/${playlistId}`
  );

  revalidatePath(
    "/admin/playlists"
  );
}

async function addTrackToPlaylist(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const playlistId =
    String(
      formData.get(
        "playlist_id"
      ) ?? ""
    );

  const trackId =
    String(
      formData.get(
        "track_id"
      ) ?? ""
    );

  const editorialNote =
    String(
      formData.get(
        "editorial_note"
      ) ?? ""
    ).trim();

  if (
    !playlistId ||
    !trackId
  ) {
    throw new Error(
      "Playlist and track are required."
    );
  }

  const {
    data: lastItem,
    error:
      lastItemError,
  } =
    await supabase
      .from(
        "playlist_items"
      )
      .select(
        "playlist_position"
      )
      .eq(
        "playlist_id",
        playlistId
      )
      .order(
        "playlist_position",
        {
          ascending:
            false,
        }
      )
      .limit(
        1
      )
      .maybeSingle();

  if (
    lastItemError
  ) {
    throw new Error(
      lastItemError.message
    );
  }

  const nextPosition =
    (
      lastItem?.playlist_position ??
      0
    ) + 1;

  const {
    error,
  } =
    await supabase
      .from(
        "playlist_items"
      )
      .insert({
        playlist_id:
          playlistId,
        track_id:
          trackId,
        playlist_position:
          nextPosition,
        editorial_note:
          editorialNote ||
          null,
      });

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidatePath(
    `/admin/playlists/${playlistId}`
  );
}

async function updatePlaylistItem(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const playlistId =
    String(
      formData.get(
        "playlist_id"
      ) ?? ""
    );

  const itemId =
    String(
      formData.get(
        "item_id"
      ) ?? ""
    );

  const editorialNote =
    String(
      formData.get(
        "editorial_note"
      ) ?? ""
    ).trim();

  if (
    !playlistId ||
    !itemId
  ) {
    throw new Error(
      "Missing playlist item."
    );
  }

  const {
    error,
  } =
    await supabase
      .from(
        "playlist_items"
      )
      .update({
        editorial_note:
          editorialNote ||
          null,
      })
      .eq(
        "id",
        itemId
      )
      .eq(
        "playlist_id",
        playlistId
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  revalidatePath(
    `/admin/playlists/${playlistId}`
  );
}

async function movePlaylistItem(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const playlistId =
    String(
      formData.get(
        "playlist_id"
      ) ?? ""
    );

  const itemId =
    String(
      formData.get(
        "item_id"
      ) ?? ""
    );

  const direction =
    String(
      formData.get(
        "direction"
      ) ?? ""
    );

  if (
    !playlistId ||
    !itemId ||
    ![
      "up",
      "down",
    ].includes(
      direction
    )
  ) {
    throw new Error(
      "Invalid playlist move."
    );
  }

  const {
    data: items,
    error:
      itemsError,
  } =
    await supabase
      .from(
        "playlist_items"
      )
      .select(
        `
        id,
        playlist_position
        `
      )
      .eq(
        "playlist_id",
        playlistId
      )
      .order(
        "playlist_position"
      );

  if (
    itemsError
  ) {
    throw new Error(
      itemsError.message
    );
  }

  const list =
    items ??
    [];

  const index =
    list.findIndex(
      (
        item
      ) =>
        item.id ===
        itemId
    );

  if (
    index === -1
  ) {
    throw new Error(
      "Playlist item was not found."
    );
  }

  const targetIndex =
    direction ===
    "up"
      ? index - 1
      : index + 1;

  if (
    targetIndex <
      0 ||
    targetIndex >=
      list.length
  ) {
    return;
  }

  const current =
    list[index];

  const target =
    list[
      targetIndex
    ];

  const temporaryPosition =
    1000000 +
    current.playlist_position;

  const {
    error:
      tempError,
  } =
    await supabase
      .from(
        "playlist_items"
      )
      .update({
        playlist_position:
          temporaryPosition,
      })
      .eq(
        "id",
        current.id
      );

  if (
    tempError
  ) {
    throw new Error(
      tempError.message
    );
  }

  const {
    error:
      targetError,
  } =
    await supabase
      .from(
        "playlist_items"
      )
      .update({
        playlist_position:
          current.playlist_position,
      })
      .eq(
        "id",
        target.id
      );

  if (
    targetError
  ) {
    throw new Error(
      targetError.message
    );
  }

  const {
    error:
      currentError,
  } =
    await supabase
      .from(
        "playlist_items"
      )
      .update({
        playlist_position:
          target.playlist_position,
      })
      .eq(
        "id",
        current.id
      );

  if (
    currentError
  ) {
    throw new Error(
      currentError.message
    );
  }

  revalidatePath(
    `/admin/playlists/${playlistId}`
  );
}

async function removePlaylistItem(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const playlistId =
    String(
      formData.get(
        "playlist_id"
      ) ?? ""
    );

  const itemId =
    String(
      formData.get(
        "item_id"
      ) ?? ""
    );

  if (
    !playlistId ||
    !itemId
  ) {
    throw new Error(
      "Missing playlist item."
    );
  }

  const {
    error,
  } =
    await supabase
      .from(
        "playlist_items"
      )
      .delete()
      .eq(
        "id",
        itemId
      )
      .eq(
        "playlist_id",
        playlistId
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  const {
    data: remaining,
    error:
      remainingError,
  } =
    await supabase
      .from(
        "playlist_items"
      )
      .select(
        "id"
      )
      .eq(
        "playlist_id",
        playlistId
      )
      .order(
        "playlist_position"
      );

  if (
    remainingError
  ) {
    throw new Error(
      remainingError.message
    );
  }

  let position =
    1;

  for (
    const item of
    remaining ??
    []
  ) {
    const {
      error:
        updateError,
    } =
      await supabase
        .from(
          "playlist_items"
        )
        .update({
          playlist_position:
            position,
        })
        .eq(
          "id",
          item.id
        );

    if (
      updateError
    ) {
      throw new Error(
        updateError.message
      );
    }

    position +=
      1;
  }

  revalidatePath(
    `/admin/playlists/${playlistId}`
  );
}

async function deletePlaylist(
  formData: FormData
) {
  "use server";

  const supabase =
    await requireContentManager();

  const playlistId =
    String(
      formData.get(
        "playlist_id"
      ) ?? ""
    );

  if (!playlistId) {
    throw new Error(
      "Missing playlist."
    );
  }

  const {
    error,
  } =
    await supabase
      .from(
        "playlists"
      )
      .delete()
      .eq(
        "id",
        playlistId
      );

  if (error) {
    throw new Error(
      error.message
    );
  }

  redirect(
    "/admin/playlists"
  );
}

export default async function PlaylistAdminDetailPage({
  params,
}: PageProps) {
  const {
    id,
  } =
    await params;

  const supabase =
    await requireContentManager();

  const [
    playlistResult,
    genresResult,
    itemsResult,
    tracksResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "playlists"
        )
        .select(
          `
          id,
          name,
          slug,
          description,
          playlist_type,
          genre_id,
          is_published,
          published_at,
          genres (
            id,
            name,
            slug
          )
          `
        )
        .eq(
          "id",
          id
        )
        .maybeSingle(),

      supabase
        .from(
          "genres"
        )
        .select(
          `
          id,
          name,
          slug,
          active
          `
        )
        .eq(
          "active",
          true
        )
        .order(
          "name"
        ),

      supabase
        .from(
          "playlist_items"
        )
        .select(
          `
          id,
          track_id,
          playlist_position,
          editorial_note
          `
        )
        .eq(
          "playlist_id",
          id
        )
        .order(
          "playlist_position"
        ),

      supabase
        .from(
          "tracks"
        )
        .select(
          `
          id,
          artist_id,
          release_id,
          title,
          track_number,
          duration_seconds,
          featured,
          recommendation_type,
          artists (
            id,
            name,
            slug,
            published
          ),
          releases (
            id,
            title,
            release_type,
            release_date,
            cover_image_path
          )
          `
        )
        .order(
          "title"
        ),
    ]);

  if (
    playlistResult.error
  ) {
    throw new Error(
      playlistResult.error.message
    );
  }

  if (
    genresResult.error
  ) {
    throw new Error(
      genresResult.error.message
    );
  }

  if (
    itemsResult.error
  ) {
    throw new Error(
      itemsResult.error.message
    );
  }

  if (
    tracksResult.error
  ) {
    throw new Error(
      tracksResult.error.message
    );
  }

  const playlist =
    playlistResult.data;

  if (!playlist) {
    notFound();
  }

  const genres =
    genresResult.data ??
    [];

  const items =
    itemsResult.data ??
    [];

  const tracks =
    tracksResult.data ??
    [];

  const itemTrackIds =
    new Set(
      items.map(
        (
          item
        ) =>
          item.track_id
      )
    );

  const availableTracks =
    tracks.filter(
      (
        track
      ) =>
        !itemTrackIds.has(
          track.id
        )
    );

  const trackMap =
    new Map(
      tracks.map(
        (
          track
        ) => [
          track.id,
          track,
        ]
      )
    );

  const genre =
    Array.isArray(
      playlist.genres
    )
      ? playlist.genres[0]
      : playlist.genres;

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      <header className="border-b-2 border-black px-6 py-5">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link
              href="/admin/playlists"
              className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
            >
              ← Playlists
            </Link>

            <h1 className="mt-2 text-3xl font-black uppercase">
              {
                playlist.name
              }
            </h1>

            <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-black/45">
              {genre?.name ??
                "No Genre"}{" "}
              ·{" "}
              {playlist.is_published
                ? "Published"
                : "Draft"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {genre?.slug && (
              <Link
                href={`/genres/${genre.slug}`}
                className="border-2 border-black bg-white px-3 py-2 text-xs font-black uppercase transition-colors hover:bg-black hover:text-white"
              >
                View Genre →
              </Link>
            )}

            <Link
              href="/"
              className="border-2 border-black bg-black px-3 py-2 text-xs font-black uppercase text-white transition-colors hover:bg-white hover:text-black"
            >
              View Atlas →
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-6">
          <section className="border-2 border-black bg-white p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
              Playlist
            </p>

            <h2 className="mt-1 text-xl font-black uppercase">
              Settings
            </h2>

            <form
              action={
                updatePlaylist
              }
              className="mt-5 space-y-5"
            >
              <input
                type="hidden"
                name="playlist_id"
                value={
                  playlist.id
                }
              />

              <label className="block">
                <span className="text-xs font-black uppercase">
                  Name
                </span>

                <input
                  name="name"
                  required
                  defaultValue={
                    playlist.name
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase">
                  Slug
                </span>

                <input
                  name="slug"
                  required
                  defaultValue={
                    playlist.slug
                  }
                  className="mt-2 w-full border-2 border-black px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase">
                  Genre
                </span>

                <select
                  name="genre_id"
                  required
                  defaultValue={
                    playlist.genre_id ??
                    ""
                  }
                  className="mt-2 w-full border-2 border-black bg-white px-3 py-2"
                >
                  {genres.map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item.id
                        }
                        value={
                          item.id
                        }
                      >
                        {
                          item.name
                        }
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase">
                  Description
                </span>

                <textarea
                  name="description"
                  rows={5}
                  defaultValue={
                    playlist.description ??
                    ""
                  }
                  className="mt-2 w-full resize-y border-2 border-black px-3 py-2"
                />
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="is_published"
                  defaultChecked={
                    playlist.is_published
                  }
                  className="h-4 w-4"
                />

                <span className="text-xs font-black uppercase">
                  Published
                </span>
              </label>

              <button
                type="submit"
                className="w-full border-2 border-black bg-black px-4 py-3 text-xs font-black uppercase text-white transition-colors hover:bg-white hover:text-black"
              >
                Save Playlist
              </button>
            </form>
          </section>

          <section className="border-2 border-black bg-white p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
              Add Music
            </p>

            <h2 className="mt-1 text-xl font-black uppercase">
              Add Track
            </h2>

            <form
              action={
                addTrackToPlaylist
              }
              className="mt-5 space-y-5"
            >
              <input
                type="hidden"
                name="playlist_id"
                value={
                  playlist.id
                }
              />

              <label className="block">
                <span className="text-xs font-black uppercase">
                  Track
                </span>

                <select
                  name="track_id"
                  required
                  defaultValue=""
                  className="mt-2 w-full border-2 border-black bg-white px-3 py-2"
                >
                  <option
                    value=""
                    disabled
                  >
                    Select track
                  </option>

                  {availableTracks.map(
                    (
                      track
                    ) => {
                      const artist =
                        Array.isArray(
                          track.artists
                        )
                          ? track.artists[0]
                          : track.artists;

                      const release =
                        Array.isArray(
                          track.releases
                        )
                          ? track.releases[0]
                          : track.releases;

                      return (
                        <option
                          key={
                            track.id
                          }
                          value={
                            track.id
                          }
                        >
                          {artist?.name ??
                            "Unknown Artist"}{" "}
                          —{" "}
                          {
                            track.title
                          }
                          {release?.title
                            ? ` (${release.title})`
                            : ""}
                        </option>
                      );
                    }
                  )}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase">
                  Editorial Note
                </span>

                <textarea
                  name="editorial_note"
                  rows={3}
                  placeholder="Optional note about why this track matters."
                  className="mt-2 w-full resize-y border-2 border-black px-3 py-2"
                />
              </label>

              <button
                type="submit"
                disabled={
                  availableTracks.length ===
                  0
                }
                className="w-full border-2 border-black bg-black px-4 py-3 text-xs font-black uppercase text-white transition-colors enabled:hover:bg-white enabled:hover:text-black disabled:cursor-not-allowed disabled:opacity-35"
              >
                Add to Playlist
              </button>
            </form>
          </section>

          <section className="border-2 border-red-700 bg-white p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-700/70">
              Danger
            </p>

            <form
              action={
                deletePlaylist
              }
              className="mt-3"
            >
              <input
                type="hidden"
                name="playlist_id"
                value={
                  playlist.id
                }
              />

              <button
                type="submit"
                className="w-full border-2 border-red-700 px-4 py-3 text-xs font-black uppercase text-red-700 transition-colors hover:bg-red-700 hover:text-white"
              >
                Delete Playlist
              </button>
            </form>
          </section>
        </aside>

        <section>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-black/45">
                Essential Tracks
              </p>

              <h2 className="mt-1 text-3xl font-black uppercase leading-none">
                Playlist Order
              </h2>
            </div>

            <span className="text-xs font-black uppercase text-black/45">
              {items.length}{" "}
              {items.length ===
              1
                ? "Track"
                : "Tracks"}
            </span>
          </div>

          {!items.length ? (
            <div className="mt-6 border-2 border-black bg-white p-8">
              <p className="font-black uppercase">
                No tracks added.
              </p>

              <p className="mt-2 text-sm text-black/55">
                Add an existing track from the panel on the left.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {items.map(
                (
                  item,
                  index
                ) => {
                  const track =
                    trackMap.get(
                      item.track_id
                    );

                  const artist =
                    Array.isArray(
                      track?.artists
                    )
                      ? track?.artists[0]
                      : track?.artists;

                  const release =
                    Array.isArray(
                      track?.releases
                    )
                      ? track?.releases[0]
                      : track?.releases;

                  return (
                    <article
                      key={
                        item.id
                      }
                      className="border-2 border-black bg-white"
                    >
                      <div className="grid sm:grid-cols-[72px_minmax(0,1fr)_auto]">
                        <div className="flex items-center justify-center border-b-2 border-black bg-black p-4 text-3xl font-black text-white sm:border-b-0 sm:border-r-2">
                          {String(
                            item.playlist_position
                          ).padStart(
                            2,
                            "0"
                          )}
                        </div>

                        <div className="p-5">
                          <p className="text-[9px] font-black uppercase tracking-[0.12em] text-black/45">
                            {artist?.name ??
                              "Unknown Artist"}
                          </p>

                          <h3 className="mt-1 text-xl font-black uppercase tracking-[-0.025em]">
                            {track?.title ??
                              "Unknown Track"}
                          </h3>

                          {release?.title && (
                            <p className="mt-1 text-xs font-bold text-black/50">
                              {
                                release.title
                              }
                            </p>
                          )}

                          <form
                            action={
                              updatePlaylistItem
                            }
                            className="mt-4"
                          >
                            <input
                              type="hidden"
                              name="playlist_id"
                              value={
                                playlist.id
                              }
                            />

                            <input
                              type="hidden"
                              name="item_id"
                              value={
                                item.id
                              }
                            />

                            <label className="block">
                              <span className="text-[9px] font-black uppercase tracking-[0.12em] text-black/45">
                                Editorial Note
                              </span>

                              <textarea
                                name="editorial_note"
                                rows={2}
                                defaultValue={
                                  item.editorial_note ??
                                  ""
                                }
                                className="mt-2 w-full resize-y border-2 border-black px-3 py-2 text-sm"
                              />
                            </label>

                            <button
                              type="submit"
                              className="mt-2 text-[9px] font-black uppercase tracking-[0.1em] hover:underline"
                            >
                              Save Note
                            </button>
                          </form>
                        </div>

                        <div className="flex border-t-2 border-black sm:flex-col sm:border-l-2 sm:border-t-0">
                          <form
                            action={
                              movePlaylistItem
                            }
                            className="flex-1"
                          >
                            <input
                              type="hidden"
                              name="playlist_id"
                              value={
                                playlist.id
                              }
                            />

                            <input
                              type="hidden"
                              name="item_id"
                              value={
                                item.id
                              }
                            />

                            <input
                              type="hidden"
                              name="direction"
                              value="up"
                            />

                            <button
                              type="submit"
                              disabled={
                                index ===
                                0
                              }
                              title="Move up"
                              className="h-full min-h-12 w-full border-black px-4 font-black transition-colors enabled:hover:bg-black enabled:hover:text-white disabled:opacity-20 sm:border-b-2"
                            >
                              ↑
                            </button>
                          </form>

                          <form
                            action={
                              movePlaylistItem
                            }
                            className="flex-1 border-l-2 border-black sm:border-l-0"
                          >
                            <input
                              type="hidden"
                              name="playlist_id"
                              value={
                                playlist.id
                              }
                            />

                            <input
                              type="hidden"
                              name="item_id"
                              value={
                                item.id
                              }
                            />

                            <input
                              type="hidden"
                              name="direction"
                              value="down"
                            />

                            <button
                              type="submit"
                              disabled={
                                index ===
                                items.length -
                                  1
                              }
                              title="Move down"
                              className="h-full min-h-12 w-full border-black px-4 font-black transition-colors enabled:hover:bg-black enabled:hover:text-white disabled:opacity-20 sm:border-b-2"
                            >
                              ↓
                            </button>
                          </form>

                          <form
                            action={
                              removePlaylistItem
                            }
                            className="flex-1 border-l-2 border-black sm:border-l-0"
                          >
                            <input
                              type="hidden"
                              name="playlist_id"
                              value={
                                playlist.id
                              }
                            />

                            <input
                              type="hidden"
                              name="item_id"
                              value={
                                item.id
                              }
                            />

                            <button
                              type="submit"
                              title="Remove from playlist"
                              className="h-full min-h-12 w-full px-4 text-xs font-black uppercase text-red-700 transition-colors hover:bg-red-700 hover:text-white"
                            >
                              Remove
                            </button>
                          </form>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
