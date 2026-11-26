/** Default Istanbul package content (shared trip_preview v1). */
export const defaultIstanbulPackageContent = {
  kind: "trip_preview",
  version: 1,
  answers: {
    budgetEgp: 90000,
    destination: "istanbul",
    travelerCount: 2,
    lifestyle: "culture",
    nights: 3,
    amenities: ["Breakfast included"],
  },
  selections: {
    flightId: "economy-example",
    hotelSlug: "istanbul-ajia-hotel",
    includedActivitySlugs: ["hagia-sophia-exterior"],
  },
  itinerary: {
    days: [
      {
        dayNumber: 1,
        stopSlugs: ["hagia-sophia-exterior", "istanbul-grand-bazaar"],
      },
      { dayNumber: 2, stopSlugs: ["istanbul-galata-tower"] },
      { dayNumber: 3, stopSlugs: ["hagia-sophia-exterior"] },
    ],
  },
} as const;

export const istanbulHotelOptions = ["istanbul-ajia-hotel"] as const;
