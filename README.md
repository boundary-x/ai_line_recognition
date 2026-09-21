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
5. Select **Start transmission**. Select **Stop transmission** to send `L000R000` and keep previewing.

The project-example and class-material links are intentionally pending. The Bluetooth name-check example only identifies the device; it is not a robot controller.

## Motor-speed protocol

Use a micro:bit receiver that reads the left and right motor speeds.

Messages are 8 ASCII characters plus LF (9 bytes): L080R120\n means left 80, right 120. L000R000\n means stop, including line loss and manual transmission stop.

Each speed uses three zero-padded digits and is limited to 0–140. Left motors are 3/4; right motors are 1/2. No reverse motion is requested.

The web app computes error = 200 - x, correction = error × sensitivity, left = base - correction, right = base + correction, then rounds and clamps speeds. Default base is 80 and sensitivity 0.4. Base 0 overrides both outputs to zero. The preview shows computed commands, not measured wheel speed. Expand the principle panel for live calculations.

**Sent** means the Bluetooth write completed, not that the robot acknowledged motion. Stop commands take priority. Camera/configuration changes, walkthrough start, and tab hiding stop transmission; explicit restart is required. A micro:bit-side timeout must stop motors if packets stop arriving. Page-exit delivery is best effort.

## Detection and limitations

OpenCV 4.8.0 converts the bottom region to grayscale, applies Gaussian blur and thresholding, then selects the largest external contour over 300 pixels². Its centroid supplies the position. This is conventional computer vision, with no trained neural model. Shadows, large background regions, and intersections can affect detection.

## Requirements and development

Camera access requires HTTPS or localhost. Bluetooth requires a browser/platform that supports Web Bluetooth; verify compatibility on the target device. Internet access is required to load OpenCV and shared visual assets. Node.js is **not** required to use the hosted app.

For local development, serve this directory using any static HTTP server. No build step is required.

| File | Role |
| --- | --- |
| `index.html`, `style.css` | App layout and responsive states |
| `sketch.js` | Camera, OpenCV detection, and serialized Bluetooth writes |
| `support.js`, `support.css` | Support content and guided walkthrough |
