import Link from "next/link";

import AtlasExplorer from "@/components/AtlasExplorer";
import HomeSplash from "@/components/HomeSplash";
import UndergroundAtlasHeader from "@/components/UndergroundAtlasHeader";

import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function HomePage() {
  const supabase =
    await createClient();

  const [
    genresResult,
    locationsResult,
  ] = await Promise.all([
    supabase
      .from("genres")
      .select(
        `
        id,
        name,
        slug
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
      .from("locations")
      .select(
        `
        id,
        name,
        slug,
        city,
        region,
        country
        `
      )
      .order(
        "name"
      ),
  ]);

  if (
    genresResult.error
  ) {
    throw new Error(
      genresResult.error.message
    );
  }

  if (
    locationsResult.error
  ) {
    throw new Error(
      locationsResult.error.message
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f3efe4] text-black">
      {/* ======================================
          SPLASH
      ====================================== */}

      <HomeSplash />

      {/* ======================================
          APP HEADER
      ====================================== */}

      <UndergroundAtlasHeader />

      {/* ======================================
          ATLAS
      ====================================== */}

      <section className="w-full">
        <AtlasExplorer
          genres={
            genresResult.data ??
            []
          }
          locations={
            locationsResult.data ??
            []
          }
        />
      </section>

    </main>
  );
}
