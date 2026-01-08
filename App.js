
import React, { useState, useRef } from 'react';
import { StyleSheet, SafeAreaView, Platform, StatusBar, View, Text, TouchableOpacity, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Speech from 'expo-speech';

export default function App() {
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const [currentUrl, setCurrentUrl] = useState('https://mword.etoos.com/main');
  const webViewRef = useRef(null);

  // Custom JavaScript to be injected into the WebView
  // Note: Avoid single-line comments in the injected string to prevent parsing issues
  const injectedJavaScript = `
    (function() {
      /* 1. Persistent Login Cookie Strategy */
      setInterval(function() {
        try {
          var cookies = document.cookie.split(";");
          for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i];
            var eqPos = cookie.indexOf("=");
            var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
            var value = eqPos > -1 ? cookie.substr(eqPos + 1) : "";
            document.cookie = name + "=" + value + "; path=/; max-age=31536000";
          }
        } catch(e) {}
      }, 60000);

      /* 2. Long Press (3s) to Reveal Korean Text */
      function attachLongPressListeners() {
        var targets = document.querySelectorAll('.sentenceBox.long .ko');
        targets.forEach(function(target) {
            if (target.getAttribute('data-long-press-attached')) return;
            target.setAttribute('data-long-press-attached', 'true');

            /* Force hidden initially if needed, usually CSS handles this */
            /* target.style.opacity = '0'; */

            var pressTimer;
            
            target.addEventListener('touchstart', function() {
                pressTimer = setTimeout(function() {
                    target.style.color = 'black'; 
                    target.style.opacity = '1';
                    target.style.visibility = 'visible';
                }, 3000);
            });

            target.addEventListener('touchend', function() {
                clearTimeout(pressTimer);
                target.style.color = 'transparent'; 
            });
            
             target.addEventListener('mousedown', function() {
                pressTimer = setTimeout(function() {
                    target.style.color = 'black'; 
                    target.style.opacity = '1';
                    target.style.visibility = 'visible';
                }, 3000);
            });
             target.addEventListener('mouseup', function() {
                clearTimeout(pressTimer);
                target.style.color = 'transparent';
            });
        });
      }

      /* 3. TTS Trigger (Mutation Observer) */
      var observer = new MutationObserver(function(mutations) {
        /* Check text content changes regardless of mutation type */
         var enText = "";
         
         /* Check .sentenceBox.long .en */
         var sentenceBox = document.querySelector('.sentenceBox.long .en');
         if (sentenceBox && sentenceBox.innerText && sentenceBox.innerText.trim() !== window.lastReadSentence) {
            enText = sentenceBox.innerText.trim();
            window.lastReadSentence = enText;
         }

         /* Check .wordBox */
         var wordBox = document.querySelector('.wordBox span'); 
         /* Fallback for wordBox if span structure varies */
         if (!wordBox) wordBox = document.querySelector('.wordBox');

         if (!enText && wordBox && wordBox.innerText && wordBox.innerText.trim() !== window.lastReadWord) {
             enText = wordBox.innerText.trim();
             window.lastReadWord = enText;
         }
         
         if (enText && enText.length > 0) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SPEAK', text: enText }));
         }
      });
      
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      
      setInterval(attachLongPressListeners, 1000);
      
    })();
    true;
  `;

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SPEAK' && isTtsEnabled) {
        // Stop any currently speaking audio to play the new one immediately
        Speech.stop();
        Speech.speak(data.text, { language: 'en' });
      }
    } catch (e) {
      console.log('Message error:', e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Banner */}
      {/* Top Banner - Only show on main page */}
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
        injectedJavaScript={injectedJavaScript}
        onMessage={handleMessage}
        onNavigationStateChange={(navState) => setCurrentUrl(navState.url)}
        sharedCookiesEnabled={true}
        // Google Login Fix: Use a standard browser UserAgent
        userAgent="Mozilla/5.0 (Linux; Android 13; SM-S908B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36"
      />

      {/* TTS Toggle FAB - Only show on Test page */}
      {currentUrl && currentUrl.includes('/testlist/teststart') && (
        <TouchableOpacity
          style={[styles.fab, isTtsEnabled ? styles.fabOn : styles.fabOff]}
          onPress={() => setIsTtsEnabled(!isTtsEnabled)}
        >
          <Text style={styles.fabText}>{isTtsEnabled ? 'TTS ON' : 'TTS OFF'}</Text>
        </TouchableOpacity>
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
    backgroundColor: '#00B894', // Etoos Green theme
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
    bottom: 30,
    right: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
  }
});
