# Nath iPhone preview

Native SwiftUI customer dashboard, bilingual service preparation with offline saved checklists, support and entry to the existing protected staff workspace. Request and tracking flows use Safari; staff passkey sign-in opens the system browser. This is a development preview, not an App Store submission.

On a Mac with Xcode and XcodeGen: `xcodegen generate --spec ios/project.yml`, then open the generated project. CI builds an unsigned simulator app and installs/launches it on an iPhone simulator. Simulator output cannot be installed on a physical iPhone.

Before TestFlight: enroll the owner in Apple Developer, confirm the permanent bundle identifier and signing team, add complete app icons, review required-reason API privacy declarations for UserDefaults, validate privacy disclosures against app and server behavior, and complete real-device acceptance. Account credentials and signing materials must never be committed.
