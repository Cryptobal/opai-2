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
ENTITLEMENTS_PATH="apps/movil/nativo/ios/App/App/App.entitlements"
CAP_CONFIG_JSON="apps/movil/nativo/ios/App/App/capacitor.config.json"
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

# Tras `cap sync` en el workflow: server.url del binario debe coincidir con el rpId del auth (CAR-809).
verificar_server_url_y_rpid() {
  if [ ! -f "$CAP_CONFIG_JSON" ]; then
    echo "::error::No existe $CAP_CONFIG_JSON; corre «pnpm --filter @opai/movil sincronizar» antes de este script."
    exit 1
  fi
  local server_url host rpid
  server_url=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1], encoding="utf-8"))["server"]["url"])' "$CAP_CONFIG_JSON")
  host=$(python3 -c 'from urllib.parse import urlparse; import sys; print(urlparse(sys.argv[1]).hostname or "")' "$server_url")
  if [ -z "$host" ]; then
    echo "::error::No se pudo leer el host de server.url en $CAP_CONFIG_JSON (url=$server_url)."
    exit 1
  fi
  echo "Capacitor server.url=$server_url (host=$host)"
  local http_code body
  body=$(curl -fsS -w '\n%{http_code}' "https://${host}/api/auth/passkey/generate-authenticate-options") || {
    echo "::error::No se pudo llamar a https://${host}/api/auth/passkey/generate-authenticate-options"
    exit 1
  }
  http_code=$(printf '%s' "$body" | tail -n1)
  body=$(printf '%s' "$body" | sed '$d')
  if [ "$http_code" != "200" ]; then
    echo "::error::passkey/generate-authenticate-options devolvió HTTP $http_code en $host."
    exit 1
  fi
  rpid=$(printf '%s' "$body" | python3 -c 'import json,sys; print(json.load(sys.stdin)["rpId"])')
  if [ "$rpid" != "$host" ]; then
    echo "::error::server.url apunta a $host pero el auth responde rpId=$rpid. Revisa OPAI_APP_ENTORNO en ios-testflight.yml (debe ser test, no produccion)."
    exit 1
  fi
  echo "rpId del auth coincide con server.url ($host)."
  SERVER_URL_HOST="$host"
}

verificar_server_url_y_rpid

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
unset ASC_KEY_P8 GOOGLE_SERVICE_INFO_PLIST

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

env -u ASC_KEY_P8 -u GOOGLE_SERVICE_INFO_PLIST xcodebuild -resolvePackageDependencies \
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
env -u ASC_KEY_P8 -u GOOGLE_SERVICE_INFO_PLIST xcodebuild archive \
  -project "$PROJECT" \
  -scheme "$SCHEME" \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE_PATH" \
  DEVELOPMENT_TEAM="$TEAM_ID" \
  CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY="" \
  -clonedSourcePackagesDirPath "$WORK_DIR/spm"

APP_IN_ARCHIVE="$ARCHIVE_PATH/Products/Applications/App.app"
if [ ! -d "$APP_IN_ARCHIVE" ]; then
  echo "::error::No se encontró App.app en el archive: $APP_IN_ARCHIVE"
  exit 1
fi

if [ ! -f "$ENTITLEMENTS_PATH" ]; then
  echo "::error::No se encontró el archivo de entitlements: $ENTITLEMENTS_PATH"
  exit 1
fi

if [ -d "$APP_IN_ARCHIVE/Frameworks" ]; then
  find "$APP_IN_ARCHIVE/Frameworks" -type d -name '*.framework' -print0 | while IFS= read -r -d '' fw; do
    codesign -f -s - "$fw"
  done
  find "$APP_IN_ARCHIVE/Frameworks" -type f -name '*.dylib' -print0 | while IFS= read -r -d '' dylib; do
    codesign -f -s - "$dylib"
  done
fi

codesign -f -s - --entitlements "$ENTITLEMENTS_PATH" "$APP_IN_ARCHIVE"
ent_pre=$(codesign -d --entitlements - "$APP_IN_ARCHIVE" 2>/dev/null || true)
if [ -z "$ent_pre" ]; then
  echo "::error::El archive no tiene entitlements tras firma ad-hoc."
  exit 1
fi
for need in aps-environment production associated-domains; do
  echo "$ent_pre" | grep -q "$need" || {
    echo "::error::Falta $need en las entitlements del archive (pre-export)."
    exit 1
  }
done
echo "Entitlements OK en el archive (pre-export)."

env -u ASC_KEY_P8 -u GOOGLE_SERVICE_INFO_PLIST xcodebuild -exportArchive \
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
  echo "::error::El binario no tiene entitlements firmadas en el .ipa."
  exit 1
fi
if ! echo "$ent_blob" | grep -A1 'aps-environment' | grep -q '<string>production</string>'; then
  echo "::error::aps-environment debe ir seguido de <string>production</string> en el .ipa."
  exit 1
fi
for need in associated-domains; do
  echo "$ent_blob" | grep -q "$need" || {
    echo "::error::Falta $need en las entitlements del binario."
    exit 1
  }
done
echo "com.apple.developer.associated-domains en el .ipa:"
echo "$ent_blob" | sed -n '/com.apple.developer.associated-domains/,/\/array/p' || true
webcred="webcredentials:${SERVER_URL_HOST}"
if ! echo "$ent_blob" | grep -Fq "<string>${webcred}</string>"; then
  echo "::error::Falta ${webcred} en com.apple.developer.associated-domains del .ipa (server.url host=${SERVER_URL_HOST})."
  exit 1
fi
echo "Entitlements OK en el .ipa (incluye ${webcred})."

INFO_PLIST="$app_path/Info.plist"
if [ ! -f "$INFO_PLIST" ]; then
  echo "::error::No se encontró Info.plist en el .ipa."
  exit 1
fi
bundle_id=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$INFO_PLIST" 2>/dev/null || true)
if [ "$bundle_id" != 'cl.opai.app' ]; then
  echo "::error::CFBundleIdentifier=$bundle_id (se esperaba cl.opai.app)."
  exit 1
fi
bundle_version=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$INFO_PLIST" 2>/dev/null || true)
if [ "$bundle_version" != "$BUILD_NUMBER" ]; then
  echo "::error::CFBundleVersion=$bundle_version (se esperaba $BUILD_NUMBER)."
  exit 1
fi
for usage_key in NSCameraUsageDescription NSLocationWhenInUseUsageDescription NSPhotoLibraryUsageDescription; do
  usage_val=$(/usr/libexec/PlistBuddy -c "Print :$usage_key" "$INFO_PLIST" 2>/dev/null || true)
  if [ -z "$usage_val" ]; then
    echo "::error::$usage_key vacío o ausente en Info.plist."
    exit 1
  fi
done
echo "Info.plist OK."

mkdir -p "$ALTOOL_KEYS"
install -m 600 "$AUTH_KEY_PATH" "$ALTOOL_KEYS/AuthKey_${ASC_KEY_ID}.p8"

echo "Subiendo a TestFlight (sin envío a revisión de App Store)…"
xcrun altool --upload-app \
  --type ios \
  --file "$ipa" \
  --apiKey "$ASC_KEY_ID" \
  --apiIssuer "$ASC_ISSUER_ID"
echo "IPA subido a App Store Connect / TestFlight (build $BUILD_NUMBER)."