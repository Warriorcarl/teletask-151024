import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code"); // Ambil kode otorisasi dari URL
  const origin = requestUrl.origin; // URL asal
  const redirectTo = requestUrl.searchParams.get("redirect_to")?.toString(); // URL pengalihan setelah proses

  if (code) {
    const supabase = createClient();

    // Menukar kode otorisasi dengan token sesi dari Telegram
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const session = data?.session; // Ambil sesi dari data yang dikembalikan

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 400 });
    }

    // Simpan token Telegram di Supabase
    const { data: tokenData, error: tokenError } = await supabase
      .from('telegram_tokens')
      .insert({
        user_id: session.user.id, // Mengaitkan token dengan ID user di Supabase
        token: session.access_token,
        created_at: new Date()
      });

    if (tokenError) {
      return NextResponse.json({ error: tokenError.message }, { status: 500 });
    }
  }

  if (redirectTo) {
    return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  return NextResponse.redirect(`${origin}/protected`);
}
