import 'package:web/web.dart';

const _lastInteractionPrefix = 'voleybol:last-interaction:';

DateTime? readLastInteractionAt(String memberId) {
  final rawValue =
      window.localStorage.getItem('$_lastInteractionPrefix$memberId');
  if (rawValue == null || rawValue.isEmpty) {
    return null;
  }

  return DateTime.tryParse(rawValue)?.toUtc();
}

void writeLastInteractionAt(String memberId, DateTime timestamp) {
  window.localStorage.setItem(
    '$_lastInteractionPrefix$memberId',
    timestamp.toUtc().toIso8601String(),
  );
}

void clearLastInteractionAt(String memberId) {
  window.localStorage.removeItem('$_lastInteractionPrefix$memberId');
}
