import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:http/http.dart' as http;

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
  
  static const String _mainUrl =
      'https://landerlopez1992-cyber.github.io/tropiplussupermarket/tv-selector.html';
  static const String _adminUrl =
      'https://landerlopez1992-cyber.github.io/tropiplussupermarket/admin.html';

  @override
  void initState() {
    super.initState();
    _setupWebView();
    _startAutoRefresh();
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  void _startAutoRefresh() {
    // Recargar cada 5 segundos para obtener datos actualizados
    _refreshTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      if (mounted) {
        _syncDataFromAdmin();
      }
    });
  }

  Future<void> _syncDataFromAdmin() async {
    // Intentar leer los TVs desde el admin web usando JavaScript
    try {
      await _controller.runJavaScript('''
        (function() {
          // Intentar leer desde el admin abierto en otra pestaña
          // O usar BroadcastChannel para comunicación
          const channel = new BroadcastChannel('tropiplus_sync');
          channel.postMessage({type: 'request_tvs'});
          
          // También intentar leer desde localStorage del admin
          // (esto solo funciona si están en el mismo dominio)
          try {
            const adminTvs = localStorage.getItem('tropiplus_tv_configs');
            if (adminTvs) {
              // Ya tenemos los TVs, no hacer nada
              return;
            }
          } catch(e) {}
        })();
      ''');
    } catch (e) {
      print('Error sincronizando: $e');
    }
  }

  void _setupWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.black)
      ..addJavaScriptChannel(
        'FlutterChannel',
        onMessageReceived: (JavaScriptMessage message) {
          // Recibir mensajes del WebView
          if (message.message.startsWith('TVS_DATA:')) {
            final tvsJson = message.message.substring(9);
            _injectTVs(tvsJson);
          }
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            if (mounted) {
              setState(() => _loading = true);
            }
          },
          onPageFinished: (url) async {
            if (mounted) {
              setState(() => _loading = false);
            }
            
            if (url.contains('tv-selector.html')) {
              // Inyectar sesión y sincronizar TVs
              await _injectSession();
              await Future.delayed(const Duration(milliseconds: 500));
              await _setupTVSync();
            }
          },
        ),
      )
      ..loadRequest(Uri.parse(_mainUrl));
  }

  Future<void> _injectSession() async {
    // Inyectar sesión de usuario admin para que pueda ver los TVs
    final session = {
      'id': 'tv_admin_auto',
      'email': 'tallercell0133@gmail.com',
      'loggedIn': true,
      'isAdmin': true,
      'credenciales': true,
      'loginTime': DateTime.now().millisecondsSinceEpoch,
    };

    final sessionJson = jsonEncode(session);
    final passwordB64 = base64Encode(utf8.encode('Maquina2055'));

    await _controller.runJavaScript('''
      (function() {
        try {
          localStorage.setItem('tropiplus_user', '$sessionJson');
          localStorage.setItem('tropiplus_user_id', 'tv_admin_auto');
          localStorage.setItem('tropiplus_user_password', '$passwordB64');
          console.log('✅ Sesión inyectada');
        } catch(e) {
          console.error('Error inyectando sesión:', e);
        }
      })();
    ''');
  }

  Future<void> _setupTVSync() async {
    // Configurar sincronización de TVs desde el admin
    await _controller.runJavaScript('''
      (function() {
        // Escuchar mensajes de sincronización
        const channel = new BroadcastChannel('tropiplus_sync');
        channel.addEventListener('message', function(event) {
          if (event.data.type === 'tvs_data') {
            try {
              localStorage.setItem('tropiplus_tv_configs', JSON.stringify(event.data.tvs));
              if (typeof renderTvList === 'function') {
                renderTvList();
              }
              // Notificar a Flutter
              if (window.FlutterChannel) {
                window.FlutterChannel.postMessage('TVS_DATA:' + JSON.stringify(event.data.tvs));
              }
            } catch(e) {
              console.error('Error guardando TVs:', e);
            }
          }
        });
        
        // Intentar leer TVs desde el admin (si está en la misma sesión)
        try {
          // Esto solo funciona si el admin está en otra pestaña del mismo navegador
          // Para WebView, necesitamos otra solución
          
          // Intentar cargar el admin en un iframe oculto para leer localStorage
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = '$_adminUrl';
          iframe.onload = function() {
            try {
              const adminWindow = iframe.contentWindow;
              if (adminWindow && adminWindow.localStorage) {
                const tvs = adminWindow.localStorage.getItem('tropiplus_tv_configs');
                if (tvs) {
                  localStorage.setItem('tropiplus_tv_configs', tvs);
                  if (typeof renderTvList === 'function') {
                    setTimeout(renderTvList, 100);
                  }
                }
              }
            } catch(e) {
              console.log('No se puede acceder al localStorage del iframe (CORS):', e);
              // Usar método alternativo: fetch del admin y parsear
              _loadTVsFromAdminPage();
            }
          };
          document.body.appendChild(iframe);
        } catch(e) {
          console.error('Error cargando admin:', e);
        }
        
        function _loadTVsFromAdminPage() {
          // Método alternativo: hacer que el admin exponga los TVs
          fetch('$_adminUrl')
            .then(response => response.text())
            .then(html => {
              // El admin tiene los TVs en localStorage, pero no podemos acceder directamente
              // Necesitamos que el admin los exponga de otra forma
              console.log('Admin cargado, pero localStorage no accesible');
            })
            .catch(e => console.error('Error:', e));
        }
      })();
    ''');
  }

  Future<void> _injectTVs(String tvsJson) async {
    await _controller.runJavaScript('''
      (function() {
        try {
          localStorage.setItem('tropiplus_tv_configs', '$tvsJson');
          if (typeof renderTvList === 'function') {
            setTimeout(function() { renderTvList(); }, 100);
          }
        } catch(e) {
          console.error('Error inyectando TVs:', e);
        }
      })();
    ''');
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
