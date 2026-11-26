/** Default Ubud package content aligned with the mobile fixture (no cooking class). */
export const defaultUbudPackageContent = {
  kind: "ubud_trip_preview",
  version: 1,
  answers: {
    budgetEgp: 85000,
    destination: "ubud",
    travelerCount: 2,
    lifestyle: "culture",
    nights: 3,
    amenities: ["Breakfast included", "Pool"],
  },
  selections: {
    flightId: "economy-example",
    hotelSlug: "ubud-village-hotel",
    includedActivitySlugs: ["ubud-sacred-monkey-forest"],
  },
  itinerary: {
    days: [
      {
        dayNumber: 1,
        stopSlugs: ["ubud-sacred-monkey-forest", "ubud-moksa"],
      },
      { dayNumber: 2, stopSlugs: ["ubud-moksa"] },
      { dayNumber: 3, stopSlugs: ["ubud-sacred-monkey-forest"] },
    ],
  },
} as const;

export type EditablePackageContent = {
  kind: "ubud_trip_preview";
  version: 1;
  answers: {
    budgetEgp: number;
    destination: "ubud" | "surprise";
    travelerCount: number;
    lifestyle: "culture" | "adventure" | "food" | "relaxed";
    nights: number;
    amenities: string[];
  };
  selections: {
    flightId: "economy-example" | "flexible-example";
    hotelSlug: string;
    includedActivitySlugs: string[];
  };
  itinerary: {
    days: { dayNumber: number; stopSlugs: string[] }[];
  };
};

export function parseEditableContent(raw: unknown): EditablePackageContent | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as EditablePackageContent;
  if (value.kind !== "ubud_trip_preview" || value.version !== 1) return null;
  if (!value.answers || !value.selections || !value.itinerary) return null;
  return value;
}

/** Keep itinerary day count aligned with nights (Build rule). */
export function syncDaysToNights(
  content: EditablePackageContent,
  nights: number,
): EditablePackageContent {
  const days = [...content.itinerary.days];
  while (days.length < nights) {
    days.push({ dayNumber: days.length + 1, stopSlugs: [] });
  }
  while (days.length > nights) {
    days.pop();
  }
  return {
    ...content,
    answers: { ...content.answers, nights },
    itinerary: {
      days: days.map((day, index) => ({
        dayNumber: index + 1,
        stopSlugs: day.stopSlugs,
      })),
    },
  };
}

export const hotelOptions = [
  "ubud-swasti-eco-cottages",
  "ubud-village-hotel",
  "ubud-adiwana-jembawan",
  "ubud-komaneka-bisma",
  "ubud-alila-ubud",
  "ubud-capella-ubud",
] as const;

export const amenityOptions = [
  "Pool",
  "Spa",
  "Breakfast included",
  "Family-friendly",
  "Quiet location",
] as const;
