import 'dart:typed_data';

class PickedSvgFile {
  const PickedSvgFile({
    required this.name,
    required this.bytes,
  });

  final String name;
  final Uint8List bytes;
}
