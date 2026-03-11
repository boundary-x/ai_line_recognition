/*
 * sketch.js
 * Boundary X Line Tracking (Powered by OpenCV.js)
 * Features: ROI setup, Gaussian Blur, Binarization Debug View, Centroid Tracking
 */

// --- Bluetooth UUIDs (Microbit UART) ---
const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const UART_TX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const UART_RX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

// --- Variables ---
let mainCanvas; // 전역 캔버스 변수
let bluetoothDevice = null;
let rxCharacteristic = null;
let txCharacteristic = null;
let isConnected = false;
let bluetoothStatus = "연결 대기 중";
let isSendingData = false; 

let lastSentTime = 0; 
const SEND_INTERVAL = 100; // 데이터 전송 간격 (ms)

// Video & AI
let video;
let isTrackingActive = false; 
let wasDetectingBeforeSwitch = false; 

// Camera Control
let facingMode = "environment"; // 모바일 로봇 기본은 후방 카메라
let isFlipped = false;    
let isVideoReady = false; 

// OpenCV Logic Variables
let isOpenCvLoaded = false;
let thresholdValue = 100;
let roiHeightPercent = 30;
let isDarkLine = true;

// UI Elements
let switchCameraButton, connectBluetoothButton, disconnectBluetoothButton;
let startDetectionButton, stopDetectionButton;
let thresholdSlider, roiSlider, lineTypeSelect;
let thresholdLabel, roiLabel;
let dataDisplay;

// --- Wait for OpenCV.js to load ---
window.onload = () => {
  let cvCheck = setInterval(() => {
    if (typeof cv !== 'undefined' && cv.Mat) {
      clearInterval(cvCheck);
      isOpenCvLoaded = true;
      console.log("OpenCV.js Loaded!");
      if(startDetectionButton) startDetectionButton.html("라인 추적 시작");
    }
  }, 500);
};

// --- p5.js Main Functions ---

function setup() {
  mainCanvas = createCanvas(400, 300);
  mainCanvas.parent('p5-container');
  mainCanvas.style('border-radius', '16px');
  
  setupCamera();
  createUI();
}

function draw() {
  background(0); 

  if (!isVideoReady || !video || video.width === 0) {
    fill(255); textAlign(CENTER, CENTER); textSize(16);
    text("카메라 로딩 중...", width / 2, height / 2);
    return;
  }

  // 1. 원본 화면 그리기
  push();
  if (isFlipped) { translate(width, 0); scale(-1, 1); }
  image(video, 0, 0, width, height);
  pop();

  // 2. OpenCV 연산 및 시각화 진행
  if (isTrackingActive && isOpenCvLoaded) {
    processLineTracking();
  }
}

// --- OpenCV Line Tracking Logic ---
function processLineTracking() {
  let screenCenter = width / 2;
  let roiH = Math.floor(height * (roiHeightPercent / 100));
  let roiY = height - roiH;

  // 캔버스에서 픽셀 데이터 가져오기
  let src = cv.imread(mainCanvas.elt);
  let roiRect = new cv.Rect(0, roiY, width, roiH);
  let roiMat = src.roi(roiRect); 
  
  let gray = new cv.Mat();
  let binary = new cv.Mat();
  let contours = new cv.MatVector();
  let hierarchy = new cv.Mat();

  // 1. 흑백 변환
  cv.cvtColor(roiMat, gray, cv.COLOR_RGBA2GRAY);

  // 2. 가우시안 블러 적용 (바닥 노이즈, 그림자, 질감 제거)
  let ksize = new cv.Size(5, 5);
  cv.GaussianBlur(gray, gray, ksize, 0, 0, cv.BORDER_DEFAULT);

  // 3. 이진화 (Thresholding)
  let threshType = isDarkLine ? cv.THRESH_BINARY_INV : cv.THRESH_BINARY;
  cv.threshold(gray, binary, thresholdValue, 255, threshType);

  // 4. [핵심] 이진화된 흑백 화면을 ROI 영역에 덮어쓰기 (사용자 디버깅용)
  let binaryRGBA = new cv.Mat();
  cv.cvtColor(binary, binaryRGBA, cv.COLOR_GRAY2RGBA);
  let outImg = createImage(binaryRGBA.cols, binaryRGBA.rows);
  outImg.drawingContext.putImageData(
    new ImageData(new Uint8ClampedArray(binaryRGBA.data), binaryRGBA.cols, binaryRGBA.rows), 
    0, 0
  );
  image(outImg, 0, roiY); // 화면 하단에 흑백 뷰어 출력

  // 5. 외곽선 찾기
  cv.findContours(binary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

  let maxArea = 0;
  let maxContourIndex = -1;

  for (let i = 0; i < contours.size(); ++i) {
    let area = cv.contourArea(contours.get(i));
    if (area > maxArea) {
      maxArea = area;
      maxContourIndex = i;
    }
  }

  // --- 시각화 오버레이 그리기 ---
  
  // 1. ROI 영역 박스 (노란색)
  stroke(255, 204, 0); strokeWeight(2); noFill();
  rect(0, roiY, width, roiH);

  // 2. 화면 정중앙 목표선 (파란색 점선)
  stroke(0, 150, 255); strokeWeight(2); drawingContext.setLineDash([5, 5]);
  line(screenCenter, roiY, screenCenter, height);
  drawingContext.setLineDash([]); // 원상복구

  // 3. 라인이 충분히 크게 잡혔을 때 (노이즈 필터링 면적: 300)
  if (maxContourIndex !== -1 && maxArea > 300) {
    let cnt = contours.get(maxContourIndex);
    let moments = cv.moments(cnt, false);

    if (moments.m00 !== 0) {
      let cx = moments.m10 / moments.m00;
      let cy = moments.m01 / moments.m00 + roiY; // 원본 캔버스 Y좌표 보정
      let error = screenCenter - cx; 
      
      // 반전 모드 시 오차 방향 반전
      if (isFlipped) {
          error = -error;
      }

      // 중심점 (빨간 원)
      fill(255, 50, 50); noStroke();
      circle(cx, cy, 12); 

      // 오차선 (초록색)
      stroke(0, 255, 0); strokeWeight(3);
      line(screenCenter, cy, cx, cy); 

      // 오차값 텍스트
      fill(255); noStroke(); textSize(16); textStyle(BOLD); textAlign(CENTER);
      text(`Error: ${Math.round(error)}`, screenCenter + (cx - screenCenter)/2, cy - 15);

      // 데이터 전송
      let currentTime = millis();
      if (currentTime - lastSentTime > SEND_INTERVAL) {
        let sendData = `x${Math.round(cx)} e${Math.round(error)} d1`;
        sendBluetoothDataLine(sendData);
        dataDisplay.html(`전송됨: ${sendData}`);
        dataDisplay.style("color", "#0f0");
        lastSentTime = currentTime;
      }
    }
  } else {
    // 라인을 찾지 못함 (Stop 처리)
    let currentTime = millis();
    if (currentTime - lastSentTime > SEND_INTERVAL) {
      sendBluetoothDataLine("stop");
      dataDisplay.html(`전송됨: 없음 (Stop)`);
      dataDisplay.style("color", "#888");
      lastSentTime = currentTime;
    }
  }

  // 메모리 해제 필수 (브라우저 다운 방지)
  src.delete(); roiMat.delete(); gray.delete(); binary.delete();
  contours.delete(); hierarchy.delete(); binaryRGBA.delete();
}

// --- Helper Functions ---

function setupCamera() {
  isVideoReady = false;
  let constraints = { video: { facingMode: facingMode }, audio: false };

  video = createCapture(constraints);
  video.hide(); 

  let videoLoadCheck = setInterval(() => {
    if (video.elt.readyState >= 2 && video.elt.videoWidth > 0) {
      isVideoReady = true;
      clearInterval(videoLoadCheck);
      console.log(`Camera Loaded: ${facingMode}`);
      if (wasDetectingBeforeSwitch) {
        startTracking();
        wasDetectingBeforeSwitch = false;
      }
    }
  }, 100);
}

function stopVideo() {
    if (video) {
        if (video.elt.srcObject) {
            const tracks = video.elt.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        }
        video.remove();
        video = null;
    }
}

function createUI() {
  dataDisplay = select('#dataDisplay');
  dataDisplay.html("전송 대기 중...");

  // Buttons
  switchCameraButton = createButton("전후방 전환");
  switchCameraButton.parent('camera-control-buttons');
  switchCameraButton.addClass('start-button');
  switchCameraButton.mousePressed(switchCamera);

  connectBluetoothButton = createButton("기기 연결");
  connectBluetoothButton.parent('bluetooth-control-buttons');
  connectBluetoothButton.addClass('start-button');
  connectBluetoothButton.mousePressed(connectBluetooth);

  disconnectBluetoothButton = createButton("연결 해제");
  disconnectBluetoothButton.parent('bluetooth-control-buttons');
  disconnectBluetoothButton.addClass('stop-button');
  disconnectBluetoothButton.mousePressed(disconnectBluetooth);

  // Line Settings UI
  lineTypeSelect = select('#line-type-select');
  lineTypeSelect.changed(() => {
    isDarkLine = (lineTypeSelect.value() === 'dark');
  });

  thresholdSlider = select('#threshold-slider');
  thresholdLabel = select('#threshold-label');
  updateSliderFill(thresholdSlider);
  thresholdSlider.input(() => {
    thresholdValue = thresholdSlider.value();
    thresholdLabel.html(`현재 값: ${thresholdValue}`);
    updateSliderFill(thresholdSlider);
  });

  roiSlider = select('#roi-slider');
  roiLabel = select('#roi-label');
  updateSliderFill(roiSlider);
  roiSlider.input(() => {
    roiHeightPercent = roiSlider.value();
    roiLabel.html(`화면 하단 ${roiHeightPercent}% 사용`);
    updateSliderFill(roiSlider);
  });

  // Start/Stop Buttons
  startDetectionButton = createButton("모델 로딩 중...");
  startDetectionButton.parent('object-control-buttons');
  startDetectionButton.addClass('start-button');
  startDetectionButton.mousePressed(() => {
    if (!isOpenCvLoaded) { alert("OpenCV 모델 로딩 중입니다."); return; }
    if (!isConnected) { alert("블루투스가 연결되지 않았습니다!"); return; }
    startTracking();
  });

  stopDetectionButton = createButton("주행 중지");
  stopDetectionButton.parent('object-control-buttons');
  stopDetectionButton.addClass('stop-button');
  stopDetectionButton.mousePressed(() => {
    stopTracking();
    sendBluetoothDataLine("stop"); 
  });

  updateBluetoothStatusUI();
}

function updateSliderFill(slider) {
    const val = (slider.value() - slider.elt.min) / (slider.elt.max - slider.elt.min) * 100;
    slider.elt.style.background = `linear-gradient(to right, #000000 ${val}%, #D1D5DB ${val}%)`;
}

function switchCamera() {
  wasDetectingBeforeSwitch = isTrackingActive;
  isTrackingActive = false; 
  stopVideo(); 
  isVideoReady = false;
  
  facingMode = facingMode === "user" ? "environment" : "user";
  isFlipped = (facingMode === "user");

  setTimeout(setupCamera, 500);
}

function startTracking() {
  if (!isVideoReady) { console.warn("카메라 준비 안됨"); return; }
  isTrackingActive = true;
}

function stopTracking() {
  isTrackingActive = false;
}

// --- Bluetooth Logic ---

async function connectBluetooth() {
  try {
    bluetoothDevice = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "BBC micro:bit" }],
      optionalServices: [UART_SERVICE_UUID]
    });
    const server = await bluetoothDevice.gatt.connect();
    const service = await server.getPrimaryService(UART_SERVICE_UUID);
    rxCharacteristic = await service.getCharacteristic(UART_RX_CHARACTERISTIC_UUID);
    txCharacteristic = await service.getCharacteristic(UART_TX_CHARACTERISTIC_UUID);
    txCharacteristic.startNotifications();
    isConnected = true;
    bluetoothStatus = "연결됨: " + bluetoothDevice.name;
    updateBluetoothStatusUI(true);
  } catch (error) {
    console.error(error);
    bluetoothStatus = "연결 실패";
    updateBluetoothStatusUI(false, true);
  }
}

function disconnectBluetooth() {
  if (bluetoothDevice && bluetoothDevice.gatt.connected) {
    bluetoothDevice.gatt.disconnect();
  }
  isConnected = false;
  bluetoothStatus = "연결 해제됨";
  rxCharacteristic = null;
  txCharacteristic = null;
  bluetoothDevice = null;
  updateBluetoothStatusUI(false);
}

function updateBluetoothStatusUI(connected = false, error = false) {
  const statusElement = select('#bluetoothStatus');
  if(statusElement) {
      statusElement.html(`상태: ${bluetoothStatus}`);
      statusElement.removeClass('status-connected');
      statusElement.removeClass('status-error');
      if (connected) statusElement.addClass('status-connected');
      else if (error) statusElement.addClass('status-error');
  }
}

async function sendBluetoothDataLine(dataStr) {
  if (!rxCharacteristic || !isConnected || isSendingData) return;
  try {
    isSendingData = true; 
    
    if (dataStr === "stop") {
      const encoder = new TextEncoder();
      await rxCharacteristic.writeValue(encoder.encode("stop\n"));
      return;
    }
    
    const encoder = new TextEncoder();
    await rxCharacteristic.writeValue(encoder.encode(dataStr + "\n"));

  } catch (error) { console.error(error); } 
  finally { isSendingData = false; }
}

window.setup = setup;
window.draw = draw;
