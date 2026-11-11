# claim-tracker

Claim tracker: log a claim number as Approve or RWE with time and per-user approval counts, plus an overall daily total.

A clean replacement for the claim tracker spreadsheet. Pick a user, type a claim number, and hit Approve (yes) or RWE (no). The app stamps the current Eastern time and the next approval number automatically.

## Users

- **Drew**, **Margo**, and **William** each have a separate log and a separate approval count. Approval numbers count only that user's Approves, per day.
- **All · Overall** combines everyone: overall reviewed / approved / RWE for the day, an approval rate, a per-person breakdown, and a combined log with a User column.

## Features

- Time, claim, decision (Approve / RWE), and approval # logged in one tap
- Today / previous / next day navigation, plus a date picker
- Tap a row's action to flip Approve ↔ RWE or delete it; approval numbers renumber with no gaps
- Undo right after logging
- Search by claim number
- Export CSV (with per-user approval numbers) and Backup JSON
- Import a Backup JSON to merge another computer's entries into the overall total (duplicates are skipped)

## How data is stored

Entries live in the browser's local storage on the device being used. Nothing is sent to a server and no claim data is stored in this repository. If Drew, Margo, and William log on different computers, use Backup / Import to bring the files together for a combined overall total.

## Run it

Open `index.html` in a browser, or serve the folder with any static host (for example GitHub Pages):

```
https://highimdreww.github.io/claim-tracker/
```
