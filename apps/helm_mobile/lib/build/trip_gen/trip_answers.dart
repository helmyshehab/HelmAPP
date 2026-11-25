/// Traveler questionnaire answers for the local Build trip-preview demo.
library;

enum TripDestinationChoice { ubud, surprise }

enum TripLifestyle { culture, adventure, food, relaxed }

const tripAmenityOptions = <String>[
  'Pool',
  'Spa',
  'Breakfast included',
  'Family-friendly',
  'Quiet location',
];

class TripAnswers {
  const TripAnswers({
    this.budgetEgp,
    this.destination = TripDestinationChoice.ubud,
    this.travelerCount,
    this.lifestyle = TripLifestyle.culture,
    this.nights,
    this.amenities = const {},
  });

  final int? budgetEgp;
  final TripDestinationChoice destination;
  final int? travelerCount;
  final TripLifestyle lifestyle;
  final int? nights;
  final Set<String> amenities;

  TripAnswers copyWith({
    int? budgetEgp,
    bool clearBudget = false,
    TripDestinationChoice? destination,
    int? travelerCount,
    bool clearTravelers = false,
    TripLifestyle? lifestyle,
    int? nights,
    bool clearNights = false,
    Set<String>? amenities,
  }) {
    return TripAnswers(
      budgetEgp: clearBudget ? null : (budgetEgp ?? this.budgetEgp),
      destination: destination ?? this.destination,
      travelerCount:
          clearTravelers ? null : (travelerCount ?? this.travelerCount),
      lifestyle: lifestyle ?? this.lifestyle,
      nights: clearNights ? null : (nights ?? this.nights),
      amenities: amenities ?? this.amenities,
    );
  }
}

class TripAnswersValidation {
  const TripAnswersValidation({
    this.budgetError,
    this.travelersError,
    this.nightsError,
  });

  final String? budgetError;
  final String? travelersError;
  final String? nightsError;

  bool get isValid =>
      budgetError == null && travelersError == null && nightsError == null;
}

TripAnswersValidation validateTripAnswers(TripAnswers answers) {
  String? budgetError;
  final budget = answers.budgetEgp;
  if (budget == null) {
    budgetError = 'Enter a total trip budget in EGP.';
  } else if (budget < 5000) {
    budgetError = 'Budget must be at least 5,000 EGP.';
  } else if (budget > 5000000) {
    budgetError = 'Budget looks too high — check the amount.';
  }

  String? travelersError;
  final travelers = answers.travelerCount;
  if (travelers == null) {
    travelersError = 'Enter how many travelers are going.';
  } else if (travelers < 1) {
    travelersError = 'At least one traveler is required.';
  } else if (travelers > 20) {
    travelersError = 'Traveler count must be 20 or fewer.';
  }

  String? nightsError;
  final nights = answers.nights;
  if (nights == null) {
    nightsError = 'Enter how many nights you want to stay.';
  } else if (nights < 1) {
    nightsError = 'Stay at least 1 night.';
  } else if (nights > 14) {
    nightsError = 'This preview supports up to 14 nights.';
  }

  return TripAnswersValidation(
    budgetError: budgetError,
    travelersError: travelersError,
    nightsError: nightsError,
  );
}

String lifestyleLabel(TripLifestyle lifestyle) {
  switch (lifestyle) {
    case TripLifestyle.culture:
      return 'Culture';
    case TripLifestyle.adventure:
      return 'Adventure';
    case TripLifestyle.food:
      return 'Food';
    case TripLifestyle.relaxed:
      return 'Relaxed';
  }
}

String destinationChoiceLabel(TripDestinationChoice choice) {
  switch (choice) {
    case TripDestinationChoice.ubud:
      return 'Ubud';
    case TripDestinationChoice.surprise:
      return 'Surprise me';
  }
}
