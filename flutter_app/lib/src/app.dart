import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'auth_utils.dart';
import 'browser_context.dart';
import 'models.dart';
import 'repository.dart';
import 'session_activity_store.dart' as session_activity_store;
import 'svg_picker.dart';
import 'svg_picker_types.dart';

const _pageBackground = Color(0xFFF3EFE6);
const _surfaceColor = Colors.white;
const _surfaceAlt = Color(0xFFFBF8F1);
const _primaryColor = Color(0xFF12343B);
const _accentColor = Color(0xFFDE6B48);
const _accentSoftColor = Color(0xFFF0C36C);
const _mutedColor = Color(0xFF667681);
const _dangerColor = Color(0xFFAF3C30);
const _borderColor = Color(0xFFE2DACE);
const _shadowColor = Color(0x1E1C2D28);
const _heroGlowColor = Color(0xFF8FC1A9);
const _sessionInactivityTimeout = Duration(minutes: 2);

enum AuthView { login, register }

TextTheme _buildAppTextTheme(TextTheme base) {
  final bodyTheme = GoogleFonts.plusJakartaSansTextTheme(base).apply(
    bodyColor: _primaryColor,
    displayColor: _primaryColor,
  );

  return bodyTheme.copyWith(
    displayLarge: GoogleFonts.spaceGrotesk(
      fontSize: 56,
      fontWeight: FontWeight.w700,
      height: 0.95,
      color: _primaryColor,
    ),
    displayMedium: GoogleFonts.spaceGrotesk(
      fontSize: 44,
      fontWeight: FontWeight.w700,
      height: 0.98,
      color: _primaryColor,
    ),
    headlineLarge: GoogleFonts.spaceGrotesk(
      fontSize: 34,
      fontWeight: FontWeight.w700,
      height: 1,
      color: _primaryColor,
    ),
    headlineMedium: GoogleFonts.spaceGrotesk(
      fontSize: 28,
      fontWeight: FontWeight.w700,
      height: 1.02,
      color: _primaryColor,
    ),
    headlineSmall: GoogleFonts.spaceGrotesk(
      fontSize: 24,
      fontWeight: FontWeight.w700,
      height: 1.08,
      color: _primaryColor,
    ),
    titleLarge: GoogleFonts.spaceGrotesk(
      fontSize: 20,
      fontWeight: FontWeight.w700,
      color: _primaryColor,
    ),
    titleMedium: GoogleFonts.spaceGrotesk(
      fontSize: 17,
      fontWeight: FontWeight.w700,
      color: _primaryColor,
    ),
    titleSmall: GoogleFonts.plusJakartaSans(
      fontSize: 14,
      fontWeight: FontWeight.w700,
      color: _primaryColor,
    ),
    bodyLarge: GoogleFonts.plusJakartaSans(
      fontSize: 15.5,
      fontWeight: FontWeight.w500,
      height: 1.55,
      color: _primaryColor,
    ),
    bodyMedium: GoogleFonts.plusJakartaSans(
      fontSize: 14,
      fontWeight: FontWeight.w500,
      height: 1.5,
      color: _primaryColor,
    ),
    bodySmall: GoogleFonts.plusJakartaSans(
      fontSize: 12,
      fontWeight: FontWeight.w600,
      height: 1.4,
      color: _mutedColor,
    ),
    labelLarge: GoogleFonts.plusJakartaSans(
      fontSize: 13,
      fontWeight: FontWeight.w700,
      letterSpacing: 0.2,
      color: _primaryColor,
    ),
    labelMedium: GoogleFonts.plusJakartaSans(
      fontSize: 11.5,
      fontWeight: FontWeight.w700,
      letterSpacing: 0.4,
      color: _mutedColor,
    ),
  );
}

class VoleybolFlutterApp extends StatelessWidget {
  const VoleybolFlutterApp({
    required this.initializationError,
    super.key,
  });

  final String? initializationError;

  @override
  Widget build(BuildContext context) {
    final baseTextTheme = _buildAppTextTheme(ThemeData.light().textTheme);

    return MaterialApp(
      title: 'Takim Ismi Oylamasi',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: _pageBackground,
        textTheme: baseTextTheme,
        primaryTextTheme: baseTextTheme,
        colorScheme: ColorScheme.fromSeed(
          seedColor: _primaryColor,
          primary: _primaryColor,
          secondary: _accentColor,
          surface: _surfaceColor,
          error: _dangerColor,
        ),
        snackBarTheme: SnackBarThemeData(
          behavior: SnackBarBehavior.floating,
          backgroundColor: _primaryColor,
          contentTextStyle: baseTextTheme.bodyMedium?.copyWith(
            color: Colors.white,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
        ),
        filledButtonTheme: FilledButtonThemeData(
          style: FilledButton.styleFrom(
            elevation: 0,
            backgroundColor: _primaryColor,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
            textStyle: baseTextTheme.labelLarge,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
            ),
          ),
        ),
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: _primaryColor,
            side: const BorderSide(color: _borderColor),
            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
            textStyle: baseTextTheme.labelLarge,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
            ),
          ),
        ),
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: _primaryColor,
            textStyle: baseTextTheme.labelLarge,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
          ),
        ),
        chipTheme: ChipThemeData(
          backgroundColor: _surfaceAlt,
          selectedColor: _primaryColor,
          secondarySelectedColor: _primaryColor,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
            side: const BorderSide(color: _borderColor),
          ),
          labelStyle: baseTextTheme.labelLarge!,
          secondaryLabelStyle: baseTextTheme.labelLarge!.copyWith(
            color: Colors.white,
          ),
          side: const BorderSide(color: _borderColor),
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white.withValues(alpha: 0.78),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 16,
          ),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: const BorderSide(color: _borderColor),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: const BorderSide(color: _borderColor),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(18),
            borderSide: const BorderSide(color: _primaryColor, width: 1.4),
          ),
          labelStyle: baseTextTheme.bodyMedium?.copyWith(
            color: _mutedColor,
            fontWeight: FontWeight.w700,
          ),
          hintStyle: baseTextTheme.bodyMedium?.copyWith(
            color: _mutedColor.withValues(alpha: 0.78),
          ),
        ),
      ),
      home: initializationError == null
          ? const HomePage()
          : BootstrapErrorScreen(message: initializationError!),
    );
  }
}

class BootstrapErrorScreen extends StatelessWidget {
  const BootstrapErrorScreen({
    required this.message,
    super.key,
  });

  final String message;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: _surfaceColor,
                borderRadius: BorderRadius.circular(28),
                border: Border.all(color: _borderColor),
              ),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Flutter uygulamasi baslatilamadi',
                      style:
                          Theme.of(context).textTheme.headlineSmall?.copyWith(
                                fontWeight: FontWeight.w800,
                                color: _primaryColor,
                              ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      message,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: _mutedColor,
                          ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> with WidgetsBindingObserver {
  late final AppRepository _repository;
  StreamSubscription<AuthState>? _authSubscription;
  Timer? _pendingRefreshTimer;
  Timer? _sessionTimeoutTimer;

  final _loginUsernameController = TextEditingController();
  final _loginPasswordController = TextEditingController();
  final _registerUsernameController = TextEditingController();
  final _registerPasswordController = TextEditingController();
  final _suggestionTitleController = TextEditingController();
  final _suggestionNoteController = TextEditingController();
  final _editingSuggestionNoteController = TextEditingController();
  final Map<String, TextEditingController> _commentControllers = {};

  AppData _appData = const AppData.empty();
  String? _sessionMemberId;
  String? _selectedSuggestionId;
  String? _editingSuggestionId;
  String? _openSuggestionModalId;
  String? _openSuggestionAssetPreviewId;
  String? _openMemberVisitsMemberId;
  List<Member> _pendingMembers = const [];
  List<MemberActivityLogEntry> _memberActivityLogs = const [];
  AuthView _authView = AuthView.login;
  String _loginError = '';
  String _suggestionError = '';
  String _adminError = '';
  String _activityLogError = '';
  bool _isBooting = true;
  bool _isSubmitting = false;
  bool _isLoadingMemberActivity = false;
  bool _isTimingOutSession = false;
  String? _pageAccessLoggedMemberId;
  DateTime? _lastInteractionAt;
  String? _lastInteractionMemberId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _repository = AppRepository(Supabase.instance.client);
    _registerInteractionController(_loginUsernameController);
    _registerInteractionController(_loginPasswordController);
    _registerInteractionController(_registerUsernameController);
    _registerInteractionController(_registerPasswordController);
    _registerInteractionController(_suggestionTitleController);
    _registerInteractionController(_suggestionNoteController);
    _registerInteractionController(_editingSuggestionNoteController);
    _authSubscription = _repository.authStateChanges.listen((_) {
      unawaited(_hydrateRemoteState(showLoading: false));
    });
    unawaited(_hydrateRemoteState());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _authSubscription?.cancel();
    _pendingRefreshTimer?.cancel();
    _sessionTimeoutTimer?.cancel();
    _loginUsernameController.dispose();
    _loginPasswordController.dispose();
    _registerUsernameController.dispose();
    _registerPasswordController.dispose();
    _suggestionTitleController.dispose();
    _suggestionNoteController.dispose();
    _editingSuggestionNoteController.dispose();
    for (final controller in _commentControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Map<String, Member> get _membersById {
    return {
      for (final member in _appData.members) member.id: member,
    };
  }

  Member? get _currentMember {
    final id = _sessionMemberId;
    if (id == null) {
      return null;
    }

    return _membersById[id];
  }

  bool get _isAdmin => _currentMember?.isAdmin ?? false;

  bool get _canParticipate {
    final currentMember = _currentMember;
    return currentMember != null &&
        (currentMember.approved || currentMember.isAdmin);
  }

  bool get _isPendingApproval {
    final currentMember = _currentMember;
    return currentMember != null &&
        !currentMember.approved &&
        currentMember.role == MemberRole.member;
  }

  bool get _pendingOnlyMode => _isPendingApproval;

  List<Suggestion> get _orderedSuggestions {
    final suggestions = [..._appData.suggestions];

    suggestions.sort((left, right) {
      final leftSummary = getSuggestionSummary(_appData.votes, left.id);
      final rightSummary = getSuggestionSummary(_appData.votes, right.id);

      if (rightSummary.totalScore != leftSummary.totalScore) {
        return rightSummary.totalScore.compareTo(leftSummary.totalScore);
      }

      if (rightSummary.averageScore != leftSummary.averageScore) {
        return rightSummary.averageScore.compareTo(leftSummary.averageScore);
      }

      return right.createdAt.compareTo(left.createdAt);
    });

    return suggestions;
  }

  Suggestion? get _selectedSuggestion {
    final selectedSuggestionId = _selectedSuggestionId;

    if (_orderedSuggestions.isEmpty) {
      return null;
    }

    if (selectedSuggestionId == null) {
      return _orderedSuggestions.first;
    }

    return _orderedSuggestions.cast<Suggestion?>().firstWhere(
          (suggestion) => suggestion?.id == selectedSuggestionId,
          orElse: () => _orderedSuggestions.first,
        );
  }

  bool get _isOwnSelectedSuggestion {
    final currentMember = _currentMember;
    final selectedSuggestion = _selectedSuggestion;

    return currentMember != null &&
        selectedSuggestion != null &&
        currentMember.id == selectedSuggestion.memberId;
  }

  int? get _currentSelectedVote {
    final currentMember = _currentMember;
    final selectedSuggestion = _selectedSuggestion;

    if (currentMember == null || selectedSuggestion == null) {
      return null;
    }

    final vote = _appData.votes.cast<VoteEntry?>().firstWhere(
          (entry) =>
              entry?.memberId == currentMember.id &&
              entry?.suggestionId == selectedSuggestion.id,
          orElse: () => null,
        );

    return vote?.value;
  }

  int get _activeVoters {
    return _appData.votes.map((vote) => vote.memberId).toSet().length;
  }

  TextEditingController _commentControllerFor(String suggestionId) {
    return _commentControllers.putIfAbsent(
      suggestionId,
      () {
        final controller = TextEditingController();
        _registerInteractionController(controller);
        return controller;
      },
    );
  }

  void _registerInteractionController(TextEditingController controller) {
    controller.addListener(_markInteraction);
  }

  void _markInteraction() {
    if (_sessionMemberId == null || _isTimingOutSession) {
      return;
    }

    final now = DateTime.now().toUtc();
    final lastInteractionAt = _lastInteractionAt;

    if (lastInteractionAt != null &&
        now.difference(lastInteractionAt) >= _sessionInactivityTimeout) {
      unawaited(_handleSessionTimeout());
      return;
    }

    _rememberLastInteraction(at: now);
  }

  void _restartSessionTimeout() {
    _sessionTimeoutTimer?.cancel();

    if (_sessionMemberId == null) {
      return;
    }

    _sessionTimeoutTimer = Timer(
      _sessionInactivityTimeout,
      () => unawaited(_handleSessionTimeout()),
    );
  }

  void _rememberLastInteraction({DateTime? at}) {
    final memberId = _sessionMemberId;
    if (memberId == null || _isTimingOutSession) {
      return;
    }

    final timestamp = (at ?? DateTime.now()).toUtc();
    _lastInteractionAt = timestamp;
    _lastInteractionMemberId = memberId;
    session_activity_store.writeLastInteractionAt(memberId, timestamp);
    _restartSessionTimeout();
  }

  void _loadStoredInteraction(String memberId) {
    _lastInteractionMemberId = memberId;
    _lastInteractionAt = session_activity_store.readLastInteractionAt(memberId);
  }

  void _clearStoredInteraction([String? memberId]) {
    final resolvedMemberId = memberId ?? _lastInteractionMemberId;
    if (resolvedMemberId != null) {
      session_activity_store.clearLastInteractionAt(resolvedMemberId);
    }
    if (_lastInteractionMemberId == resolvedMemberId) {
      _lastInteractionMemberId = null;
      _lastInteractionAt = null;
    }
  }

  Future<bool> _enforceStoredTimeoutIfNeeded() async {
    final lastInteractionAt = _lastInteractionAt;
    if (lastInteractionAt == null) {
      return false;
    }

    final now = DateTime.now().toUtc();
    if (now.difference(lastInteractionAt) < _sessionInactivityTimeout) {
      _restartSessionTimeout();
      return false;
    }

    await _handleSessionTimeout();
    return true;
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(_handleLifecycleResume());
    }
  }

  Future<void> _handleLifecycleResume() async {
    final memberId = _sessionMemberId;
    if (memberId == null || _isTimingOutSession) {
      return;
    }

    _loadStoredInteraction(memberId);
    if (await _enforceStoredTimeoutIfNeeded()) {
      return;
    }

    _restartSessionTimeout();
  }

  void _cancelSessionTimeout() {
    _sessionTimeoutTimer?.cancel();
    _sessionTimeoutTimer = null;
  }

  Suggestion? _findSuggestionById(String suggestionId) {
    return _appData.suggestions.cast<Suggestion?>().firstWhere(
          (item) => item?.id == suggestionId,
          orElse: () => null,
        );
  }

  SuggestionAsset? _findSuggestionAssetById(String assetId) {
    return _appData.assets.cast<SuggestionAsset?>().firstWhere(
          (item) => item?.id == assetId,
          orElse: () => null,
        );
  }

  Future<void> _hydrateRemoteState({bool showLoading = true}) async {
    if (showLoading && mounted) {
      setState(() {
        _isBooting = true;
        _loginError = '';
      });
    }

    final wasPending = _isPendingApproval;
    Member? sessionMember;
    var shouldRestartSessionTimeout = false;

    try {
      sessionMember = await _repository.getRemoteSessionMember();

      if (!mounted) {
        return;
      }

      if (sessionMember == null) {
        setState(() {
          _sessionMemberId = null;
          _appData = const AppData.empty();
          _pendingMembers = const [];
          _memberActivityLogs = const [];
          _selectedSuggestionId = null;
          _editingSuggestionId = null;
          _openMemberVisitsMemberId = null;
          _activityLogError = '';
          _isLoadingMemberActivity = false;
        });
        _clearStoredInteraction();
        _pageAccessLoggedMemberId = null;
        _cancelSessionTimeout();
        _syncPendingTimer();
        return;
      }

      _sessionMemberId = sessionMember.id;
      _loadStoredInteraction(sessionMember.id);

      if (await _enforceStoredTimeoutIfNeeded()) {
        sessionMember = null;
        return;
      }

      await _logPageAccessIfNeeded(sessionMember);

      final nextData = await _repository.fetchRemoteAppData();
      final nextPendingMembersFuture = sessionMember.isAdmin
          ? _repository.fetchPendingMembers()
          : Future.value(const <Member>[]);

      final nextPendingMembers = await nextPendingMembersFuture;

      if (!mounted) {
        return;
      }

        setState(() {
          _appData = nextData;
          _sessionMemberId = sessionMember!.id;
        _pendingMembers = nextPendingMembers;
        final validSelection = _selectedSuggestionId != null &&
            nextData.suggestions.any(
              (suggestion) => suggestion.id == _selectedSuggestionId,
            );
        _selectedSuggestionId = validSelection
            ? _selectedSuggestionId
            : (nextData.suggestions.isNotEmpty
                ? nextData.suggestions.first.id
                : null);
        });
        _rememberLastInteraction();
        shouldRestartSessionTimeout = true;

      if (wasPending && !_isPendingApproval) {
        _showNotice('Onayin geldi. Artik uygulamayi kullanabilirsin.');
      }
    } catch (error) {
      if (await _handlePossibleSessionTimeout(error)) {
        return;
      }
      if (!mounted) {
        return;
      }
      setState(() {
        _loginError = getAuthErrorMessage(error);
      });
    } finally {
      if (mounted) {
        setState(() {
          _isBooting = false;
        });
        _syncPendingTimer();
        if (sessionMember == null || !shouldRestartSessionTimeout) {
          _cancelSessionTimeout();
        } else {
          _restartSessionTimeout();
        }
      }
    }
  }

  void _syncPendingTimer() {
    _pendingRefreshTimer?.cancel();

    if (!_isPendingApproval || _sessionMemberId == null) {
      return;
    }

    _pendingRefreshTimer = Timer.periodic(
      const Duration(seconds: 5),
      (_) => unawaited(_hydrateRemoteState(showLoading: false)),
    );
  }

  Future<void> _logPageAccessIfNeeded(Member sessionMember) async {
    if (_pageAccessLoggedMemberId == sessionMember.id) {
      return;
    }

    _pageAccessLoggedMemberId = sessionMember.id;

    try {
      await _repository.logMemberActivity(
        actionType: 'app_open',
        targetType: 'app',
        details: {
          'username': sessionMember.label,
          'approved': sessionMember.approved,
        },
      );
    } catch (_) {
      // Log akisi acilmamis olsa da ana ekran yuklensin.
    }
  }

  Future<void> _loadMemberActivityLogs(String memberId) async {
    if (!_isAdmin) {
      return;
    }

    if (mounted) {
      setState(() {
        _isLoadingMemberActivity = true;
        _activityLogError = '';
      });
    }

    try {
      final entries = await _repository.fetchMemberActivityLogs(memberId);

      if (!mounted || _openMemberVisitsMemberId != memberId) {
        return;
      }

      setState(() {
        _memberActivityLogs = entries;
        _activityLogError = '';
      });
    } catch (error) {
      if (await _handlePossibleSessionTimeout(error)) {
        return;
      }
      if (!mounted || _openMemberVisitsMemberId != memberId) {
        return;
      }

      setState(() {
        _memberActivityLogs = const [];
        _activityLogError = 'Islem kayitlari simdilik yuklenemedi.';
      });
    } finally {
      if (mounted && _openMemberVisitsMemberId == memberId) {
        setState(() {
          _isLoadingMemberActivity = false;
        });
      }
    }
  }

  Future<void> _handleSessionTimeout() async {
    if (_isTimingOutSession || _sessionMemberId == null) {
      return;
    }

    final timedOutMemberId = _sessionMemberId;
    _isTimingOutSession = true;

    try {
      try {
        await _repository.logMemberActivity(
          actionType: 'session_timeout',
          targetType: 'auth',
        );
      } catch (_) {
        // Timeout logu atilamasa da cikis aksin.
      }

      await _repository.signOutRemote(logAction: false);
      _clearStoredInteraction(timedOutMemberId);
      _pageAccessLoggedMemberId = null;
      _cancelSessionTimeout();

      if (!mounted) {
        return;
      }

      setState(() {
        _authView = AuthView.login;
        _sessionMemberId = null;
        _appData = const AppData.empty();
        _pendingMembers = const [];
        _memberActivityLogs = const [];
        _selectedSuggestionId = null;
        _editingSuggestionId = null;
        _openSuggestionModalId = null;
        _openSuggestionAssetPreviewId = null;
        _openMemberVisitsMemberId = null;
        _activityLogError = '';
        _isLoadingMemberActivity = false;
        _loginError =
            'Uzun sure islem yapilmadigi icin tekrar giris yapman gerekiyor.';
      });
      scrollToTop();
      _showError(_loginError);
    } catch (_) {
      // Oturum zaman asimi logout denemesi sessizce gecsin.
    } finally {
      _isTimingOutSession = false;
    }
  }

  Future<bool> _handlePossibleSessionTimeout(Object error) async {
    if (!isSessionTimeoutError(error)) {
      return false;
    }

    final expiredMemberId = _sessionMemberId;

    try {
      await _repository.signOutRemote(logAction: false);
    } catch (_) {
      // Oturum zaten gecersiz olsa da arayuz login ekranina donsun.
    }

    _clearStoredInteraction(expiredMemberId);
    _pageAccessLoggedMemberId = null;
    _cancelSessionTimeout();

    if (!mounted) {
      return true;
    }

    setState(() {
      _authView = AuthView.login;
      _sessionMemberId = null;
      _appData = const AppData.empty();
      _pendingMembers = const [];
      _memberActivityLogs = const [];
      _selectedSuggestionId = null;
      _editingSuggestionId = null;
      _openSuggestionModalId = null;
      _openSuggestionAssetPreviewId = null;
      _openMemberVisitsMemberId = null;
      _activityLogError = '';
      _isLoadingMemberActivity = false;
      _loginError =
          'Uzun sure islem yapilmadigi icin tekrar giris yapman gerekiyor.';
    });
    scrollToTop();
    _showError(_loginError);
    return true;
  }

  Future<bool> _ensureSessionActiveForUiAction() async {
    if (_sessionMemberId == null) {
      return false;
    }

    try {
      await _repository.touchCurrentSession();
      _rememberLastInteraction();
      return true;
    } catch (error) {
      if (await _handlePossibleSessionTimeout(error)) {
        return false;
      }

      _showError(getAuthErrorMessage(error));
      return false;
    }
  }

  Future<void> _openSuggestionModal(String suggestionId) async {
    if (!mounted) {
      return;
    }

    if (!await _ensureSessionActiveForUiAction()) {
      return;
    }

    final suggestion = _findSuggestionById(suggestionId);

    setState(() {
      _selectedSuggestionId = suggestionId;
      _editingSuggestionId = null;
      _openSuggestionModalId = suggestionId;
      _openSuggestionAssetPreviewId = null;
      _openMemberVisitsMemberId = null;
    });

    _markInteraction();

    if (suggestion != null) {
      unawaited(
        _safeLogActivity(
          actionType: 'suggestion_view',
          targetType: 'suggestion',
          targetId: suggestion.id,
          details: {
            'suggestion_title': suggestion.title,
          },
        ),
      );
    }
  }

  void _closeSuggestionModal() {
    if (!mounted) {
      return;
    }

    setState(() {
      _editingSuggestionId = null;
      _openSuggestionModalId = null;
      _openSuggestionAssetPreviewId = null;
    });

    _markInteraction();
  }

  Future<void> _openMemberVisitsModal(String memberId) async {
    if (!mounted || !_isAdmin) {
      return;
    }

    if (!await _ensureSessionActiveForUiAction()) {
      return;
    }

    setState(() {
      _openMemberVisitsMemberId = memberId;
      _openSuggestionModalId = null;
      _openSuggestionAssetPreviewId = null;
      _memberActivityLogs = const [];
      _activityLogError = '';
      _isLoadingMemberActivity = true;
    });

    _markInteraction();
    unawaited(_loadMemberActivityLogs(memberId));
  }

  void _closeMemberVisitsModal() {
    if (!mounted) {
      return;
    }

    setState(() {
      _openMemberVisitsMemberId = null;
      _memberActivityLogs = const [];
      _activityLogError = '';
      _isLoadingMemberActivity = false;
    });

    _markInteraction();
  }

  Future<void> _openSuggestionAssetPreview(SuggestionAsset asset) async {
    if (!mounted) {
      return;
    }

    if (!await _ensureSessionActiveForUiAction()) {
      return;
    }

    final suggestion = _findSuggestionById(asset.suggestionId);

    setState(() {
      _openSuggestionAssetPreviewId = asset.id;
    });

    _markInteraction();
    unawaited(
      _safeLogActivity(
        actionType: 'asset_view',
        targetType: 'suggestion_asset',
        targetId: asset.id,
        details: {
          'asset_name': asset.fileName,
          'suggestion_id': asset.suggestionId,
          'suggestion_title': suggestion?.title ?? '',
        },
      ),
    );
  }

  void _closeSuggestionAssetPreview() {
    if (!mounted) {
      return;
    }

    setState(() {
      _openSuggestionAssetPreviewId = null;
    });

    _markInteraction();
  }

  Future<void> _handleLogin() async {
    final username = _loginUsernameController.text;
    final password = _loginPasswordController.text;
    _markInteraction();

    if (!isValidUsername(username)) {
      setState(() {
        _loginError =
            'Kullanici adi 3-24 karakter olmali ve sadece kucuk harf, sayi, nokta, cizgi kullanmali.';
      });
      return;
    }

    if (password.trim().isEmpty) {
      setState(() {
        _loginError = 'Sifre bos olamaz.';
      });
      return;
    }

    setState(() {
      _loginError = '';
      _isSubmitting = true;
    });

    try {
      await _repository.signInWithUsernamePassword(username, password);
      final sessionMember = await _repository.getRemoteSessionMember();
      if (sessionMember != null) {
        _sessionMemberId = sessionMember.id;
        _rememberLastInteraction();
      }
      _loginPasswordController.clear();
      await _hydrateRemoteState(showLoading: false);
    } catch (error) {
      if (await _handlePossibleSessionTimeout(error)) {
        return;
      }
      if (!mounted) {
        return;
      }
      setState(() {
        _loginError = getAuthErrorMessage(error);
      });
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  Future<void> _handleRegister() async {
    final username = _registerUsernameController.text;
    final password = _registerPasswordController.text;
    _markInteraction();

    if (!isValidUsername(username)) {
      setState(() {
        _loginError =
            'Kullanici adi 3-24 karakter olmali ve sadece kucuk harf, sayi, nokta, cizgi kullanmali.';
      });
      return;
    }

    if (!isValidPassword(password)) {
      setState(() {
        _loginError = getPasswordRuleText();
      });
      return;
    }

    setState(() {
      _loginError = '';
      _isSubmitting = true;
    });

    try {
      await _repository.signUpPendingMember(
        username: username,
        password: password,
      );
      final sessionMember = await _repository.getRemoteSessionMember();
      if (sessionMember != null) {
        _sessionMemberId = sessionMember.id;
        _rememberLastInteraction();
      }
      _registerPasswordController.clear();
      _registerUsernameController.clear();
      _showNotice('Kayit alindi.');
      await _hydrateRemoteState(showLoading: false);
    } catch (error) {
      if (await _handlePossibleSessionTimeout(error)) {
        return;
      }
      if (!mounted) {
        return;
      }
      setState(() {
        _loginError = getAuthErrorMessage(error);
      });
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  Future<void> _handleLogout() async {
    _markInteraction();
    setState(() {
      _isSubmitting = true;
      _editingSuggestionId = null;
    });

    try {
      final currentMemberId = _sessionMemberId;
      await _repository.signOutRemote();
      _clearStoredInteraction(currentMemberId);
      _pageAccessLoggedMemberId = null;
      _loginPasswordController.clear();
      _registerPasswordController.clear();
      await _hydrateRemoteState(showLoading: false);
    } catch (error) {
      if (await _handlePossibleSessionTimeout(error)) {
        return;
      }
      if (!mounted) {
        return;
      }
      setState(() {
        _loginError = getAuthErrorMessage(error);
      });
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  Future<void> _handleAddSuggestion() async {
    final currentMember = _currentMember;
    final title = _suggestionTitleController.text.trim();
    final note = _suggestionNoteController.text.trim();
    _markInteraction();

    if (currentMember == null || !_canParticipate) {
      setState(() {
        _suggestionError =
            'Oneri eklemek icin once giris yapip onay alman gerekiyor.';
      });
      return;
    }

    if (title.length < 2 || title.length > 40) {
      setState(() {
        _suggestionError = 'Takim ismi 2 ile 40 karakter arasinda olmali.';
      });
      return;
    }

    if (getMemberSuggestionCount(_appData.suggestions, currentMember.id) >=
        maxSuggestionsPerMember) {
      setState(() {
        _suggestionError = 'Kisi basi en fazla 3 oneri yapilabilir.';
      });
      return;
    }

    setState(() {
      _suggestionError = '';
      _isSubmitting = true;
    });

    try {
      final insertedSuggestion =
          await _repository.addRemoteSuggestion(title, note);
      await _safeLogActivity(
        actionType: 'suggestion_create',
        targetType: 'suggestion',
        targetId: insertedSuggestion.id,
        details: {
          'suggestion_title': insertedSuggestion.title,
          'note_length': insertedSuggestion.note.length,
        },
      );
      _suggestionTitleController.clear();
      _suggestionNoteController.clear();
      _selectedSuggestionId = insertedSuggestion.id;
      await _hydrateRemoteState(showLoading: false);
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _suggestionError = getAuthErrorMessage(error);
      });
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  Future<void> _handleVote(String suggestionId, int value) async {
    _markInteraction();

    if (!_canParticipate) {
      return;
    }

    final suggestion = _appData.suggestions.cast<Suggestion?>().firstWhere(
          (item) => item?.id == suggestionId,
          orElse: () => null,
        );

    if (suggestion == null || suggestion.memberId == _currentMember?.id) {
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      await _repository.upsertRemoteVote(suggestionId, clampVote(value));
      await _safeLogActivity(
        actionType: 'vote_set',
        targetType: 'suggestion',
        targetId: suggestionId,
        details: {
          'suggestion_title': suggestion.title,
          'vote_value': clampVote(value),
        },
      );
      await _hydrateRemoteState(showLoading: false);
    } catch (error) {
      if (await _handlePossibleSessionTimeout(error)) {
        return;
      }
      _showError(getAuthErrorMessage(error));
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  Future<void> _handleClearVote(String suggestionId) async {
    _markInteraction();
    final suggestion = _findSuggestionById(suggestionId);

    setState(() {
      _isSubmitting = true;
    });

    try {
      await _repository.deleteRemoteVote(suggestionId);
      await _safeLogActivity(
        actionType: 'vote_clear',
        targetType: 'suggestion',
        targetId: suggestionId,
        details: {
          'suggestion_title': suggestion?.title ?? '',
        },
      );
      await _hydrateRemoteState(showLoading: false);
    } catch (error) {
      if (await _handlePossibleSessionTimeout(error)) {
        return;
      }
      _showError(getAuthErrorMessage(error));
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  Future<void> _handleCommentSubmit(String suggestionId) async {
    final controller = _commentControllerFor(suggestionId);
    final message = controller.text.trim();
    final suggestion = _findSuggestionById(suggestionId);
    _markInteraction();

    if (!_canParticipate) {
      return;
    }

    if (message.isEmpty) {
      _showError('Yorum bos olamaz.');
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      await _repository.addRemoteComment(suggestionId, message);
      await _safeLogActivity(
        actionType: 'comment_create',
        targetType: 'suggestion',
        targetId: suggestionId,
        details: {
          'suggestion_title': suggestion?.title ?? '',
          'comment_preview':
              message.length > 60 ? '${message.substring(0, 60)}...' : message,
        },
      );
      controller.clear();
      await _hydrateRemoteState(showLoading: false);
    } catch (error) {
      if (await _handlePossibleSessionTimeout(error)) {
        return;
      }
      _showError(getAuthErrorMessage(error));
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  Future<void> _handleDeleteSuggestion(String suggestionId) async {
    final suggestion = _findSuggestionById(suggestionId);
    final shouldDelete =
        await _confirmAction('Bu oneriyi silmek istiyor musun?');

    if (!shouldDelete) {
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      await _repository.deleteRemoteSuggestion(suggestionId);
      await _safeLogActivity(
        actionType: 'suggestion_delete',
        targetType: 'suggestion',
        targetId: suggestionId,
        details: {
          'suggestion_title': suggestion?.title ?? '',
        },
      );
      if (_selectedSuggestionId == suggestionId) {
        _selectedSuggestionId = null;
      }
      final previewAsset = _openSuggestionAssetPreviewId == null
          ? null
          : _findSuggestionAssetById(_openSuggestionAssetPreviewId!);
      if (previewAsset?.suggestionId == suggestionId) {
        _openSuggestionAssetPreviewId = null;
      }
      await _hydrateRemoteState(showLoading: false);
    } catch (error) {
      if (await _handlePossibleSessionTimeout(error)) {
        return;
      }
      _showError(getAuthErrorMessage(error));
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  void _startSuggestionNoteEdit(Suggestion suggestion) {
    setState(() {
      _editingSuggestionId = suggestion.id;
      _editingSuggestionNoteController.text = suggestion.note;
    });
  }

  void _cancelSuggestionNoteEdit() {
    setState(() {
      _editingSuggestionId = null;
      _editingSuggestionNoteController.clear();
    });
  }

  Future<void> _handleSuggestionNoteSave(String suggestionId) async {
    final nextNote = _editingSuggestionNoteController.text.trim();
    final suggestion = _findSuggestionById(suggestionId);
    _markInteraction();

    setState(() {
      _isSubmitting = true;
    });

    try {
      await _repository.updateRemoteSuggestionNote(suggestionId, nextNote);
      await _safeLogActivity(
        actionType: 'suggestion_note_update',
        targetType: 'suggestion',
        targetId: suggestionId,
        details: {
          'suggestion_title': suggestion?.title ?? '',
          'note_length': nextNote.length,
        },
      );
      _editingSuggestionId = null;
      _editingSuggestionNoteController.clear();
      await _hydrateRemoteState(showLoading: false);
    } catch (error) {
      if (await _handlePossibleSessionTimeout(error)) {
        return;
      }
      _showError(getAuthErrorMessage(error));
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  Future<void> _handlePickedSuggestionAssets(
    String suggestionId,
    List<PickedSvgFile> pickedFiles,
  ) async {
    final suggestion = _findSuggestionById(suggestionId);
    _markInteraction();

    if (suggestion == null) {
      _showError('Oneri bulunamadi.');
      return;
    }

    if (!_canUploadSuggestionAssets(suggestion)) {
      _showError('SVG dosyalarini sadece oneriyi ekleyen uye yukleyebilir.');
      return;
    }

    final currentAssets = getSuggestionAssets(_appData.assets, suggestionId);
    final remainingSlots =
        maxSuggestionAssetsPerSuggestion - currentAssets.length;

    if (remainingSlots <= 0) {
      _showError('Bu oneri icin en fazla 3 SVG saklanabilir.');
      return;
    }

    if (pickedFiles.length > remainingSlots) {
      _showError(
        'Bu oneriye en fazla $remainingSlots SVG daha ekleyebilirsin.',
      );
      return;
    }

    for (final file in pickedFiles) {
      final lowerName = file.name.trim().toLowerCase();
      final bytes = file.bytes;

      if (!lowerName.endsWith('.svg')) {
        _showError('Sadece SVG formatinda dosya yuklenebilir.');
        return;
      }

      if (bytes.isEmpty) {
        _showError('Secilen SVG dosyasi okunamadi.');
        return;
      }

      if (bytes.length > maxSuggestionAssetBytes) {
        _showError('Her SVG dosyasi en fazla 400 KB olabilir.');
        return;
      }
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      for (final file in pickedFiles) {
        await _repository.uploadSuggestionAsset(
          suggestionId: suggestionId,
          fileName: file.name,
          bytes: file.bytes,
        );
        await _safeLogActivity(
          actionType: 'asset_upload',
          targetType: 'suggestion_asset',
          targetId: suggestionId,
          details: {
            'suggestion_title': suggestion.title,
            'asset_name': file.name,
          },
        );
      }
      _showNotice(
        'SVG dosyasi eklendi.',
      );
      await _hydrateRemoteState(showLoading: false);
    } catch (error) {
      if (await _handlePossibleSessionTimeout(error)) {
        return;
      }
      _showError(getAuthErrorMessage(error));
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  Future<void> _handleSuggestionAssetUpload(String suggestionId) async {
    _markInteraction();
    final pickedFiles = await pickSvgFiles(allowMultiple: false);

    if (pickedFiles == null || pickedFiles.isEmpty) {
      return;
    }

    await _handlePickedSuggestionAssets(suggestionId, pickedFiles);
  }

  Future<void> _handleDeleteSuggestionAsset(SuggestionAsset asset) async {
    final suggestion = _findSuggestionById(asset.suggestionId);
    if (!_canDeleteSuggestionAsset(asset)) {
      return;
    }

    final shouldDelete = await _confirmAction(
      'Bu SVG dosyasini silmek istiyor musun?',
    );

    if (!shouldDelete) {
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      await _repository.deleteSuggestionAsset(asset);
      await _safeLogActivity(
        actionType: 'asset_delete',
        targetType: 'suggestion_asset',
        targetId: asset.id,
        details: {
          'suggestion_title': suggestion?.title ?? '',
          'asset_name': asset.fileName,
        },
      );
      if (_openSuggestionAssetPreviewId == asset.id && mounted) {
        setState(() {
          _openSuggestionAssetPreviewId = null;
        });
      }
      _showNotice('SVG dosyasi silindi.');
      await _hydrateRemoteState(showLoading: false);
    } catch (error) {
      if (await _handlePossibleSessionTimeout(error)) {
        return;
      }
      _showError(getAuthErrorMessage(error));
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  Future<void> _handleDeleteComment(String commentId) async {
    final comment = _appData.comments.cast<CommentEntry?>().firstWhere(
          (entry) => entry?.id == commentId,
          orElse: () => null,
        );
    final suggestion =
        comment == null ? null : _findSuggestionById(comment.suggestionId);
    final shouldDelete =
        await _confirmAction('Bu yorumu silmek istiyor musun?');

    if (!shouldDelete) {
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    try {
      await _repository.deleteRemoteComment(commentId);
      await _safeLogActivity(
        actionType: 'comment_delete',
        targetType: 'comment',
        targetId: commentId,
        details: {
          'suggestion_title': suggestion?.title ?? '',
          'comment_preview': comment == null
              ? ''
              : (comment.message.length > 60
                  ? '${comment.message.substring(0, 60)}...'
                  : comment.message),
        },
      );
      await _hydrateRemoteState(showLoading: false);
    } catch (error) {
      if (await _handlePossibleSessionTimeout(error)) {
        return;
      }
      _showError(getAuthErrorMessage(error));
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  Future<void> _handleApproval(String memberId, bool approved) async {
    final member = _memberById(memberId) ??
        _pendingMembers.cast<Member?>().firstWhere(
              (entry) => entry?.id == memberId,
              orElse: () => null,
            );
    _markInteraction();
    setState(() {
      _adminError = '';
      _isSubmitting = true;
    });

    try {
      await _repository.updateMemberApproval(memberId, approved);
      await _safeLogActivity(
        actionType: approved ? 'member_approve' : 'member_reject',
        targetType: 'member',
        targetId: memberId,
        details: {
          'member_username': member?.label ?? '',
        },
      );
      _showNotice('Uye onaylandi.');
      await _hydrateRemoteState(showLoading: false);
    } catch (error) {
      if (await _handlePossibleSessionTimeout(error)) {
        return;
      }
      if (!mounted) {
        return;
      }
      setState(() {
        _adminError = getAuthErrorMessage(error);
      });
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  Future<void> _handleRejectMember(String memberId) async {
    final member = _memberById(memberId) ??
        _pendingMembers.cast<Member?>().firstWhere(
              (entry) => entry?.id == memberId,
              orElse: () => null,
            );
    _markInteraction();
    final shouldReject = await _confirmAction(
      'Bu kaydi tamamen reddetmek istiyor musun?',
    );

    if (!shouldReject) {
      return;
    }

    setState(() {
      _adminError = '';
      _isSubmitting = true;
    });

    try {
      await _repository.deleteRemoteMember(memberId);
      await _safeLogActivity(
        actionType: 'member_reject',
        targetType: 'member',
        targetId: memberId,
        details: {
          'member_username': member?.label ?? '',
        },
      );
      _showNotice('Kayit reddedildi.');
      await _hydrateRemoteState(showLoading: false);
    } catch (error) {
      if (await _handlePossibleSessionTimeout(error)) {
        return;
      }
      if (!mounted) {
        return;
      }
      setState(() {
        _adminError = getAuthErrorMessage(error);
      });
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  Future<void> _handleDeleteMember(Member member) async {
    if (!_canAdminDeleteMember(member)) {
      return;
    }

    _markInteraction();
    final shouldDelete = await _confirmAction(
      '@${member.label} kullanicisini tamamen silmek istiyor musun? Bu islem oylarini, yorumlarini, onerilerini ve yukledigi SVG dosyalarini kaldirir.',
    );

    if (!shouldDelete) {
      return;
    }

    setState(() {
      _adminError = '';
      _isSubmitting = true;
    });

    try {
      await _repository.deleteRemoteMember(member.id);
      await _safeLogActivity(
        actionType: 'member_delete',
        targetType: 'member',
        targetId: member.id,
        details: {
          'member_username': member.label,
        },
      );
      if (mounted) {
        setState(() {
          _openMemberVisitsMemberId = null;
          _memberActivityLogs = const [];
          _activityLogError = '';
          _isLoadingMemberActivity = false;
        });
      }
      _showNotice('Uye silindi.');
      await _hydrateRemoteState(showLoading: false);
    } catch (error) {
      if (await _handlePossibleSessionTimeout(error)) {
        return;
      }
      if (!mounted) {
        return;
      }
      setState(() {
        _adminError = getAuthErrorMessage(error);
      });
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }

  Widget _buildSuggestionPopupFrame(
    BuildContext context,
    Suggestion suggestion, {
    required bool compact,
    required VoidCallback onRefresh,
    required VoidCallback onClose,
  }) {
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color(0xFFFFFEFB),
            Color(0xFFF8F3EA),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(compact ? 28 : 34),
        border: Border.all(color: _borderColor),
        boxShadow: const [
          BoxShadow(
            color: _shadowColor,
            blurRadius: 34,
            offset: Offset(0, 20),
          ),
        ],
      ),
      child: Column(
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(
              compact ? 16 : 18,
              compact ? 12 : 16,
              compact ? 12 : 14,
              0,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (compact)
                  Center(
                    child: Container(
                      width: 40,
                      height: 4,
                      decoration: BoxDecoration(
                        color: _borderColor,
                        borderRadius: BorderRadius.circular(999),
                      ),
                    ),
                  ),
                if (compact) const SizedBox(height: 10),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        suggestion.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style:
                            Theme.of(context).textTheme.headlineSmall?.copyWith(
                                  color: _primaryColor,
                                  fontWeight: FontWeight.w800,
                                ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    IconButton(
                      onPressed: onClose,
                      tooltip: 'Kapat',
                      icon: const Icon(Icons.close_rounded),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: ScrollConfiguration(
              behavior:
                  const MaterialScrollBehavior().copyWith(scrollbars: false),
              child: SingleChildScrollView(
                padding: EdgeInsets.fromLTRB(
                  compact ? 10 : 14,
                  0,
                  compact ? 10 : 14,
                  compact ? 12 : 16,
                ),
                child: _buildDetailPanel(
                  context,
                  suggestion,
                  onDataChanged: onRefresh,
                  onClose: onClose,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  int? _getCurrentMemberVote(String suggestionId) {
    final currentMember = _currentMember;

    if (currentMember == null) {
      return null;
    }

    final vote = _appData.votes.cast<VoteEntry?>().firstWhere(
          (entry) =>
              entry?.memberId == currentMember.id &&
              entry?.suggestionId == suggestionId,
          orElse: () => null,
        );

    return vote?.value;
  }

  bool _canDeleteSuggestion(Suggestion suggestion) {
    final currentMember = _currentMember;

    if (currentMember == null) {
      return false;
    }

    return currentMember.id == suggestion.memberId || _isAdmin;
  }

  bool _canEditSuggestionNote(Suggestion suggestion) {
    final currentMember = _currentMember;

    if (currentMember == null) {
      return false;
    }

    return currentMember.id == suggestion.memberId;
  }

  bool _canUploadSuggestionAssets(Suggestion suggestion) {
    final currentMember = _currentMember;

    if (currentMember == null || !_canParticipate) {
      return false;
    }

    return currentMember.id == suggestion.memberId;
  }

  bool _canDeleteSuggestionAsset(SuggestionAsset asset) {
    final currentMember = _currentMember;

    if (currentMember == null) {
      return false;
    }

    return currentMember.id == asset.memberId || _isAdmin;
  }

  bool _canManageComment(CommentEntry comment) {
    final currentMember = _currentMember;

    if (currentMember == null) {
      return false;
    }

    return currentMember.id == comment.memberId || _isAdmin;
  }

  bool _canAdminDeleteMember(Member member) {
    final currentMember = _currentMember;
    if (currentMember == null || !_isAdmin) {
      return false;
    }

    if (member.id == currentMember.id) {
      return false;
    }

    return !member.isAdmin;
  }

  String _memberLabel(String memberId) {
    return _membersById[memberId]?.label ?? 'Bilinmeyen uye';
  }

  Member? _memberById(String memberId) {
    return _membersById[memberId];
  }

  Future<void> _safeLogActivity({
    required String actionType,
    String targetType = '',
    String? targetId,
    Map<String, dynamic>? details,
  }) async {
    try {
      await _repository.logMemberActivity(
        actionType: actionType,
        targetType: targetType,
        targetId: targetId,
        details: details,
      );
    } catch (_) {
      // Log yazilamasa da ana is akisi bozulmasin.
    }
  }

  String _detailText(Map<String, dynamic> details, String key) {
    final value = details[key];
    if (value == null) {
      return '';
    }

    return value.toString().trim();
  }

  String _activityTitle(MemberActivityLogEntry entry) {
    switch (entry.actionType) {
      case 'login_success':
        return 'Giris yapti';
      case 'signup_completed':
        return 'Kaydini tamamladi';
      case 'logout':
        return 'Cikis yapti';
      case 'session_timeout':
        return 'Oturumu zaman asimina ugradi';
      case 'app_open':
        return 'Siteyi acti';
      case 'suggestion_view':
        return 'Bir oneriyi inceledi';
      case 'suggestion_create':
        return 'Oneri ekledi';
      case 'suggestion_note_update':
        return 'Oneri notunu guncelledi';
      case 'suggestion_delete':
        return 'Oneri sildi';
      case 'vote_set':
        return 'Puan verdi';
      case 'vote_clear':
        return 'Verdigi puani geri aldi';
      case 'comment_create':
        return 'Yorum ekledi';
      case 'comment_delete':
        return 'Yorumu sildi';
      case 'asset_upload':
        return 'SVG yukledi';
      case 'asset_view':
        return 'SVG onizlemesini acti';
      case 'asset_delete':
        return 'SVG sildi';
      case 'member_approve':
        return 'Uyeyi onayladi';
      case 'member_reject':
        return 'Uyelik kaydini reddetti';
      case 'member_delete':
        return 'Uyeyi tamamen sildi';
      default:
        return entry.actionType.replaceAll('_', ' ');
    }
  }

  String _activitySubtitle(MemberActivityLogEntry entry) {
    final suggestionTitle = _detailText(entry.details, 'suggestion_title');
    final username = _detailText(entry.details, 'username');
    final memberUsername = _detailText(entry.details, 'member_username');
    final voteValue = _detailText(entry.details, 'vote_value');
    final assetName = _detailText(entry.details, 'asset_name');
    final commentPreview = _detailText(entry.details, 'comment_preview');

    switch (entry.actionType) {
      case 'login_success':
      case 'signup_completed':
        return username.isEmpty ? 'Hesap oturumu acildi.' : '@$username';
      case 'logout':
      case 'session_timeout':
      case 'app_open':
        return '';
      case 'suggestion_view':
      case 'suggestion_create':
      case 'suggestion_note_update':
      case 'suggestion_delete':
        return suggestionTitle.isEmpty ? 'Oneri kaydi' : suggestionTitle;
      case 'vote_set':
        final voteText = voteValue.isEmpty ? '' : '$voteValue puan';
        if (suggestionTitle.isEmpty) {
          return voteText;
        }
        return voteText.isEmpty ? suggestionTitle : '$suggestionTitle - $voteText';
      case 'vote_clear':
        return suggestionTitle.isEmpty ? '' : suggestionTitle;
      case 'comment_create':
      case 'comment_delete':
        if (suggestionTitle.isNotEmpty && commentPreview.isNotEmpty) {
          return '$suggestionTitle - "$commentPreview"';
        }
        if (commentPreview.isNotEmpty) {
          return '"$commentPreview"';
        }
        return suggestionTitle;
      case 'asset_upload':
      case 'asset_view':
      case 'asset_delete':
        if (suggestionTitle.isNotEmpty && assetName.isNotEmpty) {
          return '$suggestionTitle - $assetName';
        }
        if (assetName.isNotEmpty) {
          return assetName;
        }
        return suggestionTitle;
      case 'member_approve':
      case 'member_reject':
      case 'member_delete':
        return memberUsername.isEmpty ? '' : '@$memberUsername';
      default:
        return '';
    }
  }

  void _showNotice(String message) {
    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: _primaryColor,
      ),
    );
  }

  void _showError(String message) {
    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: _dangerColor,
      ),
    );
  }

  Future<bool> _confirmAction(String message) async {
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Emin misin?'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Vazgec'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Devam et'),
          ),
        ],
      ),
    );

    return result ?? false;
  }

  @override
  Widget build(BuildContext context) {
    final approvedMemberCount =
        _appData.members.where((member) => member.approved).length;
    final modalSuggestion = _openSuggestionModalId == null
        ? null
        : _findSuggestionById(_openSuggestionModalId!);
    final previewAsset = _openSuggestionAssetPreviewId == null
        ? null
        : _findSuggestionAssetById(_openSuggestionAssetPreviewId!);
    final memberVisitsModalMember = _openMemberVisitsMemberId == null
        ? null
        : _memberById(_openMemberVisitsMemberId!);

    return Listener(
      behavior: HitTestBehavior.translucent,
      onPointerDown: (_) => _markInteraction(),
      onPointerSignal: (_) => _markInteraction(),
      child: Scaffold(
        body: Stack(
          children: [
            const Positioned.fill(child: _AmbientBackdrop()),
            SafeArea(
              child: _isBooting
                  ? const Center(child: CircularProgressIndicator())
                  : LayoutBuilder(
                      builder: (context, constraints) {
                        final isWide = constraints.maxWidth >= 1120;
                        final primaryColumn = [
                          _buildAccountPanel(context),
                          if (_isAdmin) _buildPendingMembersPanel(context),
                          if (!_pendingOnlyMode)
                            _buildSuggestionComposerPanel(context),
                          if (!_pendingOnlyMode) _buildMembersPanel(context),
                        ];
                        final secondaryColumn = !_pendingOnlyMode
                            ? [_buildSuggestionListPanel(context)]
                            : const <Widget>[];

                        return ScrollConfiguration(
                          behavior: const MaterialScrollBehavior().copyWith(
                            scrollbars: false,
                          ),
                          child: SingleChildScrollView(
                            padding: const EdgeInsets.fromLTRB(16, 18, 16, 40),
                            child: Center(
                              child: ConstrainedBox(
                                constraints:
                                    const BoxConstraints(maxWidth: 1360),
                                child: Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.stretch,
                                  children: [
                                    _buildHero(
                                      context,
                                      approvedMemberCount: approvedMemberCount,
                                    ),
                                    const SizedBox(height: 22),
                                    if (isWide && !_pendingOnlyMode)
                                      Row(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Expanded(
                                            flex: 10,
                                            child: Column(
                                              children:
                                                  _withGaps(primaryColumn),
                                            ),
                                          ),
                                          const SizedBox(width: 20),
                                          Expanded(
                                            flex: 14,
                                            child: Column(
                                              children:
                                                  _withGaps(secondaryColumn),
                                            ),
                                          ),
                                        ],
                                      )
                                    else
                                      Column(
                                        children: _withGaps([
                                          ...primaryColumn,
                                          ...secondaryColumn,
                                        ]),
                                      ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
            if (modalSuggestion != null)
              Positioned.fill(
                child: _SuggestionOverlay(
                  onClose: _closeSuggestionModal,
                  child: _buildSuggestionPopupFrame(
                    context,
                    modalSuggestion,
                    compact: MediaQuery.of(context).size.width < 860,
                    onRefresh: () {
                      if (mounted) {
                        setState(() {});
                      }
                    },
                    onClose: _closeSuggestionModal,
                  ),
                ),
              ),
            if (memberVisitsModalMember != null)
              Positioned.fill(
                child: _SuggestionOverlay(
                  onClose: _closeMemberVisitsModal,
                  child: _buildMemberVisitsPopupFrame(
                    context,
                    memberVisitsModalMember,
                    compact: MediaQuery.of(context).size.width < 860,
                  ),
                ),
              ),
            if (previewAsset != null)
              Positioned.fill(
                child: _SuggestionOverlay(
                  onClose: _closeSuggestionAssetPreview,
                  child: _buildSuggestionAssetPreviewFrame(
                    context,
                    previewAsset,
                    compact: MediaQuery.of(context).size.width < 860,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  List<Widget> _withGaps(List<Widget> children) {
    if (children.isEmpty) {
      return const [];
    }

    return [
      for (var index = 0; index < children.length; index++) ...[
        children[index],
        if (index != children.length - 1) const SizedBox(height: 18),
      ],
    ];
  }

  Widget _buildHero(BuildContext context, {required int approvedMemberCount}) {
    final leadingSuggestion =
        _orderedSuggestions.isNotEmpty ? _orderedSuggestions.first : null;
    final leadingSummary = leadingSuggestion == null
        ? null
        : getSuggestionSummary(_appData.votes, leadingSuggestion.id);

    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth >= 980;

        return Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(36),
            gradient: const LinearGradient(
              colors: [
                Color(0xFF0E2D33),
                Color(0xFF18424B),
                Color(0xFF245764),
              ],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            boxShadow: const [
              BoxShadow(
                color: Color(0x24142A25),
                blurRadius: 36,
                offset: Offset(0, 22),
              ),
            ],
          ),
          child: Stack(
            children: [
              Positioned(
                right: -36,
                top: -24,
                child: Container(
                  width: 220,
                  height: 220,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _heroGlowColor.withValues(alpha: 0.18),
                  ),
                ),
              ),
              Positioned(
                left: 60,
                bottom: -72,
                child: Container(
                  width: 240,
                  height: 240,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: _accentColor.withValues(alpha: 0.12),
                  ),
                ),
              ),
              Padding(
                padding: EdgeInsets.all(isWide ? 30 : 22),
                child: isWide
                    ? Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            flex: 11,
                            child: _HeroCopy(
                              approvedMemberCount: approvedMemberCount,
                              suggestionCount: _appData.suggestions.length,
                              activeVoters: _activeVoters,
                              commentCount: _appData.comments.length,
                              showStats: !_pendingOnlyMode,
                              pendingMemberCount: _pendingMembers.length,
                              isAdmin: _isAdmin,
                            ),
                          ),
                          const SizedBox(width: 24),
                          Expanded(
                            flex: 8,
                            child: Center(
                              child: ConstrainedBox(
                                constraints:
                                    const BoxConstraints(maxWidth: 520),
                                child: _HeroSpotlightCard(
                                  suggestion: leadingSuggestion,
                                  summary: leadingSummary,
                                  memberLabel: leadingSuggestion == null
                                      ? null
                                      : _memberLabel(
                                          leadingSuggestion.memberId),
                                  pendingOnlyMode: _pendingOnlyMode,
                                  requiresRegistration: _currentMember == null,
                                ),
                              ),
                            ),
                          ),
                        ],
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _HeroCopy(
                            approvedMemberCount: approvedMemberCount,
                            suggestionCount: _appData.suggestions.length,
                            activeVoters: _activeVoters,
                            commentCount: _appData.comments.length,
                            showStats: !_pendingOnlyMode,
                            pendingMemberCount: _pendingMembers.length,
                            isAdmin: _isAdmin,
                          ),
                          const SizedBox(height: 20),
                          _HeroSpotlightCard(
                            suggestion: leadingSuggestion,
                            summary: leadingSummary,
                            memberLabel: leadingSuggestion == null
                                ? null
                                : _memberLabel(leadingSuggestion.memberId),
                            pendingOnlyMode: _pendingOnlyMode,
                            requiresRegistration: _currentMember == null,
                          ),
                        ],
                      ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildAccountPanel(BuildContext context) {
    final currentMember = _currentMember;

    return _Panel(
      title: 'Hesap',
      action: currentMember != null
          ? TextButton(
              onPressed: _isSubmitting ? null : _handleLogout,
              child: const Text('Cikis yap'),
            )
          : null,
      child: currentMember != null
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [
                        Color(0xFFFDFBF5),
                        Color(0xFFF7F0E4),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: _borderColor),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(16),
                              gradient: const LinearGradient(
                                colors: [
                                  _accentColor,
                                  _accentSoftColor,
                                ],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                            ),
                            child: Text(
                              currentMember.label.characters.first
                                  .toUpperCase(),
                              style: Theme.of(context)
                                  .textTheme
                                  .titleLarge
                                  ?.copyWith(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w800,
                                  ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  '@${currentMember.label}',
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleLarge
                                      ?.copyWith(
                                        fontWeight: FontWeight.w800,
                                        color: _primaryColor,
                                      ),
                                ),
                                const SizedBox(height: 6),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: [
                                    _MetaPill(
                                      label: currentMember.isAdmin
                                          ? 'admin'
                                          : 'uye',
                                    ),
                                    _MetaPill(
                                      label: currentMember.approved ||
                                              currentMember.isAdmin
                                          ? 'onayli'
                                          : 'onay bekliyor',
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),
                      Text(
                        currentMember.isAdmin
                            ? 'Uyelikleri, onay akislarini ve tum icerikleri bu hesaptan yonetebilirsin.'
                            : 'Onerilerini, oylarini ve yorumlarini bu hesap altinda takip edebilirsin.',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: _mutedColor,
                              height: 1.55,
                            ),
                      ),
                    ],
                  ),
                ),
                if (_isPendingApproval) ...[
                  const SizedBox(height: 14),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFDF2E4),
                      borderRadius: BorderRadius.circular(22),
                      border: Border.all(color: const Color(0xFFE9C99B)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Onay bekleniyor',
                          style:
                              Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.w800,
                                    color: _primaryColor,
                                  ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Kaydin alindi. Admin onay verene kadar oy, yorum ve isim onerisi gonderemezsin.',
                          style:
                              Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: _mutedColor,
                                    height: 1.45,
                                  ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            )
          : Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: _surfaceAlt,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: _borderColor),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: _AuthTabButton(
                          label: 'Giris',
                          isActive: _authView == AuthView.login,
                          onPressed: () {
                            setState(() {
                              _authView = AuthView.login;
                              _loginError = '';
                            });
                          },
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: _AuthTabButton(
                          label: 'Kayit',
                          isActive: _authView == AuthView.register,
                          onPressed: () {
                            setState(() {
                              _authView = AuthView.register;
                              _loginError = '';
                            });
                          },
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 220),
                  switchInCurve: Curves.easeOutCubic,
                  switchOutCurve: Curves.easeInCubic,
                  child: _authView == AuthView.login
                      ? _AuthFormShell(
                          key: const ValueKey('login'),
                          child: Column(
                            children: [
                              TextField(
                                controller: _loginUsernameController,
                                textInputAction: TextInputAction.next,
                                decoration: const InputDecoration(
                                  labelText: 'Kullanici adi',
                                  hintText: 'ornek: mert',
                                ),
                              ),
                              const SizedBox(height: 12),
                              TextField(
                                controller: _loginPasswordController,
                                obscureText: true,
                                onSubmitted: (_) =>
                                    _isSubmitting ? null : _handleLogin(),
                                decoration: const InputDecoration(
                                  labelText: 'Sifre',
                                ),
                              ),
                              if (_loginError.isNotEmpty) ...[
                                const SizedBox(height: 12),
                                _InlineMessage(
                                  message: _loginError,
                                  color: _dangerColor,
                                ),
                              ],
                              const SizedBox(height: 16),
                              SizedBox(
                                width: double.infinity,
                                child: FilledButton(
                                  onPressed:
                                      _isSubmitting ? null : _handleLogin,
                                  child: const Text('Giris yap'),
                                ),
                              ),
                            ],
                          ),
                        )
                      : _AuthFormShell(
                          key: const ValueKey('register'),
                          child: Column(
                            children: [
                              TextField(
                                controller: _registerUsernameController,
                                textInputAction: TextInputAction.next,
                                decoration: InputDecoration(
                                  labelText: 'Kullanici adi',
                                  hintText: adminUsername,
                                ),
                              ),
                              const SizedBox(height: 12),
                              TextField(
                                controller: _registerPasswordController,
                                obscureText: true,
                                onSubmitted: (_) =>
                                    _isSubmitting ? null : _handleRegister(),
                                decoration: const InputDecoration(
                                  labelText: 'Sifre',
                                ),
                              ),
                              const SizedBox(height: 10),
                              Align(
                                alignment: Alignment.centerLeft,
                                child: Text(
                                  getPasswordRuleText(),
                                  style: Theme.of(context)
                                      .textTheme
                                      .bodySmall
                                      ?.copyWith(
                                        color: _mutedColor,
                                      ),
                                ),
                              ),
                              if (_loginError.isNotEmpty) ...[
                                const SizedBox(height: 12),
                                _InlineMessage(
                                  message: _loginError,
                                  color: _dangerColor,
                                ),
                              ],
                              const SizedBox(height: 16),
                              SizedBox(
                                width: double.infinity,
                                child: FilledButton(
                                  onPressed:
                                      _isSubmitting ? null : _handleRegister,
                                  child: const Text('Kaydi tamamla'),
                                ),
                              ),
                            ],
                          ),
                        ),
                ),
              ],
            ),
    );
  }

  Widget _buildPendingMembersPanel(BuildContext context) {
    return _Panel(
      title: 'Onay bekleyen uyeler',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_adminError.isNotEmpty) ...[
            _InlineMessage(message: _adminError, color: _dangerColor),
            const SizedBox(height: 12),
          ],
          if (_pendingMembers.isEmpty)
            Text(
              'Su an onay bekleyen uye yok.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: _mutedColor,
                  ),
            )
          else
            Column(
              children: [
                for (var index = 0;
                    index < _pendingMembers.length;
                    index++) ...[
                  _PendingMemberCard(
                    member: _pendingMembers[index],
                    isSubmitting: _isSubmitting,
                    onApprove: () =>
                        _handleApproval(_pendingMembers[index].id, true),
                    onReject: () =>
                        _handleRejectMember(_pendingMembers[index].id),
                  ),
                  if (index != _pendingMembers.length - 1)
                    const SizedBox(height: 12),
                ],
              ],
            ),
        ],
      ),
    );
  }

  Widget _buildSuggestionComposerPanel(BuildContext context) {
    return _Panel(
      title: 'Yeni isim onerisi',
      subtitle:
          'Oneri eklemek icin once kayit olup giris yapman ve onay alman gerekir. Kisi basi en fazla 3 oneri yapilabilir.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: _suggestionTitleController,
            enabled: _canParticipate,
            maxLength: 40,
            decoration: const InputDecoration(
              labelText: 'Takim ismi',
              hintText: 'Ornek: Blok Cizgisi',
              counterText: '',
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _suggestionNoteController,
            enabled: _canParticipate,
            maxLength: 300,
            maxLines: 4,
            decoration: const InputDecoration(
              labelText: 'Kisa not',
              hintText:
                  'Bu ismi neden sevdigini biraz daha detayli yazabilirsin.',
              counterText: '',
            ),
          ),
          if (_suggestionError.isNotEmpty) ...[
            const SizedBox(height: 12),
            _InlineMessage(message: _suggestionError, color: _dangerColor),
          ],
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: _isSubmitting || !_canParticipate
                  ? null
                  : _handleAddSuggestion,
              child: const Text('Oneriyi ekle'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMembersPanel(BuildContext context) {
    return _Panel(
      title: 'Uyeler',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_appData.members.isEmpty)
            Text(
              'Kayit olmadan bilgileri goremezsiniz.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: _mutedColor,
                  ),
            )
          else
            Wrap(
              spacing: 10,
              runSpacing: 10,
              children: _appData.members
                  .map(
                    (member) => _MemberBadge(
                      member: member,
                      isClickable: _isAdmin,
                      onTap: _isAdmin
                          ? () => unawaited(_openMemberVisitsModal(member.id))
                          : null,
                    ),
                  )
                  .toList(),
            ),
        ],
      ),
    );
  }

  Widget _buildMemberVisitsPopupFrame(
    BuildContext context,
    Member member, {
    required bool compact,
  }) {
    final canDeleteMember = _canAdminDeleteMember(member);
    final memberActivityLogs = _memberActivityLogs;

    return Container(
      decoration: BoxDecoration(
        color: _surfaceColor,
        borderRadius: BorderRadius.circular(compact ? 28 : 34),
        border: Border.all(color: _borderColor),
        boxShadow: const [
          BoxShadow(
            color: Color(0x26111E1A),
            blurRadius: 34,
            offset: Offset(0, 22),
          ),
        ],
      ),
      child: Column(
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(
              compact ? 20 : 26,
              compact ? 18 : 22,
              compact ? 16 : 20,
              0,
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '@${member.label}',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                              color: _primaryColor,
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Islem gecmisi',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: _mutedColor,
                            ),
                      ),
                    ],
                  ),
                ),
                if (canDeleteMember)
                  TextButton.icon(
                    onPressed: _isSubmitting
                        ? null
                        : () async {
                            await _handleDeleteMember(member);
                          },
                    style: TextButton.styleFrom(
                      foregroundColor: _dangerColor,
                    ),
                    icon: const Icon(Icons.delete_outline),
                    label: const Text('Uyeyi sil'),
                  ),
                IconButton(
                  onPressed: _closeMemberVisitsModal,
                  tooltip: 'Kapat',
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: ListView(
              padding: EdgeInsets.fromLTRB(
                compact ? 20 : 26,
                0,
                compact ? 20 : 26,
                compact ? 20 : 26,
              ),
              children: [
                if (_adminError.isNotEmpty) ...[
                  _InlineMessage(message: _adminError, color: _dangerColor),
                  const SizedBox(height: 12),
                ],
                if (_activityLogError.isNotEmpty) ...[
                  _InlineMessage(
                    message: _activityLogError,
                    color: _dangerColor,
                  ),
                  const SizedBox(height: 12),
                ],
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _MetaPill(label: '${memberActivityLogs.length} islem'),
                    _MetaPill(
                      label: memberActivityLogs.isEmpty
                          ? 'Henuz yok'
                          : 'Son islem ${formatDate(memberActivityLogs.first.createdAt)}',
                    ),
                  ],
                ),
                const SizedBox(height: 18),
                if (_isLoadingMemberActivity)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 28),
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (memberActivityLogs.isEmpty)
                  Text(
                    'Bu uye icin henuz kaydedilmis bir islem yok.',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: _mutedColor,
                        ),
                  )
                else
                  Column(
                    children: [
                      for (var index = 0;
                          index < memberActivityLogs.length;
                          index++) ...[
                        _MemberActivityEventRow(
                          title: _activityTitle(memberActivityLogs[index]),
                          subtitle: _activitySubtitle(memberActivityLogs[index]),
                          createdAt: memberActivityLogs[index].createdAt,
                        ),
                        if (index != memberActivityLogs.length - 1)
                          const SizedBox(height: 10),
                      ],
                    ],
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSuggestionAssetPreviewFrame(
    BuildContext context,
    SuggestionAsset asset, {
    required bool compact,
  }) {
    final suggestion = _findSuggestionById(asset.suggestionId);
    final imageUrl = _repository.getSuggestionAssetPublicUrl(asset.storagePath);

    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color(0xFFFFFEFB),
            Color(0xFFF8F3EA),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(compact ? 28 : 34),
        border: Border.all(color: _borderColor),
        boxShadow: const [
          BoxShadow(
            color: Color(0x26111E1A),
            blurRadius: 34,
            offset: Offset(0, 22),
          ),
        ],
      ),
      child: Column(
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(
              compact ? 20 : 26,
              compact ? 18 : 22,
              compact ? 16 : 20,
              0,
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        suggestion?.title ?? 'SVG onizleme',
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style:
                            Theme.of(context).textTheme.headlineSmall?.copyWith(
                                  color: _primaryColor,
                                  fontWeight: FontWeight.w800,
                                ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        asset.fileName,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: _mutedColor,
                            ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                IconButton(
                  onPressed: _closeSuggestionAssetPreview,
                  tooltip: 'Kapat',
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: Padding(
              padding: EdgeInsets.fromLTRB(
                compact ? 18 : 26,
                0,
                compact ? 18 : 26,
                compact ? 18 : 24,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      const _MetaPill(label: 'SVG onizleme'),
                      _MetaPill(label: formatDate(asset.createdAt)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Expanded(
                    child: Container(
                      width: double.infinity,
                      padding: EdgeInsets.all(compact ? 18 : 26),
                      decoration: BoxDecoration(
                        color: _surfaceAlt,
                        borderRadius: BorderRadius.circular(26),
                        border:
                            Border.all(color: _borderColor.withValues(alpha: 0.9)),
                      ),
                      child: InteractiveViewer(
                        minScale: 0.8,
                        maxScale: 4,
                        child: Center(
                          child: SvgPicture.network(
                            imageUrl,
                            fit: BoxFit.contain,
                            placeholderBuilder: (context) => const Center(
                              child: SizedBox(
                                width: 28,
                                height: 28,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.4,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSuggestionListPanel(BuildContext context) {
    return _Panel(
      title: 'Oneri listesi',
      subtitle:
          'Toplam puan once gelir, esitlikte ortalama ve son eklenen belirler.',
      child: _orderedSuggestions.isEmpty
          ? _EmptyState(
              title: 'Henuz isim onerisi yok.',
              message: _currentMember == null
                  ? 'Kayit olmadan bilgileri goremezsiniz.'
                  : _isPendingApproval
                      ? 'Admin onayindan sonra oneriler burada gorunur.'
                      : 'Ilk oneriyi ekleyerek listeyi baslatabilirsin.',
            )
          : Column(
              children: [
                for (var index = 0;
                    index < _orderedSuggestions.length;
                    index++) ...[
                  _SuggestionListCard(
                    suggestion: _orderedSuggestions[index],
                    index: index,
                    summary: getSuggestionSummary(
                      _appData.votes,
                      _orderedSuggestions[index].id,
                    ),
                    isSelected: _orderedSuggestions[index].id ==
                        _selectedSuggestion?.id,
                    userVote:
                        _getCurrentMemberVote(_orderedSuggestions[index].id),
                    memberLabel:
                        _memberLabel(_orderedSuggestions[index].memberId),
                    onTap: () {
                      unawaited(
                        _openSuggestionModal(_orderedSuggestions[index].id),
                      );
                    },
                  ),
                  if (index != _orderedSuggestions.length - 1)
                    const SizedBox(height: 12),
                ],
              ],
            ),
    );
  }

  Widget _buildDetailPanel(
    BuildContext context,
    Suggestion? selectedSuggestion, {
    VoidCallback? onDataChanged,
    VoidCallback? onClose,
  }) {
    if (selectedSuggestion == null) {
      return const _Panel(
        title: 'Detay',
        child: _EmptyState(
          title: 'Detay gormek icin bir isim sec.',
          message:
              'Listeye ilk oneriyi ekledikten sonra detaylar burada acilir.',
        ),
      );
    }

    final summary = getSuggestionSummary(_appData.votes, selectedSuggestion.id);
    final suggestionVotes =
        getSuggestionVotes(_appData.votes, selectedSuggestion.id)
          ..sort((left, right) => right.value.compareTo(left.value));
    final suggestionComments = getSuggestionComments(
      _appData.comments,
      selectedSuggestion.id,
    );
    final suggestionAssets = getSuggestionAssets(
      _appData.assets,
      selectedSuggestion.id,
    );
    final commentController = _commentControllerFor(selectedSuggestion.id);

    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 220),
      switchInCurve: Curves.easeOutCubic,
      switchOutCurve: Curves.easeInCubic,
      child: _Panel(
        key: ValueKey(selectedSuggestion.id),
        title: selectedSuggestion.title,
        showTitle: false,
        subtitle:
            '@${_memberLabel(selectedSuggestion.memberId)} tarafindan ${formatDate(selectedSuggestion.createdAt)} tarihinde eklendi.',
        action: _canDeleteSuggestion(selectedSuggestion)
            ? TextButton.icon(
                onPressed: _isSubmitting
                    ? null
                    : () async {
                        await _handleDeleteSuggestion(selectedSuggestion.id);
                        onDataChanged?.call();
                        if (_findSuggestionById(selectedSuggestion.id) ==
                            null) {
                          onClose?.call();
                        }
                      },
                icon: const Icon(Icons.delete_outline),
                label: const Text('Oneriyi sil'),
                style: TextButton.styleFrom(
                  foregroundColor: _dangerColor,
                ),
              )
            : null,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _MiniStatCard(
                    label: 'Toplam puan', value: '${summary.totalScore}'),
                _MiniStatCard(
                  label: 'Ortalama',
                  value: summary.averageScore.toStringAsFixed(1),
                ),
                _MiniStatCard(
                    label: 'Oy sayisi', value: '${summary.voteCount}'),
              ],
            ),
            const SizedBox(height: 18),
            _DetailBlock(
              title: 'Oneri notu',
              trailing: _canEditSuggestionNote(selectedSuggestion) &&
                      _editingSuggestionId != selectedSuggestion.id
                  ? TextButton.icon(
                      onPressed: _isSubmitting
                          ? null
                          : () => _startSuggestionNoteEdit(selectedSuggestion),
                      icon: const Icon(Icons.edit_outlined),
                      label: const Text('Duzenle'),
                    )
                  : null,
              child: _editingSuggestionId == selectedSuggestion.id
                  ? Column(
                      children: [
                        TextField(
                          controller: _editingSuggestionNoteController,
                          maxLength: 300,
                          maxLines: 4,
                          decoration: const InputDecoration(
                            hintText: 'Bu ismi neden sectigini yaz.',
                            counterText: '',
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            FilledButton(
                              onPressed: _isSubmitting
                                  ? null
                                  : () async {
                                      await _handleSuggestionNoteSave(
                                        selectedSuggestion.id,
                                      );
                                      onDataChanged?.call();
                                    },
                              child: const Text('Kaydet'),
                            ),
                            const SizedBox(width: 10),
                            TextButton(
                              onPressed: _isSubmitting
                                  ? null
                                  : _cancelSuggestionNoteEdit,
                              child: const Text('Vazgec'),
                            ),
                          ],
                        ),
                      ],
                    )
                  : Text(
                      selectedSuggestion.note.isEmpty
                          ? 'Bu oneride ek bir not yok.'
                          : selectedSuggestion.note,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                            color: _primaryColor,
                            height: 1.55,
                            fontWeight: FontWeight.w500,
                          ),
                    ),
            ),
            const SizedBox(height: 18),
            _DetailBlock(
              title: 'Amblem / logo',
              trailing: _canUploadSuggestionAssets(selectedSuggestion)
                  ? TextButton.icon(
                      onPressed: _isSubmitting ||
                              suggestionAssets.length >=
                                  maxSuggestionAssetsPerSuggestion
                          ? null
                          : () async {
                              await _handleSuggestionAssetUpload(
                                selectedSuggestion.id,
                              );
                            },
                      icon: const Icon(Icons.upload_file_outlined),
                      label: const Text('SVG yukle'),
                    )
                  : null,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_canUploadSuggestionAssets(selectedSuggestion)) ...[
                    Text(
                      'Yalnizca SVG kabul edilir. Her oneriye en fazla 3 dosya eklenebilir ve dosya basi sinir 400 KB.\nJPG\'den SVG\'ye ceviri kolay site: https://convertio.co/tr/\nRenkli SVG icin: https://www.recraft.ai/',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: _mutedColor,
                          ),
                    ),
                    const SizedBox(height: 14),
                  ],
                  if (suggestionAssets.isEmpty)
                    Text(
                      _canUploadSuggestionAssets(selectedSuggestion)
                          ? 'Bu oneride henuz SVG yok. Buraya amblem ya da logo ekleyebilirsin.'
                          : 'Bu oneride henuz logo eklenmemis.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: _mutedColor,
                          ),
                    )
                  else
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final tileWidth = constraints.maxWidth >= 680
                            ? 168.0
                            : (constraints.maxWidth - 12) / 2;

                        return Wrap(
                          spacing: 12,
                          runSpacing: 12,
                          children: [
                            for (final asset in suggestionAssets)
                              SizedBox(
                                width: tileWidth,
                                child: _SuggestionAssetCard(
                                  asset: asset,
                                  imageUrl:
                                      _repository.getSuggestionAssetPublicUrl(
                                    asset.storagePath,
                                  ),
                                  onPreview: () => unawaited(
                                    _openSuggestionAssetPreview(asset),
                                  ),
                                  canDelete: _canDeleteSuggestionAsset(asset),
                                  onDelete: _isSubmitting
                                      ? null
                                      : () async {
                                          await _handleDeleteSuggestionAsset(
                                            asset,
                                          );
                                        },
                                ),
                              ),
                          ],
                        );
                      },
                    ),
                ],
              ),
            ),
            const SizedBox(height: 18),
            _DetailBlock(
              title: 'Puan ver',
              child: _canParticipate
                  ? _isOwnSelectedSuggestion
                      ? Text(
                          'Kendi onerine puan veremezsin.',
                          style:
                              Theme.of(context).textTheme.bodyMedium?.copyWith(
                                    color: _mutedColor,
                                  ),
                        )
                      : Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Wrap(
                              spacing: 10,
                              runSpacing: 10,
                              children: [
                                for (var value = minVote;
                                    value <= maxVote;
                                    value++)
                                  ChoiceChip(
                                    label: Text('$value'),
                                    selected: _currentSelectedVote == value,
                                    onSelected: _isSubmitting
                                        ? null
                                        : (_) async {
                                            await _handleVote(
                                              selectedSuggestion.id,
                                              value,
                                            );
                                            onDataChanged?.call();
                                          },
                                  ),
                              ],
                            ),
                            if (_currentSelectedVote != null) ...[
                              const SizedBox(height: 12),
                              TextButton(
                                onPressed: _isSubmitting
                                    ? null
                                    : () async {
                                        await _handleClearVote(
                                          selectedSuggestion.id,
                                        );
                                        onDataChanged?.call();
                                      },
                                child: const Text('Oyumu geri al'),
                              ),
                            ],
                          ],
                        )
                  : Text(
                      _isPendingApproval
                          ? 'Admin onayi gelene kadar oy kullanamazsin.'
                          : 'Oy kullanmak icin once giris yap.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: _mutedColor,
                          ),
                    ),
            ),
            const SizedBox(height: 18),
            _DetailBlock(
              title: 'Kim hangi puani verdi?',
              child: suggestionVotes.isEmpty
                  ? Text(
                      'Bu oneride henuz oy yok.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: _mutedColor,
                          ),
                    )
                  : Column(
                      children: [
                        for (var index = 0;
                            index < suggestionVotes.length;
                            index++) ...[
                          _VoteRow(
                            memberLabel:
                                _memberLabel(suggestionVotes[index].memberId),
                            value: suggestionVotes[index].value,
                            dateLabel:
                                formatDate(suggestionVotes[index].updatedAt),
                            showDate: !isLikelyMobileBrowser,
                          ),
                          if (index != suggestionVotes.length - 1)
                            const SizedBox(height: 10),
                        ],
                      ],
                    ),
            ),
            const SizedBox(height: 18),
            _DetailBlock(
              title: 'Yorumlar',
              chrome: false,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (_canParticipate) ...[
                    TextField(
                      controller: commentController,
                      maxLength: 200,
                      maxLines: 3,
                      decoration: const InputDecoration(
                        hintText: 'Bu isim hakkindaki fikrini yaz.',
                        counterText: '',
                      ),
                    ),
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: _isSubmitting
                          ? null
                          : () async {
                              await _handleCommentSubmit(selectedSuggestion.id);
                              onDataChanged?.call();
                            },
                      child: const Text('Yorumu ekle'),
                    ),
                  ] else
                    Text(
                      _isPendingApproval
                          ? 'Admin onayi gelene kadar yorum yapamazsin.'
                          : 'Yorum yapmak icin once giris yap.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: _mutedColor,
                          ),
                    ),
                  const SizedBox(height: 16),
                  if (suggestionComments.isEmpty)
                    Text(
                      'Bu oneride henuz yorum yok.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: _mutedColor,
                          ),
                    )
                  else
                    Column(
                      children: [
                        for (var index = 0;
                            index < suggestionComments.length;
                            index++) ...[
                          _CommentCard(
                            comment: suggestionComments[index],
                            memberLabel: _memberLabel(
                                suggestionComments[index].memberId),
                            canDelete:
                                _canManageComment(suggestionComments[index]),
                            onDelete: _isSubmitting
                                ? null
                                : () async {
                                    await _handleDeleteComment(
                                      suggestionComments[index].id,
                                    );
                                    onDataChanged?.call();
                                  },
                          ),
                          if (index != suggestionComments.length - 1)
                            const SizedBox(height: 12),
                        ],
                      ],
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AmbientBackdrop extends StatelessWidget {
  const _AmbientBackdrop();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Color(0xFFF6F0E4),
            Color(0xFFF1EFE7),
            Color(0xFFEAEFE8),
          ],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
      ),
      child: Stack(
        children: [
          Positioned(
            left: -60,
            top: -40,
            child: Container(
              width: 240,
              height: 240,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _accentSoftColor.withValues(alpha: 0.18),
              ),
            ),
          ),
          Positioned(
            right: -20,
            top: 120,
            child: Container(
              width: 180,
              height: 180,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _heroGlowColor.withValues(alpha: 0.15),
              ),
            ),
          ),
          Positioned(
            left: 40,
            bottom: -40,
            child: Container(
              width: 220,
              height: 220,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: _primaryColor.withValues(alpha: 0.05),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroCopy extends StatelessWidget {
  const _HeroCopy({
    required this.approvedMemberCount,
    required this.suggestionCount,
    required this.activeVoters,
    required this.commentCount,
    required this.showStats,
    required this.pendingMemberCount,
    required this.isAdmin,
  });

  final int approvedMemberCount;
  final int suggestionCount;
  final int activeVoters;
  final int commentCount;
  final bool showStats;
  final int pendingMemberCount;
  final bool isAdmin;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            _MetaPill(
              label: 'Takim ici oylama',
              backgroundColor: Colors.white.withValues(alpha: 0.12),
              borderColor: Colors.white.withValues(alpha: 0.16),
              foregroundColor: Colors.white,
            ),
            if (isAdmin && pendingMemberCount > 0)
              _MetaPill(
                label: '$pendingMemberCount onay bekliyor',
                backgroundColor: _accentColor.withValues(alpha: 0.16),
                borderColor: _accentColor.withValues(alpha: 0.2),
                foregroundColor: Colors.white,
              ),
          ],
        ),
        const SizedBox(height: 16),
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: Text(
            'Voleybol takim adini birlikte secin.',
            style: Theme.of(context).textTheme.displayMedium?.copyWith(
                  color: Colors.white,
                ),
          ),
        ),
        const SizedBox(height: 14),
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: Text(
            'Herkes en fazla 3 isim onerisi girebilir, tum oneriler puanlanabilir, yorumlanabilir ve tum oy dagilimi tek ekranda takip edilebilir.',
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: Colors.white.withValues(alpha: 0.82),
                  height: 1.6,
                ),
          ),
        ),
        if (showStats) ...[
          const SizedBox(height: 22),
          SizedBox(
            width: double.infinity,
            child: LayoutBuilder(
              builder: (context, constraints) {
                const spacing = 12.0;
                final maxWidth = constraints.maxWidth;
                final isCompact = maxWidth < 520;
                final columns = maxWidth >= 760 ? 4 : 2;
                final rawCardWidth = columns == 4
                    ? (maxWidth - (spacing * 3)) / 4
                    : (maxWidth - spacing) / 2;
                final cardWidth = columns == 4
                    ? rawCardWidth.clamp(132.0, 156.0)
                    : rawCardWidth.clamp(118.0, 146.0);

                return Wrap(
                  alignment: WrapAlignment.center,
                  spacing: spacing,
                  runSpacing: spacing,
                  children: [
                    SizedBox(
                      width: cardWidth,
                      child: _StatCard(
                        label: 'Uye',
                        value: approvedMemberCount.toString(),
                        compact: isCompact,
                      ),
                    ),
                    SizedBox(
                      width: cardWidth,
                      child: _StatCard(
                        label: 'Oneri',
                        value: suggestionCount.toString(),
                        compact: isCompact,
                      ),
                    ),
                    SizedBox(
                      width: cardWidth,
                      child: _StatCard(
                        label: 'Aktif oylayan',
                        value: activeVoters.toString(),
                        compact: isCompact,
                      ),
                    ),
                    SizedBox(
                      width: cardWidth,
                      child: _StatCard(
                        label: 'Yorum',
                        value: commentCount.toString(),
                        compact: isCompact,
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
        ],
      ],
    );
  }
}

class _HeroSpotlightCard extends StatelessWidget {
  const _HeroSpotlightCard({
    required this.suggestion,
    required this.summary,
    required this.memberLabel,
    required this.pendingOnlyMode,
    required this.requiresRegistration,
  });

  final Suggestion? suggestion;
  final SuggestionSummary? summary;
  final String? memberLabel;
  final bool pendingOnlyMode;
  final bool requiresRegistration;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(28),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.14),
        ),
      ),
      child: pendingOnlyMode
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Durum',
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: Colors.white.withValues(alpha: 0.74),
                      ),
                ),
                const SizedBox(height: 10),
                Text(
                  'Kaydin admin onayini bekliyor.',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: Colors.white,
                      ),
                ),
                const SizedBox(height: 12),
                Text(
                  'Onay geldigi anda oy, yorum ve oneriler acilacak.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: Colors.white.withValues(alpha: 0.78),
                      ),
                ),
              ],
            )
          : requiresRegistration
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Kayit gerekli',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: Colors.white.withValues(alpha: 0.72),
                          ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'Kayit olmadan bilgileri goremezsiniz.',
                      style:
                          Theme.of(context).textTheme.headlineSmall?.copyWith(
                                color: Colors.white,
                              ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Devam etmek icin once kayit olup giris yapman gerekir.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Colors.white.withValues(alpha: 0.78),
                          ),
                    ),
                  ],
                )
          : suggestion == null || summary == null
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Listenin bos alani',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: Colors.white.withValues(alpha: 0.72),
                          ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      'Ilk oneriyi ekleyen burada one cikar.',
                      style:
                          Theme.of(context).textTheme.headlineSmall?.copyWith(
                                color: Colors.white,
                              ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Kisa ama akilda kalici bir takim ismiyle listeyi baslatabilirsin.',
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Colors.white.withValues(alpha: 0.78),
                          ),
                    ),
                  ],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Su an one cikan isim',
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: Colors.white.withValues(alpha: 0.74),
                          ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      suggestion!.title,
                      style:
                          Theme.of(context).textTheme.headlineSmall?.copyWith(
                                color: Colors.white,
                              ),
                    ),
                    const SizedBox(height: 10),
                    Text(
                      suggestion!.note.isEmpty
                          ? 'Bu oneride ek bir aciklama yok.'
                          : suggestion!.note,
                      maxLines: 3,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: Colors.white.withValues(alpha: 0.8),
                            height: 1.55,
                          ),
                    ),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        _MetaPill(
                          label: '${summary!.totalScore} puan',
                          backgroundColor: Colors.white.withValues(alpha: 0.14),
                          borderColor: Colors.white.withValues(alpha: 0.18),
                          foregroundColor: Colors.white,
                        ),
                        _MetaPill(
                          label: '${summary!.voteCount} oy',
                          backgroundColor: Colors.white.withValues(alpha: 0.14),
                          borderColor: Colors.white.withValues(alpha: 0.18),
                          foregroundColor: Colors.white,
                        ),
                        _MetaPill(
                          label: '@${memberLabel ?? 'uye'}',
                          backgroundColor: Colors.white.withValues(alpha: 0.14),
                          borderColor: Colors.white.withValues(alpha: 0.18),
                          foregroundColor: Colors.white,
                        ),
                      ],
                    ),
                  ],
                ),
    );
  }
}

class _AuthFormShell extends StatelessWidget {
  const _AuthFormShell({
    required this.child,
    super.key,
  });

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: _surfaceAlt,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: _borderColor),
      ),
      child: child,
    );
  }
}

class _SuggestionOverlay extends StatelessWidget {
  const _SuggestionOverlay({
    required this.onClose,
    required this.child,
  });

  final VoidCallback onClose;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final isCompact = MediaQuery.of(context).size.width < 860;
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Material(
      color: Colors.black.withValues(alpha: 0.36),
      child: Stack(
        children: [
          Positioned.fill(
            child: GestureDetector(
              onTap: onClose,
              child: const SizedBox.expand(),
            ),
          ),
          SafeArea(
            child: Align(
              alignment: isCompact ? Alignment.bottomCenter : Alignment.center,
              child: Padding(
                padding: EdgeInsets.fromLTRB(
                  isCompact ? 10 : 24,
                  isCompact ? 10 : 24,
                  isCompact ? 10 : 24,
                  (isCompact ? 10 : 24) + bottomInset,
                ),
                child: GestureDetector(
                  onTap: () {},
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    curve: Curves.easeOutCubic,
                    width: isCompact ? double.infinity : 920,
                    height: isCompact
                        ? MediaQuery.of(context).size.height * 0.92
                        : MediaQuery.of(context).size.height * 0.88,
                    child: child,
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Panel extends StatelessWidget {
  const _Panel({
    required this.title,
    required this.child,
    this.subtitle,
    this.action,
    this.showTitle = true,
    super.key,
  });

  final String title;
  final String? subtitle;
  final Widget child;
  final Widget? action;
  final bool showTitle;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 180),
      width: double.infinity,
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color(0xFFFFFEFB),
            Color(0xFFFBF7EF),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: _borderColor),
        boxShadow: const [
          BoxShadow(
            color: _shadowColor,
            blurRadius: 28,
            offset: Offset(0, 18),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 46,
            height: 5,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(999),
              gradient: const LinearGradient(
                colors: [
                  _accentColor,
                  _accentSoftColor,
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (showTitle)
                      Text(
                        title,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              color: _primaryColor,
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                    if (subtitle != null) ...[
                      SizedBox(height: showTitle ? 6 : 0),
                      Text(
                        subtitle!,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: _mutedColor,
                              height: 1.45,
                            ),
                      ),
                    ],
                  ],
                ),
              ),
              if (action != null) ...[
                const SizedBox(width: 12),
                action!,
              ],
            ],
          ),
          const SizedBox(height: 18),
          child,
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({
    required this.label,
    required this.value,
    this.compact = false,
  });

  final String label;
  final String value;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(minHeight: compact ? 112 : 128),
      padding: EdgeInsets.symmetric(
        horizontal: compact ? 12 : 14,
        vertical: compact ? 14 : 18,
      ),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Colors.white.withValues(alpha: 0.11),
            Colors.white.withValues(alpha: 0.04),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.1),
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            label,
            textAlign: TextAlign.center,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  fontSize: compact ? 13 : 14,
                  color: Colors.white.withValues(alpha: 0.66),
                ),
          ),
          SizedBox(height: compact ? 4 : 6),
          Text(
            value,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontSize: compact ? 34 : null,
                  color: Colors.white,
                  fontWeight: FontWeight.w800,
                ),
          ),
        ],
      ),
    );
  }
}

class _MiniStatCard extends StatelessWidget {
  const _MiniStatCard({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 150,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color(0xFFFFFFFF),
            Color(0xFFF9F5EC),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: _mutedColor,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: _primaryColor,
                ),
          ),
        ],
      ),
    );
  }
}

class _AuthTabButton extends StatelessWidget {
  const _AuthTabButton({
    required this.label,
    required this.isActive,
    required this.onPressed,
  });

  final String label;
  final bool isActive;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return FilledButton.tonal(
      onPressed: onPressed,
      style: FilledButton.styleFrom(
        backgroundColor: isActive ? _primaryColor : Colors.transparent,
        foregroundColor: isActive ? Colors.white : _primaryColor,
        elevation: isActive ? 0 : 0,
        padding: const EdgeInsets.symmetric(vertical: 15),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
        ),
      ),
      child: Text(label),
    );
  }
}

class _InlineMessage extends StatelessWidget {
  const _InlineMessage({
    required this.message,
    required this.color,
  });

  final String message;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.18)),
      ),
      child: Text(
        message,
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: color,
              fontWeight: FontWeight.w700,
            ),
      ),
    );
  }
}

class _PendingMemberCard extends StatelessWidget {
  const _PendingMemberCard({
    required this.member,
    required this.isSubmitting,
    required this.onApprove,
    required this.onReject,
  });

  final Member member;
  final bool isSubmitting;
  final VoidCallback onApprove;
  final VoidCallback onReject;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color(0xFFFFFFFF),
            Color(0xFFF9F4EC),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: _borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '@${member.label}',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: _primaryColor,
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            member.role == MemberRole.admin ? 'admin' : 'uye',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: _mutedColor,
                ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              FilledButton(
                onPressed: isSubmitting ? null : onApprove,
                child: const Text('Onayla'),
              ),
              OutlinedButton(
                onPressed: isSubmitting ? null : onReject,
                style: OutlinedButton.styleFrom(
                  foregroundColor: _dangerColor,
                ),
                child: const Text('Reddet'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MemberBadge extends StatelessWidget {
  const _MemberBadge({
    required this.member,
    required this.isClickable,
    this.onTap,
  });

  final Member member;
  final bool isClickable;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final content = Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 14,
        vertical: 12,
      ),
      decoration: BoxDecoration(
        color: _surfaceAlt,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _borderColor),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '@${member.label}',
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: _primaryColor,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            member.approved ? 'onayli' : 'onay bekliyor',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: _mutedColor,
                ),
          ),
          if (isClickable) ...[
            const SizedBox(height: 6),
            Text(
              'Islemleri gor',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: _accentColor,
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ],
        ],
      ),
    );

    if (!isClickable) {
      return content;
    }

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: content,
    );
  }
}

class _MemberActivityEventRow extends StatelessWidget {
  const _MemberActivityEventRow({
    required this.title,
    required this.subtitle,
    required this.createdAt,
  });

  final String title;
  final String subtitle;
  final DateTime createdAt;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.76),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _borderColor.withValues(alpha: 0.9)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: _primaryColor,
                        fontWeight: FontWeight.w700,
                      ),
                ),
                if (subtitle.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: _mutedColor,
                          height: 1.45,
                        ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(width: 12),
          Text(
            formatDate(createdAt),
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: _mutedColor,
                ),
          ),
        ],
      ),
    );
  }
}

class _SuggestionListCard extends StatelessWidget {
  const _SuggestionListCard({
    required this.suggestion,
    required this.index,
    required this.summary,
    required this.isSelected,
    required this.userVote,
    required this.memberLabel,
    required this.onTap,
  });

  final Suggestion suggestion;
  final int index;
  final SuggestionSummary summary;
  final bool isSelected;
  final int? userVote;
  final String memberLabel;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(24),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 210),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: isSelected
                ? const [
                    Color(0xFFF0F8F5),
                    Color(0xFFFEFCF7),
                  ]
                : const [
                    Color(0xFFFFFEFB),
                    Color(0xFFF8F3EB),
                  ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(26),
          border: Border.all(
            color: isSelected ? _primaryColor : _borderColor,
            width: isSelected ? 1.4 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: isSelected
                  ? _primaryColor.withValues(alpha: 0.08)
                  : _shadowColor,
              blurRadius: isSelected ? 22 : 16,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '#${index + 1}',
                        style: Theme.of(context).textTheme.labelLarge?.copyWith(
                              color: _accentColor,
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        suggestion.title,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              color: _primaryColor,
                              fontWeight: FontWeight.w800,
                            ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 14,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [
                        _primaryColor,
                        Color(0xFF245764),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Column(
                    children: [
                      Text(
                        '${summary.totalScore}',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w800,
                              color: Colors.white,
                            ),
                      ),
                      Text(
                        'puan',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: Colors.white.withValues(alpha: 0.72),
                            ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              suggestion.note.isEmpty ? 'Ek not girilmedi.' : suggestion.note,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: _primaryColor,
                    height: 1.5,
                  ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _MetaPill(label: '@$memberLabel'),
                _MetaPill(label: '${summary.voteCount} oy'),
                _MetaPill(
                    label: 'Ort. ${summary.averageScore.toStringAsFixed(1)}'),
                if (userVote != null) _MetaPill(label: 'Senin oyun: $userVote'),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _MetaPill extends StatelessWidget {
  const _MetaPill({
    required this.label,
    this.backgroundColor,
    this.borderColor,
    this.foregroundColor,
  });

  final String label;
  final Color? backgroundColor;
  final Color? borderColor;
  final Color? foregroundColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: backgroundColor ?? Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: borderColor ?? _borderColor),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: foregroundColor ?? _mutedColor,
              fontWeight: FontWeight.w600,
            ),
      ),
    );
  }
}

class _DetailBlock extends StatelessWidget {
  const _DetailBlock({
    required this.title,
    required this.child,
    this.trailing,
    this.chrome = true,
  });

  final String title;
  final Widget child;
  final Widget? trailing;
  final bool chrome;

  @override
  Widget build(BuildContext context) {
    final content = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(
                title,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: _primaryColor,
                    ),
              ),
            ),
            if (trailing != null) trailing!,
          ],
        ),
        const SizedBox(height: 12),
        child,
      ],
    );

    if (!chrome) {
      return content;
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color(0xFFFFFFFF),
            Color(0xFFF8F3EB),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(26),
        border: Border.all(color: _borderColor),
      ),
      child: content,
    );
  }
}

class _VoteRow extends StatelessWidget {
  const _VoteRow({
    required this.memberLabel,
    required this.value,
    required this.dateLabel,
    required this.showDate,
  });

  final String memberLabel;
  final int value;
  final String dateLabel;
  final bool showDate;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color(0xFFFFFFFF),
            Color(0xFFF9F6EF),
          ],
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: _borderColor),
      ),
      child: Row(
        children: [
          Expanded(
            child: Text(
              '@$memberLabel',
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: _primaryColor,
                    fontWeight: FontWeight.w700,
                  ),
            ),
          ),
          Text(
            '$value puan',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: _accentColor,
                  fontWeight: FontWeight.w800,
                ),
          ),
          if (showDate) ...[
            const SizedBox(width: 12),
            Text(
              dateLabel,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: _mutedColor,
                  ),
            ),
          ],
        ],
      ),
    );
  }
}

class _CommentCard extends StatelessWidget {
  const _CommentCard({
    required this.comment,
    required this.memberLabel,
    required this.canDelete,
    required this.onDelete,
  });

  final CommentEntry comment;
  final String memberLabel;
  final bool canDelete;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 10),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.76),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: _borderColor.withValues(alpha: 0.78)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Wrap(
            spacing: 10,
            runSpacing: 6,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              Text(
                '@$memberLabel',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: _primaryColor,
                      fontWeight: FontWeight.w800,
                    ),
              ),
              Text(
                formatDate(comment.createdAt),
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: _mutedColor,
                    ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.only(left: 14),
            decoration: BoxDecoration(
              border: Border(
                left: BorderSide(
                  color: _accentColor.withValues(alpha: 0.55),
                  width: 3,
                ),
              ),
            ),
            child: Text(
              comment.message,
              style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                    color: _primaryColor,
                    height: 1.6,
                    fontWeight: FontWeight.w600,
                  ),
            ),
          ),
          if (canDelete) ...[
            const SizedBox(height: 8),
            TextButton(
              onPressed: onDelete,
              style: TextButton.styleFrom(
                foregroundColor: _dangerColor,
                padding: EdgeInsets.zero,
              ),
              child: const Text('Yorumu sil'),
            ),
          ],
        ],
      ),
    );
  }
}

class _SuggestionAssetCard extends StatelessWidget {
  const _SuggestionAssetCard({
    required this.asset,
    required this.imageUrl,
    required this.onPreview,
    required this.canDelete,
    required this.onDelete,
  });

  final SuggestionAsset asset;
  final String imageUrl;
  final VoidCallback onPreview;
  final bool canDelete;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.8),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  suggestionAssetFormatLabel,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: _primaryColor,
                        fontWeight: FontWeight.w800,
                      ),
                ),
              ),
              if (canDelete)
                IconButton(
                  onPressed: onDelete,
                  tooltip: 'SVG sil',
                  visualDensity: VisualDensity.compact,
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints.tightFor(
                    width: 32,
                    height: 32,
                  ),
                  icon: const Icon(
                    Icons.delete_outline,
                    size: 18,
                    color: _dangerColor,
                  ),
                ),
            ],
          ),
          const SizedBox(height: 8),
          Material(
            color: Colors.transparent,
            child: InkWell(
              onTap: onPreview,
              borderRadius: BorderRadius.circular(18),
              child: AspectRatio(
                aspectRatio: 1,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: _surfaceAlt,
                    borderRadius: BorderRadius.circular(18),
                    border:
                        Border.all(color: _borderColor.withValues(alpha: 0.9)),
                  ),
                  child: Stack(
                    children: [
                      Positioned.fill(
                        child: SvgPicture.network(
                          imageUrl,
                          fit: BoxFit.contain,
                          placeholderBuilder: (context) => const Center(
                            child: SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(strokeWidth: 2.2),
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        right: 6,
                        bottom: 6,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.88),
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(color: _borderColor),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.open_in_full_rounded,
                                size: 14,
                                color: _primaryColor,
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'Buyut',
                                style: Theme.of(context)
                                    .textTheme
                                    .bodySmall
                                    ?.copyWith(
                                      color: _primaryColor,
                                      fontWeight: FontWeight.w700,
                                    ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            formatDate(asset.createdAt),
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: _mutedColor,
                ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.title,
    required this.message,
  });

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                color: _primaryColor,
                fontWeight: FontWeight.w800,
              ),
        ),
        const SizedBox(height: 8),
        Text(
          message,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: _mutedColor,
                height: 1.45,
              ),
        ),
      ],
    );
  }
}
