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
  String _serverStatus = 'Iniciando...';
  bool _showDebugInfo = false;
  
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
    setState(() => _serverStatus = 'Obteniendo IP...');
    
    try {
      // Obtener IP local
      final networkInfo = NetworkInfo();
      _localIp = await networkInfo.getWifiIP();
      
      // Si no hay WiFi, intentar obtener IP de cualquier interfaz
      if (_localIp == null || _localIp == '0.0.0.0' || _localIp == '127.0.0.1') {
        final interfaces = await NetworkInterface.list(
          type: InternetAddressType.IPv4,
          includeLinkLocal: false,
        );
        
        for (var interface in interfaces) {
          for (var addr in interface.addresses) {
            if (!addr.isLoopback && 
                addr.type == InternetAddressType.IPv4 &&
                !addr.address.startsWith('169.254.')) { // Evitar link-local
              _localIp = addr.address;
              break;
            }
          }
          if (_localIp != null && _localIp != '127.0.0.1') break;
        }
      }
      
      if (_localIp == null || _localIp == '127.0.0.1') {
        setState(() => _serverStatus = '❌ No se pudo obtener IP');
        print('❌ No se pudo obtener IP local');
        return;
      }
      
      print('📡 IP local detectada: $_localIp');
      setState(() => _serverStatus = 'IP: $_localIp');
      
      // Intentar puertos en orden
      final ports = [8081, 8082, 8083, 8084];
      bool serverStarted = false;
      
      for (final port in ports) {
        try {
          _serverPort = port;
          _localServer = await HttpServer.bind(
            InternetAddress.anyIPv4,
            _serverPort,
          );
          
          print('✅ Servidor local iniciado en http://$_localIp:$_serverPort');
          setState(() => _serverStatus = '✅ Activo: $_localIp:$_serverPort');
          serverStarted = true;
          
          // Escuchar requests
          _localServer!.listen((HttpRequest request) {
            _handleRequest(request);
          });
          
          break;
        } catch (e) {
          print('⚠️ Puerto $_serverPort ocupado, intentando siguiente...');
          continue;
        }
      }
      
      if (!serverStarted) {
        setState(() => _serverStatus = '❌ No se pudo iniciar servidor');
        print('❌ No se pudo iniciar servidor en ningún puerto');
      }
    } catch (e) {
      setState(() => _serverStatus = '❌ Error: $e');
      print('❌ Error iniciando servidor local: $e');
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
    print('📥 Request: ${request.method} ${uri.path} from ${request.connectionInfo?.remoteAddress}');
    
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
        
        print('✅ Respondido /ping exitosamente');
        
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
            // Debug info (tocar 5 veces para mostrar/ocultar)
            Positioned(
              top: 10,
              right: 10,
              child: GestureDetector(
                onTap: () {
                  setState(() => _showDebugInfo = !_showDebugInfo);
                },
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.black54,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Icon(
                    Icons.info_outline,
                    color: Colors.white70,
                    size: 20,
                  ),
                ),
              ),
            ),
            if (_showDebugInfo)
              Positioned(
                top: 50,
                right: 10,
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.black87,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.green, width: 2),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Servidor Local',
                        style: TextStyle(
                          color: Colors.green,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _serverStatus,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                        ),
                      ),
                      if (_localIp != null && _serverPort > 0)
                        Padding(
                          padding: const EdgeInsets.only(top: 8),
                          child: Text(
                            'http://$_localIp:$_serverPort/ping',
                            style: const TextStyle(
                              color: Colors.blue,
                              fontSize: 10,
                              fontFamily: 'monospace',
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
