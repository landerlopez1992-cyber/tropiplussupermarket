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
      home: const TVScreen(),
    );
  }
}

class TVScreen extends StatefulWidget {
  const TVScreen({super.key});

  @override
  State<TVScreen> createState() => _TVScreenState();
}

class _TVScreenState extends State<TVScreen> {
  late WebViewController _controller;
  bool _loading = true;
  final FocusNode _focusNode = FocusNode();
  String _currentUrl = '';
  Timer? _syncTimer;
  List<Map<String, dynamic>> _tvs = [];
  
  static const String _selectorUrl =
      'https://landerlopez1992-cyber.github.io/tropiplussupermarket/tv-selector.html';
  static const String _tvsJsonUrl =
      'https://landerlopez1992-cyber.github.io/tropiplussupermarket/tvs.json';

  @override
  void initState() {
    super.initState();
    _loadTVsFromJSON();
    _setupWebView();
    _startSyncTimer();
  }

  @override
  void dispose() {
    _focusNode.dispose();
    _syncTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadTVsFromJSON() async {
    try {
      final response = await http.get(Uri.parse(_tvsJsonUrl));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as List;
        setState(() {
          _tvs = data.cast<Map<String, dynamic>>();
        });
        print('✅ TVs cargados desde JSON: ${_tvs.length}');
      }
    } catch (e) {
      print('⚠️ Error cargando TVs desde JSON: $e');
    }
  }

  void _startSyncTimer() {
    _syncTimer = Timer.periodic(const Duration(minutes: 2), (timer) {
      _loadTVsFromJSON();
      _controller.reload();
    });
  }

  void _setupWebView() {
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.black)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (url) {
            setState(() {
              _currentUrl = url;
              _loading = true;
            });
          },
          onPageFinished: (url) async {
            setState(() {
              _loading = false;
              _currentUrl = url;
            });
            
            if (url.contains('tv-selector.html')) {
              await _injectTVsAndSession();
              await Future.delayed(const Duration(milliseconds: 500));
              await _injectRemoteControlForSelector();
              await _injectReloadButton();
            } else if (url.contains('tv.html')) {
              await Future.delayed(const Duration(milliseconds: 300));
              await _hideWebHeader();
            }
          },
        ),
      )
      ..loadRequest(Uri.parse(_selectorUrl));
  }

  Future<void> _injectTVsAndSession() async {
    final session = {
      'id': 'tv_admin',
      'email': 'tallercell0133@gmail.com',
      'loggedIn': true,
      'isAdmin': true,
      'credenciales': true,
    };

    final sessionJson = jsonEncode(session);
    final tvsJson = jsonEncode(_tvs);

    await _controller.runJavaScript('''
      (function() {
        try {
          localStorage.setItem('tropiplus_user', '$sessionJson');
          localStorage.setItem('tropiplus_user_id', 'tv_admin');
          localStorage.setItem('tropiplus_tv_configs', '$tvsJson');
          console.log('✅ TVs inyectados: ${_tvs.length}');
          
          if (typeof renderTvList === 'function') {
            setTimeout(function() { renderTvList(); }, 100);
            setTimeout(function() { renderTvList(); }, 500);
            setTimeout(function() { renderTvList(); }, 1000);
          }
        } catch(e) {
          console.error('Error inyectando:', e);
        }
      })();
    ''');
  }

  Future<void> _injectReloadButton() async {
    await _controller.runJavaScript('''
      (function() {
        if (document.getElementById('flutter-reload-btn')) return;
        
        var btn = document.createElement('div');
        btn.id = 'flutter-reload-btn';
        btn.innerHTML = '<i class="fas fa-sync-alt"></i> ACTUALIZAR';
        btn.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #42b649 0%, #2e8b38 100%);
          color: white;
          padding: 12px 24px;
          border-radius: 30px;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(66, 182, 73, 0.4);
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.3s;
          border: 2px solid rgba(255,255,255,0.3);
        `;
        
        btn.addEventListener('click', function() {
          btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ACTUALIZANDO...';
          window.location.reload();
        });
        
        btn.setAttribute('tabindex', '0');
        btn.addEventListener('keydown', function(e) {
          if (e.key === 'Enter' || e.key === ' ') {
            btn.click();
          }
        });
        
        document.body.appendChild(btn);
      })();
    ''');
  }

  Future<void> _hideWebHeader() async {
    await _controller.runJavaScript('''
      (function() {
        var style = document.createElement('style');
        style.textContent = `
          .tv-header, #tv-header, header {
            display: none !important;
          }
          .tv-root {
            grid-template-rows: 0px 1fr 56px !important;
          }
        `;
        document.head.appendChild(style);
      })();
    ''');
  }

  Future<void> _injectRemoteControlForSelector() async {
    await _controller.runJavaScript('''
      (function() {
        if (window.__tvRemoteInjected) return;
        window.__tvRemoteInjected = true;

        var style = document.createElement('style');
        style.textContent = `
          .tv-item { 
            border: 4px solid transparent !important;
            transition: all 0.3s !important;
          }
          .tv-item.focused { 
            border: 4px solid #42b649 !important;
            transform: scale(1.08) !important;
            box-shadow: 0 0 30px rgba(66, 182, 73, 0.6) !important;
          }
        `;
        document.head.appendChild(style);

        var currentIndex = 0;
        var items = [];

        function updateItems() {
          items = Array.from(document.querySelectorAll('.tv-item'));
          items.forEach(function(item) {
            item.setAttribute('tabindex', '0');
            item.classList.remove('focused');
          });
          if (items.length > 0 && currentIndex < items.length) {
            items[currentIndex].classList.add('focused');
            items[currentIndex].scrollIntoView({block: 'center', behavior: 'smooth'});
          }
        }

        function focusItem(index) {
          if (items.length === 0) {
            updateItems();
            return;
          }
          items[currentIndex].classList.remove('focused');
          currentIndex = Math.max(0, Math.min(index, items.length - 1));
          items[currentIndex].classList.add('focused');
          items[currentIndex].scrollIntoView({block: 'center', behavior: 'smooth'});
        }

        window.addEventListener('keydown', function(e) {
          updateItems();
          var key = e.key || e.keyCode;
          
          if (key === 'ArrowDown' || key === 40) {
            focusItem(currentIndex + 1);
            e.preventDefault();
            return false;
          }
          if (key === 'ArrowUp' || key === 38) {
            focusItem(currentIndex - 1);
            e.preventDefault();
            return false;
          }
          if (key === 'Enter' || key === 13 || key === ' ') {
            if (items[currentIndex]) items[currentIndex].click();
            e.preventDefault();
            return false;
          }
        }, true);

        setTimeout(updateItems, 300);
        setTimeout(updateItems, 1000);

        var observer = new MutationObserver(function() {
          setTimeout(updateItems, 100);
        });
        observer.observe(document.body, { childList: true, subtree: true });
      })();
    ''');
  }

  void _handleBack() {
    if (!_currentUrl.contains('tv-selector.html')) {
      setState(() => _loading = true);
      _controller.loadRequest(Uri.parse(_selectorUrl));
    }
  }

  void _sendKeyToWebView(String key) {
    _controller.runJavaScript('''
      var event = new KeyboardEvent('keydown', {
        key: '$key',
        keyCode: ${_getKeyCode(key)},
        bubbles: true,
        cancelable: true
      });
      window.dispatchEvent(event);
    ''');
  }

  int _getKeyCode(String key) {
    switch (key) {
      case 'ArrowDown': return 40;
      case 'ArrowUp': return 38;
      case 'Enter': return 13;
      default: return 0;
    }
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) _handleBack();
      },
      child: Focus(
        focusNode: _focusNode,
        autofocus: true,
        onKey: (node, event) {
          if (event is RawKeyDownEvent) {
            if (event.logicalKey == LogicalKeyboardKey.escape ||
                event.logicalKey == LogicalKeyboardKey.backspace) {
              _handleBack();
              return KeyEventResult.handled;
            } else if (event.logicalKey == LogicalKeyboardKey.arrowDown) {
              _sendKeyToWebView('ArrowDown');
              return KeyEventResult.handled;
            } else if (event.logicalKey == LogicalKeyboardKey.arrowUp) {
              _sendKeyToWebView('ArrowUp');
              return KeyEventResult.handled;
            } else if (event.logicalKey == LogicalKeyboardKey.enter ||
                event.logicalKey == LogicalKeyboardKey.select) {
              _sendKeyToWebView('Enter');
              return KeyEventResult.handled;
            }
          }
          return KeyEventResult.ignored;
        },
        child: Scaffold(
          backgroundColor: Colors.black,
          body: Stack(
            children: [
              Positioned.fill(
                child: WebViewWidget(controller: _controller),
              ),
              if (_loading)
                Container(
                  color: Colors.black,
                  child: const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        CircularProgressIndicator(color: Color(0xFF42B649)),
                        SizedBox(height: 16),
                        Text(
                          'Cargando...',
                          style: TextStyle(color: Colors.white, fontSize: 18),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
