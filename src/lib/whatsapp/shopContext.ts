import { createClient } from "@supabase/supabase-js";
import { ShopContext } from "@/types/whatsapp-session";

/**
 * Recupera el contexto del negocio (nombre, servicios, profesionales) desde la DB.
 * Esto alimenta a Gemini para que sepa qué opciones hay disponibles.
 */
export async function getShopContext(
  slug: string,
  phone: string
): Promise<ShopContext> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase.rpc("get_shop_context", {
    p_slug: slug,
    p_phone: phone,
  });

  if (error) {
    console.error("[ShopContext] RPC Error:", error.message);
    throw new Error(`[ShopContext] ${error.message}`);
  }

  // Si no hay data o error silencioso, devolvemos un fallback seguro
  if (!data) throw new Error("Contexto de negocio no encontrado.");

  const ctx = Array.isArray(data) ? data[0] : data;

  return {
    shop_name: ctx.shop_name ?? "Peluquería",
    services: (ctx.services ?? "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean),
    professionals: (ctx.professionals ?? "")
      .split(",")
      .map((p: string) => p.trim())
      .filter(Boolean),
    sender_phone: process.env.YCLOUD_DEFAULT_SENDER || "",
  };
}
