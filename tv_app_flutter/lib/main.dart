import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';

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
  final FocusNode _remoteFocusNode = FocusNode();

  static const String _mainUrl =
      'https://landerlopez1992-cyber.github.io/tropiplussupermarket/tv-selector.html';

  @override
  void initState() {
    super.initState();
    _setupWebView();
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
          onPageFinished: (_) {
            if (mounted) {
              setState(() => _loading = false);
            }
            _injectRemoteSupport();
            _requestRemoteFocus();
          },
          onWebResourceError: (error) {
            print('❌ Error cargando página: ${error.description}');
            if (mounted) {
              setState(() => _loading = false);
            }
          },
        ),
      )
      ..loadRequest(Uri.parse(_mainUrl));
  }

  @override
  void dispose() {
    _remoteFocusNode.dispose();
    super.dispose();
  }

  void _requestRemoteFocus() {
    if (!mounted) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _remoteFocusNode.requestFocus();
      }
    });
  }

  Future<void> _injectRemoteSupport() async {
    await _controller.runJavaScript('''
      (function() {
        if (window.__tropiplusRemoteReady) return;
        window.__tropiplusRemoteReady = true;

        const style = document.createElement('style');
        style.innerHTML = `
          .tv-remote-focused {
            outline: 4px solid #42b649 !important;
            outline-offset: 4px !important;
            border-radius: 10px !important;
          }
        `;
        document.head.appendChild(style);

        const state = { idx: -1 };

        function getTargets() {
          const nodes = Array.from(
            document.querySelectorAll('.tv-item, button, [role="button"], a, [tabindex]')
          );
          return nodes.filter(el => {
            const r = el.getBoundingClientRect();
            const visible = r.width > 0 && r.height > 0;
            return visible && !el.disabled;
          });
        }

        function clearFocus(items) {
          items.forEach(el => el.classList.remove('tv-remote-focused'));
        }

        function ensureFocus() {
          const items = getTargets();
          if (!items.length) return;

          if (state.idx < 0 || state.idx >= items.length) {
            state.idx = 0;
          }
          clearFocus(items);
          const current = items[state.idx];
          current.classList.add('tv-remote-focused');
          if (typeof current.focus === 'function') current.focus({ preventScroll: true });
          current.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }

        window.tropiplusRemoteMove = function(dir) {
          const items = getTargets();
          if (!items.length) return;
          if (state.idx < 0) state.idx = 0;

          if (dir === 'down' || dir === 'right') {
            state.idx = (state.idx + 1) % items.length;
          } else if (dir === 'up' || dir === 'left') {
            state.idx = (state.idx - 1 + items.length) % items.length;
          }
          ensureFocus();
        };

        window.tropiplusRemoteOk = function() {
          const items = getTargets();
          if (!items.length) return;
          if (state.idx < 0 || state.idx >= items.length) state.idx = 0;
          const current = items[state.idx];
          current.click();
        };

        // Initial focus once content is ready.
        setTimeout(ensureFocus, 150);
      })();
    ''');
  }

  Future<void> _handleBackAction() async {
    final canGoBack = await _controller.canGoBack();
    if (canGoBack) {
      await _controller.goBack();
    } else {
      await _controller.loadRequest(Uri.parse(_mainUrl));
    }
  }

  KeyEventResult _onRemoteKey(FocusNode node, KeyEvent event) {
    if (event is! KeyDownEvent) return KeyEventResult.ignored;

    final key = event.logicalKey;

    if (key == LogicalKeyboardKey.arrowUp) {
      _controller.runJavaScript("window.tropiplusRemoteMove && window.tropiplusRemoteMove('up');");
      return KeyEventResult.handled;
    }
    if (key == LogicalKeyboardKey.arrowDown) {
      _controller.runJavaScript("window.tropiplusRemoteMove && window.tropiplusRemoteMove('down');");
      return KeyEventResult.handled;
    }
    if (key == LogicalKeyboardKey.arrowLeft) {
      _controller.runJavaScript("window.tropiplusRemoteMove && window.tropiplusRemoteMove('left');");
      return KeyEventResult.handled;
    }
    if (key == LogicalKeyboardKey.arrowRight) {
      _controller.runJavaScript("window.tropiplusRemoteMove && window.tropiplusRemoteMove('right');");
      return KeyEventResult.handled;
    }
    if (key == LogicalKeyboardKey.enter ||
        key == LogicalKeyboardKey.select ||
        key == LogicalKeyboardKey.numpadEnter) {
      _controller.runJavaScript("window.tropiplusRemoteOk && window.tropiplusRemoteOk();");
      return KeyEventResult.handled;
    }
    if (key == LogicalKeyboardKey.escape ||
        key == LogicalKeyboardKey.goBack ||
        key == LogicalKeyboardKey.browserBack) {
      _handleBackAction();
      return KeyEventResult.handled;
    }

    return KeyEventResult.ignored;
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (!didPop) {
          _handleBackAction();
        }
      },
      child: Scaffold(
        backgroundColor: Colors.black,
        body: Focus(
          autofocus: true,
          focusNode: _remoteFocusNode,
          onKeyEvent: _onRemoteKey,
          child: Stack(
            children: [
              WebViewWidget(controller: _controller),
              if (_loading)
                const ColoredBox(
                  color: Colors.black,
                  child: Center(
                    child: CircularProgressIndicator(
                      valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF42B649)),
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
