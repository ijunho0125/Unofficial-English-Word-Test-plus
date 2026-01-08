
import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, SafeAreaView, Platform, StatusBar, View, Text, TouchableOpacity, Linking } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Speech from 'expo-speech';

// Optimized Injected JavaScript (Defined outside component)
const INJECTED_JAVASCRIPT = `
(function() {
  // 1. Cookie Persistence (1 Day)
  function extendCookies() {
    try {
      var cookies = document.cookie.split(";");
      for (var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i];
        var eqPos = cookie.indexOf("=");
        var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        var value = eqPos > -1 ? cookie.substr(eqPos + 1) : "";
        document.cookie = name + "=" + value + "; path=/; max-age=86400"; // 1 day
      }
    } catch(e) {}
  }
  extendCookies();
  setInterval(extendCookies, 60000);

  // 2. Korean Visibility Styles
  var style = document.createElement('style');
  style.innerHTML = \`
    .sentenceBox.long .ko { opacity: 0 !important; transition: opacity 0.3s; }
    body.show-korean-always .sentenceBox.long .ko { opacity: 1 !important; }
  \`;
  document.head.appendChild(style);

  // 2. TTS Logic & Debounce
  var lastReadText = "";
  var ttsTimeout = null;
  
  function isVisible(elem) {
      return !!( elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length );
  }

  function checkAndSpeak() {
    var candidates = document.querySelectorAll('.sentenceBox.long .en, .wordBox span, .wordBox');
    var targetText = "";

    for (var i = 0; i < candidates.length; i++) {
        var el = candidates[i];
        if (isVisible(el) && el.innerText && el.innerText.trim().length > 0) {
            targetText = el.innerText.trim();
            break;
        }
    }

    if (targetText.length > 0 && targetText !== lastReadText) {
        lastReadText = targetText;
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SPEAK', text: targetText }));
        }
    }
  }

  // Debounced Check
  function debouncedCheck() {
    if (ttsTimeout) clearTimeout(ttsTimeout);
    ttsTimeout = setTimeout(checkAndSpeak, 500); // 0.5s debounce
  }

  // 3. Mutation Observer
  var observer = new MutationObserver(function(mutations) {
     debouncedCheck();
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true });

  // 4. Button Listeners (Immediate check on click + safety check)
  document.body.addEventListener('click', function(e) {
    var target = e.target;
    if (target && (
        target.classList.contains('btn_test_next') || target.closest('.btn_test_next') ||
        target.classList.contains('btn_test_prev') || target.closest('.btn_test_prev')
    )) {
        // Reset lastReadText to force re-read if needed, but rely on observer for new content
        lastReadText = ""; 
        setTimeout(checkAndSpeak, 600); // Single safety check after transition
    }
  });

  // Initial check
  setTimeout(checkAndSpeak, 1000);
})();
true;
`;

export default function App() {
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [isKoreanVisible, setIsKoreanVisible] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('https://mword.etoos.com/main');
  const webViewRef = useRef(null);

  // Toggle Korean visibility
  useEffect(() => {
    if (webViewRef.current) {
      const jsCode = `
        if (document && document.body) {
           document.body.classList.toggle('show-korean-always', ${isKoreanVisible});
        }
        true;
      `;
      webViewRef.current.injectJavaScript(jsCode);
    }
  }, [isKoreanVisible]);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SPEAK' && isTtsEnabled) {
        Speech.stop();
        Speech.speak(data.text, {
          language: 'en',
          onError: (e) => console.log('Speech error:', e)
        });
      }
    } catch (e) {
      console.log('Message parse error:', e);
    }
  };

  const handleShouldStartLoadWithRequest = (request) => {
    const { url } = request;
    // Allow main domain and login domain
    if (url.startsWith('https://mword.etoos.com') || url.startsWith('https://member.etoos.com')) {
      return true;
    }

    // Open external links in system browser
    Linking.openURL(url).catch((err) => console.error('An error occurred', err));
    return false;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Banner */}
      {currentUrl === 'https://mword.etoos.com/main' && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>영단태+ 앱으로 접속 중 (Unofficial-APP)</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: 'https://mword.etoos.com/main' }}
        style={styles.webview}
        scalesPageToFit={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        injectedJavaScript={INJECTED_JAVASCRIPT}
        onMessage={handleMessage}
        onNavigationStateChange={(navState) => setCurrentUrl(navState.url)}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        sharedCookiesEnabled={true}
        userAgent="Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36"
      />

      {/* FABs - Only on Test Page */}
      {currentUrl && currentUrl.includes('/testlist/teststart') && (
        <>
          <TouchableOpacity
            style={[styles.fab, styles.fabLeft, isKoreanVisible ? styles.fabOn : styles.fabOff]}
            onPress={() => setIsKoreanVisible(!isKoreanVisible)}
          >
            <Text style={styles.fabText}>{isKoreanVisible ? 'KO ON' : 'KO OFF'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fab, styles.fabRight, isTtsEnabled ? styles.fabOn : styles.fabOff]}
            onPress={() => setIsTtsEnabled(!isTtsEnabled)}
          >
            <Text style={styles.fabText}>{isTtsEnabled ? 'TTS ON' : 'TTS OFF'}</Text>
          </TouchableOpacity>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    backgroundColor: '#fff',
  },
  banner: {
    backgroundColor: '#00B894',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  webview: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 70, // Optimized position above nav bar
    width: 80,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  fabLeft: {
    left: 20,
  },
  fabRight: {
    right: 20,
  },
  fabOn: {
    backgroundColor: '#00B894',
  },
  fabOff: {
    backgroundColor: '#ccc',
  },
  fabText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  }
});

