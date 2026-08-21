"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ReleaseCoverManagerProps = {
  artistSlug: string;
  releaseId: string;
  currentCoverPath: string | null;
};

export default function ReleaseCoverManager({
  artistSlug,
  releaseId,
  currentCoverPath,
}: ReleaseCoverManagerProps) {
  const supabase = createClient();

  const [file, setFile] =
    useState<File | null>(null);

  const [coverPath, setCoverPath] =
    useState<string | null>(currentCoverPath);

  const [uploading, setUploading] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  function getPublicUrl(path: string) {
    const { data } = supabase.storage
      .from("release-images")
      .getPublicUrl(path);

    return data.publicUrl;
  }

  async function handleUpload(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!file) {
      setMessage("Select an image first.");
      return;
    }

    if (!file.type.startsWith("image/")) {
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
          ?.toLowerCase() || "jpg";

      const storagePath =
        `artists/${artistSlug}/releases/${releaseId}/cover-${Date.now()}-${crypto.randomUUID()}.${extension}`;

      // ========================================
      // UPLOAD NEW FILE
      // ========================================

      const {
        error: uploadError,
      } = await supabase.storage
        .from("release-images")
        .upload(storagePath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // ========================================
      // UPDATE RELEASE RECORD
      // ========================================

      const {
        error: updateError,
      } = await supabase
        .from("releases")
        .update({
          cover_image_path: storagePath,
        })
        .eq("id", releaseId);

      if (updateError) {
        await supabase.storage
          .from("release-images")
          .remove([storagePath]);

        throw updateError;
      }

      // ========================================
      // REMOVE OLD COVER
      // ========================================

      if (
        coverPath &&
        coverPath !== storagePath
      ) {
        await supabase.storage
          .from("release-images")
          .remove([coverPath]);
      }

      setCoverPath(storagePath);
      setFile(null);

      const input =
        document.getElementById(
          "release-cover-file"
        ) as HTMLInputElement | null;

      if (input) {
        input.value = "";
      }

      setMessage(
        "Cover uploaded successfully."
      );
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to upload cover."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!coverPath) {
      return;
    }

    const confirmed =
      window.confirm(
        "Delete this release cover permanently?"
      );

    if (!confirmed) {
      return;
    }

    setMessage(null);

    try {
      // ========================================
      // DELETE STORAGE OBJECT
      // ========================================

      const {
        error: storageError,
      } = await supabase.storage
        .from("release-images")
        .remove([coverPath]);

      if (storageError) {
        throw storageError;
      }

      // ========================================
      // CLEAR DATABASE PATH
      // ========================================

      const {
        error: updateError,
      } = await supabase
        .from("releases")
        .update({
          cover_image_path: null,
        })
        .eq("id", releaseId);

      if (updateError) {
        throw updateError;
      }

      setCoverPath(null);

      setMessage(
        "Cover deleted successfully."
      );
    } catch (error) {
      console.error(error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete cover."
      );
    }
  }

  return (
    <section className="border-2 border-black bg-white p-6">
      <h2 className="text-xl font-black uppercase">
        Release Cover
      </h2>

      {coverPath && (
        <div className="mt-6 max-w-sm">
          <div className="aspect-square overflow-hidden border-2 border-black bg-black">
            <img
              src={getPublicUrl(
                coverPath
              )}
              alt="Release cover"
              className="h-full w-full object-cover"
            />
          </div>

          <button
            type="button"
            onClick={
              handleDelete
            }
            className="mt-3 border-2 border-red-700 px-4 py-2 text-xs font-bold uppercase text-red-700"
          >
            Delete Cover
          </button>
        </div>
      )}

      <form
        onSubmit={
          handleUpload
        }
        className="mt-6 space-y-4"
      >
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[0.15em]">
            Cover Image
          </span>

          <input
            id="release-cover-file"
            type="file"
            accept="image/*"
            required
            onChange={(event) =>
              setFile(
                event.target
                  .files?.[0] ??
                  null
              )
            }
            className="mt-2 block w-full border-2 border-black bg-white p-3"
          />
        </label>

        <button
          type="submit"
          disabled={
            uploading
          }
          className="border-2 border-black bg-black px-5 py-3 text-xs font-black uppercase text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading
            ? "Uploading..."
            : coverPath
            ? "Replace Cover"
            : "Upload Cover"}
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
  );
}