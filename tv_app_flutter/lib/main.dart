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
  List<Map<String, dynamic>> _cachedTVs = [];
  
  static const String _mainUrl =
      'https://landerlopez1992-cyber.github.io/tropiplussupermarket/tv-selector.html';
  static const String _adminUrl =
      'https://landerlopez1992-cyber.github.io/tropiplussupermarket/admin.html';

  @override
  void initState() {
    super.initState();
    _loadTVsFromAdmin();
    _setupWebView();
    _startAutoRefresh();
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  void _startAutoRefresh() {
    // Recargar cada 5 segundos
    _refreshTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      if (mounted) {
        _loadTVsFromAdmin();
        _controller.reload();
      }
    });
  }

  Future<void> _loadTVsFromAdmin() async {
    // Intentar leer los TVs desde el admin usando un iframe
    try {
      await _controller.runJavaScript('''
        (function() {
          // Crear iframe oculto que carga el admin
          let iframe = document.getElementById('admin-iframe-sync');
          if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'admin-iframe-sync';
            iframe.style.display = 'none';
            iframe.style.width = '1px';
            iframe.style.height = '1px';
            iframe.style.position = 'absolute';
            iframe.style.left = '-9999px';
            iframe.src = '$_adminUrl';
            document.body.appendChild(iframe);
          }
          
          // Esperar a que el iframe cargue y luego leer los TVs
          iframe.onload = function() {
            setTimeout(function() {
              try {
                const adminWindow = iframe.contentWindow;
                if (adminWindow) {
                  // Intentar leer desde window.tropiplusTVs
                  if (adminWindow.tropiplusTVs) {
                    const tvs = adminWindow.tropiplusTVs;
                    localStorage.setItem('tropiplus_tv_configs', JSON.stringify(tvs));
                    console.log('✅ TVs cargados desde admin:', tvs.length);
                    if (typeof renderTvList === 'function') {
                      setTimeout(function() { renderTvList(); }, 100);
                    }
                    return;
                  }
                  
                  // Intentar leer desde el script tag
                  const scriptTag = adminWindow.document.getElementById('tropiplus-tvs-data');
                  if (scriptTag && scriptTag.textContent) {
                    const tvs = JSON.parse(scriptTag.textContent);
                    localStorage.setItem('tropiplus_tv_configs', JSON.stringify(tvs));
                    console.log('✅ TVs cargados desde script tag:', tvs.length);
                    if (typeof renderTvList === 'function') {
                      setTimeout(function() { renderTvList(); }, 100);
                    }
                    return;
                  }
                  
                  // Intentar leer desde localStorage del iframe
                  try {
                    const tvs = adminWindow.localStorage.getItem('tropiplus_tv_configs');
                    if (tvs) {
                      localStorage.setItem('tropiplus_tv_configs', tvs);
                      console.log('✅ TVs cargados desde localStorage del iframe');
                      if (typeof renderTvList === 'function') {
                        setTimeout(function() { renderTvList(); }, 100);
                      }
                    }
                  } catch(e) {
                    console.log('No se puede acceder al localStorage del iframe (CORS):', e);
                  }
                }
              } catch(e) {
                console.error('Error leyendo TVs del iframe:', e);
              }
            }, 2000);
          };
          
          // Si el iframe ya está cargado, intentar leer inmediatamente
          if (iframe.contentWindow && iframe.contentWindow.document.readyState === 'complete') {
            iframe.onload();
          }
        })();
      ''');
    } catch (e) {
      print('Error configurando carga de TVs: $e');
    }
  }

  void _setupWebView() {
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
          onPageFinished: (url) async {
            if (mounted) {
              setState(() => _loading = false);
            }
            
            if (url.contains('tv-selector.html')) {
              // Inyectar sesión
              await _injectSession();
              await Future.delayed(const Duration(milliseconds: 500));
              // Cargar TVs desde el admin
              await _loadTVsFromAdmin();
            }
          },
        ),
      )
      ..loadRequest(Uri.parse(_mainUrl));
  }

  Future<void> _injectSession() async {
    // Inyectar sesión de usuario admin
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
        } catch(e) {
          console.error('Error inyectando sesión:', e);
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
