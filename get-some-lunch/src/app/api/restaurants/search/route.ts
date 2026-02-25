import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchPlaces } from "@/lib/foursquare";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!query || !lat || !lng) {
    return NextResponse.json(
      { error: "query, lat, and lng are required" },
      { status: 400 }
    );
  }

  try {
    const places = await searchPlaces(
      query,
      parseFloat(lat),
      parseFloat(lng)
    );

    const results = places.map((p) => ({
      foursquare_id: p.fsq_id,
      name: p.name,
      address:
        p.location.formatted_address ??
        p.location.address ??
        "",
      category: p.categories?.[0]?.name ?? "Restaurant",
      distance: p.distance,
      lat: p.geocodes?.main?.latitude ?? null,
      lng: p.geocodes?.main?.longitude ?? null,
    }));

    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
