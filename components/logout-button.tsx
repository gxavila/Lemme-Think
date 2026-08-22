"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function logout() {
    await supabase.auth.signOut();

    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="border-2 border-black bg-black px-3 py-2 text-xs font-black uppercase text-white transition-colors hover:bg-white hover:text-black"
    >
      Log Out
    </button>
  );
}