import 'dart:async';
import 'dart:js_interop';
import 'dart:typed_data';

import 'package:web/web.dart';

import 'svg_picker_types.dart';

HTMLInputElement? _persistentSafariMobileInput;

Future<List<PickedSvgFile>?> pickSvgFiles({
  bool allowMultiple = false,
}) async {
  final completer = Completer<List<PickedSvgFile>?>();
  final safariMobileBrowser = _isMobileSafariBrowser();
  final input = safariMobileBrowser
      ? _ensurePersistentSafariMobileInput()
      : HTMLInputElement()
    ..type = 'file';

  input
    ..accept = safariMobileBrowser ? '' : '.svg'
    ..multiple = allowMultiple
    ..value = '';

  if (!safariMobileBrowser) {
    input.style
      ..opacity = '0'
      ..position = 'fixed'
      ..left = '-1000px'
      ..top = '0'
      ..width = '1px'
      ..height = '1px'
      ..pointerEvents = 'none';
    document.body?.children.add(input);
  }

  void cleanup() {
    if (!safariMobileBrowser) {
      input.remove();
    }
  }

  late EventListener focusListener;

  input.onChange.listen((_) async {
    final files = input.files;
    if (files == null || files.length == 0) {
      if (!completer.isCompleted) {
        completer.complete(null);
      }
      cleanup();
      return;
    }

    final pickedFiles = <PickedSvgFile>[];

    for (var index = 0; index < files.length; index++) {
      final file = files.item(index);
      if (file == null) {
        continue;
      }

      final bytes = await _readFileBytes(file);
      pickedFiles.add(PickedSvgFile(name: file.name, bytes: bytes));
    }

    if (!completer.isCompleted) {
      completer.complete(pickedFiles);
    }
    cleanup();
  });

  focusListener = ((Event _) {
    window.removeEventListener('focus', focusListener);
    Future<void>.delayed(const Duration(milliseconds: 350), () {
      final hasSelection = (input.files?.length ?? 0) > 0;
      if (!hasSelection && !completer.isCompleted) {
        completer.complete(null);
        cleanup();
      }
    });
  }).toJS;
  window.addEventListener('focus', focusListener);

  if (safariMobileBrowser) {
    input.click();
  } else {
    try {
      input.showPicker();
    } catch (_) {
      input.click();
    }
  }

  return completer.future;
}

HTMLInputElement _ensurePersistentSafariMobileInput() {
  final existingInput = _persistentSafariMobileInput;
  if (existingInput != null) {
    return existingInput;
  }

  final input = HTMLInputElement()
    ..type = 'file'
    ..style.position = 'fixed'
    ..style.left = '0'
    ..style.top = '0'
    ..style.width = '1px'
    ..style.height = '1px'
    ..style.opacity = '0.001'
    ..style.zIndex = '-1';

  document.body?.children.add(input);
  _persistentSafariMobileInput = input;
  return input;
}

Future<Uint8List> _readFileBytes(File file) async {
  final completer = Completer<Uint8List>();
  final reader = FileReader();

  reader.onLoadEnd.listen((_) {
    final result = reader.result;
    if (result == null || !result.isA<JSArrayBuffer>()) {
      completer.complete(Uint8List(0));
      return;
    }

    completer.complete((result as JSArrayBuffer).toDart.asUint8List());
  });

  reader.readAsArrayBuffer(file);
  return completer.future;
}

bool _isMobileSafariBrowser() {
  final userAgent = window.navigator.userAgent.toLowerCase();
  final isIos = userAgent.contains('iphone') ||
      userAgent.contains('ipad') ||
      userAgent.contains('ipod');
  final isSafari = userAgent.contains('safari') &&
      !userAgent.contains('crios') &&
      !userAgent.contains('fxios') &&
      !userAgent.contains('edgios') &&
      !userAgent.contains('opr/');
  return isIos && isSafari;
}
