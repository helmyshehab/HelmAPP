import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:helm_api_client/helm_api_client.dart';

import '../../auth/traveler_session.dart';
import '../../discover/place_list_item.dart';
import '../draft_title_patch.dart';
import 'istanbul_demo_catalog.dart';
import 'trip_answers.dart';
import 'trip_demo_checkout_screen.dart';
import 'trip_demo_pricing.dart';
import 'trip_flow_routes.dart';
import 'trip_planner.dart';
import 'trip_preview_draft.dart';
import 'trip_questionnaire_screen.dart';
import 'ubud_demo_catalog.dart';

/// Traveler-facing local trip preview (catalog places + demo price estimate).
///
/// When opened from the questionnaire, auth dismissal for both routes is owned
/// by [TripQuestionnaireScreen]. When reopened from the drafts list, this
/// screen clears itself on sign-out / account switch.
class TripPreviewScreen extends StatefulWidget {
  const TripPreviewScreen({
    super.key,
    required this.plan,
    required this.auth,
    required this.apiClient,
    this.draftId,
    this.initialFlightId,
    this.initialHotelSlug,
    this.initialIncludedActivitySlugs,
    this.onAnswersChanged,
    this.onDraftIdChanged,
    this.allowDemoStaffConfirmation = false,
  });

  final TripPreviewPlan plan;
  final TravelerAuth auth;
  final HelmApiClient apiClient;

  /// Existing private draft id when reopening or after the first successful save.
  final String? draftId;

  final String? initialFlightId;
  final String? initialHotelSlug;
  final Set<String>? initialIncludedActivitySlugs;

  final ValueChanged<TripAnswers>? onAnswersChanged;
  final ValueChanged<String>? onDraftIdChanged;
  final bool allowDemoStaffConfirmation;

  @override
  State<TripPreviewScreen> createState() => _TripPreviewScreenState();
}

class _TripPreviewScreenState extends State<TripPreviewScreen> {
  late TripPreviewPlan _plan;
  late String _flightId;
  late String _hotelSlug;
  late Set<String> _includedActivitySlugs;
  late String? _draftId;
  late String? _boundUserId;
  late int _boundGeneration;

  bool _saving = false;
  String? _saveError;
  String? _saveMessage;
  TripDraftQuote? _quote;
  String? _quoteConstraints;
  String? _quoteError;
  Timer? _quoteExpiration;
  bool _requestingQuote = false;
  bool _submittingRequest = false;
  String? _requestError;
  String? _requestStatus;
  bool _cleared = false;
  Set<String>? _publishedSlugs;
  bool _catalogFailed = false;
  int? _activityPickerDay;
  Route<void>? _checkoutRoute;

  /// Stable owner-scoped create key until the first create succeeds.
  String? _createClientRequestKey;

  /// First create payload retained for idempotent replay after timeouts.
  String? _createReplayTitle;
  Map<String, dynamic>? _createReplayConstraints;

  @override
  void initState() {
    super.initState();
    _plan = widget.plan;
    _draftId = widget.draftId;
    _boundUserId = widget.auth.session?.userId;
    _boundGeneration = widget.auth.authGeneration;
    _restoreSelections(
      flightId: widget.initialFlightId,
      hotelSlug: widget.initialHotelSlug,
      includedActivitySlugs: widget.initialIncludedActivitySlugs,
    );
    widget.auth.sessionListenable.addListener(_onAuthChanged);
    unawaited(_loadCatalog());
    unawaited(_loadExistingRequest());
  }

  Future<void> _loadExistingRequest() async {
    final session = widget.auth.session;
    final draftId = _draftId;
    if (session == null || draftId == null) return;
    final generation = widget.auth.authGeneration;
    try {
      final items =
          await widget.apiClient.listTripRequests(accessToken: session.accessToken);
      if (!mounted || !_isAuthCurrent(generation) || _cleared) return;
      for (final item in items) {
        if (item.draftId == draftId) {
          setState(() => _requestStatus = item.status);
          return;
        }
      }
    } catch (_) {
      // Request status is optional until the traveler submits.
    }
  }

  Future<void> _submitTripRequest() async {
    if (!canStartMutation(_saving || _submittingRequest) || _cleared) return;
    final session = widget.auth.session;
    final draftId = _draftId;
    if (session == null || session.userId != _boundUserId || draftId == null) {
      return;
    }
    final generation = widget.auth.authGeneration;
    setState(() {
      _submittingRequest = true;
      _requestError = null;
    });
    try {
      final request = await widget.apiClient.createTripRequest(
        accessToken: session.accessToken,
        draftId: draftId,
      );
      if (!mounted || !_isAuthCurrent(generation) || _cleared) return;
      setState(() {
        _requestStatus = request.status;
        _saveMessage =
            'Trip requested. You can keep editing this private draft.';
      });
    } catch (error) {
      if (!mounted || !_isAuthCurrent(generation) || _cleared) return;
      setState(() => _requestError = error.toString());
    } finally {
      if (mounted && _isAuthCurrent(generation) && !_cleared) {
        setState(() => _submittingRequest = false);
      }
    }
  }

  Future<void> _loadCatalog() async {
    if (_catalogFailed || _publishedSlugs != null) {
      setState(() {
        _catalogFailed = false;
        _publishedSlugs = null;
      });
    }
    try {
      final slugs = <String>{};
      var offset = 0;
      while (true) {
        final page =
            PlaceListPage.fromJson(await widget.apiClient.listCatalogPlaces(
          destinationSlug: _plan.destinationSlug,
          limit: 100,
          offset: offset,
        ));
        slugs.addAll(page.items.map((place) => place.slug));
        if (!page.hasMore) break;
        if (page.items.isEmpty || page.offset != offset) {
          throw StateError('Incomplete catalog page');
        }
        offset += page.items.length;
      }
      if (!mounted || _cleared) return;
      setState(() {
        _publishedSlugs = slugs;
        if (!slugs.contains(_hotelSlug) && _availableHotels.isNotEmpty) {
          _hotelSlug = _availableHotels.first.slug;
        }
        if (_availableHotels.isNotEmpty) {
          _plan = _publishedPlan(_plan);
          _includedActivitySlugs.retainAll(previewPlaceSlugs(_plan));
        }
      });
    } catch (_) {
      if (mounted && !_cleared) setState(() => _catalogFailed = true);
    }
  }

  bool _isPublished(String slug) => _publishedSlugs?.contains(slug) ?? false;

  List<DemoHotelOption> get _availableHotels =>
      demoHotelOptions.where((option) => _isPublished(option.slug)).toList();

  TripPreviewPlan _publishedPlan(TripPreviewPlan plan) => plan.withDays([
        for (final day in plan.days)
          TripPreviewDay(
            dayNumber: day.dayNumber,
            title: day.title,
            stops: List.unmodifiable(
              day.stops.where((stop) => _isPublished(stop.place.slug)),
            ),
          ),
      ]);

  @override
  void dispose() {
    _quoteExpiration?.cancel();
    widget.auth.sessionListenable.removeListener(_onAuthChanged);
    super.dispose();
  }

  bool _isAuthCurrent(int generation) =>
      widget.auth.authGeneration == generation;

  void _onAuthChanged() {
    final session = widget.auth.session;
    final generationChanged = widget.auth.authGeneration != _boundGeneration;
    final identityChanged = session?.userId != _boundUserId;
    if (!identityChanged && !generationChanged) return;
    if (!mounted) return;
    _quoteExpiration?.cancel();
    setState(() {
      _cleared = true;
      _saving = false;
      _requestingQuote = false;
      _quote = null;
      _quoteError = null;
      _saveError = null;
      _saveMessage = null;
    });
    final navigator = Navigator.of(context);
    final checkout = _checkoutRoute;
    if (checkout != null && checkout.isActive) navigator.removeRoute(checkout);
    final self = ModalRoute.of(context);
    if (self != null && self.isActive) {
      navigator.removeRoute(self);
    }
  }

  Future<void> _openDemoCheckout() async {
    if (_cleared || _saving || _checkoutRoute != null) return;
    final quote = _currentQuote;
    if (quote == null) return;
    final plan = _plan;
    final days = demoBookingDays(plan, _includedActivitySlugs);
    final route = MaterialPageRoute<void>(
      builder: (_) => TripDemoCheckoutScreen(
        tripLabel: _tripLabel(plan),
        quote: quote,
        destinationName: plan.destinationName,
        days: days,
        createBooking: () => _createDemoBooking(quote),
        confirmDemoService: widget.allowDemoStaffConfirmation
            ? (id, kind) => widget.apiClient.confirmDemoBookingService(
                  accessToken: widget.auth.session!.accessToken,
                  bookingId: id,
                  kind: kind,
                )
            : null,
      ),
    );
    _checkoutRoute = route;
    try {
      await Navigator.of(context).push(route);
    } finally {
      _checkoutRoute = null;
    }
  }

  Future<DemoTripBooking?> _createDemoBooking(TripDraftQuote quote) async {
    final session = widget.auth.session;
    if (session == null || _cleared || !_isAuthCurrent(_boundGeneration)) {
      return null;
    }
    final generation = widget.auth.authGeneration;
    final booking = await widget.apiClient.createDemoTripBooking(
      accessToken: session.accessToken,
      draftId: quote.draftId,
      quoteId: quote.id,
    );
    if (!mounted || _cleared || !_isAuthCurrent(generation)) return null;
    if (booking != null) return booking;
    _quoteExpiration?.cancel();
    setState(() {
      _quote = null;
      _quoteError = 'This quote is no longer current. Request a new quote.';
    });
    return null;
  }

  void _restoreSelections({
    String? flightId,
    String? hotelSlug,
    Set<String>? includedActivitySlugs,
  }) {
    final preferredFlight = flightId ?? demoFlightOptions.first.id;
    _flightId =
        demoFlightById(preferredFlight)?.id ?? demoFlightOptions.first.id;

    final suggested = demoHotelBySlug(_plan.staySuggestion.slug);
    final preferredHotel = hotelSlug ??
        suggested?.slug ??
        demoHotelsInTier(DemoHotelTier.base).first.slug;
    _hotelSlug = demoHotelBySlug(preferredHotel)?.slug ??
        suggested?.slug ??
        demoHotelsInTier(DemoHotelTier.base).first.slug;

    if (includedActivitySlugs != null) {
      _includedActivitySlugs = {...includedActivitySlugs};
    } else {
      _includedActivitySlugs = {
        for (final day in _plan.days)
          for (final stop in day.stops)
            if (isPricedDemoActivity(stop.place)) stop.place.slug,
      };
    }
  }

  DemoFlightOption get _flight => demoFlightById(_flightId)!;

  DemoHotelOption get _hotel => demoHotelBySlug(_hotelSlug)!;

  TripDemoEstimate get _estimate {
    final answers = _plan.answers;
    return calculateTripDemoEstimate(
      travelerCount: answers.travelerCount!,
      nights: answers.nights!,
      budgetEgp: answers.budgetEgp!,
      flight: _flight,
      hotelTier: _hotel.tier,
      selectedActivityRatesPerTraveler: [
        for (final slug in _includedActivitySlugs)
          demoActivityRateForSlug(slug) ?? 0,
      ],
    );
  }

  void _selectFlight(String id) {
    setState(() {
      _flightId = id;
      _saveMessage = null;
    });
  }

  void _selectHotel(String slug) {
    if (!_isPublished(slug)) return;
    setState(() {
      _hotelSlug = slug;
      _saveMessage = null;
    });
  }

  void _removeActivity(String slug) {
    setState(() {
      _includedActivitySlugs.remove(slug);
      _saveMessage = null;
    });
  }

  void _restoreActivity(String slug) {
    setState(() {
      _includedActivitySlugs.add(slug);
      _saveMessage = null;
    });
  }

  void _removeScheduledActivity(TripPreviewDay day, String slug) {
    if (_saving || _cleared) return;
    setState(() {
      _plan = _plan.withDays([
        for (final existing in _plan.days)
          if (existing == day)
            TripPreviewDay(
              dayNumber: day.dayNumber,
              title: day.title,
              stops: List.unmodifiable(
                day.stops.where((stop) => stop.place.slug != slug),
              ),
            )
          else
            existing,
      ]);
      _includedActivitySlugs.remove(slug);
      _saveMessage = null;
    });
  }

  void _reorderStops(TripPreviewDay day, int fromIndex, int toIndex) {
    if (_saving || _cleared) return;
    final stops = [...day.stops];
    final stop = stops.removeAt(fromIndex);
    stops.insert(toIndex, stop);
    setState(() {
      _plan = _plan.withDays([
        for (final existing in _plan.days)
          if (existing == day)
            TripPreviewDay(
              dayNumber: day.dayNumber,
              title: day.title,
              stops: List.unmodifiable(stops),
            )
          else
            existing,
      ]);
      _saveMessage = null;
    });
  }

  void _addActivity(int dayNumber, UbudDemoPlace place) {
    if (_saving ||
        _cleared ||
        !_isPublished(place.slug) ||
        previewPlaceSlugs(_plan).contains(place.slug)) {
      return;
    }
    setState(() {
      _plan = _plan.withDays([
        for (final day in _plan.days)
          if (day.dayNumber == dayNumber)
            TripPreviewDay(
              dayNumber: day.dayNumber,
              title: day.title,
              stops: List.unmodifiable([
                ...day.stops,
                TripPreviewStop(
                    place: place, roleLabel: TripPreviewStop.unscheduledRole),
              ]),
            )
          else
            day,
      ]);
      _includedActivitySlugs.add(place.slug);
      _activityPickerDay = null;
      _saveMessage = null;
    });
  }

  Widget _activityPicker(TripPreviewDay day, int travelers) {
    final expanded = _activityPickerDay == day.dayNumber;
    final scheduled = expanded ? previewPlaceSlugs(_plan) : const <String>{};
    final options = expanded
        ? ubudDemoPlaces.where((place) =>
            _isPublished(place.slug) &&
            isPricedDemoActivity(place) &&
            !scheduled.contains(place.slug))
        : const <UbudDemoPlace>[];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        OutlinedButton.icon(
          key: Key('trip-day-add-activity-${day.dayNumber}'),
          onPressed: _saving
              ? null
              : () => setState(() {
                    _activityPickerDay = expanded ? null : day.dayNumber;
                  }),
          icon: Icon(expanded ? Icons.close : Icons.add),
          label: Text(expanded ? 'Close activity list' : 'Add activity'),
        ),
        if (expanded && options.isEmpty)
          const Text('No additional published activities are available.'),
        for (final place in options)
          ListTile(
            key: Key('trip-catalog-activity-${place.slug}'),
            contentPadding: EdgeInsets.zero,
            title: Text(place.nameEn),
            subtitle: Text('${place.shortDescriptionEn}\n'
                'Demo ${formatDemoEgp(demoActivityRateForSlug(place.slug)! * travelers)} for group'),
            trailing: const Icon(Icons.add),
            enabled: !_saving,
            onTap: () => _addActivity(day.dayNumber, place),
          ),
      ],
    );
  }

  Future<void> _editAnswers() async {
    if (_cleared || _saving) return;

    final updated = await Navigator.of(context).push<TripAnswers>(
      MaterialPageRoute<TripAnswers>(
        settings: const RouteSettings(name: tripQuestionnaireRouteName),
        builder: (_) => TripQuestionnaireScreen(
          auth: widget.auth,
          apiClient: widget.apiClient,
          initialAnswers: _plan.answers,
          onAnswersChanged: (_) {},
          returnAnswersOnSubmit: true,
        ),
      ),
    );
    if (!mounted || updated == null || _cleared) return;

    final previous = _plan.answers;
    final keepItinerary = previous.nights == updated.nights &&
        previous.lifestyle == updated.lifestyle &&
        previous.destination == updated.destination;
    final nextPlan = _publishedPlan(planDemoTrip(updated));
    setState(() {
      if (keepItinerary) {
        _plan = nextPlan.withDays(_plan.days);
      } else {
        final previousStops = previewPlaceSlugs(_plan);
        _includedActivitySlugs = {
          for (final day in nextPlan.days)
            for (final stop in day.stops)
              if (isPricedDemoActivity(stop.place) &&
                  (!previousStops.contains(stop.place.slug) ||
                      _includedActivitySlugs.contains(stop.place.slug)))
                stop.place.slug,
        };
        _plan = nextPlan;
        _activityPickerDay = null;
      }
      _saveMessage = null;
    });
    widget.onAnswersChanged?.call(updated);
  }

  bool get _supportsDemoQuote =>
      _plan.destinationSlug != 'istanbul' &&
      _plan.answers.destination != TripDestinationChoice.istanbul;

  Map<String, dynamic> _snapshotConstraints() =>
      TripPreviewDraftSnapshot.fromPlan(
        plan: _plan,
        flightId: _flightId,
        hotelSlug: _hotelSlug,
        includedActivitySlugs: _includedActivitySlugs,
      ).toConstraints();

  TripDraftQuote? get _currentQuote {
    if (!_supportsDemoQuote) return null;
    final quote = _quote;
    if (quote == null ||
        !DateTime.parse(quote.expiresAt).isAfter(DateTime.now())) {
      return null;
    }
    return _quoteConstraints == jsonEncode(_snapshotConstraints())
        ? quote
        : null;
  }

  Future<void> _saveDraft({bool requestQuote = false}) async {
    if (!canStartMutation(_saving) || _cleared) return;
    final session = widget.auth.session;
    if (session == null || session.userId != _boundUserId) return;
    final generation = widget.auth.authGeneration;
    final shouldRequestQuote = requestQuote && _supportsDemoQuote;

    _quoteExpiration?.cancel();
    setState(() {
      _saving = true;
      _requestingQuote = shouldRequestQuote;
      _saveError = null;
      _saveMessage = null;
      _quote = null;
      _quoteError = null;
    });

    final constraints = _snapshotConstraints();
    final title = tripPreviewDraftTitle(_plan.answers);

    try {
      await widget.apiClient.bootstrapCustomerProfile(
        accessToken: session.accessToken,
      );
      if (!mounted || !_isAuthCurrent(generation) || _cleared) return;

      TripDraft saved;
      final existingId = _draftId;
      if (existingId == null) {
        // Idempotent first create: keep one client key + first payload for
        // replay when the server commits but the response never arrives.
        _createClientRequestKey ??= _newClientRequestKey();
        _createReplayTitle ??= title;
        _createReplayConstraints ??= Map<String, dynamic>.from(constraints);

        saved = await widget.apiClient.createTripDraft(
          accessToken: session.accessToken,
          title: _createReplayTitle,
          constraints: _createReplayConstraints,
          clientRequestKey: _createClientRequestKey,
        );
        if (!mounted || !_isAuthCurrent(generation) || _cleared) return;

        // Traveler may have edited after a timed-out first attempt — patch.
        final newerThanReplay = title != _createReplayTitle ||
            !_sameJsonMaps(constraints, _createReplayConstraints!);
        if (newerThanReplay) {
          saved = await widget.apiClient.updateTripDraft(
            accessToken: session.accessToken,
            id: saved.id,
            title: title,
            constraints: constraints,
          );
        }

        _createClientRequestKey = null;
        _createReplayTitle = null;
        _createReplayConstraints = null;
      } else {
        saved = await widget.apiClient.updateTripDraft(
          accessToken: session.accessToken,
          id: existingId,
          title: title,
          constraints: constraints,
        );
      }

      if (!mounted || !_isAuthCurrent(generation) || _cleared) return;
      setState(() {
        _draftId = saved.id;
        _saveMessage = 'Draft saved.';
      });
      widget.onDraftIdChanged?.call(saved.id);
      if (shouldRequestQuote) {
        await _requestQuote(saved.id, constraints, generation);
      }
    } catch (e) {
      if (!mounted || !_isAuthCurrent(generation) || _cleared) return;
      // Keep traveler edits; do not assign a draft id after a failed create.
      // Replay key + first payload stay set so a retry can recover safely.
      setState(() {
        _saveError = e.toString();
      });
    } finally {
      if (mounted && _isAuthCurrent(generation) && !_cleared) {
        setState(() {
          _saving = false;
          _requestingQuote = false;
        });
      }
    }
  }

  Future<void> _requestQuote(
    String draftId,
    Map<String, dynamic> constraints,
    int generation,
  ) async {
    final session = widget.auth.session;
    if (session == null || !_isAuthCurrent(generation)) return;
    try {
      final quote = await widget.apiClient.createTripDraftQuote(
        accessToken: session.accessToken,
        id: draftId,
        expectedConstraints: constraints,
      );
      if (!mounted || !_isAuthCurrent(generation) || _cleared) return;
      if (quote.draftId != draftId) {
        throw StateError('Quote does not match the saved draft');
      }
      if (!_sameJsonMaps(constraints, _snapshotConstraints())) {
        setState(() => _quoteError = 'Your trip changed. Request a new quote.');
        return;
      }
      final remaining =
          DateTime.parse(quote.expiresAt).difference(DateTime.now());
      if (remaining <= Duration.zero) {
        setState(() => _quoteError = 'The quote expired. Request a new quote.');
        return;
      }
      setState(() {
        _quote = quote;
        _quoteConstraints = jsonEncode(constraints);
      });
      _quoteExpiration = Timer(remaining, () {
        if (!mounted || _cleared) return;
        setState(() {
          _quote = null;
          _quoteError = 'The quote expired. Request a new quote.';
        });
      });
    } catch (_) {
      if (!mounted || !_isAuthCurrent(generation) || _cleared) return;
      setState(() => _quoteError =
          'Could not get a quote. Your draft is saved. Try again.');
    }
  }

  static bool _sameJsonMaps(
    Map<String, dynamic> a,
    Map<String, dynamic> b,
  ) =>
      jsonEncode(a) == jsonEncode(b);

  static String _newClientRequestKey() {
    final random = Random.secure();
    final suffix =
        List.generate(8, (_) => random.nextInt(16).toRadixString(16)).join();
    return 'ubud-preview-${DateTime.now().toUtc().microsecondsSinceEpoch}-$suffix';
  }

  @override
  Widget build(BuildContext context) {
    if (_cleared) {
      return const Scaffold(
        body: Center(
          child: Text(
            'Signed out',
            key: Key('trip-preview-cleared'),
            textAlign: TextAlign.center,
          ),
        ),
      );
    }

    if (_publishedSlugs == null || _availableHotels.isEmpty) {
      final message = _catalogFailed
          ? 'Could not load published places.'
          : _publishedSlugs == null
              ? 'Loading published places…'
              : 'No published lodging is available for this demo trip.';
      return Scaffold(
        appBar: AppBar(title: const Text('Trip preview')),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(message),
              if (_catalogFailed || _publishedSlugs != null)
                TextButton(onPressed: _loadCatalog, child: const Text('Retry')),
            ],
          ),
        ),
      );
    }

    final theme = Theme.of(context);
    final estimate = _estimate;
    final quote = _currentQuote;
    final travelers = _plan.answers.travelerCount!;
    final nights = _plan.answers.nights!;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Trip preview'),
      ),
      body: SingleChildScrollView(
        key: const Key('trip-preview'),
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 32),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              _plan.destinationName,
              key: const Key('trip-preview-destination'),
              style: theme.textTheme.headlineMedium,
            ),
            const SizedBox(height: 4),
            Text(
              '${_plan.days.length} day${_plan.days.length == 1 ? '' : 's'} · '
              '${lifestyleLabel(_plan.answers.lifestyle)} · '
              '$travelers traveler${travelers == 1 ? '' : 's'}',
              style: theme.textTheme.titleSmall,
            ),
            if (_plan.surpriseResolvedToUbud) ...[
              const SizedBox(height: 8),
              Text(
                'Surprise me resolved to Ubud for this demo preview.',
                key: const Key('trip-preview-surprise'),
                style: theme.textTheme.bodySmall,
              ),
            ],
            const SizedBox(height: 20),
            _EstimateCard(estimate: estimate),
            const SizedBox(height: 20),
            Text('Example flights', style: theme.textTheme.titleSmall),
            const SizedBox(height: 4),
            Text(
              'Demo rates in EGP per traveler. Not live fares.',
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 8),
            ...demoFlightOptions.map((option) {
              final selected = option.id == _flightId;
              final groupFare = option.rateEgpPerTraveler * travelers;
              return RadioListTile<String>(
                key: Key('trip-flight-${option.id}'),
                dense: true,
                contentPadding: EdgeInsets.zero,
                title: Text(option.label),
                subtitle: Text(
                  '${formatDemoEgp(option.rateEgpPerTraveler)} per traveler\n'
                  '${formatDemoEgp(groupFare)} for the group'
                  '${_priceChange(groupFare - estimate.flightTotalEgp, selected: selected)}',
                ),
                value: option.id,
                groupValue: _flightId,
                onChanged: (value) {
                  if (value != null) _selectFlight(value);
                },
                selected: selected,
              );
            }),
            const SizedBox(height: 16),
            Text('Lodging', style: theme.textTheme.titleSmall),
            const SizedBox(height: 4),
            Text(
              'Demo lodging rates cover the group for the full stay.',
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 8),
            for (final tier in DemoHotelTier.values)
              if (_availableHotels.any((option) => option.tier == tier)) ...[
                Text(tier == DemoHotelTier.base ? 'Base tier' : 'Upgrade tier',
                    style: theme.textTheme.labelLarge),
                for (final option
                    in _availableHotels.where((option) => option.tier == tier))
                  _HotelTile(
                    option: option,
                    selectedSlug: _hotelSlug,
                    suggestedSlug: _plan.staySuggestion.slug,
                    nights: nights,
                    selectedStayTotal: estimate.lodgingTotalEgp,
                    onSelect: _selectHotel,
                  ),
              ],
            const SizedBox(height: 20),
            Text(
              'Requested preferences',
              style: theme.textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            ..._plan.requestedPreferences.map(
              (line) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text('• $line', style: theme.textTheme.bodyMedium),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Place details below come from the Ubud catalog. '
              'Demo prices are separate from catalog facts and are not '
              'confirmed rates or amenity inventory.',
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 20),
            ..._plan.days.map(
              (day) => _DayCard(
                day: day,
                activityPicker: _activityPicker(day, travelers),
                includedActivitySlugs: _includedActivitySlugs,
                travelers: travelers,
                onRemove: _removeActivity,
                onRestore: _restoreActivity,
                onRemoveScheduled: _saving
                    ? null
                    : (slug) => _removeScheduledActivity(day, slug),
                onReorder:
                    _saving ? null : (from, to) => _reorderStops(day, from, to),
                moveTargets: [
                  for (final target in _plan.days)
                    if (target.dayNumber != day.dayNumber) target,
                ],
                onMove: (stop, targetDay) {
                  if (_saving || _cleared) return;
                  setState(() {
                    _plan = movePreviewStop(
                      _plan,
                      stop: stop,
                      fromDay: day.dayNumber,
                      toDay: targetDay,
                    );
                    _saveMessage = null;
                  });
                },
              ),
            ),
            _TripReview(
              plan: _plan,
              flight: _flight,
              stay: demoPlaceBySlug(_hotelSlug)!,
              includedActivitySlugs: _includedActivitySlugs,
              estimate: estimate,
              quote: quote,
              quoteError: _quoteError,
              supportsDemoQuote: _supportsDemoQuote,
              requestingQuote: _requestingQuote,
              onRequestQuote: !_supportsDemoQuote || _saving
                  ? null
                  : () => _saveDraft(requestQuote: true),
              onCheckout: !_supportsDemoQuote || _saving || quote == null
                  ? null
                  : _openDemoCheckout,
            ),
            if (_saveError != null) ...[
              const SizedBox(height: 8),
              Text(
                _saveError!,
                key: const Key('trip-preview-save-error'),
                style: TextStyle(color: theme.colorScheme.error),
              ),
            ],
            if (_saveMessage != null) ...[
              const SizedBox(height: 8),
              Text(
                _saveMessage!,
                key: const Key('trip-preview-save-success'),
              ),
            ],
            const SizedBox(height: 8),
            FilledButton(
              key: const Key('trip-preview-save'),
              onPressed: _saving ? null : () => _saveDraft(),
              child: Text(_saving ? 'Saving…' : 'Save draft'),
            ),
            if (_draftId != null) ...[
              const SizedBox(height: 8),
              if (_requestStatus != null)
                Text(
                  'Trip request status: ${_requestStatusLabel(_requestStatus!)}',
                  key: const Key('trip-preview-request-status'),
                )
              else
                FilledButton.tonal(
                  key: const Key('trip-preview-request'),
                  onPressed: (_saving || _submittingRequest)
                      ? null
                      : _submitTripRequest,
                  child: Text(
                    _submittingRequest ? 'Requesting…' : 'Request this trip',
                  ),
                ),
              if (_requestError != null) ...[
                const SizedBox(height: 8),
                Text(
                  _requestError!,
                  key: const Key('trip-preview-request-error'),
                  style: TextStyle(color: theme.colorScheme.error),
                ),
              ],
            ],
            const SizedBox(height: 8),
            OutlinedButton(
              key: const Key('trip-preview-edit'),
              onPressed: _saving ? null : _editAnswers,
              child: const Text('Edit answers'),
            ),
          ],
        ),
      ),
    );
  }
}

String _requestStatusLabel(String status) {
  switch (status) {
    case 'submitted':
      return 'Submitted';
    case 'under_review':
      return 'Under review';
    case 'declined':
      return 'Declined';
    default:
      return status;
  }
}

String _tripLabel(TripPreviewPlan plan) {
  final travelers = plan.answers.travelerCount!;
  final nights = plan.answers.nights!;
  return '${plan.destinationName} · $travelers ${travelers == 1 ? 'traveler' : 'travelers'}'
      ' · $nights ${nights == 1 ? 'night' : 'nights'}';
}

class _TripReview extends StatelessWidget {
  const _TripReview({
    required this.plan,
    required this.flight,
    required this.stay,
    required this.includedActivitySlugs,
    required this.estimate,
    required this.onCheckout,
    required this.quote,
    required this.quoteError,
    required this.supportsDemoQuote,
    required this.requestingQuote,
    required this.onRequestQuote,
  });

  final TripPreviewPlan plan;
  final DemoFlightOption flight;
  final UbudDemoPlace stay;
  final Set<String> includedActivitySlugs;
  final TripDemoEstimate estimate;
  final VoidCallback? onCheckout;
  final TripDraftQuote? quote;
  final String? quoteError;
  final bool supportsDemoQuote;
  final bool requestingQuote;
  final VoidCallback? onRequestQuote;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final currentQuote = quote;
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ExpansionTile(
        key: const Key('trip-review'),
        title: const Text('Review your trip'),
        subtitle: Text(_tripLabel(plan)),
        expandedAlignment: Alignment.centerLeft,
        expandedCrossAxisAlignment: CrossAxisAlignment.start,
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        children: [
          Text('Demo group estimate', style: textTheme.labelLarge),
          Text(
            formatDemoEgp(estimate.totalEgp),
            key: const Key('trip-review-total'),
            style: textTheme.headlineSmall,
          ),
          const SizedBox(height: 12),
          Text('Flight', style: textTheme.titleSmall),
          Text('${flight.label} · ${formatDemoEgp(estimate.flightTotalEgp)}'),
          const SizedBox(height: 8),
          Text('Stay', style: textTheme.titleSmall),
          Text('${stay.nameEn} · ${formatDemoEgp(estimate.lodgingTotalEgp)}'),
          const SizedBox(height: 12),
          Text('Activity estimate', style: textTheme.titleSmall),
          Text(formatDemoEgp(estimate.activitiesTotalEgp)),
          for (final day in plan.days) ...[
            const SizedBox(height: 12),
            Text(day.title, style: textTheme.titleSmall),
            if (day.stops.isEmpty) const Text('Open time'),
            for (final stop in day.stops)
              Text(
                '${stop.place.nameEn}'
                '${isPricedDemoActivity(stop.place) && !includedActivitySlugs.contains(stop.place.slug) ? ' (excluded from estimate)' : ''}',
              ),
          ],
          const SizedBox(height: 16),
          if (!supportsDemoQuote) ...[
            Text(
              'Demo quote and checkout are available for Ubud only right now.',
              key: const Key('trip-review-quote-unavailable'),
              style: textTheme.bodyMedium,
            ),
          ] else ...[
            if (currentQuote != null) ...[
              Text('Saved demo quote', style: textTheme.labelLarge),
              Text(
                formatDemoEgp(currentQuote.totalEgp),
                key: const Key('trip-review-server-quote-total'),
                style: textTheme.headlineSmall,
              ),
              Text(_quoteExpiryLabel(context, currentQuote.expiresAt)),
            ],
            if (quoteError != null)
              Text(quoteError!, key: const Key('trip-review-quote-error')),
            OutlinedButton(
              key: const Key('trip-review-request-quote'),
              onPressed: onRequestQuote,
              child: Text(requestingQuote
                  ? 'Getting quote…'
                  : 'Save and get demo quote'),
            ),
            if (currentQuote == null)
              const Text('Get a current quote to try demo checkout.'),
            FilledButton(
              key: const Key('trip-demo-checkout'),
              onPressed: onCheckout,
              child: const Text('Try demo checkout'),
            ),
          ],
        ],
      ),
    );
  }

  String _quoteExpiryLabel(BuildContext context, String expiresAt) {
    final local = DateTime.parse(expiresAt).toLocal();
    final formats = MaterialLocalizations.of(context);
    final date = formats.formatCompactDate(local);
    final time = formats.formatTimeOfDay(TimeOfDay.fromDateTime(local));
    return 'Expires $date at $time';
  }
}

class _EstimateCard extends StatelessWidget {
  const _EstimateCard({required this.estimate});

  final TripDemoEstimate estimate;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final vs = estimate.amountOverBudgetEgp;
    final vsLabel = estimate.isOnBudget
        ? 'Matches the questionnaire budget.'
        : estimate.isOverBudget
            ? '${formatDemoEgp(vs)} over the questionnaire budget.'
            : '${formatDemoEgp(-vs)} under the questionnaire budget.';

    return Card(
      key: const Key('trip-preview-estimate'),
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Demo price estimate', style: theme.textTheme.titleMedium),
            const SizedBox(height: 4),
            Text(
              formatDemoEgp(estimate.totalEgp),
              key: const Key('trip-preview-estimate-total'),
              style: theme.textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              vsLabel,
              key: const Key('trip-preview-estimate-vs-budget'),
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 12),
            Text('Breakdown', style: theme.textTheme.titleSmall),
            const SizedBox(height: 6),
            Text(
              'Flights: ${formatDemoEgp(estimate.flightTotalEgp)}',
              key: const Key('trip-preview-estimate-flights'),
            ),
            Text(
              'Lodging: ${formatDemoEgp(estimate.lodgingTotalEgp)}',
              key: const Key('trip-preview-estimate-lodging'),
            ),
            Text(
              'Activities: ${formatDemoEgp(estimate.activitiesTotalEgp)}',
              key: const Key('trip-preview-estimate-activities'),
            ),
            const SizedBox(height: 8),
            Text(
              'Excluded from this demo estimate: taxes and fees, ground '
              'transfers, meals and drinks not listed as priced activities, '
              'travel insurance, tips, and any live booking or inventory costs.',
              style: theme.textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

String _priceChange(int delta, {required bool selected}) {
  if (selected) return '';
  if (delta == 0) return ' · No change to trip total';
  final sign = delta < 0 ? '−' : '+';
  return ' · $sign${formatDemoEgp(delta.abs())} to trip total';
}

class _HotelTile extends StatelessWidget {
  const _HotelTile({
    required this.option,
    required this.selectedSlug,
    required this.suggestedSlug,
    required this.nights,
    required this.selectedStayTotal,
    required this.onSelect,
  });

  final DemoHotelOption option;
  final String selectedSlug;
  final String suggestedSlug;
  final int nights;
  final int selectedStayTotal;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    final place = demoPlaceBySlug(option.slug)!;
    final selected = option.slug == selectedSlug;
    final suggested = option.slug == suggestedSlug;
    final stayTotal = demoHotelRateEgpPerNight(option.tier) * nights;
    return RadioListTile<String>(
      key: Key('trip-hotel-${option.slug}'),
      dense: true,
      contentPadding: EdgeInsets.zero,
      title: Text(
        suggested ? '${place.nameEn} (suggested)' : place.nameEn,
      ),
      subtitle: Text(
        '${place.shortDescriptionEn}\n'
        '${formatDemoEgp(stayTotal)} for the stay'
        '${_priceChange(stayTotal - selectedStayTotal, selected: selected)}',
      ),
      value: option.slug,
      groupValue: selectedSlug,
      onChanged: (value) {
        if (value != null) onSelect(value);
      },
      selected: selected,
    );
  }
}

class _DayCard extends StatelessWidget {
  const _DayCard({
    required this.day,
    required this.activityPicker,
    required this.includedActivitySlugs,
    required this.travelers,
    required this.onRemove,
    required this.onRestore,
    required this.onRemoveScheduled,
    required this.onReorder,
    required this.moveTargets,
    required this.onMove,
  });

  final TripPreviewDay day;
  final Widget activityPicker;
  final Set<String> includedActivitySlugs;
  final int travelers;
  final ValueChanged<String> onRemove;
  final ValueChanged<String> onRestore;
  final ValueChanged<String>? onRemoveScheduled;
  final void Function(int, int)? onReorder;
  final List<TripPreviewDay> moveTargets;
  final void Function(TripPreviewStop, int) onMove;

  @override
  Widget build(BuildContext context) {
    return Card(
      key: Key('trip-preview-day-${day.dayNumber}'),
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              day.title,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            if (day.stops.isEmpty)
              Text(
                'Open time — explore at your pace.',
                key: Key('trip-preview-day-${day.dayNumber}-open'),
                style: Theme.of(context).textTheme.bodyMedium,
              )
            else
              ...day.stops.asMap().entries.map((entry) {
                final index = entry.key;
                final stop = entry.value;
                return _StopBlock(
                  key: Key('trip-stop-${stop.place.slug}'),
                  stop: stop,
                  included: includedActivitySlugs.contains(stop.place.slug),
                  travelers: travelers,
                  onRemove: onRemove,
                  onRestore: onRestore,
                  onRemoveScheduled: onRemoveScheduled,
                  showReorder: day.stops.length > 1,
                  onMoveUp: index > 0 && onReorder != null
                      ? () => onReorder!(index, index - 1)
                      : null,
                  onMoveDown: index < day.stops.length - 1 && onReorder != null
                      ? () => onReorder!(index, index + 1)
                      : null,
                  moveTargets: moveTargets,
                  onMove: (targetDay) => onMove(stop, targetDay),
                );
              }),
            activityPicker,
          ],
        ),
      ),
    );
  }
}

class _StopBlock extends StatelessWidget {
  const _StopBlock({
    super.key,
    required this.stop,
    required this.included,
    required this.travelers,
    required this.onRemove,
    required this.onRestore,
    required this.onRemoveScheduled,
    required this.showReorder,
    required this.onMoveUp,
    required this.onMoveDown,
    required this.moveTargets,
    required this.onMove,
  });

  final TripPreviewStop stop;
  final bool included;
  final int travelers;
  final ValueChanged<String> onRemove;
  final ValueChanged<String> onRestore;
  final ValueChanged<String>? onRemoveScheduled;
  final bool showReorder;
  final VoidCallback? onMoveUp;
  final VoidCallback? onMoveDown;
  final List<TripPreviewDay> moveTargets;
  final ValueChanged<int> onMove;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final place = stop.place;
    final priced = isPricedDemoActivity(place);
    final rate = demoActivityRateForSlug(place.slug);
    final removed = priced && !included;

    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  stop.roleLabel == TripPreviewStop.unscheduledRole
                      ? place.nameEn
                      : '${stop.roleLabel} · ${place.nameEn}',
                  style: theme.textTheme.titleSmall?.copyWith(
                    decoration: removed ? TextDecoration.lineThrough : null,
                  ),
                ),
              ),
              if (showReorder) ...[
                IconButton(
                  key: Key('trip-stop-up-${place.slug}'),
                  tooltip: 'Move ${place.nameEn} earlier in the day',
                  onPressed: onMoveUp,
                  icon: const Icon(Icons.arrow_upward),
                ),
                IconButton(
                  key: Key('trip-stop-down-${place.slug}'),
                  tooltip: 'Move ${place.nameEn} later in the day',
                  onPressed: onMoveDown,
                  icon: const Icon(Icons.arrow_downward),
                ),
              ],
            ],
          ),
          const SizedBox(height: 2),
          Text(
            place.shortDescriptionEn,
            style: theme.textTheme.bodyMedium,
          ),
          Text(place.category, style: theme.textTheme.bodySmall),
          if (moveTargets.isNotEmpty)
            PopupMenuButton<int>(
              key: Key('trip-stop-move-${place.slug}'),
              tooltip: 'Move ${place.nameEn} to another day',
              onSelected: onMove,
              itemBuilder: (_) => [
                for (final day in moveTargets)
                  PopupMenuItem(
                    key: Key('trip-stop-move-to-${day.dayNumber}'),
                    value: day.dayNumber,
                    child: Text(day.title),
                  ),
              ],
              child: const Padding(
                padding: EdgeInsets.symmetric(vertical: 12, horizontal: 8),
                child: Text('Move to day'),
              ),
            ),
          if (priced && rate != null) ...[
            const SizedBox(height: 4),
            Text(
              'Demo ${formatDemoEgp(rate)} per traveler'
              '${included ? ' · ${formatDemoEgp(rate * travelers)} for group' : ''}',
              key: Key('trip-activity-price-${place.slug}'),
              style: theme.textTheme.bodySmall,
            ),
            if (place.activityDescriptionEn case final description?)
              ExpansionTile(
                key: Key('trip-activity-details-${place.slug}'),
                tilePadding: EdgeInsets.zero,
                expandedAlignment: Alignment.centerLeft,
                expandedCrossAxisAlignment: CrossAxisAlignment.start,
                title:
                    Text('Activity details', style: theme.textTheme.labelLarge),
                children: [
                  if (place.area case final area?)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text(area, style: theme.textTheme.titleSmall),
                    ),
                  Text(description),
                  const SizedBox(height: 6),
                  Text(
                    'Confirm the duration, meeting point, and what to bring with the activity provider.',
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
            const SizedBox(height: 4),
            if (included)
              TextButton(
                key: Key('trip-activity-remove-${place.slug}'),
                onPressed: () => onRemove(place.slug),
                child: const Text('Remove from estimate'),
              )
            else
              TextButton(
                key: Key('trip-activity-add-${place.slug}'),
                onPressed: () => onRestore(place.slug),
                child: const Text('Add back to estimate'),
              ),
            TextButton(
              key: Key('trip-activity-remove-scheduled-${place.slug}'),
              onPressed: onRemoveScheduled == null
                  ? null
                  : () => onRemoveScheduled!(place.slug),
              child: const Text('Remove from itinerary'),
            ),
          ],
        ],
      ),
    );
  }
}
