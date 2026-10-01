import type { GeocodeHit, Item, SearchQuery } from "../types";

export interface DiscoveryProvider {
  searchPlaces(q: SearchQuery): Promise<Item[]>;
  searchEvents(q: SearchQuery): Promise<Item[]>;
  getPlace(id: string): Promise<Item | null>;
  geocode(input: string): Promise<GeocodeHit>;
}
