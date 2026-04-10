import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'src/app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  String? initializationError;

  try {
    await initializeDateFormatting('tr_TR');
    await dotenv.load(fileName: '.env');

    final supabaseUrl = dotenv.env['VITE_SUPABASE_URL']?.trim() ?? '';
    final supabaseAnonKey = dotenv.env['VITE_SUPABASE_ANON_KEY']?.trim() ?? '';

    if (supabaseUrl.isEmpty || supabaseAnonKey.isEmpty) {
      throw Exception('.env icinde Supabase ayarlari eksik.');
    }

    await Supabase.initialize(
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      authOptions: const FlutterAuthClientOptions(
        autoRefreshToken: true,
      ),
    );
  } catch (error) {
    initializationError = error.toString();
  }

  runApp(VoleybolFlutterApp(initializationError: initializationError));
}
