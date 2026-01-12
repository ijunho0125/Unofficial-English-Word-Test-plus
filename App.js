
// React와 React Native 기본 훅 및 컴포넌트 import
import React, { useState, useRef, useEffect, useCallback } from 'react';
// 스타일, 상태바, 뷰, 텍스트, 터치, 링크, 백버튼 핸들러 import
import { StyleSheet, Platform, StatusBar, View, Text, TouchableOpacity, Linking, BackHandler } from 'react-native';
// 웹 페이지 표시를 위한 WebView import
import { WebView } from 'react-native-webview';
// 텍스트‑투‑스피치 기능을 위한 expo‑speech import
import * as Speech from 'expo-speech';
// SafeAreaContext를 이용해 노치·네비게이션 바와 겹치지 않게 함
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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
  var lastKoExists = -1; // -1: Unknown, 0: No, 1: Yes
  
  function isVisible(elem) {
      return !!( elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length );
  }

  function checkAndSpeak() {
    // Check for KO content presence
    var koExists = !!document.querySelector('.sentenceBox.long .ko');
    if (koExists !== (lastKoExists === 1)) {
        lastKoExists = koExists ? 1 : 0;
        if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'HAS_KO', exists: koExists }));
        }
    }

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
  const [hasKoContent, setHasKoContent] = useState(false);
  const [currentUrl, setCurrentUrl] = useState('https://mword.etoos.com/main');
  const [canGoBack, setCanGoBack] = useState(false);
  const webViewRef = useRef(null);

  return (
    <SafeAreaProvider>
      <MainApp
        isTtsEnabled={isTtsEnabled}
        setIsTtsEnabled={setIsTtsEnabled}
        isKoreanVisible={isKoreanVisible}
        setIsKoreanVisible={setIsKoreanVisible}
        hasKoContent={hasKoContent}
        setHasKoContent={setHasKoContent}
        currentUrl={currentUrl}
        setCurrentUrl={setCurrentUrl}
        canGoBack={canGoBack}
        setCanGoBack={setCanGoBack}
        webViewRef={webViewRef}
      />
    </SafeAreaProvider>
  );
}

function MainApp({
  isTtsEnabled, setIsTtsEnabled,
  isKoreanVisible, setIsKoreanVisible,
  hasKoContent, setHasKoContent,
  currentUrl, setCurrentUrl,
  canGoBack, setCanGoBack,
  webViewRef
}) {
  const insets = useSafeAreaInsets();
  const fabBottom = Math.max(insets.bottom, 16) + 20; // Ensure at least some padding + user's 20-30

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

  // Handle Android Hardware Back Button
  useEffect(() => {
    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      onBackPress
    );

    return () => backHandler.remove();
  }, [canGoBack]);

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SPEAK' && isTtsEnabled) {
        Speech.stop();
        Speech.speak(data.text, {
          language: 'en',
          onError: (e) => {
            if (__DEV__) console.log('Speech error:', e);
          }
        });
      } else if (data.type === 'HAS_KO') {
        setHasKoContent(data.exists);
      }
    } catch (e) {
      if (__DEV__) console.log('Message parse error:', e);
    }
  };

  const handleNavigationStateChange = (navState) => {
    if (navState.url.includes('/testlist/teststart') && !currentUrl.includes('/testlist/teststart')) {
      setIsKoreanVisible(false);
      setIsTtsEnabled(true);
      setHasKoContent(false);
    }

    setCurrentUrl(navState.url);
    setCanGoBack(navState.canGoBack);
  };

  const handleShouldStartLoadWithRequest = (request) => {
    const { url } = request;
    const allowedDomains = ['etoos.com', 'apple.com', 'naver.com', 'google.com', 'kakao.com'];
    const isAllowed = allowedDomains.some(domain => url.includes(domain));

    if (isAllowed) return true;
    Linking.openURL(url).catch((err) => console.error('An error occurred', err));
    return false;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#047F89" />

      {currentUrl === 'https://mword.etoos.com/main' && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>English Word Test Plus (Unofficial-APP)</Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: 'https://mword.etoos.com/main' }}
        style={styles.webview}
        scalesPageToFit={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        cacheEnabled={true}
        thirdPartyCookiesEnabled={true}
        cacheMode="LOAD_DEFAULT"
        injectedJavaScript={INJECTED_JAVASCRIPT}
        onMessage={handleMessage}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        sharedCookiesEnabled={true}
        userAgent="Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36"
      />

      {/* FABs - Only on Test Page */}
      {currentUrl && currentUrl.includes('/testlist/teststart') && (
        <>
          {hasKoContent && (
            <TouchableOpacity
              onPress={() => setIsKoreanVisible(!isKoreanVisible)}
              style={[styles.fab, styles.fabLeft, isKoreanVisible ? styles.fabOn : styles.fabOff, { bottom: fabBottom }]}
            >
              <Text style={styles.fabText}>{isKoreanVisible ? '한글 숨김' : '한글 표시'}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => setIsTtsEnabled(!isTtsEnabled)}
            style={[styles.fab, styles.fabRight, isTtsEnabled ? styles.fabOn : styles.fabOff, { bottom: fabBottom }]}
          >
            <Text style={styles.fabText}>{isTtsEnabled ? 'TTS 끄기' : 'TTS 켜기'}</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Return to Main Button - Only on generic Etoos pages */}
      {currentUrl && currentUrl.includes('m.etoos.com') && !currentUrl.includes('mword.etoos.com') && (
        <TouchableOpacity
          style={[styles.fab, styles.fabCenter, { bottom: fabBottom }]}
          onPress={() => {
            if (webViewRef.current) {
              webViewRef.current.injectJavaScript("window.location.href = 'https://mword.etoos.com/main'; true;");
            }
          }}
        >
          <Text style={styles.fabText}>메인으로 돌아가기</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA', // Light Grey Background
  },
  banner: {
    backgroundColor: '#047F89', // Etoos Blue Lagoon
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  bannerText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  webview: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  fab: {
    position: 'absolute',
    paddingHorizontal: 20,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  fabLeft: {
    left: 20,
  },
  fabRight: {
    right: 20,
  },
  fabOn: {
    backgroundColor: '#047F89', // Solid Blue Lagoon
  },
  fabOff: {
    backgroundColor: '#333333', // Solid Dark Grey
  },
  fabText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: -0.5,
  },
  fabCenter: {
    alignSelf: 'center',
    width: 160,
    height: 45,
    borderRadius: 12,
    backgroundColor: '#8B56FF', // Solid Heliotrope
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
});

