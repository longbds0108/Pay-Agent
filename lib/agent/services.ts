import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Service } from "@/types";

/** Danh mục dịch vụ agent có thể trả phí — bảng public.services, đọc công khai (không cần RLS). */
export async function listServices(): Promise<Service[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("services")
    .select("id, name, description, price_usdc, recipient_address")
    .order("price_usdc", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string | null) ?? null,
    priceUsdc: Number(row.price_usdc),
    recipientAddress: row.recipient_address as string,
  }));
}
