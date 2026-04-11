import 'package:flutter/material.dart';

import 'svg_picker.dart';
import 'svg_picker_types.dart';

typedef SvgFilesPickedCallback = Future<void> Function(
  List<PickedSvgFile> files,
);

class SvgUploadActionButton extends StatelessWidget {
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
  Widget build(BuildContext context) {
    return TextButton.icon(
      onPressed: !enabled
          ? null
          : () async {
              final pickedFiles = await pickSvgFiles(allowMultiple: false);
              if (pickedFiles == null || pickedFiles.isEmpty) {
                return;
              }
              await onFilesPicked(pickedFiles);
            },
      icon: const Icon(Icons.upload_file_outlined),
      label: Text(label),
    );
  }
}
