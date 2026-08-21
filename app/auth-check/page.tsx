import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function AuthCheckPage() {
  const supabase = await createClient();

  const { data: claimsData, error } =
    await supabase.auth.getClaims();

  const userId = claimsData?.claims?.sub;

  let profile = null;

  if (userId) {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, role, active")
      .eq("id", userId)
      .single();

    profile = data;
  }

  return (
    <main className="min-h-screen bg-white p-8 text-black">
      <h1 className="text-2xl font-bold">
        Auth Check
      </h1>

      <div className="mt-6 space-y-4">
        <div>
          <strong>Authenticated:</strong>{" "}
          {userId ? "YES" : "NO"}
        </div>

        <div>
          <strong>User ID:</strong>{" "}
          {userId ?? "None"}
        </div>

        <div>
          <strong>Claims Error:</strong>{" "}
          {error?.message ?? "None"}
        </div>

        <div>
          <strong>Profile:</strong>
          <pre className="mt-2 border p-4">
            {JSON.stringify(profile, null, 2)}
          </pre>
        </div>
      </div>
    </main>
  );
}