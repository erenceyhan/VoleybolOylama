import 'dart:typed_data';

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
      client.from('suggestion_assets').select(
          'id, suggestion_id, member_id, storage_path, mime_type, created_at'),
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
      assets: (results[2] as List<dynamic>)
          .map((row) =>
              SuggestionAsset.fromRow(Map<String, dynamic>.from(row as Map)))
          .toList(),
      votes: (results[3] as List<dynamic>)
          .map(
              (row) => VoteEntry.fromRow(Map<String, dynamic>.from(row as Map)))
          .toList(),
      comments: (results[4] as List<dynamic>)
          .map((row) =>
              CommentEntry.fromRow(Map<String, dynamic>.from(row as Map)))
          .toList(),
    );
  }

  String getSuggestionAssetPublicUrl(String storagePath) {
    return client.storage.from(suggestionAssetBucket).getPublicUrl(storagePath);
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

  Future<void> deleteRemoteSuggestion(String suggestionId) async {
    final assetRows = await client
        .from('suggestion_assets')
        .select('storage_path')
        .eq('suggestion_id', suggestionId);
    final paths = (assetRows as List<dynamic>)
        .map((row) => (row as Map)['storage_path'] as String?)
        .whereType<String>()
        .where((path) => path.trim().isNotEmpty)
        .toList();

    if (paths.isNotEmpty) {
      await client.storage.from(suggestionAssetBucket).remove(paths);
    }

    await client.from('suggestions').delete().eq('id', suggestionId);
  }

  Future<void> updateRemoteSuggestionNote(String suggestionId, String note) {
    return client.from('suggestions').update({
      'note': note.trim(),
    }).eq('id', suggestionId);
  }

  Future<void> uploadSuggestionAsset({
    required String suggestionId,
    required String fileName,
    required Uint8List bytes,
  }) async {
    final session = client.auth.currentSession;

    if (session?.user == null) {
      throw Exception('Logo yuklemek icin giris yapman gerekiyor.');
    }

    if (bytes.length > maxSuggestionAssetBytes) {
      throw Exception('SVG dosyasi en fazla 400 KB olabilir.');
    }

    final normalizedFileName = fileName.trim().toLowerCase();
    if (!normalizedFileName.endsWith('.svg')) {
      throw Exception('Sadece SVG formatinda logo yukleyebilirsin.');
    }

    final suggestionRow = await client
        .from('suggestions')
        .select('member_id')
        .eq('id', suggestionId)
        .maybeSingle();

    if (suggestionRow == null) {
      throw Exception('Logo yuklenecek oneri bulunamadi.');
    }

    if ((suggestionRow as Map)['member_id'] != session!.user.id) {
      throw Exception('Bu dosyalari sadece oneriyi ekleyen uye yukleyebilir.');
    }

    final storagePath = _buildSuggestionAssetPath(
      session.user.id,
      suggestionId,
      fileName,
    );

    await client.storage.from(suggestionAssetBucket).uploadBinary(
          storagePath,
          bytes,
          fileOptions:
              const FileOptions(contentType: 'image/svg+xml', upsert: false),
        );

    try {
      await client.from('suggestion_assets').insert({
        'suggestion_id': suggestionId,
        'member_id': session.user.id,
        'storage_path': storagePath,
        'mime_type': 'image/svg+xml',
      });
    } catch (error) {
      await client.storage.from(suggestionAssetBucket).remove([storagePath]);
      rethrow;
    }
  }

  Future<void> deleteSuggestionAsset(SuggestionAsset asset) async {
    await client.storage
        .from(suggestionAssetBucket)
        .remove([asset.storagePath]);
    await client.from('suggestion_assets').delete().eq('id', asset.id);
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

  Future<void> recordCurrentMemberVisit() {
    return client.rpc('record_member_visit');
  }

  Future<List<MemberVisitEntry>> fetchMemberVisits() async {
    final data = await client
        .from('member_visits')
        .select('id, member_id, created_at')
        .order('created_at', ascending: false);

    return (data as List<dynamic>)
        .map((row) =>
            MemberVisitEntry.fromRow(Map<String, dynamic>.from(row as Map)))
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
    return deleteRemoteMember(memberId);
  }

  Future<void> deleteRemoteMember(String memberId) async {
    final assetRows = await client
        .from('suggestion_assets')
        .select('storage_path')
        .eq('member_id', memberId);
    final paths = (assetRows as List<dynamic>)
        .map((row) => (row as Map)['storage_path'] as String?)
        .whereType<String>()
        .where((path) => path.trim().isNotEmpty)
        .toList();

    if (paths.isNotEmpty) {
      await client.storage.from(suggestionAssetBucket).remove(paths);
    }

    await client.rpc(
      'admin_reject_member',
      params: {
        'member_id_input': memberId,
      },
    );
  }

  String _buildSuggestionAssetPath(
    String memberId,
    String suggestionId,
    String fileName,
  ) {
    final safeFileName = _sanitizeSuggestionAssetFileName(fileName);
    final timestamp = DateTime.now().microsecondsSinceEpoch;
    return '$memberId/$suggestionId/$timestamp-$safeFileName';
  }

  String _sanitizeSuggestionAssetFileName(String fileName) {
    final normalized = fileName.trim().toLowerCase().replaceAll(' ', '-');
    final safe = normalized.replaceAll(RegExp(r'[^a-z0-9._-]'), '');
    if (safe.endsWith('.svg')) {
      return safe;
    }
    return '$safe.svg';
  }
}
