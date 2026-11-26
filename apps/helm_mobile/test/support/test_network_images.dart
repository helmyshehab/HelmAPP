import 'dart:async';
import 'dart:io';

import 'package:flutter/painting.dart';
import 'package:flutter_test/flutter_test.dart';

/// Minimal valid 1×1 PNG used by [installTestNetworkImages].
const List<int> kTestPngBytes = <int>[
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
];

/// Installs a test [HttpClient] for [Image.network] via Flutter's debug hook.
///
/// Hosts in [failHosts] return HTTP 404. All others return [kTestPngBytes].
void installTestNetworkImages({Set<String> failHosts = const {}}) {
  debugNetworkImageHttpClientProvider = () {
    return _TestImageHttpClient(failHosts: failHosts);
  };
  addTearDown(() {
    debugNetworkImageHttpClientProvider = null;
  });
}

class _TestImageHttpClient implements HttpClient {
  _TestImageHttpClient({required this.failHosts});

  final Set<String> failHosts;

  @override
  bool autoUncompress = true;

  @override
  Duration? connectionTimeout;

  @override
  Duration idleTimeout = const Duration(seconds: 15);

  @override
  int? maxConnectionsPerHost;

  @override
  String? userAgent;

  @override
  Future<HttpClientRequest> getUrl(Uri url) async =>
      _TestImageHttpRequest(url: url, fail: failHosts.contains(url.host));

  @override
  Future<HttpClientRequest> openUrl(String method, Uri url) => getUrl(url);

  @override
  void close({bool force = false}) {}

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _TestImageHttpRequest implements HttpClientRequest {
  _TestImageHttpRequest({required this.url, required this.fail});

  // Not an HttpClientRequest getter on current Dart SDKs; kept for request routing.
  final Uri url;
  final bool fail;

  @override
  final HttpHeaders headers = _TestImageHttpHeaders();

  @override
  bool followRedirects = true;

  @override
  int maxRedirects = 5;

  @override
  bool persistentConnection = true;

  @override
  Future<HttpClientResponse> close() async =>
      _TestImageHttpResponse(fail: fail);

  @override
  void abort([Object? exception, StackTrace? stackTrace]) {}

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _TestImageHttpResponse extends StreamView<List<int>>
    implements HttpClientResponse {
  _TestImageHttpResponse({required this.fail})
      : super(
          fail
              ? const Stream<List<int>>.empty()
              : Stream<List<int>>.fromIterable(<List<int>>[kTestPngBytes]),
        );

  final bool fail;

  @override
  int get statusCode => fail ? HttpStatus.notFound : HttpStatus.ok;

  @override
  int get contentLength => fail ? 0 : kTestPngBytes.length;

  @override
  HttpClientResponseCompressionState get compressionState =>
      HttpClientResponseCompressionState.notCompressed;

  @override
  final HttpHeaders headers = _TestImageHttpHeaders();

  @override
  bool get isRedirect => false;

  @override
  bool get persistentConnection => true;

  @override
  String get reasonPhrase => fail ? 'Not Found' : 'OK';

  @override
  List<RedirectInfo> get redirects => const <RedirectInfo>[];

  @override
  Future<Socket> detachSocket() =>
      Future<Socket>.error(UnsupportedError('detachSocket'));

  @override
  Future<HttpClientResponse> redirect([
    String? method,
    Uri? url,
    bool? followLoops,
  ]) =>
      Future<HttpClientResponse>.error(UnsupportedError('redirect'));

  @override
  X509Certificate? get certificate => null;

  @override
  HttpConnectionInfo? get connectionInfo => null;

  @override
  List<Cookie> get cookies => const <Cookie>[];
}

class _TestImageHttpHeaders implements HttpHeaders {
  final Map<String, List<String>> _map = <String, List<String>>{};

  @override
  void set(String name, Object value, {bool preserveHeaderCase = false}) {
    _map[name.toLowerCase()] = <String>[value.toString()];
  }

  @override
  void add(String name, Object value, {bool preserveHeaderCase = false}) {
    _map.putIfAbsent(name.toLowerCase(), () => <String>[]).add(value.toString());
  }

  @override
  List<String>? operator [](String name) => _map[name.toLowerCase()];

  @override
  String? value(String name) {
    final values = this[name];
    if (values == null || values.isEmpty) return null;
    return values.join(',');
  }

  @override
  void forEach(void Function(String name, List<String> values) action) {
    _map.forEach(action);
  }

  @override
  void clear() => _map.clear();

  @override
  void remove(String name, Object value) {}

  @override
  void removeAll(String name) => _map.remove(name.toLowerCase());

  @override
  bool get chunkedTransferEncoding => false;

  @override
  set chunkedTransferEncoding(bool value) {}

  @override
  int get contentLength => -1;

  @override
  set contentLength(int value) {}

  @override
  ContentType? get contentType => null;

  @override
  set contentType(ContentType? value) {}

  @override
  DateTime? get date => null;

  @override
  set date(DateTime? value) {}

  @override
  DateTime? get expires => null;

  @override
  set expires(DateTime? value) {}

  @override
  String? get host => null;

  @override
  set host(String? value) {}

  @override
  DateTime? get ifModifiedSince => null;

  @override
  set ifModifiedSince(DateTime? value) {}

  @override
  bool get persistentConnection => true;

  @override
  set persistentConnection(bool value) {}

  @override
  int get port => 0;

  @override
  set port(int? value) {}

  @override
  void noFolding(String name) {}
}
