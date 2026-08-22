"use client";

import {
  FormEvent,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type ArtistImage = {
  id: string;
  storage_path: string;
  image_type:
    | "hero"
    | "profile"
    | "gallery";
  alt_text: string | null;
  photographer: string | null;
  source_url: string | null;
  sort_order: number;
  position_x: number;
  position_y: number;
};

type ArtistImageManagerProps = {
  artistId: string;
  artistSlug: string;
  initialImages: ArtistImage[];
};

type PositionDraft = {
  x: number;
  y: number;
};

export default function ArtistImageManager({
  artistId,
  artistSlug,
  initialImages,
}: ArtistImageManagerProps) {
  const supabase =
    createClient();

  const [images, setImages] =
    useState<ArtistImage[]>(
      initialImages.map(
        (image) => ({
          ...image,
          position_x:
            image.position_x ??
            50,
          position_y:
            image.position_y ??
            50,
        })
      )
    );

  const [positionDrafts, setPositionDrafts] =
    useState<
      Record<
        string,
        PositionDraft
      >
    >(
      Object.fromEntries(
        initialImages.map(
          (image) => [
            image.id,
            {
              x:
                image.position_x ??
                50,
              y:
                image.position_y ??
                50,
            },
          ]
        )
      )
    );

  const [savingPositionId, setSavingPositionId] =
    useState<
      string | null
    >(null);

  const [file, setFile] =
    useState<File | null>(
      null
    );

  const [
    imageType,
    setImageType,
  ] =
    useState<
      | "hero"
      | "profile"
      | "gallery"
    >("gallery");

  const [
    altText,
    setAltText,
  ] =
    useState("");

  const [
    photographer,
    setPhotographer,
  ] =
    useState("");

  const [
    sourceUrl,
    setSourceUrl,
  ] =
    useState("");

  const [
    sortOrder,
    setSortOrder,
  ] =
    useState("0");

  const [
    uploading,
    setUploading,
  ] =
    useState(false);

  const [
    message,
    setMessage,
  ] =
    useState<
      string | null
    >(null);

  function getPublicUrl(
    path: string
  ) {
    const { data } =
      supabase.storage
        .from(
          "artist-images"
        )
        .getPublicUrl(
          path
        );

    return data.publicUrl;
  }

  function getPositionDraft(
    image: ArtistImage
  ) {
    return (
      positionDrafts[
        image.id
      ] ?? {
        x:
          image.position_x ??
          50,
        y:
          image.position_y ??
          50,
      }
    );
  }

  function updatePositionDraft(
    imageId: string,
    axis: "x" | "y",
    value: number
  ) {
    setPositionDrafts(
      (current) => {
        const existing =
          current[
            imageId
          ] ?? {
            x: 50,
            y: 50,
          };

        return {
          ...current,
          [imageId]: {
            ...existing,
            [axis]:
              value,
          },
        };
      }
    );
  }

  function resetPosition(
    imageId: string
  ) {
    setPositionDrafts(
      (current) => ({
        ...current,
        [imageId]: {
          x: 50,
          y: 50,
        },
      })
    );

    setMessage(
      "Position reset to center. Click Save Position to keep the change."
    );
  }

  async function handleSavePosition(
    image: ArtistImage
  ) {
    const draft =
      getPositionDraft(
        image
      );

    setSavingPositionId(
      image.id
    );

    setMessage(null);

    try {
      const {
        error,
      } =
        await supabase
          .from(
            "artist_images"
          )
          .update({
            position_x:
              draft.x,
            position_y:
              draft.y,
          })
          .eq(
            "id",
            image.id
          );

      if (error) {
        throw error;
      }

      setImages(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              image.id
                ? {
                    ...item,
                    position_x:
                      draft.x,
                    position_y:
                      draft.y,
                  }
                : item
          )
      );

      setMessage(
        "Image position saved."
      );
    } catch (error) {
      console.error(
        error
      );

      setMessage(
        error instanceof
          Error
          ? error.message
          : "Unable to save image position."
      );
    } finally {
      setSavingPositionId(
        null
      );
    }
  }

  async function handleUpload(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!file) {
      setMessage(
        "Select an image first."
      );

      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setMessage(
        "The selected file must be an image."
      );

      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "jpg";

      const uniqueName =
        `${imageType}-${Date.now()}-${crypto.randomUUID()}.${extension}`;

      const storagePath =
        `artists/${artistSlug}/${uniqueName}`;

      // ========================================
      // UPLOAD FILE
      // ========================================

      const {
        error:
          storageError,
      } =
        await supabase.storage
          .from(
            "artist-images"
          )
          .upload(
            storagePath,
            file,
            {
              cacheControl:
                "3600",
              contentType:
                file.type,
              upsert: false,
            }
          );

      if (
        storageError
      ) {
        throw storageError;
      }

      // ========================================
      // CREATE DATABASE RECORD
      // ========================================

      const {
        data:
          imageRecord,
        error:
          databaseError,
      } =
        await supabase
          .from(
            "artist_images"
          )
          .insert({
            artist_id:
              artistId,
            storage_path:
              storagePath,
            image_type:
              imageType,
            alt_text:
              altText.trim() ||
              null,
            photographer:
              photographer.trim() ||
              null,
            source_url:
              sourceUrl.trim() ||
              null,
            sort_order:
              Number(
                sortOrder
              ) || 0,
            position_x:
              50,
            position_y:
              50,
          })
          .select(
            `
            id,
            storage_path,
            image_type,
            alt_text,
            photographer,
            source_url,
            sort_order,
            position_x,
            position_y
            `
          )
          .single();

      if (
        databaseError ||
        !imageRecord
      ) {
        await supabase.storage
          .from(
            "artist-images"
          )
          .remove([
            storagePath,
          ]);

        throw (
          databaseError ??
          new Error(
            "Unable to create image record."
          )
        );
      }

      const newImage =
        imageRecord as ArtistImage;

      setImages(
        (current) =>
          [
            ...current,
            newImage,
          ].sort(
            (
              a,
              b
            ) =>
              a.sort_order -
              b.sort_order
          )
      );

      setPositionDrafts(
        (current) => ({
          ...current,
          [
            newImage.id
          ]: {
            x:
              newImage.position_x ??
              50,
            y:
              newImage.position_y ??
              50,
          },
        })
      );

      setFile(null);

      setImageType(
        "gallery"
      );

      setAltText("");

      setPhotographer(
        ""
      );

      setSourceUrl("");

      setSortOrder(
        "0"
      );

      const fileInput =
        document.getElementById(
          "artist-image-file"
        ) as HTMLInputElement | null;

      if (
        fileInput
      ) {
        fileInput.value =
          "";
      }

      setMessage(
        "Image uploaded successfully."
      );
    } catch (error) {
      console.error(
        error
      );

      setMessage(
        error instanceof
          Error
          ? error.message
          : "Unable to upload image."
      );
    } finally {
      setUploading(
        false
      );
    }
  }

  async function handleDelete(
    image: ArtistImage
  ) {
    const confirmed =
      window.confirm(
        "Delete this image permanently?"
      );

    if (
      !confirmed
    ) {
      return;
    }

    setMessage(null);

    try {
      // ========================================
      // DELETE STORAGE OBJECT
      // ========================================

      const {
        error:
          storageError,
      } =
        await supabase.storage
          .from(
            "artist-images"
          )
          .remove([
            image.storage_path,
          ]);

      if (
        storageError
      ) {
        throw storageError;
      }

      // ========================================
      // DELETE DATABASE RECORD
      // ========================================

      const {
        error:
          databaseError,
      } =
        await supabase
          .from(
            "artist_images"
          )
          .delete()
          .eq(
            "id",
            image.id
          );

      if (
        databaseError
      ) {
        throw databaseError;
      }

      setImages(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              image.id
          )
      );

      setPositionDrafts(
        (current) => {
          const next = {
            ...current,
          };

          delete next[
            image.id
          ];

          return next;
        }
      );

      setMessage(
        "Image deleted successfully."
      );
    } catch (error) {
      console.error(
        error
      );

      setMessage(
        error instanceof
          Error
          ? error.message
          : "Unable to delete image."
      );
    }
  }

  return (
    <div className="space-y-10">
      {/* ======================================
          UPLOAD IMAGE
      ====================================== */}

      <section className="border-2 border-black bg-white p-6">
        <h2 className="text-xl font-black uppercase">
          Upload Image
        </h2>

        <form
          onSubmit={
            handleUpload
          }
          className="mt-6 space-y-6"
        >
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.15em]">
              Image File
            </span>

            <input
              id="artist-image-file"
              type="file"
              accept="image/*"
              required
              onChange={(
                event
              ) =>
                setFile(
                  event.target
                    .files?.[0] ??
                    null
                )
              }
              className="mt-2 block w-full border-2 border-black bg-white p-3"
            />
          </label>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Image Type
              </span>

              <select
                value={
                  imageType
                }
                onChange={(
                  event
                ) =>
                  setImageType(
                    event.target
                      .value as
                      | "hero"
                      | "profile"
                      | "gallery"
                  )
                }
                className="mt-2 w-full border-2 border-black px-3 py-2"
              >
                <option value="hero">
                  Hero
                </option>

                <option value="profile">
                  Profile
                </option>

                <option value="gallery">
                  Gallery
                </option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-bold uppercase tracking-[0.15em]">
                Sort Order
              </span>

              <input
                type="number"
                value={
                  sortOrder
                }
                onChange={(
                  event
                ) =>
                  setSortOrder(
                    event.target
                      .value
                  )
                }
                className="mt-2 w-full border-2 border-black px-3 py-2"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.15em]">
              Alt Text
            </span>

            <input
              value={
                altText
              }
              onChange={(
                event
              ) =>
                setAltText(
                  event.target
                    .value
                )
              }
              placeholder="Describe the image"
              className="mt-2 w-full border-2 border-black px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.15em]">
              Photographer / Credit
            </span>

            <input
              value={
                photographer
              }
              onChange={(
                event
              ) =>
                setPhotographer(
                  event.target
                    .value
                )
              }
              placeholder="Optional"
              className="mt-2 w-full border-2 border-black px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="text-xs font-bold uppercase tracking-[0.15em]">
              Source URL
            </span>

            <input
              type="url"
              value={
                sourceUrl
              }
              onChange={(
                event
              ) =>
                setSourceUrl(
                  event.target
                    .value
                )
              }
              placeholder="https://..."
              className="mt-2 w-full border-2 border-black px-3 py-2"
            />
          </label>

          <button
            type="submit"
            disabled={
              uploading
            }
            className="border-2 border-black bg-black px-5 py-3 text-sm font-bold uppercase text-white transition-colors hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading
              ? "Uploading..."
              : "Upload Image"}
          </button>

          {message && (
            <p
              className="text-sm font-bold"
              aria-live="polite"
            >
              {message}
            </p>
          )}
        </form>
      </section>

      {/* ======================================
          EXISTING IMAGES
      ====================================== */}

      <section className="border-2 border-black bg-white p-6">
        <h2 className="text-xl font-black uppercase">
          Current Images
        </h2>

        <p className="mt-2 max-w-2xl text-sm text-black/60">
          Adjust the focal
          position to control
          how the image is
          cropped on the
          public artist page.
        </p>

        {images.length ===
        0 ? (
          <p className="mt-5 text-black/60">
            No images uploaded
            yet.
          </p>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {images.map(
              (image) => {
                const position =
                  getPositionDraft(
                    image
                  );

                const hasPositionChanges =
                  position.x !==
                    image.position_x ||
                  position.y !==
                    image.position_y;

                return (
                  <article
                    key={
                      image.id
                    }
                    className="border-2 border-black"
                  >
                    {/* IMAGE PREVIEW */}

                    <div className="relative aspect-[4/3] overflow-hidden bg-[#ddd8cc]">
                      <img
                        src={getPublicUrl(
                          image.storage_path
                        )}
                        alt={
                          image.alt_text ??
                          "Artist image"
                        }
                        className="h-full w-full object-cover"
                        style={{
                          objectPosition: `${position.x}% ${position.y}%`,
                        }}
                      />

                      <div className="absolute left-0 top-0 bg-black px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                        Public Crop
                        Preview
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-black uppercase">
                            {
                              image.image_type
                            }
                          </p>

                          <p className="mt-1 text-xs uppercase">
                            Sort:{" "}
                            {
                              image.sort_order
                            }
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleDelete(
                              image
                            )
                          }
                          className="border-2 border-red-700 px-3 py-2 text-xs font-bold uppercase text-red-700 transition-colors hover:bg-red-700 hover:text-white"
                        >
                          Delete
                        </button>
                      </div>

                      {/* ==============================
                          FOCAL POSITION
                      ============================== */}

                      <div className="mt-6 border-t-2 border-black pt-5">
                        <div className="flex items-center justify-between gap-4">
                          <p className="text-xs font-black uppercase tracking-[0.15em]">
                            Focal
                            Position
                          </p>

                          <span className="text-[10px] font-bold uppercase text-black/50">
                            {
                              position.x
                            }
                            % /{" "}
                            {
                              position.y
                            }
                            %
                          </span>
                        </div>

                        {/* HORIZONTAL */}

                        <label className="mt-5 block">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.12em]">
                              Horizontal
                            </span>

                            <span className="text-xs font-bold">
                              {
                                position.x
                              }
                              %
                            </span>
                          </div>

                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={
                              position.x
                            }
                            onChange={(
                              event
                            ) =>
                              updatePositionDraft(
                                image.id,
                                "x",
                                Number(
                                  event
                                    .target
                                    .value
                                )
                              )
                            }
                            className="mt-2 w-full"
                          />

                          <div className="mt-1 flex justify-between text-[9px] font-bold uppercase text-black/45">
                            <span>
                              Left
                            </span>

                            <span>
                              Center
                            </span>

                            <span>
                              Right
                            </span>
                          </div>
                        </label>

                        {/* VERTICAL */}

                        <label className="mt-5 block">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-[10px] font-black uppercase tracking-[0.12em]">
                              Vertical
                            </span>

                            <span className="text-xs font-bold">
                              {
                                position.y
                              }
                              %
                            </span>
                          </div>

                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={
                              position.y
                            }
                            onChange={(
                              event
                            ) =>
                              updatePositionDraft(
                                image.id,
                                "y",
                                Number(
                                  event
                                    .target
                                    .value
                                )
                              )
                            }
                            className="mt-2 w-full"
                          />

                          <div className="mt-1 flex justify-between text-[9px] font-bold uppercase text-black/45">
                            <span>
                              Top
                            </span>

                            <span>
                              Center
                            </span>

                            <span>
                              Bottom
                            </span>
                          </div>
                        </label>

                        <div className="mt-5 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleSavePosition(
                                image
                              )
                            }
                            disabled={
                              savingPositionId ===
                              image.id
                            }
                            className="border-2 border-black bg-black px-4 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-white transition-colors hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {savingPositionId ===
                            image.id
                              ? "Saving..."
                              : "Save Position"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              resetPosition(
                                image.id
                              )
                            }
                            className="border-2 border-black bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.1em] transition-colors hover:bg-black hover:text-white"
                          >
                            Reset Center
                          </button>
                        </div>

                        {hasPositionChanges && (
                          <p className="mt-3 text-[10px] font-black uppercase tracking-[0.1em] text-black/55">
                            Unsaved
                            position
                            changes
                          </p>
                        )}
                      </div>

                      {/* ==============================
                          IMAGE METADATA
                      ============================== */}

                      {image.alt_text && (
                        <p className="mt-6 border-t-2 border-black pt-4 text-sm">
                          {
                            image.alt_text
                          }
                        </p>
                      )}

                      {image.photographer && (
                        <p className="mt-2 text-xs">
                          Credit:{" "}
                          {
                            image.photographer
                          }
                        </p>
                      )}

                      {image.source_url && (
                        <a
                          href={
                            image.source_url
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 block text-xs underline"
                        >
                          Image
                          Source
                        </a>
                      )}
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}

        {message && (
          <p
            className="mt-6 border-t-2 border-black pt-4 text-sm font-bold"
            aria-live="polite"
          >
            {message}
          </p>
        )}
      </section>
    </div>
  );
}