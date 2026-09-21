# 🛤️ Boundary X - AI Line Recognition

**Boundary X - AI Line Recognition** detects a line in the camera image and calculates left and right motor speeds for a **BBC Micro:bit** robot through **Web Bluetooth (BLE)**.

Powered by **OpenCV.js**, camera images are processed locally in the browser. No model training is required. Students can explore how line position changes steering while the micro:bit receives ready-to-use motor speeds.

![Project Status](https://img.shields.io/badge/Status-Active-success)
![Platform](https://img.shields.io/badge/Platform-Web-blue)
![Tech](https://img.shields.io/badge/Stack-OpenCV.js%20%7C%20Canvas%20%7C%20BLE-00E676)

**[Open the Web App](https://boundary-x.github.io/ai_line_recognition/)**

---

## ✨ Key Features

### 1. 🔍 Camera-Based Line Detection

- **Detection Region:** Adjustable bottom region, using 30% of the image by default.
- **Line Type:** Supports dark lines on a light background or light lines on a dark background.
- **Threshold Adjustment:** Separates the line from its background.
- **Binary Preview:** Enabled by default; detected foreground appears white and background appears black. It can be switched off.
- **Visual Feedback:** Yellow region outline, center reference, detected centroid, and position error.

The largest external contour over 300 pixels² is selected. Detection uses image processing rather than a trained neural model; shadows, floor patterns, and intersections can affect the result.

### 2. 🎮 Motor-Speed Control

- **Base Speed:** Adjustable from 0 to 140; default 80.
- **Steering Sensitivity:** Adjustable from 0 to 1; default 0.4.
- **Ready-to-Use Output:** Computes left and right speeds in the browser, simplifying the micro:bit program.
- **Speed Limits:** Rounded and limited to 0–140, with no reverse motion. Base speed 0 stops both sides.
- **Independent Preview:** Recognition and calculated speeds can be checked without connecting a robot.

### 3. 💡 Learn How Steering Works

- Left and right speed bars show the calculated motor commands.
- The expandable **How It Works** panel shows line position, error, correction, and resulting speeds.
- Moving the line left slows the left motors relative to the right motors; moving it right does the opposite.
- Mounting the camera on the robot lets students observe the feedback loop: detect, steer, then detect again.

Speed bars represent commands, not measured wheel speeds.

### 4. 🔗 Wireless Connectivity (BLE)

- Connects to a micro:bit Nordic UART receiver.
- Explicit **Start Transmission** and **Stop Transmission** controls.
- Serialized writes with prioritized stop commands.
- Connection and transmission error messages.
- Transmission status changes to **Sent** only after the browser write completes.

### 5. 📱 Responsive UI & Support

- Automatic rear-camera start, front/rear switching, and horizontal mirroring.
- A 4:3 center crop with a sticky preview for desktop, tablet, and phone layouts.
- A 12-step highlighted walkthrough, troubleshooting cards, and update notes.
- Bluetooth name-check example included; project examples and lesson materials are marked as pending.

---

## 🚀 How to Use

1. Open the app and allow camera access.
2. Point the rear camera at the line, keeping it inside the yellow detection region.
3. Choose **Dark Line** or **Light Line**. In the default binary view, adjust the threshold until the line is white and the background is black.
4. Adjust the detection-region height if needed.
5. Set **Base Speed** and **Steering Sensitivity**, and check the calculated left/right speeds. Expand **How It Works** to inspect the calculation.
6. Connect a micro:bit running a compatible motor-speed UART receiver.
7. Select **Start Transmission**. Select **Stop Transmission** to stop the robot while continuing the preview.

Changing the camera, mirroring, detection settings, or driving settings stops transmission. Starting the walkthrough or hiding the tab also stops transmission. Press Start again after checking the settings.

The Bluetooth name-check example identifies the device; it does not control the robot. The receiver must apply motor speeds and stop its motors when data stops arriving.

---

## 📡 Communication Protocol

Each ASCII message ends with an actual newline, represented below as `\n`.

| Situation | Example | Meaning |
| --- | --- | --- |
| Straight ahead | `L080R080\n` | Left 80, right 80 |
| Turn left | `L060R100\n` | Left 60, right 100 |
| Turn right | `L100R060\n` | Left 100, right 60 |
| No line / stopped | `L000R000\n` | Both sides stopped |

| Field | Description |
| --- | --- |
| `L` | Left motor speed, three zero-padded digits, 000–140 |
| `R` | Right motor speed, three zero-padded digits, 000–140 |

A packet contains **8 ASCII characters plus one newline: 9 bytes**. Using zero-based positions, the left value is at 1–3 and the right value is at 5–7. Read until the newline before parsing.

**Steering calculation:**

```text
error = 200 - lineX
correction = error × steeringSensitivity
leftSpeed = baseSpeed - correction
rightSpeed = baseSpeed + correction
```

The displayed image uses a 400 × 300 coordinate space. Speeds are rounded and limited to 0–140. Base speed 0 overrides both outputs to zero. Coordinates follow the displayed orientation, including mirroring.

Transmission is limited to at most once per 100 ms and depends on frame processing and Bluetooth speed. **Sent** means the browser write completed, not that the robot acknowledged or executed the command. Page-exit delivery is best effort; the receiver needs a timeout to stop motors after communication is lost.

**Nordic UART UUIDs:**

- Service: `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
- Write characteristic: `6e400003-b5a3-f393-e0a9-e50e24dcca9e`

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript, Canvas API
- **Detection:** OpenCV.js 4.8.0
- **Processing:** Grayscale conversion, Gaussian blur, thresholding, contour selection, and centroid calculation
- **Connectivity:** Web Bluetooth API

Detection runs at most once every 80 ms on a new camera frame. OpenCV buffers are reused and temporary contour objects are released. Actual performance and heating depend on the phone and scene.

| File | Role |
| --- | --- |
| `index.html`, `style.css` | Layout, responsive design, and visual states |
| `sketch.js` | Camera, line detection, motor calculations, and Bluetooth transmission |
| `support.js`, `support.css` | Support content and guided walkthrough |

Automated checks cover synthetic line detection, motor-speed calculations, simulated Bluetooth writes, stop priority, and responsive walkthroughs. Physical robot operation and phone-specific performance still require real-device testing.

---

## 🌐 Requirements

- Camera access requires **HTTPS or localhost** and camera permission.
- Bluetooth requires a **Web Bluetooth-compatible browser** and a compatible micro:bit receiver.
- Internet access is required to load OpenCV and shared visual assets.
- **Node.js is not required to use the hosted web app.**
- For local development, serve this directory with any static HTTP server. No build step is required.

---

## 📝 License

- Copyright © 2024 Boundary X Co. All rights reserved.
- Third-party components retain their respective licenses.
- Web: [boundaryx.io](https://boundaryx.io)
- Contact: [Contact Boundary X](https://boundaryx.io/contact)
