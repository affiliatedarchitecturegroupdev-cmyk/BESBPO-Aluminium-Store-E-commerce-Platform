# Communications — WhatsApp, SMS, Email

## Provider-adapter pattern
`CommunicationsService` mirrors the `payments` module's shape: one method per channel, each
currently a `TODO(phase-2)` stub that logs to `NotificationLog` and returns a `QUEUED` status
rather than silently doing nothing or pretending to have sent something. See
`docs/22-service-providers.md` for the shortlist (Twilio/Bird/Infobip for WhatsApp Business
API, Clickatell/BulkSMS for SMS).

## Why this matters beyond marketing
WhatsApp order confirmations and dispatch links, and SMS delivery alerts, are now standard
buyer expectations in the SA market per the blueprint review — but MFA codes and any
compliance-critical notice (compliance document attached, DSAR status change) should route
through whichever channel the buyer explicitly opted into, tracked via `NotificationLog`, not
blasted across every channel by default.

## Event log, not a queue
`NotificationLog` is a record of what was sent and its provider-reported status — the actual
send queue (retry logic, rate limiting) belongs in BullMQ once the real provider is wired, per
`docs/01-tech-stack.md`.
