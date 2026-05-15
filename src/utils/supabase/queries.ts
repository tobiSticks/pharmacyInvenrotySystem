import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fetches all products for a given organization by paginating through the results
 * to bypass the default 1000 row limit set by Supabase.
 */
export async function fetchAllProducts(
  supabase: SupabaseClient<any, "public", any>,
  organizationId: string,
  selectQuery: string = "*"
) {
  let allData: any[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("products")
      .select(selectQuery)
      .eq("organization_id", organizationId)
      .order("name")
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Error fetching products:", error);
      throw error;
    }

    if (data && data.length > 0) {
      allData.push(...data);
      if (data.length === pageSize) {
        from += pageSize;
      } else {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  return allData;
}

export async function fetchAllRows(
  supabase: SupabaseClient<any, "public", any>,
  table: string,
  selectQuery: string,
  filterColumn: string,
  filterValue: string
) {
  let allData: any[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from(table)
      .select(selectQuery)
      .eq(filterColumn, filterValue)
      .range(from, from + pageSize - 1);

    if (error) {
      console.error(`Error fetching from ${table}:`, error);
      throw error;
    }

    if (data && data.length > 0) {
      allData.push(...data);
      if (data.length === pageSize) {
        from += pageSize;
      } else {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }

  return allData;
}
