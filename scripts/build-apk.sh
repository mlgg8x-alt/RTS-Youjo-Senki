#!/usr/bin/env bash
# Builds a signed, installable APK without Gradle:
#   aapt2 compile/link -> javac -> d8 -> zipalign -> apksigner
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SDK="${ANDROID_SDK:-$HOME/toolchain/sdk}"
JDK="${JAVA_HOME:-$HOME/toolchain/jdk17}"
BT="$SDK/build-tools/34.0.0"
PLATFORM="$SDK/platforms/android-34/android.jar"

export JAVA_HOME="$JDK"
export PATH="$JDK/bin:$BT:$PATH"

for bin in aapt2 d8 zipalign apksigner javac keytool zip; do
  command -v "$bin" >/dev/null 2>&1 || { echo "missing tool: $bin"; exit 1; }
done
[ -f "$PLATFORM" ] || { echo "missing android.jar at $PLATFORM"; exit 1; }

echo "== web bundle =="
node scripts/build.mjs

echo "== icons =="
python3 tools/make_icons.py

WORK="build/android"
OUT="artifacts"
rm -rf "$WORK"
mkdir -p "$WORK/compiled" "$WORK/gen" "$WORK/classes" "$WORK/dex" "$WORK/assets/www" "$OUT"

cp dist/index.html dist/style.css dist/game.js "$WORK/assets/www/"

echo "== aapt2 compile =="
aapt2 compile --dir android/res -o "$WORK/compiled/res.zip"

echo "== aapt2 link =="
aapt2 link \
  -o "$WORK/base.apk" \
  -I "$PLATFORM" \
  --manifest android/AndroidManifest.xml \
  -A "$WORK/assets" \
  --java "$WORK/gen" \
  --min-sdk-version 24 \
  --target-sdk-version 34 \
  --version-code 1 \
  --version-name 1.0 \
  "$WORK/compiled/res.zip"

echo "== javac =="
SRCS=$(find android/java "$WORK/gen" -name '*.java')
if ! javac -source 8 -target 8 -encoding UTF-8 -bootclasspath "$PLATFORM" -classpath "$PLATFORM" -d "$WORK/classes" $SRCS; then
  echo "javac failed"; exit 1
fi
if ! find "$WORK/classes" -name '*.class' | grep -q .; then
  echo "javac produced no classes"; exit 1
fi

echo "== d8 =="
CLASSES=$(find "$WORK/classes" -name '*.class')
d8 --lib "$PLATFORM" --min-api 24 --output "$WORK/dex" $CLASSES

echo "== package =="
cp "$WORK/base.apk" "$WORK/unsigned.apk"
( cd "$WORK/dex" && zip -q -X "$ROOT/$WORK/unsigned.apk" classes.dex )

echo "== align =="
zipalign -f -p 4 "$WORK/unsigned.apk" "$WORK/aligned.apk"

echo "== sign =="
KEYSTORE="${YS_KEYSTORE:-$HOME/.android/youjo-frontline.keystore}"
KS_PASS="${YS_KEYSTORE_PASS:-frontline}"
if [ ! -f "$KEYSTORE" ]; then
  mkdir -p "$(dirname "$KEYSTORE")"
  keytool -genkeypair -v -keystore "$KEYSTORE" -alias frontline -keyalg RSA -keysize 2048 \
    -validity 10000 -storepass "$KS_PASS" -keypass "$KS_PASS" \
    -dname "CN=Youjo Senki Frontline, OU=Games, O=Frontline, L=Berun, C=DE" >/dev/null 2>&1
  echo "created debug keystore at $KEYSTORE"
fi

APK="$OUT/youjo-senki-frontline.apk"
apksigner sign --ks "$KEYSTORE" --ks-pass "pass:$KS_PASS" --key-pass "pass:$KS_PASS" \
  --out "$APK" "$WORK/aligned.apk"

apksigner verify --print-certs "$APK" | head -4
aapt dump badging "$APK" | head -6
ls -lh "$APK"
echo "APK ready: $APK"
