import Link from "next/link";
import {
  notFound,
  redirect,
} from "next/navigation";

import SceneImageManager from "@/components/admin/SceneImageManager";
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
    error:
      profileError,
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
    ![
      "admin",
      "editor",
    ].includes(
      profile.role
    )
  ) {
    redirect("/");
  }

  return supabase;
}

export default async function SceneImagesPage({
  params,
}: PageProps) {
  const { id } =
    await params;

  const supabase =
    await requireContentManager();

  const {
    data: scene,
    error: sceneError,
  } = await supabase
    .from("scenes")
    .select(
      `
      id,
      name,
      slug,
      hero_image_path,
      hero_position_x,
      hero_position_y,
      published
      `
    )
    .eq(
      "id",
      id
    )
    .single();

  if (
    sceneError ||
    !scene
  ) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      {/* =====================================
          HEADER
      ===================================== */}

      <header className="border-b-2 border-black px-6 py-5">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href={`/admin/scenes/${scene.id}`}
              className="text-xs font-bold uppercase tracking-[0.2em] hover:underline"
            >
              ← Edit Scene
            </Link>

            <h1 className="mt-2 text-3xl font-black uppercase">
              {scene.name} Image
            </h1>

            <p className="mt-2 max-w-xl text-sm text-black/60">
              Upload the scene hero image and adjust which portion appears on the public page.
            </p>
          </div>

          {scene.published && (
            <Link
              href={`/scenes/${scene.slug}`}
              className="border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white transition-colors hover:bg-white hover:text-black"
            >
              View Scene →
            </Link>
          )}
        </div>
      </header>

      {/* =====================================
          CONTENT
      ===================================== */}

      <section className="mx-auto max-w-4xl px-6 py-10">
        <SceneImageManager
          sceneId={
            scene.id
          }
          sceneSlug={
            scene.slug
          }
          currentImagePath={
            scene.hero_image_path
          }
          currentPositionX={
            scene.hero_position_x
          }
          currentPositionY={
            scene.hero_position_y
          }
        />
      </section>
    </main>
  );
}