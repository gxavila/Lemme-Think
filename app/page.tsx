import AtlasExplorer from "@/components/AtlasExplorer";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: genres,
    error: genresError,
  } = await supabase
    .from("genres")
    .select(
      `
      id,
      name,
      slug
      `
    )
    .eq("active", true)
    .order("name");

  if (genresError) {
    throw new Error(
      genresError.message
    );
  }

  return (
    <main className="min-h-screen bg-[#f3efe4] text-black">
      {/* ======================================
          HERO
      ====================================== */}

      <section className="border-b-2 border-black">
        <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
          <div className="max-w-5xl">
            <p className="text-xs font-black uppercase tracking-[0.25em]">
              Map the Underground
            </p>

            <h1 className="mt-4 max-w-5xl text-[clamp(3rem,9vw,8rem)] font-black uppercase leading-[0.86] tracking-[-0.05em]">
              Explore Underground Music by Place
            </h1>

            <p className="mt-5 max-w-2xl text-base font-medium leading-7 sm:mt-7 sm:text-xl sm:leading-8">
              Discover contemporary underground artists,
              local scenes, and independent sounds through
              the places where they are happening.
            </p>
          </div>
        </div>
      </section>

      {/* ======================================
          ATLAS
      ====================================== */}

      <AtlasExplorer
        genres={genres ?? []}
      />

      {/* ======================================
          FOOTER
      ====================================== */}

      <footer className="border-t-2 border-black bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs font-bold uppercase tracking-[0.12em] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <span>
            Independent music,
            mapped geographically.
          </span>

          <span className="text-black/50">
            Underground Atlas
          </span>
        </div>
      </footer>
    </main>
  );
}