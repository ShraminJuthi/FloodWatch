# FloodWatch – Smart Flood Reporting & Monitoring System

SE 331 Live Coding Assessment project: **How Deep Is the Water?**

## What it does
- Accepts reports written in everyday language.
- Interprets common phrases and numeric depth measurements.
- Converts feet and centimeters to inches.
- Estimates risk: Low, Moderate, High, Critical.
- Marks reports older than 3 hours as stale.
- Detects disagreement between fresh reports in the same road area.
- Ranks areas by risk and shows a single dashboard.

> Important: qualitative body-depth phrases are approximate estimates, not precise measurements. This prototype is decision support, not a replacement for field verification.

## Requirements
- Node.js 18+ (recommended)
- VS Code
- Internet connection only for optional Google Fonts; the app itself runs locally.

## Run in VS Code
1. Extract the ZIP.
2. Open the `FloodWatch` folder in VS Code.
3. Open Terminal → New Terminal.
4. Run `npm install`.
5. Run `npm start`.
6. Open `http://localhost:3000` in your browser.
7. Click **Load demo data** to see sample reports.

For development with automatic server restart, use `npm run dev`.

## Test examples
Submit these reports with different area names:
- `Knee deep near the school`
- `Water up to my ankles`
- `About 1.5 feet in front of the mosque`
- `Water is 30 cm deep`
- `Road closed, too deep`
- `Rickshaw can still pass but barely`

Try the same area with different reports to see conflict detection. Use an old report only in demo data to see stale-report handling.

## Project structure
```text
FloodWatch/
├── data/
│   └── reports.json
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── src/
│   └── logic.js
├── package.json
├── server.js
└── README.md
```

## API endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check server |
| GET | `/api/reports` | Get all reports |
| POST | `/api/reports` | Submit and analyze report |
| DELETE | `/api/reports/:id` | Delete a report |
| GET | `/api/dashboard` | Get area summaries |
| POST | `/api/demo/reset` | Load sample demo reports |

### Example POST body
```json
{
  "area": "School Road",
  "volunteer": "Volunteer 1",
  "text": "Knee deep near the school"
}
```

## Team division (3 members)
1. **Frontend:** `public/index.html`, `public/styles.css`, `public/app.js`
2. **Backend:** `server.js`, API endpoints, JSON persistence in `data/reports.json`
3. **Logic & QA:** `src/logic.js`, parsing, unit conversion, staleness, conflict detection, test cases

Agree on the API contract before parallel work. Integrate through feature branches and pull requests.

## Known limitations / future improvements
- The first version uses keyword-based NLP, not a trained machine-learning model.
- Area names are entered by volunteers; geolocation/map integration can be added later.
- Conflict detection uses a simple threshold and should be improved with distance, report quality, and source reliability.
- Depth estimates from "ankle" or "knee" are approximate.
- A real deployment should use authentication, a database, audit logs, rate limiting, and field verification.
