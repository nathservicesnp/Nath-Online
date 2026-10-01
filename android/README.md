# Nath Preview for Android

Installable test wrapper for the existing HTTPS Nath preview website. Requires Android 8 or newer and internet access. Not a Play Store release. Never use real identity or medical documents in the preview.

The APK opens the preview services, requests and tracking pages. Staff sign-in and external HTTPS, phone and email links open the appropriate phone app. It requests only internet access; it includes no native upload, payment or push-notification feature. The website remains the source of service functionality.

Build with JDK 17, Android SDK 35 and Gradle 8.11.1: `gradle -p android :app:testDebugUnitTest :app:lintDebug :app:assembleDebug`. The pull-request workflow performs these checks, verifies the APK signature and publishes a downloadable artifact and SHA-256 checksum.

This first preview uses an automatically generated debug signing key. It is for testing only; later builds may require uninstalling this preview first. Production needs a protected persistent signing key, device acceptance testing, a production URL decision and a separate release approval. No production deployment is performed by the Android workflow.
