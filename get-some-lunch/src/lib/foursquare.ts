export interface FoursquarePlace {
  fsq_id: string;
  name: string;
  location: {
    address?: string;
    formatted_address?: string;
    locality?: string;
    region?: string;
  };
  categories: { name: string }[];
  distance?: number;
  geocodes?: {
    main?: { latitude: number; longitude: number };
  };
}

export async function searchPlaces(
  query: string,
  lat: number,
  lng: number,
  radius: number = 3000
): Promise<FoursquarePlace[]> {
  const apiKey = process.env.FOURSQUARE_API_KEY;
  if (!apiKey) throw new Error("FOURSQUARE_API_KEY not set");

  const params = new URLSearchParams({
    query,
    ll: `${lat},${lng}`,
    radius: radius.toString(),
    categories: "13065", // restaurants
    limit: "20",
    sort: "RELEVANCE",
  });

  const res = await fetch(
    `https://api.foursquare.com/v3/places/search?${params}`,
    {
      headers: {
        Authorization: apiKey,
        Accept: "application/json",
      },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Foursquare API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.results as FoursquarePlace[];
}
