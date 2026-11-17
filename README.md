# Splitz — Android-first bill splitting PWA

## Files
Keep `index.html`, `style.css`, `app.js`, `sw.js`, and `manifest.webmanifest` together in the repository root.

## Features
- Start with 10 participants and add more as needed.
- Edit participant names.
- Choose receipt photos from Gallery, Files, or Camera.
- In-browser OCR using Tesseract.js.
- Review and edit detected line items.
- Assign items to one or more people; shared items divide evenly.
- Allocate tax/GST and discounts proportionally.
- Copyable settlement summary.
- Dark mobile-first interface and offline app-shell caching.

## Publish
Upload all files in this package to the root of the GitHub repository. Keep the existing `manifest.webmanifest` (it is included unchanged here). GitHub Pages will redeploy after the commit.

## OCR notes
OCR runs locally in the browser after the Tesseract.js library loads from jsDelivr, so the first scan requires an internet connection. Recognition and receipt parsing are best-effort; verify all extracted rows and totals against the source receipt. Receipts vary widely in layout, and this version does not guarantee accurate automatic interpretation of every quantity/rate/amount column.

## Install on Android
Open the HTTPS GitHub Pages URL in Chrome, then use Chrome menu → Install app / Add to Home screen. After updating, close and reopen the installed app. If an old shell remains, clear the site's cached data.

## Limitations
No accounts, cloud sync, group invites, payment processing, or signed APK.
