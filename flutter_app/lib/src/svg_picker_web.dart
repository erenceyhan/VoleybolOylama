import 'dart:async';
import 'dart:js_interop';
import 'dart:typed_data';

import 'package:web/web.dart';

import 'svg_picker_types.dart';

Future<List<PickedSvgFile>?> pickSvgFiles({
  bool allowMultiple = false,
}) async {
  final completer = Completer<List<PickedSvgFile>?>();
  final input = HTMLInputElement()
    ..type = 'file'
    ..accept = '.svg,image/svg+xml'
    ..multiple = allowMultiple
    ..style.display = 'none';

  document.body?.children.add(input);

  void cleanup() {
    input.remove();
  }

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

  input.click();

  return completer.future;
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
