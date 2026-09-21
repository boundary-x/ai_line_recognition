# Boundary X · AI Line Recognition

Browser-based line tracking with OpenCV.js and micro:bit Bluetooth UART.

[Open the web app](https://boundary-x.github.io/ai_line_recognition/)

## Features

- Automatic rear-camera preview, front/rear switching, and mirroring.
- A consistent 4:3 center crop with responsive, sticky preview.
- Dark/light line selection, threshold adjustment, and bottom-region selection.
- Optional binary preview for separating the line from the background.
- Recognition preview works without a Bluetooth connection.
- Explicit transmission controls and connection/error feedback.
- In-app walkthrough, example-code section, troubleshooting cards, and update notes.

## Quick start

1. Allow camera access and place the line in the yellow detection region.
2. Choose dark or light line. Enable the binary view and adjust the threshold until the line is white and the background is black.
3. Check the detected center and error before connecting a robot.
4. Connect a micro:bit running a compatible Bluetooth UART receiver.
5. Select **Start transmission**. Select **Stop transmission** to send `stop` and keep previewing.

The project-example and class-material links are intentionally pending. The Bluetooth name-check example only identifies the device; it is not a robot controller.

## UART protocol

Messages are ASCII text ending in LF (`\n`). The existing protocol is retained:

| State | Example |
| --- | --- |
| Line detected | `x150 e50 d1\n` |
| No line / transmission stopped | `stop\n` |

- `x`: horizontal position in the 400 × 300 displayed image (0–400).
- `e`: `200 - x`; left is positive, right is negative (−200–200).
- `d1`: line detected. This app does not transmit `d0`.
- Mirroring changes both the displayed image and the coordinate direction.
- Frames are processed at most every 80 ms; transmission is limited to at most once per 100 ms and depends on device performance.

**Sent** means the Bluetooth write completed, not that the robot acknowledged or completed a movement. Stop commands take priority over pending tracking data. Camera/configuration changes, walkthrough start, and tab hiding stop transmission; resuming requires an explicit start. Page exit delivery is best-effort. The robot must stop its motors when data has not arrived within its configured timeout, because a disconnected browser cannot deliver `stop`.

## Detection and limitations

OpenCV 4.8.0 converts the bottom region to grayscale, applies Gaussian blur and thresholding, then selects the largest external contour over 300 pixels². Its centroid supplies the position. This is conventional computer vision, with no trained neural model. Shadows, large background regions, and intersections can affect detection. Line selection has not been redesigned in this update.

## Requirements and development

Camera access requires HTTPS or localhost. Bluetooth requires a browser/platform that supports Web Bluetooth; verify compatibility on the target device. Internet access is required to load OpenCV and shared visual assets. Node.js is **not** required to use the hosted app.

For local development, serve this directory using any static HTTP server. No build step is required.

| File | Role |
| --- | --- |
| `index.html`, `style.css` | App layout and responsive states |
| `sketch.js` | Camera, OpenCV detection, and serialized Bluetooth writes |
| `support.js`, `support.css` | Support content and guided walkthrough |
