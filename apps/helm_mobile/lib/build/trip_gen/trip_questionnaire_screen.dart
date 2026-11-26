import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:helm_api_client/helm_api_client.dart';

import '../../auth/traveler_session.dart';
import 'trip_answers.dart';
import 'trip_flow_routes.dart';
import 'trip_planner.dart';
import 'trip_preview_screen.dart';

/// Collects Build trip answers and opens a local Trip preview.
class TripQuestionnaireScreen extends StatefulWidget {
  const TripQuestionnaireScreen({
    super.key,
    required this.auth,
    required this.apiClient,
    required this.initialAnswers,
    required this.onAnswersChanged,
    this.returnAnswersOnSubmit = false,
    this.draftId,
    this.onDraftIdChanged,
    this.allowDemoStaffConfirmation = false,
  });

  final TravelerAuth auth;
  final HelmApiClient apiClient;
  final TripAnswers initialAnswers;
  final ValueChanged<TripAnswers> onAnswersChanged;

  /// When true, a valid submit pops [TripAnswers] instead of opening preview.
  final bool returnAnswersOnSubmit;

  /// Optional draft id when continuing an already-saved preview.
  final String? draftId;
  final ValueChanged<String>? onDraftIdChanged;
  final bool allowDemoStaffConfirmation;

  @override
  State<TripQuestionnaireScreen> createState() =>
      _TripQuestionnaireScreenState();
}

class _TripQuestionnaireScreenState extends State<TripQuestionnaireScreen> {
  late final TextEditingController _budgetController;
  late final TextEditingController _travelersController;
  late final TextEditingController _nightsController;

  late TripDestinationChoice _destination;
  late TripLifestyle _lifestyle;
  late Set<String> _amenities;
  TripAnswersValidation? _validation;
  late int _boundGeneration;
  late String? _boundUserId;
  late String? _draftId;

  /// Exact preview [Route] from [_preview]; cleared when that route completes.
  Route<void>? _activePreviewRoute;

  @override
  void initState() {
    super.initState();
    final initial = widget.initialAnswers;
    _budgetController = TextEditingController(
      text: initial.budgetEgp?.toString() ?? '',
    );
    _travelersController = TextEditingController(
      text: initial.travelerCount?.toString() ?? '',
    );
    _nightsController = TextEditingController(
      text: initial.nights?.toString() ?? '',
    );
    _destination = initial.destination;
    _lifestyle = initial.lifestyle;
    _amenities = {...initial.amenities};
    _boundGeneration = widget.auth.authGeneration;
    _boundUserId = widget.auth.session?.userId;
    _draftId = widget.draftId;
    widget.auth.sessionListenable.addListener(_onAuthChanged);
  }

  @override
  void dispose() {
    widget.auth.sessionListenable.removeListener(_onAuthChanged);
    _budgetController.dispose();
    _travelersController.dispose();
    _nightsController.dispose();
    super.dispose();
  }

  void _onAuthChanged() {
    final session = widget.auth.session;
    final generationChanged = widget.auth.authGeneration != _boundGeneration;
    final identityChanged = session?.userId != _boundUserId;
    // Token refresh keeps the same generation + identity — stay put.
    if (!identityChanged && !generationChanged) return;
    if (!mounted) return;
    // Remove only this flow's routes by identity so unrelated routes
    // (dialogs / pages above or below) stay on the shared navigator.
    final navigator = Navigator.of(context);
    final preview = _activePreviewRoute;
    if (preview != null && preview.isActive) {
      navigator.removeRoute(preview);
    }
    _activePreviewRoute = null;
    final self = ModalRoute.of(context);
    if (self != null && self.isActive) {
      navigator.removeRoute(self);
    }
  }

  TripAnswers _collectAnswers() {
    return TripAnswers(
      budgetEgp: int.tryParse(_budgetController.text.trim()),
      destination: _destination,
      travelerCount: int.tryParse(_travelersController.text.trim()),
      lifestyle: _lifestyle,
      nights: int.tryParse(_nightsController.text.trim()),
      amenities: {..._amenities},
    );
  }

  void _persistAnswers(TripAnswers answers) {
    widget.onAnswersChanged(answers);
  }

  void _updateFromPreview(TripAnswers answers) {
    if (!mounted) return;
    _budgetController.text = answers.budgetEgp!.toString();
    _travelersController.text = answers.travelerCount!.toString();
    _nightsController.text = answers.nights!.toString();
    setState(() {
      _destination = answers.destination;
      _lifestyle = answers.lifestyle;
      _amenities = {...answers.amenities};
    });
    _persistAnswers(answers);
  }

  Future<void> _preview() async {
    final answers = _collectAnswers();
    _persistAnswers(answers);
    final validation = validateTripAnswers(answers);
    setState(() => _validation = validation);
    if (!validation.isValid) return;

    if (widget.returnAnswersOnSubmit) {
      Navigator.of(context).pop<TripAnswers>(answers);
      return;
    }

    final plan = planDemoTrip(answers);
    if (!mounted) return;
    final route = MaterialPageRoute<void>(
      settings: const RouteSettings(name: tripPreviewRouteName),
      builder: (_) => TripPreviewScreen(
        plan: plan,
        auth: widget.auth,
        apiClient: widget.apiClient,
        draftId: _draftId,
        onAnswersChanged: _updateFromPreview,
        allowDemoStaffConfirmation: widget.allowDemoStaffConfirmation,
        onDraftIdChanged: (id) {
          _draftId = id;
          widget.onDraftIdChanged?.call(id);
        },
      ),
    );
    _activePreviewRoute = route;
    try {
      await Navigator.of(context).push<void>(route);
    } finally {
      if (identical(_activePreviewRoute, route)) {
        _activePreviewRoute = null;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final validation = _validation;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Build my trip'),
      ),
      body: SingleChildScrollView(
        key: const Key('trip-questionnaire'),
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              widget.returnAnswersOnSubmit
                  ? 'Changing the destination, travel style, or number of nights rebuilds the itinerary.'
                  : 'Answer a few questions for a local Trip preview. '
                      'No paid AI is used in this demo.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 20),
            TextField(
              key: const Key('trip-budget'),
              controller: _budgetController,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: InputDecoration(
                labelText: 'Total trip budget (EGP)',
                border: const OutlineInputBorder(),
                errorText: validation?.budgetError,
              ),
              onChanged: (_) => _persistAnswers(_collectAnswers()),
            ),
            const SizedBox(height: 16),
            Text(
              'Destination',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            RadioListTile<TripDestinationChoice>(
              key: const Key('trip-destination-ubud'),
              title: const Text('Ubud'),
              value: TripDestinationChoice.ubud,
              groupValue: _destination,
              onChanged: (value) {
                if (value == null) return;
                setState(() => _destination = value);
                _persistAnswers(_collectAnswers());
              },
            ),
            RadioListTile<TripDestinationChoice>(
              key: const Key('trip-destination-surprise'),
              title: const Text('Surprise me'),
              value: TripDestinationChoice.surprise,
              groupValue: _destination,
              onChanged: (value) {
                if (value == null) return;
                setState(() => _destination = value);
                _persistAnswers(_collectAnswers());
              },
            ),
            if (_destination == TripDestinationChoice.surprise)
              Padding(
                padding: const EdgeInsets.only(left: 16, bottom: 8),
                child: Text(
                  'Surprise me currently previews Ubud — other destinations '
                  'are not in this demo yet.',
                  key: const Key('trip-surprise-note'),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            TextField(
              key: const Key('trip-travelers'),
              controller: _travelersController,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: InputDecoration(
                labelText: 'Travelers',
                border: const OutlineInputBorder(),
                errorText: validation?.travelersError,
              ),
              onChanged: (_) => _persistAnswers(_collectAnswers()),
            ),
            const SizedBox(height: 16),
            Text(
              'Lifestyle',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: TripLifestyle.values.map((value) {
                return ChoiceChip(
                  key: Key('trip-lifestyle-${value.name}'),
                  label: Text(lifestyleLabel(value)),
                  selected: _lifestyle == value,
                  onSelected: (_) {
                    setState(() => _lifestyle = value);
                    _persistAnswers(_collectAnswers());
                  },
                );
              }).toList(),
            ),
            const SizedBox(height: 16),
            TextField(
              key: const Key('trip-nights'),
              controller: _nightsController,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly],
              decoration: InputDecoration(
                labelText: 'Nights',
                border: const OutlineInputBorder(),
                errorText: validation?.nightsError,
              ),
              onChanged: (_) => _persistAnswers(_collectAnswers()),
            ),
            const SizedBox(height: 16),
            Text(
              'Accommodation amenities (optional)',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 4),
            Text(
              'Requested only — catalog amenities are not verified yet.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: tripAmenityOptions.map((amenity) {
                final selected = _amenities.contains(amenity);
                return FilterChip(
                  key: Key('trip-amenity-$amenity'),
                  label: Text(amenity),
                  selected: selected,
                  onSelected: (on) {
                    setState(() {
                      if (on) {
                        _amenities.add(amenity);
                      } else {
                        _amenities.remove(amenity);
                      }
                    });
                    _persistAnswers(_collectAnswers());
                  },
                );
              }).toList(),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
          child: FilledButton(
            key: const Key('trip-preview-submit'),
            onPressed: _preview,
            child: Text(widget.returnAnswersOnSubmit
                ? 'Update preview'
                : 'See trip preview'),
          ),
        ),
      ),
    );
  }
}
