"use client";

import {
  useMemo,
  useState,
} from "react";

import { createClient } from "@/lib/supabase/client";

type SceneImageManagerProps = {
  sceneId: string;
  sceneSlug: string;
  currentImagePath:
    | string
    | null;
  currentPositionX:
    | number
    | null;
  currentPositionY:
    | number
    | null;
};

export default function SceneImageManager({
  sceneId,
  sceneSlug,
  currentImagePath,
  currentPositionX,
  currentPositionY,
}: SceneImageManagerProps) {
  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const [
    imagePath,
    setImagePath,
  ] = useState<
    string | null
  >(currentImagePath);

  const [
    positionX,
    setPositionX,
  ] = useState(
    currentPositionX ?? 50
  );

  const [
    positionY,
    setPositionY,
  ] = useState(
    currentPositionY ?? 50
  );

  const [
    savedPositionX,
    setSavedPositionX,
  ] = useState(
    currentPositionX ?? 50
  );

  const [
    savedPositionY,
    setSavedPositionY,
  ] = useState(
    currentPositionY ?? 50
  );

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    deleting,
    setDeleting,
  ] = useState(false);

  const [
    savingPosition,
    setSavingPosition,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState<
    string | null
  >(null);

  const imageUrl =
    imagePath
      ? supabase.storage
          .from(
            "scene-images"
          )
          .getPublicUrl(
            imagePath
          ).data.publicUrl
      : null;

  const positionChanged =
    positionX !==
      savedPositionX ||
    positionY !==
      savedPositionY;

  async function handleUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target
        .files?.[0];

    if (!file) {
      return;
    }

    setMessage(null);
    setUploading(true);

    try {
      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "jpg";

      const newPath = [
        "scenes",
        sceneSlug,
        `hero-${Date.now()}-${crypto.randomUUID()}.${extension}`,
      ].join("/");

      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from(
            "scene-images"
          )
          .upload(
            newPath,
            file,
            {
              cacheControl:
                "3600",
              upsert:
                false,
            }
          );

      if (uploadError) {
        throw uploadError;
      }

      const {
        error:
          updateError,
      } = await supabase
        .from("scenes")
        .update({
          hero_image_path:
            newPath,
        })
        .eq(
          "id",
          sceneId
        );

      if (updateError) {
        await supabase.storage
          .from(
            "scene-images"
          )
          .remove([
            newPath,
          ]);

        throw updateError;
      }

      if (
        imagePath &&
        imagePath !==
          newPath
      ) {
        const {
          error:
            removeOldError,
        } =
          await supabase.storage
            .from(
              "scene-images"
            )
            .remove([
              imagePath,
            ]);

        if (
          removeOldError
        ) {
          console.warn(
            "Old scene image could not be removed:",
            removeOldError
          );
        }
      }

      setImagePath(
        newPath
      );

      setMessage(
        "Scene hero image updated."
      );
    } catch (
      error
    ) {
      console.error(
        "Scene image upload failed:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to upload scene image."
      );
    } finally {
      setUploading(
        false
      );

      event.target.value =
        "";
    }
  }

  async function handleSavePosition() {
    setMessage(null);
    setSavingPosition(
      true
    );

    try {
      const {
        error,
      } = await supabase
        .from("scenes")
        .update({
          hero_position_x:
            positionX,
          hero_position_y:
            positionY,
        })
        .eq(
          "id",
          sceneId
        );

      if (error) {
        throw error;
      }

      setSavedPositionX(
        positionX
      );

      setSavedPositionY(
        positionY
      );

      setMessage(
        "Image position saved."
      );
    } catch (
      error
    ) {
      console.error(
        "Scene image position update failed:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save image position."
      );
    } finally {
      setSavingPosition(
        false
      );
    }
  }

  async function handleResetPosition() {
    setPositionX(50);
    setPositionY(50);
    setMessage(
      "Preview reset to center. Click Save Position to keep it."
    );
  }

  async function handleDelete() {
    if (!imagePath) {
      return;
    }

    setMessage(null);
    setDeleting(true);

    try {
      const {
        error:
          updateError,
      } = await supabase
        .from("scenes")
        .update({
          hero_image_path:
            null,
        })
        .eq(
          "id",
          sceneId
        );

      if (updateError) {
        throw updateError;
      }

      const {
        error:
          storageError,
      } =
        await supabase.storage
          .from(
            "scene-images"
          )
          .remove([
            imagePath,
          ]);

      if (
        storageError
      ) {
        console.warn(
          "Scene image database record was cleared, but the Storage file could not be removed:",
          storageError
        );
      }

      setImagePath(
        null
      );

      setMessage(
        "Scene hero image removed."
      );
    } catch (
      error
    ) {
      console.error(
        "Scene image delete failed:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete scene image."
      );
    } finally {
      setDeleting(
        false
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* =====================================
          PREVIEW
      ===================================== */}

      <section className="border-2 border-black bg-white">
        <div className="border-b-2 border-black p-5">
          <h2 className="text-xl font-black uppercase">
            Hero Image
          </h2>

          <p className="mt-2 text-sm text-black/60">
            Adjust the visible portion of the image using the controls below.
          </p>
        </div>

        {imageUrl ? (
          <div className="relative aspect-[16/9] overflow-hidden bg-black">
            <img
              src={
                imageUrl
              }
              alt="Scene hero preview"
              className="absolute inset-0 h-full w-full object-cover"
              style={{
                objectPosition: `${positionX}% ${positionY}%`,
              }}
            />
          </div>
        ) : (
          <div className="flex aspect-[16/9] items-center justify-center bg-black p-8 text-center text-white">
            <p className="text-sm font-black uppercase tracking-[0.18em]">
              No scene image uploaded
            </p>
          </div>
        )}
      </section>

      {/* =====================================
          POSITION CONTROLS
      ===================================== */}

      {imageUrl && (
        <section className="border-2 border-black bg-white p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-black uppercase">
                Image Position
              </h3>

              <p className="mt-2 max-w-xl text-sm text-black/60">
                Move the image horizontally or vertically until the correct area appears in the preview.
              </p>
            </div>

            {positionChanged && (
              <span className="w-fit border-2 border-black bg-[#f3efe4] px-2 py-1 text-[10px] font-black uppercase">
                Unsaved Changes
              </span>
            )}
          </div>

          <div className="mt-8 space-y-8">
            {/* HORIZONTAL */}

            <div>
              <div className="flex items-center justify-between gap-4">
                <label
                  htmlFor="scene-position-x"
                  className="text-xs font-black uppercase tracking-[0.12em]"
                >
                  Horizontal Position
                </label>

                <span className="border-2 border-black px-2 py-1 text-xs font-black">
                  {positionX}%
                </span>
              </div>

              <input
                id="scene-position-x"
                type="range"
                min="0"
                max="100"
                step="1"
                value={
                  positionX
                }
                onChange={(
                  event
                ) => {
                  setPositionX(
                    Number(
                      event.target.value
                    )
                  );

                  setMessage(
                    null
                  );
                }}
                className="mt-4 w-full cursor-pointer"
              />

              <div className="mt-2 flex justify-between text-[10px] font-black uppercase tracking-[0.08em] text-black/50">
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
            </div>

            {/* VERTICAL */}

            <div>
              <div className="flex items-center justify-between gap-4">
                <label
                  htmlFor="scene-position-y"
                  className="text-xs font-black uppercase tracking-[0.12em]"
                >
                  Vertical Position
                </label>

                <span className="border-2 border-black px-2 py-1 text-xs font-black">
                  {positionY}%
                </span>
              </div>

              <input
                id="scene-position-y"
                type="range"
                min="0"
                max="100"
                step="1"
                value={
                  positionY
                }
                onChange={(
                  event
                ) => {
                  setPositionY(
                    Number(
                      event.target.value
                    )
                  );

                  setMessage(
                    null
                  );
                }}
                className="mt-4 w-full cursor-pointer"
              />

              <div className="mt-2 flex justify-between text-[10px] font-black uppercase tracking-[0.08em] text-black/50">
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
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 border-t-2 border-black pt-6">
            <button
              type="button"
              onClick={
                handleSavePosition
              }
              disabled={
                savingPosition ||
                !positionChanged
              }
              className="border-2 border-black bg-black px-5 py-3 text-xs font-black uppercase text-white transition-colors hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
            >
              {savingPosition
                ? "Saving..."
                : "Save Position"}
            </button>

            <button
              type="button"
              onClick={
                handleResetPosition
              }
              disabled={
                savingPosition
              }
              className="border-2 border-black bg-white px-5 py-3 text-xs font-black uppercase transition-colors hover:bg-black hover:text-white disabled:opacity-40"
            >
              Reset Center
            </button>
          </div>
        </section>
      )}

      {/* =====================================
          UPLOAD / REPLACE
      ===================================== */}

      <section className="border-2 border-black bg-white p-6">
        <h3 className="text-lg font-black uppercase">
          {imagePath
            ? "Replace Image"
            : "Upload Image"}
        </h3>

        <p className="mt-2 text-sm text-black/60">
          Wide landscape images work best. The image will be cropped automatically to fill the hero area.
        </p>

        <label className="mt-5 inline-flex cursor-pointer border-2 border-black bg-black px-5 py-3 text-xs font-black uppercase text-white transition-colors hover:bg-white hover:text-black">
          {uploading
            ? "Uploading..."
            : imagePath
              ? "Choose Replacement"
              : "Choose Image"}

          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={
              handleUpload
            }
            disabled={
              uploading ||
              deleting ||
              savingPosition
            }
            className="hidden"
          />
        </label>
      </section>

      {/* =====================================
          DELETE
      ===================================== */}

      {imagePath && (
        <section className="border-2 border-red-700 bg-white p-6">
          <h3 className="text-lg font-black uppercase text-red-700">
            Remove Hero Image
          </h3>

          <p className="mt-2 text-sm">
            This removes the image from the scene and deletes the stored image file.
          </p>

          <button
            type="button"
            onClick={
              handleDelete
            }
            disabled={
              deleting ||
              uploading ||
              savingPosition
            }
            className="mt-5 border-2 border-red-700 bg-red-700 px-5 py-3 text-xs font-black uppercase text-white disabled:opacity-50"
          >
            {deleting
              ? "Removing..."
              : "Remove Image"}
          </button>
        </section>
      )}

      {/* =====================================
          STATUS
      ===================================== */}

      {message && (
        <div className="border-2 border-black bg-[#f3efe4] p-4">
          <p className="text-sm font-bold">
            {message}
          </p>
        </div>
      )}
    </div>
  );
}