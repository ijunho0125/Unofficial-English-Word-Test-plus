
import React, { useState, useRef } from 'react';
import { StyleSheet, SafeAreaView, Platform, StatusBar, View, Text, TouchableOpacity, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Speech from 'expo-speech';

export default function App() {
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);
  const webViewRef = useRef(null);

  // Custom JavaScript to be injected into the WebView
  const injectedJavaScript = `
    (function() {
      // 1. Persistent Login Cookie Strategy
      // Attempt to extend the expiration of all cookies every minute
      setInterval(function() {
        try {
          var cookies = document.cookie.split(";");
          for (var i = 0; i < cookies.length; i++) {
            var cookie = cookies[i];
            var eqPos = cookie.indexOf("=");
            var name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
            var value = eqPos > -1 ? cookie.substr(eqPos + 1) : "";
            // Re-set with 1 year expiration
            document.cookie = name + "=" + value + "; path=/; max-age=31536000";
          }
        } catch(e) {}
      }, 60000);

      // 2. Long Press (3s) to Reveal Korean Text
      // Target: .sentenceBox.long .ko
      // Logic: Add touch listeners to start/clear timeout
      function attachLongPressListeners() {
        var targets = document.querySelectorAll('.sentenceBox.long .ko');
        targets.forEach(function(target) {
            if (target.getAttribute('data-long-press-attached')) return;
            target.setAttribute('data-long-press-attached', 'true');

            // Ensure text is initially hidden (using color transparent or visibility hidden)
            // Assuming the site hides it or we force it. 
            // If the site has it visible by default, we hide it.
            // Let's assume we need to force hide it initially if it's "Fill-in-the-blank".
            // target.style.opacity = '0'; // Only if we want to enforce hiding

            var pressTimer;
            
            target.addEventListener('touchstart', function() {
                pressTimer = setTimeout(function() {
                    // Reveal logic: Change color to black or opacity to 1
                    target.style.color = 'black'; 
                    target.style.opacity = '1';
                    target.style.visibility = 'visible';
                }, 3000);
            });

            target.addEventListener('touchend', function() {
                clearTimeout(pressTimer);
                // Optional: Hide again? User said "see", possibly meaning peek.
                // Leaving it visible is safer for "studying", but usually peek mechanics hide on release.
                // However user said "long press to see", implying it helps while held.
                // Let's making it a "Peek" (hide on release) for strict testing?
                // Or just reveal? "보게 해 줄 수 있어" -> "allow me to see".
                // I'll make it reset on release to strictly follow "press to see".
                target.style.color = 'transparent'; // Reset to hidden
            });
            
            // Also handle click/mousedown for desktop testing
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

      // 3. TTS Trigger (Mutation Observer)
      // Watch for appearance of .sentenceBox.long .en or .wordBox and speak content
      var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.addedNodes.length) {
             // Check for new English text nodes
             var enText = "";
             
             // Check .sentenceBox.long .en
             var sentenceBox = document.querySelector('.sentenceBox.long .en');
             if (sentenceBox && sentenceBox.innerText && sentenceBox.innerText !== window.lastReadSentence) {
                enText = sentenceBox.innerText;
                window.lastReadSentence = enText;
             }

             // Check .wordBox (simple word test)
             var wordBox = document.querySelector('.wordBox .en'); // Adjust selector as needed
             if (!enText && wordBox && wordBox.innerText && wordBox.innerText !== window.lastReadWord) {
                 enText = wordBox.innerText;
                 window.lastReadWord = enText;
             }
             
             if (enText) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SPEAK', text: enText }));
             }
          }
        });
      });
      
      observer.observe(document.body, { childList: true, subtree: true });
      
      // Run once on load just in case
      setInterval(attachLongPressListeners, 1000); // Poll for new elements (dynamic loading)
      
    })();
    true;
  `;

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SPEAK' && isTtsEnabled) {
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
      <View style={styles.banner}>
        <Text style={styles.bannerText}>영단태+ 앱으로 접속 중</Text>
      </View>

      <WebView 
        ref={webViewRef}
        source={{ uri: 'https://mword.etoos.com/main' }} 
        style={styles.webview}
        scalesPageToFit={true} 
        javaScriptEnabled={true}
        domStorageEnabled={true}
        injectedJavaScript={injectedJavaScript}
        onMessage={handleMessage}
        sharedCookiesEnabled={true} // Important for persistence attempts
      />

      {/* TTS Toggle FAB */}
      <TouchableOpacity 
        style={[styles.fab, isTtsEnabled ? styles.fabOn : styles.fabOff]} 
        onPress={() => setIsTtsEnabled(!isTtsEnabled)}
      >
        <Text style={styles.fabText}>{isTtsEnabled ? 'TTS ON' : 'TTS OFF'}</Text>
      </TouchableOpacity>
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
