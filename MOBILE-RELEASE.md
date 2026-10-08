# Nath customer and staff mobile release

Owner requested Android and iPhone store releases, with both customer and staff access, on 1 October 2026. Neither publishing account is enrolled yet. Public launch is not complete.

## Current implementation

- Android native bilingual dashboard, service preparation checklists stored locally, existing preview request/tracking flow and protected staff sign-in in the browser.
- iPhone SwiftUI equivalent with Safari request/tracking and system-browser staff sign-in. CI builds and launches an unsigned simulator app.
- Business PAN, NID, passport, driving licence, HIB and other services. Checklists are preparation prompts, not official eligibility or document requirements.
- Clear local checklists, support contact and existing website privacy policy entry. No native payments, push notifications or document upload.
- Preview API only; no production website or database deployment. Staff access uses existing authentication rather than a second password system.

## Gates before public release

1. Owner enrolls Google Play Console and Apple Developer using accurate legal identity. Confirm individual/organization eligibility and seller display name before paying. Apple organization enrollment requires legal-entity verification and usually D-U-N-S. Do not share passwords or payment card details in chat.
2. Agree permanent app IDs, final branding and launch markets. Confirm mobile-specific customer and staff acceptance criteria. This iteration keeps staff in the protected browser workspace; fully native staff management is not implemented.
3. Complete app-specific request and tracking usability, accessibility, offline/error behavior, secure session handling, privacy policy/data mapping, store disclosures and deletion process. Resolve any preview server authentication and sensitive-data limitations before serving real customers. Native checklists alone do not guarantee store approval.
4. Confirm current Google target-SDK and Apple upload SDK requirements at submission. Produce Android App Bundle with protected upload signing, and signed iOS archive using an owner-controlled Apple team. Add final store icons, real-device screenshots, descriptions, support URL, review instructions and working review access.
5. Run automated checks and real Android/iPhone acceptance for customer requests, retries, tracking, quote confirmation, staff permissions/passkeys, language, large text, rotation, backgrounding, offline recovery and local data reset. TestFlight and Google internal/closed testing precede public release.
6. New Google personal accounts may require at least 12 continuously opted-in closed testers for 14 days before applying for production access. Account-specific console requirements prevail.
7. Final acceptance of tested release, production backend readiness and review of listing/disclosures, then submit for store review. Store approval and timing are outside our control. Rollout should be staged and monitored.

## Verified account information (1 October 2026)

- Google Play: US$25 one-time registration; https://support.google.com/googleplay/android-developer/answer/6112435
- Google testing: https://support.google.com/googleplay/android-developer/answer/14151465
- Apple Developer: US$99/year, regional pricing may vary; https://developer.apple.com/programs/enroll/
- Apple minimum functionality: https://developer.apple.com/app-store/review/guidelines/#minimum-functionality

No store account has been created, fee paid, app submitted or approval obtained in this task.
