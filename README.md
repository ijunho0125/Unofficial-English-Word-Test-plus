# English Word Test+ (Unofficial)
<img src ="./assets/icon1.png">

> **⚠️ Disclaimer (필독)**
> 이 프로젝트는 개인 학습 및 편의를 위해 제작된 **비공식(Unofficial)** 앱입니다.
> 이 앱은 **Etoos(이투스)**의 공식 앱이 아니며, 모든 콘텐츠의 저작권은 원저작권자인 Etoos에 있습니다.
> 이 소스 코드를 상업적으로 이용하거나 원저작권자의 권리를 침해하는 용도로 사용하지 마십시오.

## 📖 소개 (Introduction)
**English Word Test+**는 기존 웹 기반의 단어 테스트 서비스를 모바일 앱 환경에서 더욱 편리하게 이용할 수 있도록 개선한 래퍼(Wrapper) 애플리케이션입니다.
React Native WebView를 기반으로 하며, TTS(Text-to-Speech) 자동 읽기 기능과 한글 뜻 숨기기/보기 기능을 추가하여 학습 효율을 높였습니다.

## ✨ 주요 기능 (Key Features)

### 1. 🗣️ 자동 TTS (Text-to-Speech)
- 단어 테스트 시, 영단어를 500ms 간격으로 감지하여 자동으로 읽어줍니다.
- `Expo Speech` 라이브러리를 사용하여 끊김 없는 음성 안내를 제공합니다.
- **TTS ON/OFF** 버튼으로 언제든지 기능을 켜고 끌 수 있습니다.

### 2. 👁️ 한글 뜻 숨기기/보기 (Korean Visibility Toggle)
- 학습 시 한글 뜻을 가리고 영단어만 보고 싶을 때 유용합니다.
- CSS 주입(Injection) 방식을 통해 실시간으로 한글 뜻의 투명도를 조절합니다.
- **KO ON/OFF** 플로팅 버튼으로 즉시 제어 가능합니다.

### 3. 🍪 로그인 유지 (Persistent Session)
- WebView 내 쿠키를 관리하여, 앱을 재실행해도 로그인이 풀리지 않도록 세션을 유지합니다.
- 자동 로그인 스크립트가 내장되어 있어 매번 로그인하는 번거로움을 줄였습니다.

## 🛠️ 기술 스택 (Tech Stack)
- **Framework**: React Native (Expo)
- **Core Component**: `react-native-webview`
- **Features**: `expo-speech` (TTS)

## 🚀 설치 및 실행 (Installation & Run)

```bash
# 1. 저장소 클론
git clone [Repository URL]

# 2. 패키지 설치
npm install

# 3. 앱 실행
npx expo start
```

## 📝 라이선스 (License)
이 프로젝트의 소스 코드는 개인적인 학습 용도로만 공개됩니다.
서비스 대상 사이트(Etoos)의 이용 약관을 준수해주시기 바랍니다.
