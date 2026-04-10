import 'package:supabase_flutter/supabase_flutter.dart';

import 'auth_utils.dart';
import 'models.dart';

class AppRepository {
  AppRepository(this.client);

  final SupabaseClient client;

  Stream<AuthState> get authStateChanges => client.auth.onAuthStateChange;

  Future<Member?> getRemoteSessionMember() async {
    final session = client.auth.currentSession;

    if (session?.user == null) {
      return null;
    }

    final data = await client
        .from('profiles')
        .select('id, username, display_name, role, approved')
        .eq('id', session!.user.id)
        .maybeSingle();

    if (data == null) {
      return null;
    }

    return Member.fromProfileRow(Map<String, dynamic>.from(data as Map));
  }

  Future<AppData> fetchRemoteAppData() async {
    final results = await Future.wait<dynamic>([
      client
          .from('profiles')
          .select('id, username, display_name, role, approved')
          .order('username'),
      client
          .from('suggestions')
          .select('id, title, note, member_id, created_at'),
      client
          .from('votes')
          .select('member_id, suggestion_id, value, updated_at'),
      client
          .from('comments')
          .select('id, suggestion_id, member_id, message, created_at'),
    ]);

    return AppData(
      members: (results[0] as List<dynamic>)
          .map((row) =>
              Member.fromProfileRow(Map<String, dynamic>.from(row as Map)))
          .toList(),
      suggestions: (results[1] as List<dynamic>)
          .map((row) =>
              Suggestion.fromRow(Map<String, dynamic>.from(row as Map)))
          .toList(),
      votes: (results[2] as List<dynamic>)
          .map(
              (row) => VoteEntry.fromRow(Map<String, dynamic>.from(row as Map)))
          .toList(),
      comments: (results[3] as List<dynamic>)
          .map((row) =>
              CommentEntry.fromRow(Map<String, dynamic>.from(row as Map)))
          .toList(),
    );
  }

  Future<void> signInWithUsernamePassword(
      String username, String password) async {
    await client.auth.signInWithPassword(
      email: getVirtualEmailForUsername(username),
      password: password,
    );
  }

  Future<void> signUpPendingMember({
    required String username,
    required String password,
  }) async {
    final normalizedUsername = normalizeUsername(username);

    final response = await client.auth.signUp(
      email: getVirtualEmailForUsername(normalizedUsername),
      password: password,
      data: {
        'username': normalizedUsername,
      },
    );

    if (response.session == null) {
      throw Exception(
        'Supabase Auth ayarlarinda Confirm email kapali olmali.',
      );
    }

    try {
      await client.rpc(
        'complete_signup',
        params: {
          'display_name_input': normalizedUsername,
        },
      );
    } catch (_) {
      await client.auth.signOut();
      rethrow;
    }
  }

  Future<void> signOutRemote() {
    return client.auth.signOut();
  }

  Future<Suggestion> addRemoteSuggestion(String title, String note) async {
    final session = client.auth.currentSession;

    if (session?.user == null) {
      throw Exception('Oneri eklemek icin giris yapman gerekiyor.');
    }

    final inserted = await client
        .from('suggestions')
        .insert({
          'title': title.trim(),
          'note': note.trim(),
          'member_id': session!.user.id,
        })
        .select('id, title, note, member_id, created_at')
        .single();

    return Suggestion.fromRow(Map<String, dynamic>.from(inserted));
  }

  Future<void> deleteRemoteSuggestion(String suggestionId) {
    return client.from('suggestions').delete().eq('id', suggestionId);
  }

  Future<void> updateRemoteSuggestionNote(String suggestionId, String note) {
    return client.from('suggestions').update({
      'note': note.trim(),
    }).eq('id', suggestionId);
  }

  Future<void> upsertRemoteVote(String suggestionId, int value) async {
    final session = client.auth.currentSession;

    if (session?.user == null) {
      throw Exception('Oy vermek icin giris yapman gerekiyor.');
    }

    await client.from('votes').upsert(
      {
        'member_id': session!.user.id,
        'suggestion_id': suggestionId,
        'value': value,
        'updated_at': DateTime.now().toUtc().toIso8601String(),
      },
      onConflict: 'member_id,suggestion_id',
    );
  }

  Future<void> deleteRemoteVote(String suggestionId) async {
    final session = client.auth.currentSession;

    if (session?.user == null) {
      throw Exception('Oy silmek icin giris yapman gerekiyor.');
    }

    await client
        .from('votes')
        .delete()
        .eq('member_id', session!.user.id)
        .eq('suggestion_id', suggestionId);
  }

  Future<void> addRemoteComment(String suggestionId, String message) async {
    final session = client.auth.currentSession;

    if (session?.user == null) {
      throw Exception('Yorum eklemek icin giris yapman gerekiyor.');
    }

    await client.from('comments').insert({
      'suggestion_id': suggestionId,
      'member_id': session!.user.id,
      'message': message.trim(),
    });
  }

  Future<void> deleteRemoteComment(String commentId) {
    return client.from('comments').delete().eq('id', commentId);
  }

  Future<List<Member>> fetchPendingMembers() async {
    final data = await client
        .from('profiles')
        .select('id, username, display_name, role, approved')
        .eq('approved', false)
        .order('username');

    return (data as List<dynamic>)
        .map((row) =>
            Member.fromProfileRow(Map<String, dynamic>.from(row as Map)))
        .toList();
  }

  Future<void> updateMemberApproval(String memberId, bool approved) {
    return client.rpc(
      'admin_set_member_approval',
      params: {
        'member_id_input': memberId,
        'approved_input': approved,
      },
    );
  }

  Future<void> rejectRemoteMember(String memberId) {
    return client.rpc(
      'admin_reject_member',
      params: {
        'member_id_input': memberId,
      },
    );
  }
}
