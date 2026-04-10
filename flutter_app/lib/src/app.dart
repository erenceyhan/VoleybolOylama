import 'dart:async';

import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'auth_utils.dart';
import 'models.dart';
import 'repository.dart';

const _pageBackground = Color(0xFFF3EFE6);
const _surfaceColor = Colors.white;
const _surfaceAlt = Color(0xFFFBF8F1);
const _primaryColor = Color(0xFF12343B);
const _accentColor = Color(0xFFDE6B48);
const _mutedColor = Color(0xFF667681);
const _dangerColor = Color(0xFFAF3C30);
const _borderColor = Color(0xFFE2DACE);

enum AuthView { login, register }

class VoleybolFlutterApp extends StatelessWidget {
  const VoleybolFlutterApp({
    required this.initializationError,
    super.key,
  });

  final String? initializationError;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Takim Ismi Oylamasi',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: _pageBackground,
        colorScheme: ColorScheme.fromSeed(
          seedColor: _primaryColor,
          primary: _primaryColor,
          secondary: _accentColor,
          surface: _surfaceColor,
          error: _dangerColor,
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: _surfaceAlt,
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

class _HomePageState extends State<HomePage> {
  late final AppRepository _repository;
  StreamSubscription<AuthState>? _authSubscription;
  Timer? _pendingRefreshTimer;

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
  List<Member> _pendingMembers = const [];
  AuthView _authView = AuthView.login;
  String _loginError = '';
  String _suggestionError = '';
  String _adminError = '';
  bool _isBooting = true;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _repository = AppRepository(Supabase.instance.client);
    _authSubscription = _repository.authStateChanges.listen((_) {
      unawaited(_hydrateRemoteState(showLoading: false));
    });
    unawaited(_hydrateRemoteState());
  }

  @override
  void dispose() {
    _authSubscription?.cancel();
    _pendingRefreshTimer?.cancel();
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
      TextEditingController.new,
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

    try {
      final sessionMember = await _repository.getRemoteSessionMember();

      if (!mounted) {
        return;
      }

      if (sessionMember == null) {
        setState(() {
          _sessionMemberId = null;
          _appData = const AppData.empty();
          _pendingMembers = const [];
          _selectedSuggestionId = null;
          _editingSuggestionId = null;
        });
        _syncPendingTimer();
        return;
      }

      final nextData = await _repository.fetchRemoteAppData();
      final nextPendingMembers = sessionMember.isAdmin
          ? await _repository.fetchPendingMembers()
          : const <Member>[];

      if (!mounted) {
        return;
      }

      setState(() {
        _appData = nextData;
        _sessionMemberId = sessionMember.id;
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

      if (wasPending && !_isPendingApproval) {
        _showNotice('Onayin geldi. Artik uygulamayi kullanabilirsin.');
      }
    } catch (error) {
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

  Future<void> _handleLogin() async {
    final username = _loginUsernameController.text;
    final password = _loginPasswordController.text;

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
      _loginPasswordController.clear();
      await _hydrateRemoteState(showLoading: false);
    } catch (error) {
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
      _registerPasswordController.clear();
      _registerUsernameController.clear();
      _showNotice('Kayit alindi.');
      await _hydrateRemoteState(showLoading: false);
    } catch (error) {
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
    setState(() {
      _isSubmitting = true;
      _editingSuggestionId = null;
    });

    try {
      await _repository.signOutRemote();
      _loginPasswordController.clear();
      _registerPasswordController.clear();
      await _hydrateRemoteState(showLoading: false);
    } catch (error) {
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
      await _hydrateRemoteState(showLoading: false);
    } catch (error) {
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
    setState(() {
      _isSubmitting = true;
    });

    try {
      await _repository.deleteRemoteVote(suggestionId);
      await _hydrateRemoteState(showLoading: false);
    } catch (error) {
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
      controller.clear();
      await _hydrateRemoteState(showLoading: false);
    } catch (error) {
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
      if (_selectedSuggestionId == suggestionId) {
        _selectedSuggestionId = null;
      }
      await _hydrateRemoteState(showLoading: false);
    } catch (error) {
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

    setState(() {
      _isSubmitting = true;
    });

    try {
      await _repository.updateRemoteSuggestionNote(suggestionId, nextNote);
      _editingSuggestionId = null;
      _editingSuggestionNoteController.clear();
      await _hydrateRemoteState(showLoading: false);
    } catch (error) {
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
      await _hydrateRemoteState(showLoading: false);
    } catch (error) {
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
    setState(() {
      _adminError = '';
      _isSubmitting = true;
    });

    try {
      await _repository.updateMemberApproval(memberId, approved);
      _showNotice('Uye onaylandi.');
      await _hydrateRemoteState(showLoading: false);
    } catch (error) {
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
      await _repository.rejectRemoteMember(memberId);
      _showNotice('Kayit reddedildi.');
      await _hydrateRemoteState(showLoading: false);
    } catch (error) {
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

  bool _canManageComment(CommentEntry comment) {
    final currentMember = _currentMember;

    if (currentMember == null) {
      return false;
    }

    return currentMember.id == comment.memberId || _isAdmin;
  }

  String _memberLabel(String memberId) {
    return _membersById[memberId]?.label ?? 'Bilinmeyen uye';
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
    final selectedSuggestion = _selectedSuggestion;
    final approvedMemberCount =
        _appData.members.where((member) => member.approved).length;

    return Scaffold(
      body: SafeArea(
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
                      ? [
                          _buildSuggestionListPanel(context),
                          _buildDetailPanel(context, selectedSuggestion),
                        ]
                      : const <Widget>[];

                  return SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                    child: Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 1340),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            _buildHero(
                              context,
                              approvedMemberCount: approvedMemberCount,
                            ),
                            const SizedBox(height: 18),
                            if (isWide && !_pendingOnlyMode)
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    flex: 11,
                                    child: Column(
                                      children: _withGaps(primaryColumn),
                                    ),
                                  ),
                                  const SizedBox(width: 18),
                                  Expanded(
                                    flex: 13,
                                    child: Column(
                                      children: _withGaps(secondaryColumn),
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
                  );
                },
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
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(32),
        gradient: const LinearGradient(
          colors: [
            Color(0xFF163B42),
            Color(0xFF27545E),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Voleybol takim adini birlikte secin.',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w800,
                    height: 1.1,
                  ),
            ),
            const SizedBox(height: 12),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 760),
              child: Text(
                'Herkes en fazla 3 isim onerisi girebilir, tum oneriler 1 ile 5 arasinda puanlanabilir, yorum yapilabilir ve kim hangi puani vermis tek ekranda gorulebilir.',
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: Colors.white.withValues(alpha: 0.84),
                      height: 1.45,
                    ),
              ),
            ),
            if (!_pendingOnlyMode) ...[
              const SizedBox(height: 20),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: [
                  _StatCard(
                    label: 'Uye',
                    value: approvedMemberCount.toString(),
                  ),
                  _StatCard(
                    label: 'Oneri',
                    value: _appData.suggestions.length.toString(),
                  ),
                  _StatCard(
                    label: 'Aktif oylayan',
                    value: _activeVoters.toString(),
                  ),
                  _StatCard(
                    label: 'Yorum',
                    value: _appData.comments.length.toString(),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
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
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: _surfaceAlt,
                    borderRadius: BorderRadius.circular(22),
                    border: Border.all(color: _borderColor),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '@${currentMember.label}',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w800,
                              color: _primaryColor,
                            ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        currentMember.isAdmin ? 'admin' : 'uye',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: _mutedColor,
                            ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        currentMember.approved || currentMember.isAdmin
                            ? 'Durum: onayli'
                            : 'Durum: onay bekliyor',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: _mutedColor,
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
                Row(
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
                    const SizedBox(width: 10),
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
                const SizedBox(height: 16),
                if (_authView == AuthView.login) ...[
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
                    onSubmitted: (_) => _isSubmitting ? null : _handleLogin(),
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
                      onPressed: _isSubmitting ? null : _handleLogin,
                      child: const Text('Giris yap'),
                    ),
                  ),
                ] else ...[
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
                  Text(
                    getPasswordRuleText(),
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: _mutedColor,
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
                      onPressed: _isSubmitting ? null : _handleRegister,
                      child: const Text('Kaydi tamamla'),
                    ),
                  ),
                ],
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
      child: _appData.members.isEmpty
          ? Text(
              'Uyeleri gormek icin once giris yap.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: _mutedColor,
                  ),
            )
          : Wrap(
              spacing: 10,
              runSpacing: 10,
              children: _appData.members
                  .map(
                    (member) => Container(
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
                            style:
                                Theme.of(context).textTheme.bodyLarge?.copyWith(
                                      fontWeight: FontWeight.w700,
                                      color: _primaryColor,
                                    ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            member.approved ? 'onayli' : 'onay bekliyor',
                            style:
                                Theme.of(context).textTheme.bodySmall?.copyWith(
                                      color: _mutedColor,
                                    ),
                          ),
                        ],
                      ),
                    ),
                  )
                  .toList(),
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
                  ? 'Ilk oneriyi eklemek icin once giris yap.'
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
                      setState(() {
                        _selectedSuggestionId = _orderedSuggestions[index].id;
                      });
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
      BuildContext context, Suggestion? selectedSuggestion) {
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
    final commentController = _commentControllerFor(selectedSuggestion.id);

    return _Panel(
      title: selectedSuggestion.title,
      subtitle:
          '@${_memberLabel(selectedSuggestion.memberId)} tarafindan ${formatDate(selectedSuggestion.createdAt)} tarihinde eklendi.',
      action: _canDeleteSuggestion(selectedSuggestion)
          ? TextButton.icon(
              onPressed: _isSubmitting
                  ? null
                  : () => _handleDeleteSuggestion(selectedSuggestion.id),
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
              _MiniStatCard(label: 'Oy sayisi', value: '${summary.voteCount}'),
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
                                : () => _handleSuggestionNoteSave(
                                      selectedSuggestion.id,
                                    ),
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
            title: 'Puan ver',
            child: _canParticipate
                ? _isOwnSelectedSuggestion
                    ? Text(
                        'Kendi onerine puan veremezsin.',
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
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
                                      : (_) => _handleVote(
                                            selectedSuggestion.id,
                                            value,
                                          ),
                                ),
                            ],
                          ),
                          if (_currentSelectedVote != null) ...[
                            const SizedBox(height: 12),
                            TextButton(
                              onPressed: _isSubmitting
                                  ? null
                                  : () =>
                                      _handleClearVote(selectedSuggestion.id),
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
                        : () => _handleCommentSubmit(selectedSuggestion.id),
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
                          memberLabel:
                              _memberLabel(suggestionComments[index].memberId),
                          canDelete:
                              _canManageComment(suggestionComments[index]),
                          onDelete: _isSubmitting
                              ? null
                              : () => _handleDeleteComment(
                                    suggestionComments[index].id,
                                  ),
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
    );
  }
}

class _Panel extends StatelessWidget {
  const _Panel({
    required this.title,
    required this.child,
    this.subtitle,
    this.action,
  });

  final String title;
  final String? subtitle;
  final Widget child;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: _surfaceColor,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: _borderColor),
        boxShadow: const [
          BoxShadow(
            color: Color(0x11000000),
            blurRadius: 20,
            offset: Offset(0, 12),
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
                      title,
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            color: _primaryColor,
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: 6),
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
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 148,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(22),
        border: Border.all(
          color: Colors.white.withValues(alpha: 0.14),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Colors.white.withValues(alpha: 0.76),
                ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
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
        color: _surfaceAlt,
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
        backgroundColor: isActive ? _primaryColor : _surfaceAlt,
        foregroundColor: isActive ? Colors.white : _primaryColor,
        padding: const EdgeInsets.symmetric(vertical: 14),
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
    return Text(
      message,
      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
            color: color,
            fontWeight: FontWeight.w600,
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
        color: _surfaceAlt,
        borderRadius: BorderRadius.circular(20),
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
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFF1F8F6) : _surfaceAlt,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(
            color: isSelected ? _primaryColor : _borderColor,
            width: isSelected ? 1.4 : 1,
          ),
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
                    horizontal: 12,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: _borderColor),
                  ),
                  child: Column(
                    children: [
                      Text(
                        '${summary.totalScore}',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.w800,
                              color: _primaryColor,
                            ),
                      ),
                      Text(
                        'puan',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: _mutedColor,
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
  });

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: _borderColor),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: _mutedColor,
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
  });

  final String title;
  final Widget child;
  final Widget? trailing;

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
      child: Column(
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
      ),
    );
  }
}

class _VoteRow extends StatelessWidget {
  const _VoteRow({
    required this.memberLabel,
    required this.value,
    required this.dateLabel,
  });

  final String memberLabel;
  final int value;
  final String dateLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
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
          const SizedBox(width: 12),
          Text(
            dateLabel,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: _mutedColor,
                ),
          ),
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
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _borderColor),
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
          Text(
            comment.message,
            style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: _primaryColor,
                  height: 1.6,
                  fontWeight: FontWeight.w500,
                ),
          ),
          if (canDelete) ...[
            const SizedBox(height: 10),
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
