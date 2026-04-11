import 'dart:async';
import 'dart:js_interop';
import 'dart:typed_data';
import 'dart:ui_web' as ui_web;

import 'package:flutter/material.dart';
import 'package:web/web.dart' as web;

import 'svg_picker.dart';
import 'svg_picker_types.dart';

typedef SvgFilesPickedCallback = Future<void> Function(
  List<PickedSvgFile> files,
);

class SvgUploadActionButton extends StatefulWidget {
  const SvgUploadActionButton({
    required this.enabled,
    required this.label,
    required this.onFilesPicked,
    super.key,
  });

  final bool enabled;
  final String label;
  final SvgFilesPickedCallback onFilesPicked;

  @override
  State<SvgUploadActionButton> createState() => _SvgUploadActionButtonState();
}

class _SvgUploadActionButtonState extends State<SvgUploadActionButton> {
  static int _nextId = 0;

  late final String _viewType;
  late final web.HTMLDivElement _root;
  late final web.HTMLInputElement _input;
  late final web.HTMLSpanElement _label;
  late final web.HTMLSpanElement _icon;

  @override
  void initState() {
    super.initState();
    _viewType = 'svg-upload-action-${_nextId++}';
    _root = web.HTMLDivElement();
    _input = web.HTMLInputElement()
      ..type = 'file'
      ..accept = ''
      ..multiple = false;
    _label = web.HTMLSpanElement();
    _icon = web.HTMLSpanElement();

    _configureDom();

    ui_web.platformViewRegistry.registerViewFactory(
      _viewType,
      (viewId) => _root,
    );
  }

  @override
  void didUpdateWidget(covariant SvgUploadActionButton oldWidget) {
    super.didUpdateWidget(oldWidget);
    _applyStateToDom();
  }

  @override
  void dispose() {
    _root.remove();
    super.dispose();
  }

  void _configureDom() {
    _root.style
      ..position = 'relative'
      ..display = 'inline-flex'
      ..alignItems = 'center'
      ..justifyContent = 'center'
      ..gap = '8px'
      ..height = '40px'
      ..padding = '0 14px'
      ..borderRadius = '16px'
      ..fontFamily = 'sans-serif'
      ..fontSize = '13px'
      ..fontWeight = '700'
      ..boxSizing = 'border-box'
      ..overflow = 'hidden';

    _icon.textContent = '↑';
    _icon.style
      ..fontSize = '14px'
      ..lineHeight = '1';

    _label.textContent = widget.label;

    _input.style
      ..position = 'absolute'
      ..inset = '0'
      ..width = '100%'
      ..height = '100%'
      ..opacity = '0'
      ..cursor = 'pointer';

    _input.onChange.listen((_) async {
      final files = _input.files;
      if (files == null || files.length == 0) {
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

      _input.value = '';

      if (pickedFiles.isEmpty || !mounted) {
        return;
      }

      unawaited(widget.onFilesPicked(pickedFiles));
    });

    _root.children.add(_icon);
    _root.children.add(_label);
    _root.children.add(_input);

    _applyStateToDom();
  }

  void _applyStateToDom() {
    final enabled = widget.enabled;
    _label.textContent = widget.label;

    _root.style
      ..backgroundColor = enabled ? '#12343B00' : '#12343B00'
      ..color = enabled ? '#12343B' : '#90A0A8'
      ..border = '1px solid ${enabled ? '#00000000' : '#00000000'}'
      ..opacity = enabled ? '1' : '0.55';

    _input.disabled = !enabled;
    _input.style.pointerEvents = enabled ? 'auto' : 'none';
    _input.style.cursor = enabled ? 'pointer' : 'default';
  }

  @override
  Widget build(BuildContext context) {
    if (!_isSafariLikeBrowser()) {
      return TextButton.icon(
        onPressed: !widget.enabled
            ? null
            : () async {
                final pickedFiles = await pickSvgFiles(allowMultiple: false);
                if (pickedFiles == null || pickedFiles.isEmpty) {
                  return;
                }
                await widget.onFilesPicked(pickedFiles);
              },
        icon: const Icon(Icons.upload_file_outlined),
        label: Text(widget.label),
      );
    }

    return SizedBox(
      width: 118,
      height: 40,
      child: HtmlElementView(viewType: _viewType),
    );
  }
}

Future<Uint8List> _readFileBytes(web.File file) async {
  final completer = Completer<Uint8List>();
  final reader = web.FileReader();

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

bool _isSafariLikeBrowser() {
  final userAgent = web.window.navigator.userAgent.toLowerCase();
  final isIos = userAgent.contains('iphone') ||
      userAgent.contains('ipad') ||
      userAgent.contains('ipod');
  final isSafari = userAgent.contains('safari') &&
      !userAgent.contains('crios') &&
      !userAgent.contains('fxios') &&
      !userAgent.contains('edgios');
  return isIos || isSafari;
}
