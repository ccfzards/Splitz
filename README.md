# Splitz — Android-first bill splitting PWA

Mobile-first Progressive Web App prototype.

## Features
- Start with 10 participants, with no fixed limit; add more people as needed.
- Edit participant names directly.
- Two separate buttons: choose a bill photo from your gallery, or take a new photo with the camera.
- In-browser OCR through Tesseract.js (requires internet to load the OCR library).
- Review and edit detected line items.
- Assign each item to one or more people; shared items divide evenly.
- Allocate tax/GST and discounts proportionally to each person's item subtotal.
- Copyable settlement summary.
- Dark theme and basic offline shell caching.

## Publish / update
Upload `index.html`, `manifest.webmanifest`, and `sw.js` to the root of the GitHub repository and commit the changes. GitHub Pages will redeploy the site.

## Install on Android
Open the HTTPS GitHub Pages URL in Chrome on Android, then use Chrome menu → Install app / Add to Home screen. If the app was already installed, close and reopen it after the site updates; if needed, clear the site's cached data.

## Limitations
- OCR is best-effort and detected prices/items must be checked against the receipt.
- This prototype does not include accounts, cloud sync, group invites, payment processing, or a signed APK.
