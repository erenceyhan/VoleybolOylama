import 'dart:js_interop';

import 'package:web/web.dart';

bool get isLikelyMobileBrowser {
  final userAgent = window.navigator.userAgent.toLowerCase();
  return userAgent.contains('iphone') ||
      userAgent.contains('ipad') ||
      userAgent.contains('ipod') ||
      (userAgent.contains('android') && userAgent.contains('mobile'));
}

bool get isMobileSafariBrowser {
  final userAgent = window.navigator.userAgent.toLowerCase();
  final isIos = userAgent.contains('iphone') ||
      userAgent.contains('ipad') ||
      userAgent.contains('ipod');
  final isSafari = userAgent.contains('safari') &&
      !userAgent.contains('crios') &&
      !userAgent.contains('fxios') &&
      !userAgent.contains('edgios') &&
      !userAgent.contains('opr/') &&
      !userAgent.contains('mercury');
  return isIos && isSafari;
}

void scrollToTop() {
  window.scrollTo(0.toJS, 0);
}
