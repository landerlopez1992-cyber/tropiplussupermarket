import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:network_info_plus/network_info_plus.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Tropiplus TV',
      debugShowCheckedModeBanner: false,
      home: const TVBrowser(),
    );
  }
}

class TVBrowser extends StatefulWidget {
  const TVBrowser({super.key});

  @override
  State<TVBrowser> createState() => _TVBrowserState();
}

class _TVBrowserState extends State<TVBrowser> {
  late WebViewController _controller;
  bool _loading = true;
  Timer? _refreshTimer;
  HttpServer? _localServer;
  String? _localIp;
  int _serverPort = 8081;
  
  static const String _mainUrl =
      'https://landerlopez1992-cyber.github.io/tropiplussupermarket/tv-selector.html';

  @override
  void initState() {
    super.initState();
    _startLocalServer();
    _setupWebView();
    _startAutoRefresh();
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    _localServer?.close(force: true);
    super.dispose();
  }

  Future<void> _startLocalServer() async {
    try {
      // Obtener IP local
      final networkInfo = NetworkInfo();
      _localIp = await networkInfo.getWifiIP();
      
      // Si no hay WiFi, intentar obtener IP de cualquier interfaz
      if (_localIp == null || _localIp == '0.0.0.0') {
        final interfaces = await NetworkInterface.list(
          type: InternetAddressType.IPv4,
          includeLinkLocal: false,
        );
        
        for (var interface in interfaces) {
          for (var addr in interface.addresses) {
            if (!addr.isLoopback && addr.type == InternetAddressType.IPv4) {
              _localIp = addr.address;
              break;
            }
          }
          if (_localIp != null) break;
        }
      }
      
      print('📡 IP local detectada: $_localIp');
      
      // Iniciar servidor HTTP
      _localServer = await HttpServer.bind(
        InternetAddress.anyIPv4,
        _serverPort,
      );
      
      print('✅ Servidor local iniciado en http://$_localIp:$_serverPort');
      
      // Escuchar requests
      _localServer!.listen((HttpRequest request) {
        _handleRequest(request);
      });
    } catch (e) {
      print('❌ Error iniciando servidor local: $e');
      // Intentar otro puerto
      _serverPort = 8082;
      try {
        _localServer = await HttpServer.bind(
          InternetAddress.anyIPv4,
          _serverPort,
        );
        print('✅ Servidor local iniciado en puerto alternativo: $_serverPort');
        _localServer!.listen((HttpRequest request) {
          _handleRequest(request);
        });
      } catch (e2) {
        print('❌ Error iniciando servidor en puerto alternativo: $e2');
      }
    }
  }

  Future<void> _handleRequest(HttpRequest request) async {
    // CORS headers
    request.response.headers.add('Access-Control-Allow-Origin', '*');
    request.response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    request.response.headers.add('Access-Control-Allow-Headers', 'Content-Type');
    
    if (request.method == 'OPTIONS') {
      request.response.statusCode = 200;
      await request.response.close();
      return;
    }
    
    final uri = request.uri;
    print('📥 Request: ${request.method} ${uri.path}');
    
    try {
      if (uri.path == '/ping' || uri.path == '/status') {
        // Endpoint para detectar la app
        final prefs = await SharedPreferences.getInstance();
        final tvName = prefs.getString('tv_name') ?? 'TV Sin Nombre';
        
        final response = {
          'status': 'online',
          'app': 'Tropiplus TV',
          'name': tvName,
          'ip': _localIp,
          'port': _serverPort,
          'timestamp': DateTime.now().toIso8601String(),
        };
        
        request.response
          ..statusCode = 200
          ..headers.contentType = ContentType.json
          ..write(jsonEncode(response));
        await request.response.close();
        
      } else if (uri.path == '/cast' && request.method == 'POST') {
        // Endpoint para recibir transmisión (cambiar URL del WebView)
        final body = await utf8.decoder.bind(request).join();
        final data = jsonDecode(body) as Map<String, dynamic>;
        final url = data['url'] as String?;
        
        if (url != null) {
          print('📺 Recibiendo transmisión: $url');
          
          // Guardar URL en SharedPreferences
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString('cast_url', url);
          
          // Cambiar URL del WebView
          if (mounted) {
            _controller.loadRequest(Uri.parse(url));
          }
          
          request.response
            ..statusCode = 200
            ..headers.contentType = ContentType.json
            ..write(jsonEncode({'success': true, 'message': 'Transmisión recibida'}));
        } else {
          request.response
            ..statusCode = 400
            ..headers.contentType = ContentType.json
            ..write(jsonEncode({'success': false, 'error': 'URL no proporcionada'}));
        }
        await request.response.close();
        
      } else {
        // 404
        request.response
          ..statusCode = 404
          ..write('Not Found');
        await request.response.close();
      }
    } catch (e) {
      print('❌ Error manejando request: $e');
      request.response
        ..statusCode = 500
        ..write('Internal Server Error: $e');
      await request.response.close();
    }
  }

  void _startAutoRefresh() {
    // Recargar cada 5 segundos
    _refreshTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      if (mounted) {
        _controller.reload();
      }
    });
  }

  void _setupWebView() async {
    // Verificar si hay URL de transmisión guardada
    final prefs = await SharedPreferences.getInstance();
    final castUrl = prefs.getString('cast_url');
    final initialUrl = castUrl ?? _mainUrl;
    
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.black)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (mounted) {
              setState(() => _loading = true);
            }
          },
          onPageFinished: (_) {
            if (mounted) {
              setState(() => _loading = false);
            }
          },
        ),
      )
      ..loadRequest(Uri.parse(initialUrl));
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) {
          _controller.canGoBack().then((canGoBack) {
            if (canGoBack) {
              _controller.goBack();
            } else {
              _controller.loadRequest(Uri.parse(_mainUrl));
            }
          });
        }
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: Stack(
          children: [
            WebViewWidget(controller: _controller),
            if (_loading)
              Container(
                color: Colors.black,
                child: const Center(
                  child: CircularProgressIndicator(
                    valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF42B649)),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
