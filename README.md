# 🌸 Bloom: Personal Cycle & Wellness Tracker

**Bloom** is a lightweight, browser-based menstrual cycle tracker that helps you log periods, daily notes, moods, and other wellness data. It predicts cycles, ovulation, and fertile windows while allowing you to visualize entries in a monthly calendar.

This project is designed to work **offline** and stores your data locally in the browser. Export and import options let you backup your entries easily.

---

## Features

* Log **period start & end dates**, daily moods, appetite, and flow.
* Add **notes** even if no other entry exists.
* **Predicts next period, ovulation, fertile window, and luteal phase** based on your cycle history.
* **Monthly calendar view** with color-coded days:

  * **Period:** Pink gradient
  * **Fertile:** Light pink
  * **Luteal:** Darker pink
  * **Note-only days:** Dark pink (or blue optional)
* View and **edit daily entries** through a modal editor.
* **CSV & JSON export/import** for backup and analysis.
* **Offline-first**: all data saved locally in the browser.

---

## Screenshots

![Calendar View](./screenshots/calendar.png)
*Monthly calendar highlighting periods, fertile, luteal, and notes.*

![Day Modal](./screenshots/day_modal.png)
*View and add entries for a day.*

---

## Installation / Usage

1. Clone or download this repository.
2. Open `index.html` in any modern browser.
3. (Optional) Add to Home Screen for a PWA-like experience on mobile.

---

## Usage Tips

* **Logging**:

  * Use the `+` buttons in the modal to log period start, end, or add a note.
* **Calendar colors**:

  * Pink gradient: period
  * Light pink: fertile window
  * Dark pink: luteal phase
  * Dark pink / blue: note-only days
* **Export / Import**:

  * Export CSV/JSON for backup.
  * Import JSON to restore previous data.
* **Keyboard shortcut**: `Ctrl+I` or `Cmd+I` to paste JSON backup quickly.

---

## Data Privacy

Bloom stores all data **locally in your browser**. No data is sent to any server.

---

## Future Ideas

* Multi-state day rendering (note + fertile + period)
* Mobile notifications for predicted periods
* Dark mode / theme customization
