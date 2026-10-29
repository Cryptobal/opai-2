# Benchmark de rondas (guard tour) y capacidades PWA vs nativo

**29-oct-2026 · CAR-72 · insumo de [`modulos/rondas.md`](../modulos/rondas.md).** Compara OPAI con los productos de rondas más usados del rubro y fija qué se puede medir desde una PWA y qué exige app nativa.

> **Cómo se verificó (léase antes de citar).** Desde el entorno de esta sesión la red no dejó abrir la mayoría de los sitios (tracktik.com, trackforce.com, webkit.org, caniuse.com, developer.chrome.com, MDN y la ayuda de Google Play respondieron sin conexión). Por eso **cada enlace de este archivo salió de resultados reales del buscador** (título, URL y extracto), no de una lectura completa de la página; ninguno es inventado. Sí se abrieron directamente y se confirmaron: la referencia de `android.location.Location` (método `isMock()`), la página de tipos de servicio en primer plano de Android 14 (`FOREGROUND_SERVICE_LOCATION`) y la documentación de Apple de `CLLocationSourceInformation`. Las páginas de proveedores son marketing propio, y **Trackforce es dueño de TrackTik, Silvertrac y GuardTek**. Antes del brief se reabren los enlaces de las filas que justifican una regla.

## A. Productos

### A.1 Tabla comparativa

| Capacidad | TrackTik (Trackforce) | Silvertrac (Trackforce) | QR-Patrol (Terracom) | Guardso / GuardsPro | Belfry | GuardTek (Trackforce, EMEA) | Coredinate (DE) |
|---|---|---|---|---|---|---|---|
| QR / código de barras | Sí ([soporte](https://support.tracktik.com/hc/en-us/articles/360060063774)) | Sí ([FAQ](https://support.trackforce.com/hc/en-us/articles/12832556783127-FAQ-What-Are-the-Types-of-Checkpoints-You-Can-Use-for-Tours-NFC-Barcode-QR-GPS-Virtual)) | Sí ([FitGap](https://us.fitgap.com/products/qr-patrol)) | Sí ([blog](https://blog.guardspro.com/?p=1808)) | Sí ([LP](https://www.belfrysoftware.com/lp/guard-tour-and-patrol-systems)) | Barcode ([página](https://www.trackforce.com/products/guardtek/guard-tours/)) | No verificable |
| NFC | Sí, lectura automática ([soporte](https://support.tracktik.com/hc/en-us/articles/1500001470221)) | Sí ([FAQ](https://support.trackforce.com/hc/en-us/articles/12832556783127-FAQ-What-Are-the-Types-of-Checkpoints-You-Can-Use-for-Tours-NFC-Barcode-QR-GPS-Virtual)) | Sí ([FitGap](https://us.fitgap.com/products/qr-patrol)) | Sí ([blog](https://blog.guardspro.com/?p=1808)) | Sí ([LP](https://www.belfrysoftware.com/lp/guard-tour-and-patrol-systems)) | Sí ([blog](https://www.trackforce.com/resources/blog-articles/enterprise-guard-tour-systems-with-nfc-integration-what-security-leaders-need-to-know/)) | Sí ([inicio](https://coredinate.de/?hsLang=en)) |
| Beacons BLE | No verificable | No verificable | Sí ([FitGap](https://us.fitgap.com/products/qr-patrol), [CORDIS](https://www.cordis.europa.eu/project/id/719375/reporting)) | No verificable | No verificable | No verificable | No verificable |
| Punto GPS / geocerca | Sí, radio configurable ([buenas prácticas](https://support.tracktik.com/hc/en-us/articles/30569727081367-Best-Practices-for-Creating-Checkpoints-and-Tours)) | Sí, más tour "virtual" sin punto físico ([FAQ](https://support.trackforce.com/hc/en-us/articles/12832556783127-FAQ-What-Are-the-Types-of-Checkpoints-You-Can-Use-for-Tours-NFC-Barcode-QR-GPS-Virtual)) | Geocerca ([FitGap](https://us.fitgap.com/products/qr-patrol)) | Mapa en vivo ([blog](https://blog.guardspro.com/?p=1808)) | Geocerca ([LP](https://www.belfrysoftware.com/lp/guard-tour-and-patrol-systems)) | GPS ([solución](https://www.trackforce.com/solutions/security-guard-tour-system/)) | GPS + geocerca ([funciones](https://coredinate.de/en/functions)) |
| Anti‑spoofing / GPS falso | No verificable | No verificable | No verificable | No verificable | No verificable | No verificable | No verificable |
| Sin conexión | Sí, tours completos ([soporte](https://support.tracktik.com/hc/en-us/articles/1500002654901-Mobile-App-issues-with-GPS-and-Checkpoints)) | No verificable (un agregador dice que no: [marlvel](https://marlvel.ai/apps/silvertrac)) | Sí ([SoftwareSuggest](https://www.softwaresuggest.com/qr-patrol)) | No verificable | No verificable | No verificable | Sí ([inicio](https://coredinate.de/?hsLang=en)) |
| App nativa | iOS ([App Store](https://apps.apple.com/app/id1102822566)) + Android | iOS y Android ([producto](https://www.trackforce.com/products/silvertrac/)) | iOS ([App Store](https://apps.apple.com/app/id1441106055)) | App móvil + portal web del guardia ([blog](https://blog.guardspro.com/guardso-guard-portal-is-now-live-more-updates-to-follow/)) | App ([LP](https://www.belfrysoftware.com/lp/security-guard-app)) | App | iOS/Android ([app](https://coredinate.de/en/coredinate-patrol-tour-app)) |
| Rastro GPS | Ubicación en tiempo real ([blog](https://www.tracktik.com/resources/blog-articles/built-for-guards-chosen-by-managers-the-security-app-features-that-matter-most/)) | Historial GPS de turnos y mapa en vivo ([Capterra](https://capterra.com/p/135436/Silvertrac-Software/pricing/)) | "Guard trail" ([Capterra](https://www.capterra.com/p/144995/QR-Patrol/)) | Mapa en vivo ([blog](https://blog.guardspro.com/?p=1808)) | GPS en vivo ([LP](https://www.belfrysoftware.com/lp/security-guard-tracking-system)) | No verificable | Sí ([funciones](https://coredinate.de/en/functions)) |
| Alerta por punto omitido | Alerta por punto atrasado ([manual](https://support.tracktik.com/hc/en-us/articles/35845546479255-Tracktik-Guarding-Suite-QuickLinks-Manual)) | Según terceros ([SoftwareFinder](https://softwarefinder.com/cybersecurity/silvertrac-software)) | Correo por punto omitido, adelantado o atrasado ([motherbase](https://beta.motherbase.ai/startup/23011-qr-patrol)) | No verificable | Sí ([LP](https://www.belfrysoftware.com/lp/guard-tour-and-patrol-systems)) | No verificable | No verificable |
| Hombre caído / trabajador solo / pánico | Pánico, temporizador de riesgo, check‑in de trabajador solo ([blog](https://www.tracktik.com/resources/blog-articles/built-for-guards-chosen-by-managers-the-security-app-features-that-matter-most/), [notas ago‑2023](https://support.tracktik.com/hc/en-us/articles/17282471494295-Release-notes-for-August-2023)); hombre caído no verificable | No verificable | Hombre caído en PRO ([App Store](https://apps.apple.com/app/id1441106055)) | No verificable | No verificable | Pánico y detección de caída ([blog](https://www.trackforce.com/resources/blog-articles/guard-tour-tracking-and-lone-worker-protection/)) | Hombre caído e inactividad ([inicio](https://coredinate.de/?hsLang=en)) |
| Portal y reportes al cliente | Portal de cliente ([GetApp](https://www.getapp.com/all-software/a/tracktik/)) | Portal y DAR automático ([producto](https://www.trackforce.com/products/silvertrac/)) | PDF por correo automático al cliente ([IFSEC](https://directory.ifsecglobal.com/qrpatrol-prod009773.html)) | Portal de cliente ([blog](https://blog.guardspro.com/guard-tour-client-portal-an-effective-way-to-enhance-customer-service/)) | Acceso del cliente en tiempo real ([LP](https://www.belfrysoftware.com/lp/best-security-workforce-management-software)) | Reporte electrónico al cerrar la ronda ([página](https://www.trackforce.com/products/guardtek/guard-tours/)) | PDF al cliente ([funciones](https://coredinate.de/en/functions)) |
| Orden de ronda | Cualquier orden; variación mediante varios tours ([soporte](https://support.tracktik.com/hc/en-us/articles/1500001454901), [reseña](https://softwareadvice.com.au/software/159400/tracktik)) | Orden fijo o "en algún momento del turno" ([blog](https://www.trackforce.com/resources/blog-articles/improve-security-patrols-with-guard-tour-software/)) | Programación de rutas ([App Store](https://apps.apple.com/app/id1441106055)) | No verificable | No verificable | No verificable | No verificable |
| Fotos y notas en el punto | Formulario, preguntas y ticket de excepción ([manual](https://support.tracktik.com/hc/en-us/articles/35845546479255-Tracktik-Guarding-Suite-QuickLinks-Manual)) | Reportes con foto y audio ([producto](https://www.trackforce.com/products/silvertrac/)) | Formularios móviles ([Capterra](https://www.capterra.com/p/144995/QR-Patrol/)) | Reportes ([blog](https://blog.guardspro.com/guardso-guard-portal-is-now-live-more-updates-to-follow/)) | Reportes ([LP](https://www.belfrysoftware.com/lp/security-reporting-software)) | No verificable | Bitácora y tickets ([funciones](https://coredinate.de/en/functions)) |
| Precio | **No público** ([pricing](https://www.trackforce.com/products/tracktik/pricing/)) | Desde USD 249/mes por hasta 10 dispositivos ([Capterra](https://capterra.com/p/135436/Silvertrac-Software/pricing/)) | Desde EUR 2,20, 4,40 u 8,29 por guardia al mes ([FitGap](https://us.fitgap.com/products/qr-patrol)); Capterra pide cotizar | Desde USD 10 por usuario al mes, mínimo 3 ([GetApp](https://www.getapp.com/security-software/a/guardso/)) | **No público**, por empleado ([inicio](https://belfrysoftware.com/)) | No verificable | No verificable |

### A.2 Notas por producto

**TrackTik**
- Tipos de punto en la ayuda oficial: NFC, código de barras y GPS. El NFC se lee automáticamente; para barcode y GPS el guardia toca un botón ([cómo hacer tours](https://support.tracktik.com/hc/en-us/articles/1500001470221), [crear punto](https://support.tracktik.com/hc/en-us/articles/360060063774)).
- Punto GPS: el escaneo se registra cuando el dispositivo está dentro del rango definido para ese punto. La guía advierte que los radios muy chicos son poco fiables y sugiere agrandarlos un poco. No publica un radio por defecto ni un umbral de `accuracy` ([buenas prácticas](https://support.tracktik.com/hc/en-us/articles/30569727081367-Best-Practices-for-Creating-Checkpoints-and-Tours)).
- Sin conexión: los tours funcionan completamente offline y los registros se envían después ([problemas GPS](https://support.tracktik.com/hc/en-us/articles/1500002654901-Mobile-App-issues-with-GPS-and-Checkpoints)).
- Un "No" en una pregunta Sí/No del punto crea un ticket de excepción. Las alertas de punto atrasado están en Site > Security and Patrol ([manual](https://support.tracktik.com/hc/en-us/articles/35845546479255-Tracktik-Guarding-Suite-QuickLinks-Manual)).
- Precio cotizado a medida ([pricing](https://www.trackforce.com/products/tracktik/pricing/)).

**Silvertrac**
- Trackforce prefiere QR sobre NFC ([blog QR](https://www.trackforce.com/resources/blog-articles/3-advantages-to-using-qr-codes-for-guard-tours-over-rfid-nfc-tags/)), aunque su FAQ actual lista NFC, barcode, QR, GPS y virtual.
- Los QR los genera Soporte de Trackforce. Los tours GPS son más baratos, pero sufren con mala señal y zonas muertas ([overview](https://support.trackforce.com/hc/en-us/articles/12788546228119-An-Overview-to-Understanding-Tours)).
- Hay un modo manual: el guardia toca la descripción del punto en lugar de escanearlo ([blog](https://www.trackforce.com/resources/blog-articles/how-to-conduct-effective-guard-tours-without-physical-checkpoints/)).
- Las reseñas piden mejor GPS y reportes más flexibles ([Software Advice](https://www.softwareadvice.com/cmms/silvertrac-software-profile/)).

**QR-Patrol**
- Los beacons permiten ubicar al guardia con precisión en espacios sin GPS. Hombre caído con sensor vestible ([CORDIS](https://www.cordis.europa.eu/project/id/719375/reporting)).
- El plan base incluye geocerca, alertas en tiempo real, correo, DAR, NFC/QR, beacons y gestión de incidencias (solo puntos omitidos) ([FitGap](https://us.fitgap.com/products/qr-patrol)).
- PTT y hombre caído solo en PRO. Reportes por correo, en PDF o impresos ([App Store](https://apps.apple.com/app/id1441106055)).
- Precios contradictorios: [FitGap](https://us.fitgap.com/products/qr-patrol) publica tramos en EUR y [Capterra](https://www.capterra.com/p/144995/QR-Patrol/) dice "contactar al proveedor".

**Guardso (GuardsPro)**
- Genera QR, acepta NFC y muestra un mapa en vivo en el PPO Dashboard ([blog](https://blog.guardspro.com/?p=1808)).
- Portal de cliente con control de qué reportes ve cada cliente ([blog](https://blog.guardspro.com/why-client-portal-access-for-your-clients-is-no-longer-an-option-but-a-must/)).
- Precio desde USD 10 por usuario ([GetApp](https://www.getapp.com/security-software/a/guardso/)). No queda claro si "usuario" es guardia o administrador.

**Belfry**
- Ofrece NFC, QR, GPS y geocerca, con alerta cuando el guardia sale del área ([LP](https://www.belfrysoftware.com/lp/guard-tour-and-patrol-systems)).
- Precio por empleado y por mes, sin lista publicada ([inicio](https://belfrysoftware.com/)).

**GuardTek (Trackforce, EMEA)**
- Planos y rutas cargados en el software ([blog NFC](https://www.trackforce.com/resources/blog-articles/enterprise-guard-tour-systems-with-nfc-integration-what-security-leaders-need-to-know/)).
- Trabajador solo con pánico, caída desde cierta altura y temporizador de zona de peligro ([blog](https://www.trackforce.com/resources/blog-articles/guard-tour-tracking-and-lone-worker-protection/)).
- Reporte electrónico al cerrar la ronda y ventana de solo lectura para el cliente ([guard tours](https://www.trackforce.com/products/guardtek/guard-tours/)).

**Coredinate (Alemania)**
- NFC, funcionamiento offline y sincronización en tiempo real ([inicio](https://coredinate.de/?hsLang=en)).
- Hombre caído por inactividad, geocerca y PDF al cliente ([funciones](https://coredinate.de/en/functions)).
- Kit de prueba de 14 días ([testkit](https://www.coredinate.de/en/order-testkit)).

**Latinoamérica**
- VigiControl (SoftGuard, México): valida que el guardia esté dentro del rango GPS autorizado y acepta QR y NFC Type 2 ([Syscom](https://syscom.mx/blog/vigicontrol-monitoreo-de-rondas-y-guardias-en-tiempo-real-para-centrales-de-seguridad)).
- "Rondas Control": app Android que declara presencia en Chile ([APKPure](https://apkpure.net/rondas-control/com.rondas.control)).
- Un encargo publicado en Workana pide expresamente detectar GPS falso ([Workana](https://www.workana.com/es/job/desarrollo-de-sistema-de-control-de-rondas-para-personal-de-seguridad-con-app-movil-y-panel-web)), lo que indica que el mercado lo demanda.
- Prosegur y "Rondas Online": no verificable.

**Anti‑spoofing en el mercado:** ningún proveedor del benchmark documenta públicamente cómo detecta GPS falso. Lo que sí está documentado son técnicas genéricas: la marca de ubicación simulada, cruzar el GPS con sensores y detectar emuladores ([Guardsquare](https://www.guardsquare.com/blog/securing-location-trust-to-prevent-geo-spoofing)), y un plugin de Capacitor que detecta ubicación simulada ([Capgo](https://capgo.app/docs/plugins/mock-location-detector/)).

---

## B. PWA vs nativo

| Capacidad | PWA o web | Android nativo | iOS nativo |
|---|---|---|---|
| Precisión de la posición | `coords.accuracy` en metros, con confianza de 95% ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/GeolocationCoordinates/accuracy)). El 95% es un "should" y la API no garantiza la ubicación real ([lista W3C](https://lists.w3.org/Archives/Public/public-geolocation/2015Sep/0001.html), [REC 2024](https://www.w3.org/TR/2024/REC-geolocation-20240809/)) | `Location` con precisión ([ref](https://developer.android.com/reference/android/location/Location)) | CoreLocation |
| Ubicación en segundo plano | No con la página oculta: la propuesta de la especificación pausa `watchPosition` hasta que la página vuelve a ser visible ([PR #87](https://github.com/w3c/geolocation/pull/87.patch)). WebKit y Blink no lo permiten ([log W3C](https://lists.w3.org/Archives/Public/public-device-apis-log/2020Jul/0070.html)). En iOS no hay ubicación en segundo plano para PWA ([WebKit bug](https://bugs.webkit.org/show_bug.cgi?id=193946), [MagicBell](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)) | Servicio en primer plano tipo `location` con `FOREGROUND_SERVICE_LOCATION` desde Android 14 ([Android 14](https://developer.android.com/about/versions/14/changes/fgs-types-required)) | Permiso "Always", `allowsBackgroundLocationUpdates` y cambio significativo, que relanza la app ([foro Apple](https://developer.apple.com/forums/thread/748098)). `CLBackgroundActivitySession` desde iOS 17 ([live updates](https://developer.apple.com/documentation/corelocation/supporting-live-updates-in-swiftui-and-mac-catalyst-apps.md)) |
| Detectar ubicación simulada | No existe API web | `Location.isMock()` desde API 31; `isFromMockProvider()` quedó obsoleto ([ref](https://developer.android.com/reference/android/location/Location), [LocationCompat](https://developer.android.com/reference/androidx/core/location/LocationCompat)) | `CLLocationSourceInformation.isSimulatedBySoftware` desde iOS 15 ([doc](https://developer.apple.com/documentation/corelocation/cllocationsourceinformation.md)). No detecta todas las herramientas externas ([foro](https://developer.apple.com/forums/thread/803179)) |
| Integridad del dispositivo o la app | No existe | Play Integrity: `MEETS_DEVICE_INTEGRITY` y `MEETS_STRONG_INTEGRITY` (en Android 13+ exige parche de seguridad de menos de un año) ([mejoras](https://developer.android.com/google/play/integrity/improvements)) | App Attest / DeviceCheck ([doc](https://developer.apple.com/documentation/devicecheck/establishing-your-app-s-integrity.md)) |
| QR con la cámara | `BarcodeDetector`: Chrome 88+ en Android (requiere Play Services). En Safari solo detrás de un flag ([Chrome](https://developer.chrome.com/docs/capabilities/shape-detection), [BCD](https://chromium.googlesource.com/external/github.com/mdn/browser-compat-data/+/73d346309ee9d8be7e32fda8ff574d4c79dd4c51/api/BarcodeDetector.json)). En iOS hace falta un lector en JS o WASM | Sí | Sí |
| NFC | Web NFC solo en Chrome para Android, solo NDEF ([Chrome](https://developer.chrome.com/docs/capabilities/nfc)) | Sí | Core NFC (no consultado en esta sesión) |
| Beacons BLE | Web Bluetooth no existe en Safari ni iOS ([caniuse](https://caniuse.com/mdn-api_bluetooth), [W3C](https://lists.w3.org/Archives/Public/public-web-bluetooth/2024Sep/0002.html)) | Sí | Sí |
| Escaneo Wi‑Fi | No existe API web ([doc plugin](https://pub.dev/documentation/layrz_wifi/latest/)) | Sí | Restringido ([misma fuente](https://pub.dev/documentation/layrz_wifi/latest/)) |
| Push | iOS 16.4+ solo para web apps en la pantalla de inicio ([WebKit](https://webkit.org/?p=13878)) | FCM | APNs |
| Background Sync | No en Safari ni iOS ([caniuse](https://caniuse.com/background-sync), [MDN](https://developer.mozilla.org/docs/Web/API/Background_Synchronization_API)) | WorkManager | BGTaskScheduler (no consultado) |
| Wake Lock | Safari 16.4+. En PWA instalada falló hasta iOS 18.4. Se libera al cambiar de pestaña ([web.dev](https://web.dev/blog/screen-wake-lock-supported-in-all-browsers), [Chrome](https://developer.chrome.com/docs/capabilities/web-apis/wake-lock), [Progressier](https://progressier.com/pwa-capabilities/screen-wake-lock)) | Sí | Sí |
| Persistencia de datos | Safari borra el almacenamiento tras 7 días sin uso; la app en la pantalla de inicio lleva su propio contador. `persist()` se concede por heurística ([WebKit](https://webkit.org/?p=14403), [MDN](https://developer.mozilla.org/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)) | Sí | Sí |

**Android, políticas y batería**
- Google Play exige un formulario de declaración, un video y una divulgación destacada en la app para `ACCESS_BACKGROUND_LOCATION` (targetSdk 29+). Prefiere la ubicación en primer plano ([ayuda Play](https://support.google.com/googleplay/android-developer/answer/9799150?hl=en)).
- Un servicio en primer plano de ubicación no requiere `ACCESS_BACKGROUND_LOCATION` ([HERE](https://docs.here.com/here-sdk/docs/android-get-locations-enable-background-updates)).
- Tipos de servicio en primer plano: se declaran en Play Console desde Android 14 ([Android 14](https://developer.android.com/about/versions/14/changes/fgs-types-required)).
- Doze y App Standby: un servicio en primer plano evita App Standby ([doc](https://developer.android.com/training/monitoring-device-state/doze-standby)).

**Envoltorios**
- **Capacitor + `@capacitor-community/background-geolocation`:** gratuito. En Android muestra una notificación persistente mientras hay un watcher en segundo plano y trae arreglos para Android 14 ([README](https://cdn.jsdelivr.net/npm/@capacitor-community/background-geolocation@1.2.26/README.md)).
- **Transistorsoft:** gratis en debug; la build release de Android requiere licencia ([README v9.2.0](https://app.unpkg.com/@transistorsoft/capacitor-background-geolocation@9.2.0/files/README.md)). Un competidor reporta USD 399 por una app y USD 999 por 100 keys, pago único con un año de actualizaciones ([Capawesome](https://capawesome.io/blog/alternative-to-transistorsoft-background-geolocation/)). Ese precio no se confirmó en el sitio oficial.
- **Alternativa MIT:** `@capgo/background-geolocation` ([Capgo](https://capgo.app/blog/transistorsoft-background-geolocation-alternative/)).
- **TWA (Android):** ejecuta la PWA en Chrome, verificada con Digital Asset Links. La app anfitriona no accede al estado web. Si la verificación falla, cae a una Custom Tab con barra de direcciones ([Chrome TWA](https://developer.chrome.com/docs/android/trusted-web-activity), [Android](https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities?hl=it)). Que una TWA quede limitada a las APIs web de Chrome es una inferencia; esta búsqueda no lo confirmó.

---

## C. No verificable

1. Radio GPS por defecto o umbral de `accuracy` de cualquier proveedor. TrackTik solo dice que se configura y que no conviene un radio chico.
2. Detección de GPS falso o ubicación simulada en TrackTik, Silvertrac, QR-Patrol, Guardso, Belfry, GuardTek y Coredinate.
3. Beacons en TrackTik, Silvertrac, Guardso, Belfry y GuardTek.
4. Modo offline en Silvertrac, Guardso, Belfry y GuardTek.
5. Hombre caído automático en TrackTik (sí hay pánico y check‑in de trabajador solo); trabajador solo en Silvertrac, Guardso y Belfry.
6. Rondas en orden aleatorio como función nativa (TrackTik solo vía varios tours; resto sin dato).
7. Alertas por SMS en QR-Patrol; alertas por punto omitido en Guardso.
8. Precios oficiales de TrackTik, Belfry, GuardTek y Coredinate. Los de QR-Patrol y Silvertrac vienen de agregadores.
9. Guardhouse y Prosegur: sin resultados útiles. "Rondas Online": no encontrado.
10. Precio oficial de Transistorsoft y si la v9 exige licencia también en iOS (las fuentes se contradicen).
11. Core NFC y BGTaskScheduler de iOS: no se buscaron en esta sesión.

Además: la **Battery Status API** (nivel de batería) no está en Safari; se usa como conocimiento previo, **sin enlace verificado** en esta sesión. La precisión típica de un teléfono (5–15 m al aire libre, bastante peor bajo techo) es experiencia de 1.0 y del rubro, **no una cifra con fuente**: la única fuente es TrackTik, que advierte que los radios chicos fallan.

---

## D. Qué adoptamos, qué mejoramos y qué descartamos

### Adoptamos (lo que el rubro ya hace y 1.0 también)

- **Varios tipos de punto: QR, NFC y GPS** (todos los productos de A.1). En OPAI, como **modo por punto** con herencia (R1).
- **Geocerca con radio configurable**, sin radios chicos (TrackTik, buenas prácticas). En OPAI, radio **y** precisión mínima (R3).
- **Rondas completas sin conexión** con envío posterior (TrackTik, Coredinate, QR-Patrol). En OPAI, cola idempotente con secuencia (R22, R23).
- **Alertas por punto atrasado u omitido** (TrackTik, QR-Patrol, Belfry), como eventos para la central (R31, CAR-70).
- **Informe automático al cliente en PDF** (Silvertrac DAR, QR-Patrol, GuardTek, Coredinate) y **portal del cliente** con control de qué ve (Guardso). En OPAI, PDF con la marca del tenant, opcional por cuenta (R30, R32).
- **Excepción en un punto que abre un ticket** (TrackTik): en OPAI, «Crear ticket» desde una anomalía, con responsable (ADR-025).
- **Orden fijo o libre** (Silvertrac).

### Mejoramos (donde los líderes no documentan nada o lo hacen peor)

- **Antifraude honesto.** Ningún proveedor del benchmark documenta cómo detecta GPS falso (C.2), aunque el mercado lo pide (encargo en Workana). OPAI registra la ubicación simulada y la integridad del dispositivo **solo donde el sistema operativo las entrega** (app nativa: `isMock()`, `isSimulatedBySoftware`, Play Integrity, App Attest), dice «no verificable» en la PWA y no castiga lo que el teléfono no informa (R15–R17).
- **Trust score explicado y versionado**, con desglose por señal. No se encontró nada equivalente documentado en los productos revisados.
- **QR opaco, firmado y reemplazable** y la anomalía «QR leído lejos de su punto» contra el QR fotocopiado (R7, R8). Trackforce prefiere QR sobre NFC por costo; nosotros sumamos GPS como evidencia.
- **Hora del servidor y reloj alterado** detectado también sin conexión (R14).
- **Orden aleatorio por ejecución** como opción de la plantilla (R12); en TrackTik solo se logra con varios tours.
- **Rastro solo durante la ronda y huecos visibles** (R9, R10), por la Ley 21.719, en vez de rastreo de turno completo.
- **Agent-first:** cada acción de configuración, vigilancia e informes también por MCP, con vista previa y aprobación humana para lo irreversible (§9 de la especificación). Ningún producto revisado lo ofrece.

### Descartamos (por ahora)

- **Balizas BLE** (solo QR-Patrol las documenta): requieren hardware y app nativa; se reevalúan después del Brief 17.
- **Hombre caído con sensor de caída o vestible** (QR-Patrol PRO, GuardTek): Rondas solo emite «sin movimiento» durante la ronda y la central decide (CAR-70).
- **Tours «virtuales» o marca manual tocando el punto sin leerlo** (Silvertrac): contradicen el objetivo de medición fidedigna. La etiqueta dañada se resuelve con GPS o novedad con foto.
- **Push-to-talk** (QR-Patrol PRO): fuera de alcance; sin chat (ADR-025).
- **Envoltorios sin capacidades nativas** (TWA, PWABuilder): no dan GPS en segundo plano ni detección de ubicación simulada; se mantiene Capacitor (ADR-044.8). Para la geolocalización en segundo plano, el brief 17 compara el plugin comunitario gratuito con Transistorsoft (licencia pagada en Android; precio sin confirmar en el sitio oficial).
