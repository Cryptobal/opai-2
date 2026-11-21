#!/usr/bin/env bash
# Compila @opai/movil (Capacitor, SPM) y sube a TestFlight. Solo uso desde ios-testflight.yml (CAR-733).
set -euo pipefail

PROJECT="apps/movil/nativo/ios/App/App.xcodeproj"
SCHEME="App"
TEAM_ID="PRG52N5SNA"
WORK_DIR="${RUNNER_TEMP}/opai-ios-testflight"
ARCHIVE_PATH="$WORK_DIR/App.xcarchive"
EXPORT_PATH="$WORK_DIR/export"
EXPORT_PLIST="$WORK_DIR/ExportOptions.plist"
AUTH_KEY_DIR="$WORK_DIR/private_keys"
AUTH_KEY_PATH="$AUTH_KEY_DIR/AuthKey_${ASC_KEY_ID}.p8"
ENTITLEMENTS_REL="App/App.entitlements"
ALTOOL_KEYS="$HOME/.private_keys"
GOOGLE_PLIST_STAGING="$WORK_DIR/GoogleService-Info.plist"
GOOGLE_PLIST_APP="apps/movil/nativo/ios/App/App/GoogleService-Info.plist"

cleanup() {
  rm -rf "$AUTH_KEY_DIR" "$EXPORT_PLIST" "$ARCHIVE_PATH" "$EXPORT_PATH" "$WORK_DIR/spm" 2>/dev/null || true
  rm -f "$ALTOOL_KEYS/AuthKey_${ASC_KEY_ID:-}.p8" "$GOOGLE_PLIST_STAGING" 2>/dev/null || true
  rm -f "$GOOGLE_PLIST_APP" 2>/dev/null || true
}
trap cleanup EXIT

require_var() {
  local name=$1 val=$2
  if [ -z "$val" ]; then
    echo "::error::Falta la variable $name (secreto o entorno del workflow)."
    exit 1
  fi
}

require_var ASC_KEY_ID "${ASC_KEY_ID:-}"
require_var ASC_ISSUER_ID "${ASC_ISSUER_ID:-}"
require_var ASC_KEY_P8 "${ASC_KEY_P8:-}"

BUILD_NUMBER=$((GITHUB_RUN_NUMBER + 100))
mkdir -p "$AUTH_KEY_DIR" "$EXPORT_PATH"
umask 077
if ! printf '%s' "$ASC_KEY_P8" | tr -d '[:space:]' | base64 --decode >"$AUTH_KEY_PATH" 2>/dev/null; then
  echo "::error::ASC_KEY_P8 no es base64 válido del archivo .p8 de App Store Connect."
  exit 1
fi

if [ -n "${GOOGLE_SERVICE_INFO_PLIST:-}" ]; then
  if ! printf '%s' "$GOOGLE_SERVICE_INFO_PLIST" | tr -d '[:space:]' | base64 --decode >"$GOOGLE_PLIST_STAGING" 2>/dev/null; then
    echo "::error::GOOGLE_SERVICE_INFO_PLIST no es base64 válido."
    exit 1
  fi
fi

xcodebuild -version
xcodebuild -showsdks | grep -E 'iphoneos|iphonesimulator' || true

ios_sdk=$(xcodebuild -showsdks 2>/dev/null | sed -n 's/.*iphoneos\([0-9.]*\).*/\1/p' | sort -V | tail -1)
min_major="${IOS_SDK_MIN_MAJOR:-18}"
if [ -z "$ios_sdk" ]; then
  echo "::error::No se detectó SDK iphoneos; revisa XCODE_VERSION en el workflow."
  exit 1
fi
sdk_major="${ios_sdk%%.*}"
if [ "$sdk_major" -lt "$min_major" ]; then
  echo "::error::SDK iOS $ios_sdk < mínimo $min_major; sube XCODE_VERSION en ios-testflight.yml."
  exit 1
fi

xcodebuild -resolvePackageDependencies \
  -project "$PROJECT" \
  -scheme "$SCHEME" \
  -clonedSourcePackagesDirPath "$WORK_DIR/spm"

cat >"$EXPORT_PLIST" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store-connect</string>
  <key>teamID</key>
  <string>PRG52N5SNA</string>
  <key>signingStyle</key>
  <string>automatic</string>
  <key>uploadSymbols</key>
  <true/>
  <key>destination</key>
  <string>export</string>
</dict>
</plist>
PLIST

auth_args=(
  -authenticationKeyPath "$AUTH_KEY_PATH"
  -authenticationKeyID "$ASC_KEY_ID"
  -authenticationKeyIssuerID "$ASC_ISSUER_ID"
  -allowProvisioningUpdates
)

if [ -f "$GOOGLE_PLIST_STAGING" ]; then
  install -m 600 "$GOOGLE_PLIST_STAGING" "$GOOGLE_PLIST_APP"
fi

echo "Build iOS $BUILD_NUMBER (cl.opai.app, team $TEAM_ID)"
xcodebuild archive \
  -project "$PROJECT" \
  -scheme "$SCHEME" \
  -configuration Release \
  -sdk iphoneos \
  -archivePath "$ARCHIVE_PATH" \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  CODE_SIGN_ENTITLEMENTS="$ENTITLEMENTS_REL" \
  "${auth_args[@]}"

xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist "$EXPORT_PLIST" \
  "${auth_args[@]}"

ipa=$(find "$EXPORT_PATH" -maxdepth 1 -name '*.ipa' | head -1)
if [ -z "$ipa" ]; then
  echo "::error::No se generó .ipa en $EXPORT_PATH"
  exit 1
fi

verify_dir="$WORK_DIR/verify"
mkdir -p "$verify_dir"
unzip -q "$ipa" -d "$verify_dir"
app_path=$(find "$verify_dir/Payload" -maxdepth 1 -name '*.app' | head -1)
ent_blob=$(codesign -d --entitlements :- "$app_path" 2>/dev/null || true)
if [ -z "$ent_blob" ]; then
  echo "::error::El binario no tiene entitlements firmadas (revisar CODE_SIGN_ENTITLEMENTS)."
  exit 1
fi
for need in aps-environment production associated-domains; do
  echo "$ent_blob" | grep -q "$need" || {
    echo "::error::Falta $need en las entitlements del binario."
    exit 1
  }
done
echo "Entitlements OK en el .ipa."

mkdir -p "$ALTOOL_KEYS"
install -m 600 "$AUTH_KEY_PATH" "$ALTOOL_KEYS/AuthKey_${ASC_KEY_ID}.p8"

echo "Subiendo a TestFlight (sin envío a revisión de App Store)…"
xcrun altool --upload-app \
  --type ios \
  --file "$ipa" \
  --apiKey "$ASC_KEY_ID" \
  --apiIssuer "$ASC_ISSUER_ID"
echo "IPA subido a App Store Connect / TestFlight (build $BUILD_NUMBER)."