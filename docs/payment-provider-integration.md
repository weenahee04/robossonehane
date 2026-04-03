# Payment Provider Integration Handoff

Current status on April 2, 2026:

- ROBOSS backend payment flow, webhook ingestion, verify/reconcile hooks, idempotency guards, amount verification, and admin diagnostics already exist.
- The repo still contains only scaffold adapters: `mock_promptpay` and `generic_rest`.
- No exact-match production provider contract was found in repo docs, env, or checked-in code.

## What must be supplied to finish the real adapter

Provide these exact items for the production provider:

1. Provider name
2. Create payment/reference request spec
3. Create payment success/error response examples
4. Real webhook payload example(s)
5. Signature or secret verification scheme
6. Verify/fetch payment endpoint and auth scheme
7. Reconcile behavior or settlement lookup rules
8. Provider status vocabulary and terminal-state meanings

## Exact details needed

For create payment:

- Endpoint URL
- HTTP method
- Required headers
- Authentication method
- Request body example
- Response body example
- Which field is the provider payment ID
- Which field is the QR string / redirect URL / payment token
- Expiry field name and format

For webhook:

- Full raw JSON example for success
- Full raw JSON example for failed or expired
- Event ID field
- Payment reference field
- Provider reference field
- Amount and currency field names
- Timestamp field name and timezone/format
- Retry behavior or duplicate-delivery behavior

For signature verification:

- Header name(s)
- Whether it is HMAC, asymmetric signature, or shared secret
- Input string to sign
- Hash/signature algorithm
- Prefix format if any
- Timestamp tolerance rules if any

For verify/reconcile:

- Endpoint URL
- HTTP method
- Path/query/body parameters
- Auth scheme
- Success response example
- Failure response example
- Whether verify can return refunded/voided/expired states

## Adapter mapping checklist

Once the provider data is available, encode these exact mappings:

- create request field mapping
- create response field mapping
- webhook field mapping
- signature verification
- provider status to ROBOSS `PaymentStatus` mapping
- provider amount/currency normalization
- provider reference resolution order
- verify/reconcile mapping

## Current safe posture

- Customer UX/UI is unchanged.
- Manual customer confirm remains dev-safe only.
- Production config validation now rejects scaffold payment providers.
- A provider smoke script is available at `backend/scripts/payment-provider-smoke.ts`.
- A production readiness summary is available via `cd backend && npm run verify:production`.
