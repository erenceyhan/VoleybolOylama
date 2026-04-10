import 'package:intl/intl.dart';

const maxSuggestionsPerMember = 3;
const minVote = 1;
const maxVote = 5;

enum MemberRole { admin, member }

MemberRole parseMemberRole(String value) {
  return value == 'admin' ? MemberRole.admin : MemberRole.member;
}

class Member {
  const Member({
    required this.id,
    required this.username,
    required this.role,
    required this.approved,
    required this.displayName,
  });

  final String id;
  final String username;
  final MemberRole role;
  final bool approved;
  final String displayName;

  bool get isAdmin => role == MemberRole.admin;
  String get label => username.isNotEmpty ? username : displayName;

  factory Member.fromProfileRow(Map<String, dynamic> row) {
    return Member(
      id: row['id'] as String,
      username: (row['username'] as String?) ?? '',
      role: parseMemberRole((row['role'] as String?) ?? 'member'),
      approved: row['approved'] as bool? ?? false,
      displayName: (row['display_name'] as String?) ?? '',
    );
  }
}

class Suggestion {
  const Suggestion({
    required this.id,
    required this.title,
    required this.note,
    required this.memberId,
    required this.createdAt,
  });

  final String id;
  final String title;
  final String note;
  final String memberId;
  final DateTime createdAt;

  factory Suggestion.fromRow(Map<String, dynamic> row) {
    return Suggestion(
      id: row['id'] as String,
      title: row['title'] as String? ?? '',
      note: row['note'] as String? ?? '',
      memberId: row['member_id'] as String,
      createdAt: DateTime.parse(row['created_at'] as String),
    );
  }
}

class VoteEntry {
  const VoteEntry({
    required this.memberId,
    required this.suggestionId,
    required this.value,
    required this.updatedAt,
  });

  final String memberId;
  final String suggestionId;
  final int value;
  final DateTime updatedAt;

  factory VoteEntry.fromRow(Map<String, dynamic> row) {
    return VoteEntry(
      memberId: row['member_id'] as String,
      suggestionId: row['suggestion_id'] as String,
      value: row['value'] as int,
      updatedAt: DateTime.parse(row['updated_at'] as String),
    );
  }
}

class CommentEntry {
  const CommentEntry({
    required this.id,
    required this.suggestionId,
    required this.memberId,
    required this.message,
    required this.createdAt,
  });

  final String id;
  final String suggestionId;
  final String memberId;
  final String message;
  final DateTime createdAt;

  factory CommentEntry.fromRow(Map<String, dynamic> row) {
    return CommentEntry(
      id: row['id'] as String,
      suggestionId: row['suggestion_id'] as String,
      memberId: row['member_id'] as String,
      message: row['message'] as String? ?? '',
      createdAt: DateTime.parse(row['created_at'] as String),
    );
  }
}

class AppData {
  const AppData({
    required this.members,
    required this.suggestions,
    required this.votes,
    required this.comments,
  });

  const AppData.empty()
      : members = const [],
        suggestions = const [],
        votes = const [],
        comments = const [];

  final List<Member> members;
  final List<Suggestion> suggestions;
  final List<VoteEntry> votes;
  final List<CommentEntry> comments;
}

class SuggestionSummary {
  const SuggestionSummary({
    required this.totalScore,
    required this.averageScore,
    required this.voteCount,
  });

  final int totalScore;
  final double averageScore;
  final int voteCount;
}

SuggestionSummary getSuggestionSummary(
    List<VoteEntry> votes, String suggestionId) {
  final suggestionVotes = getSuggestionVotes(votes, suggestionId);
  final totalScore = suggestionVotes.fold<int>(
    0,
    (sum, vote) => sum + vote.value,
  );
  final averageScore =
      suggestionVotes.isNotEmpty ? totalScore / suggestionVotes.length : 0.0;

  return SuggestionSummary(
    totalScore: totalScore,
    averageScore: averageScore,
    voteCount: suggestionVotes.length,
  );
}

List<VoteEntry> getSuggestionVotes(List<VoteEntry> votes, String suggestionId) {
  return votes.where((vote) => vote.suggestionId == suggestionId).toList();
}

List<CommentEntry> getSuggestionComments(
  List<CommentEntry> comments,
  String suggestionId,
) {
  return comments
      .where((comment) => comment.suggestionId == suggestionId)
      .toList();
}

int getMemberSuggestionCount(List<Suggestion> suggestions, String memberId) {
  return suggestions
      .where((suggestion) => suggestion.memberId == memberId)
      .length;
}

int clampVote(int value) {
  if (value < minVote) {
    return minVote;
  }

  if (value > maxVote) {
    return maxVote;
  }

  return value;
}

String formatDate(DateTime date) {
  return DateFormat('dd.MM.yyyy HH:mm', 'tr_TR').format(date.toLocal());
}
