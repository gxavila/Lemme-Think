import Link from "next/link";

type SceneCardProps = {
  scene: {
    id: string;
    name: string;
    slug: string;

    tagline:
      | string
      | null;

    description:
      | string
      | null;

    heroUrl:
      | string
      | null;

    heroPositionX: number;
    heroPositionY: number;

    featured: boolean;

    artistCount: number;

    locationLabel:
      | string
      | null;

    genres: {
      id: string;
      name: string;
      slug: string;
    }[];
  };
};

export default function SceneCard({
  scene,
}: SceneCardProps) {
  return (
    <article className="group overflow-hidden border-2 border-black bg-white">
      <Link
        href={`/scenes/${scene.slug}`}
        className="block"
      >
        <div className="relative aspect-[16/10] overflow-hidden border-b-2 border-black bg-black">
          {scene.heroUrl ? (
            <img
              src={
                scene.heroUrl
              }
              alt={
                scene.name
              }
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              style={{
                objectPosition:
                  `${scene.heroPositionX}% ${scene.heroPositionY}%`,
              }}
            />
          ) : (
            <div className="flex h-full items-end bg-black p-5 text-white sm:p-6">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-white/55">
                  Underground Atlas
                </p>

                <p className="mt-2 text-3xl font-black uppercase leading-[0.9] tracking-[-0.04em]">
                  {scene.name}
                </p>
              </div>
            </div>
          )}

          {scene.featured && (
            <span className="absolute left-3 top-3 border-2 border-black bg-[#f3efe4] px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em]">
              Featured
            </span>
          )}
        </div>
      </Link>

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {scene.locationLabel && (
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-black/45">
                {scene.locationLabel}
              </p>
            )}

            <Link
              href={`/scenes/${scene.slug}`}
              className="mt-1 inline-block"
            >
              <h2 className="text-2xl font-black uppercase leading-tight tracking-[-0.03em] hover:underline sm:text-3xl">
                {scene.name}
              </h2>
            </Link>
          </div>

          <span className="shrink-0 border-2 border-black bg-[#f3efe4] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.1em]">
            {scene.artistCount}{" "}
            {scene.artistCount ===
            1
              ? "Artist"
              : "Artists"}
          </span>
        </div>

        {scene.tagline && (
          <p className="mt-4 text-base font-bold leading-6">
            {scene.tagline}
          </p>
        )}

        {!scene.tagline &&
          scene.description && (
          <p className="mt-4 line-clamp-3 text-sm leading-6 text-black/65">
            {scene.description}
          </p>
        )}

        {scene.genres.length >
          0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {scene.genres.map(
              (
                genre
              ) => (
                <span
                  key={
                    genre.id
                  }
                  className="border-2 border-black px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em]"
                >
                  {genre.name}
                </span>
              )
            )}
          </div>
        )}

        <div className="mt-6 border-t-2 border-black pt-4">
          <Link
            href={`/scenes/${scene.slug}`}
            className="text-[10px] font-black uppercase tracking-[0.15em] hover:underline"
          >
            Explore Scene →
          </Link>
        </div>
      </div>
    </article>
  );
}
