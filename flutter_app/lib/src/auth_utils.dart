import 'package:supabase_flutter/supabase_flutter.dart';

const adminUsername = 'erenceyhan';

final _usernamePattern = RegExp(r'^[a-z0-9._-]{3,24}$');
final _passwordPattern = RegExp(r'^(?=(?:.*\d){2,}).{6,}$');

String normalizeUsername(String username) {
  return username.trim().toLowerCase();
}

bool isValidUsername(String username) {
  return _usernamePattern.hasMatch(normalizeUsername(username));
}

String getVirtualEmailForUsername(String username) {
  return '${normalizeUsername(username)}@erenceyhan.github.io';
}

bool isValidPassword(String password) {
  return _passwordPattern.hasMatch(password.trim());
}

String getPasswordRuleText() {
  return 'Sifre en az 6 karakter olmali ve en az 2 rakam icermeli.';
}

String getAuthErrorMessage(Object error) {
  final message = switch (error) {
    AuthException authException => authException.message,
    PostgrestException postgrestException => postgrestException.message,
    StorageException storageException => storageException.message,
    _ => error.toString().replaceFirst('Exception: ', ''),
  };

  final lowered = message.toLowerCase();

  if (lowered.contains('email rate limit exceeded')) {
    return 'Supabase kayit sirasinda dogrulama maili gondermeye calisiyor. Confirm email kapali olmali.';
  }

  if (lowered.contains('email address') && lowered.contains('invalid')) {
    return 'Teknik auth email formati reddedildi. Sayfayi yenileyip tekrar dene.';
  }

  if (lowered.contains('email signups are disabled')) {
    return 'Supabase panelinde Email provider ve signup ayari kapali gorunuyor.';
  }

  if (lowered.contains('user already registered')) {
    return 'Bu kullanici adi zaten kayitli.';
  }

  if (isSessionTimeoutError(error)) {
    return 'Uzun sure islem yapilmadigi icin tekrar giris yapman gerekiyor.';
  }

  return message;
}

bool isSessionTimeoutError(Object error) {
  final message = switch (error) {
    AuthException authException => authException.message,
    PostgrestException postgrestException => postgrestException.message,
    StorageException storageException => storageException.message,
    _ => error.toString().replaceFirst('Exception: ', ''),
  };

  final lowered = message.toLowerCase();
  return lowered.contains('session_timeout') ||
      lowered.contains('uzun sure islem yapilmadigi') ||
      lowered.contains('tekrar giris yapman gerekiyor');
}
