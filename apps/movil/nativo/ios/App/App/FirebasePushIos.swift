import Foundation
import FirebaseCore
import FirebaseMessaging

/// Firebase Messaging para entregar token FCM a Capacitor (opai-d194a). Sin plist no configura ni crashea.
enum FirebasePushIos {
    static let avisoPlistFaltante =
        "OPAI iOS: falta GoogleService-Info.plist (Firebase opai-d194a). Push FCM desactivado; "
        + "en CI use GOOGLE_SERVICE_INFO_PLIST (CAR-733)."

    static var tienePlist: Bool {
        Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil
    }

    static func configurarSiPuede() {
        guard tienePlist else {
            NSLog("%@", avisoPlistFaltante)
            return
        }
        if FirebaseApp.app() == nil {
            FirebaseApp.configure()
        }
    }

    static func entregarTokenFcm(
        apnsToken: Data,
        completion: @escaping (Result<String, Error>) -> Void,
    ) {
        guard tienePlist, FirebaseApp.app() != nil else {
            completion(.failure(NSError(
                domain: "cl.opai.push",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: avisoPlistFaltante],
            )))
            return
        }
        Messaging.messaging().apnsToken = apnsToken
        Messaging.messaging().token { token, error in
            if let error {
                completion(.failure(error))
                return
            }
            guard let token, !token.isEmpty else {
                completion(.failure(NSError(
                    domain: "cl.opai.push",
                    code: 2,
                    userInfo: [NSLocalizedDescriptionKey: "Token FCM vacío"],
                )))
                return
            }
            completion(.success(token))
        }
    }
}