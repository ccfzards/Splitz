# Split — Android-first bill splitting PWA

This is a mobile-first Progressive Web App prototype. It supports:
- Taking/selecting a receipt photo on Android
- In-browser OCR through Tesseract.js (requires internet to load the OCR library)
- Editable detected line items
- Multiple people and per-item assignment (shared items divide evenly among selected people)
- Proportional allocation of tax/GST and discount
- Copyable settlement summary
- Dark theme and basic offline shell caching

## Run locally
Serve this folder from a local web server (not `file://`). For example:
`python -m http.server 8000`
Then open `http://localhost:8000`.

## Install on Android
Deploy the folder to an HTTPS host, open it in Chrome on Android, then use
Chrome menu → **Install app** / **Add to Home screen**.

## Important limitations
- OCR is best-effort and only suggests item/price pairs; always verify the receipt.
- This prototype does not include user accounts, cloud sync, group invites, payment processing, or a signed APK.
- For a Play Store APK, package this PWA with Capacitor and complete Android signing/testing.
