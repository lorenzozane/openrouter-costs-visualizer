# OpenRouter Costs Visualizer

Visualize OpenRouter CSV usage costs by model and over time.

<img width="2536" height="1414" alt="OpenRouter Costs Visualizer Screenshot" src="https://github.com/user-attachments/assets/43701493-0628-48b0-ad35-d19ddd60223f" />

- Drag & drop multiple CSV files (duplicates removed)
- Model/date filters, column visibility
- Sortable table
- Charts: cost by model, cost over time
- Settings saved locally
- Optional OpenRouter Analytics import with daily model totals
- Export and reimport Analytics data as a separate CSV format
- Check a regular OpenRouter API key's status, usage, and spending limit

## Quick start
- Double-click [index.html](index.html), or
- In VS Code: right‑click index.html → “Open with Live Server”, or
- Terminal (Windows):

  - `npx http-server . -p 8080` then open http://localhost:8080

No build step required.

## OpenRouter Analytics import

Choose **API sync** and use **Sync from OpenRouter**. The Analytics API requires an OpenRouter **management key**, not a regular inference key. Management keys can manage API keys in your account. Create one with an expiration date. This open-source website runs in your browser; you can [inspect its source code](https://github.com/lorenzozane/openrouter-costs-visualizer) to review how it handles the key.

The app uses the key only for the current sync request to OpenRouter. It clears the input immediately and does not put the key in localStorage, IndexedDB, a URL, or an app log. You must enter it again for the next sync. The imported usage data stays in the current tab and is not saved by the app. Use **Export synced data (CSV)** to keep a portable copy, and **Import synced CSV** to reopen it later. The normal CSV upload also recognizes this exported format.

Analytics exports contain daily model aggregates, including a request count. They are not OpenRouter's per-generation activity CSVs. The two formats are displayed in separate views so overlapping data is not double-counted. Core metrics can be queried for up to 365 days at a time; available history and metric limits depend on OpenRouter. The app checks the live Analytics schema and rejects truncated responses. Large ranges are fetched in 28-day parts. Dates in the interface use DD/MM/YYYY; Analytics dates remain UTC and exported CSV dates use ISO format.

Browser access to the Analytics API depends on OpenRouter allowing cross-origin requests from the app's origin. If the browser blocks the request, use CSV import. The API view works best from a hosted HTTPS page or local HTTP server, rather than opening `index.html` as a `file://` URL.

## Privacy
All CSV processing happens in your browser. CSV files never leave the machine. Analytics sync sends the entered management key directly to OpenRouter and keeps the resulting usage data in the current tab. The Chart.js script is included in this repository rather than loaded from a CDN.

The selected view and CSV column visibility are saved in browser localStorage. Management keys and imported data are not saved there.

The **Key checker** uses a regular OpenRouter API key with `GET /api/v1/key` directly from the browser. It does not use the management-key-only credits endpoint, and an unlimited key does not reveal the account's credit balance. The input is cleared when a check starts. The site does not save the key and removes any key stored by earlier versions of the checker when the page loads.

## Contribution
The extension is built using vanilla JavaScript and HTML/CSS (using chart.js for charts)

Any kind of contributions are welcomed!

- Open an [issue][GitHub Issues] with detailed information to **Report Bugs**.
- Create an [issue][GitHub Issues] to discuss **New Features**.
- Fork the repository, make your changes, and submit a **pull request**.

When contributing code, please maintain the vanilla structure of the project without introducing additional frameworks or unnecessary dependencies.



<!-------------------------------------------------->
[GitHub Issues]: https://github.com/lorenzozane/openrouter-costs-visualizer/issues
