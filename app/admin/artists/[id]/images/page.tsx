import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import ArtistImageManager from "@/components/admin/ArtistImageManager";

export const instant = false;

type ArtistImagesPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ArtistImagesPage({
  params,
}: ArtistImagesPageProps) {
  const { id } = await params;

  const supabase =
    await createClient();

  // ============================================
  // AUTHENTICATION
  // ============================================

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    redirect("/auth/login");
  }

  // ============================================
  // AUTHORIZATION
  // ============================================

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "role, active"
    )
    .eq(
      "id",
      userId
    )
    .single();

  if (
    profileError ||
    !profile ||
    !profile.active ||
    !["admin", "editor"].includes(
      profile.role
    )
  ) {
    redirect("/");
  }

  // ============================================
  // ARTIST
  // ============================================

  const {
    data: artist,
    error: artistError,
  } = await supabase
    .from("artists")
    .select(
      "id, name, slug"
    )
    .eq(
      "id",
      id
    )
    .single();

  if (
    artistError ||
    !artist
  ) {
    notFound();
  }

  // ============================================
  // EXISTING IMAGES
  // ============================================

  const {
    data: images,
    error: imagesError,
  } = await supabase
    .from("artist_images")
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
    .eq(
      "artist_id",
      id
    )
    .order(
      "sort_order"
    );

  if (imagesError) {
    throw new Error(
      imagesError.message
    );
  }

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      <header className="border-b-2 border-black px-6 py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6">
          <div>
            <Link
              href={`/admin/artists/${artist.id}`}
              className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
            >
              ← Edit Artist
            </Link>

            <h1 className="mt-2 text-3xl font-black uppercase">
              {artist.name} Images
            </h1>
          </div>

          <Link
            href={`/artists/${artist.slug}`}
            className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
          >
            View Artist →
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <ArtistImageManager
          artistId={
            artist.id
          }
          artistSlug={
            artist.slug
          }
          initialImages={
            (images ?? []) as {
              id: string;
              storage_path: string;
              image_type:
                | "hero"
                | "profile"
                | "gallery";
              alt_text:
                | string
                | null;
              photographer:
                | string
                | null;
              source_url:
                | string
                | null;
              sort_order: number;
              position_x: number;
              position_y: number;
            }[]
          }
        />
      </section>
    </main>
  );
}