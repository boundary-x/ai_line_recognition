/**
 * sketch.js
 * Boundary X: AI Autonomous Driving [Line Tracer]
 * Algorithm: Vision Processing (Thresholding -> Centroid -> Error)
 * Resolution: 320x240 (QVGA) for High FPS
 */

// Bluetooth UUIDs
const UART_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const UART_TX_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const UART_RX_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

let bluetoothDevice = null;
let rxCharacteristic = null;
let txCharacteristic = null;
let isConnected = false;
let bluetoothStatus = "연결 대기 중";
let isSendingData = false;
let lastSendTime = 0; 

// Vision Variables
let video;
let thresholdSlider;
let thresholdVal = 150;
let isBinaryView = false; 

// Data Variables
let currentError = 0;
let isLineDetected = false;
let isTracking = false; // [핵심] 인식(전송) 활성화 여부

// UI Elements
let statusBadge;
let errorDisplayText;
let gaugeBar;
let btDataDisplay;
let toggleViewBtn;
let canvas;

// Camera
let facingMode = "environment"; 
let isFlipped = false;
let isVideoLoaded = false;

function setup() {
  canvas = createCanvas(320, 240);
  canvas.parent('p5-container');
  pixelDensity(1); 

  setupCamera();
  createUI();
}

function setupCamera() {
  let constraints = {
    video: {
      facingMode: facingMode,
      width: { ideal: 320 },
      height: { ideal: 240 }
    },
    audio: false
  };
  video = createCapture(constraints);
  video.size(320, 240);
  video.hide();

  let videoLoadCheck = setInterval(() => {
    if (video.elt.readyState >= 2 && video.width > 0) {
      isVideoLoaded = true;
      clearInterval(videoLoadCheck);
      console.log(`Video Ready: ${video.width}x${video.height}`);
    }
  }, 100);
}

function stopVideo() {
    if (video) {
        if (video.elt.srcObject) {
            video.elt.srcObject.getTracks().forEach(track => track.stop());
        }
        video.remove();
        video = null;
    }
}

function createUI() {
  // 1. 슬라이더 연결
  thresholdSlider = select('#threshold-slider');
  const thresholdLabel = select('#threshold-value');
  
  thresholdSlider.input(() => {
      thresholdVal = thresholdSlider.value();
      thresholdLabel.html(thresholdVal);
  });

  // 2. 뷰 모드 토글
  toggleViewBtn = select('#toggle-view-btn');
  toggleViewBtn.mousePressed(() => {
      isBinaryView = !isBinaryView;
      if(isBinaryView) {
          toggleViewBtn.addClass('active');
          toggleViewBtn.html('📷 원본 영상 보기');
      } else {
          toggleViewBtn.removeClass('active');
          toggleViewBtn.html('🌑 흑백(이진화) 모드 보기');
      }
  });

  // 3. UI 요소
  statusBadge = select('#status-badge');
  errorDisplayText = select('#error-display-text');
  gaugeBar = select('#gauge-bar');
  btDataDisplay = select('#bluetooth-data-display');

  // 4. 버튼 생성
  let flipButton = createButton("좌우 반전");
  flipButton.parent('camera-control-buttons');
  flipButton.addClass('start-button');
  flipButton.mousePressed(() => isFlipped = !isFlipped);

  let switchCameraButton = createButton("전후방 전환");
  switchCameraButton.parent('camera-control-buttons');
  switchCameraButton.addClass('start-button');
  switchCameraButton.mousePressed(switchCamera);

  let connectBluetoothButton = createButton("기기 연결");
  connectBluetoothButton.parent('bluetooth-control-buttons');
  connectBluetoothButton.addClass('start-button');
  connectBluetoothButton.mousePressed(connectBluetooth);

  let disconnectBluetoothButton = createButton("연결 해제");
  disconnectBluetoothButton.parent('bluetooth-control-buttons');
  disconnectBluetoothButton.addClass('stop-button');
  disconnectBluetoothButton.mousePressed(disconnectBluetooth);

  // [신규] 라인 인식 제어 버튼
  let startTrackingBtn = createButton("라인 인식 시작");
  startTrackingBtn.parent('tracking-control-buttons');
  startTrackingBtn.addClass('start-button');
  startTrackingBtn.mousePressed(startTracking);

  let stopTrackingBtn = createButton("인식 중지");
  stopTrackingBtn.parent('tracking-control-buttons');
  stopTrackingBtn.addClass('stop-button');
  stopTrackingBtn.mousePressed(stopTracking);

  updateBluetoothStatusUI();
}

function startTracking() {
    isTracking = true;
    btDataDisplay.style('color', '#0f0');
    console.log("Tracking Started");
}

function stopTracking() {
    isTracking = false;
    sendBluetoothData("stop"); // 정지 신호 전송
    btDataDisplay.html("전송됨: stop (중지됨)");
    btDataDisplay.style('color', '#EA4335');
    console.log("Tracking Stopped");
}

function switchCamera() {
  stopVideo();
  isVideoLoaded = false;
  facingMode = facingMode === "user" ? "environment" : "user";
  setTimeout(setupCamera, 500);
}

// === 비전 처리 및 라인 인식 ===

function draw() {
  background(0);

  if (!isVideoLoaded || video.width === 0) {
      fill(255); textAlign(CENTER); textSize(16);
      text("카메라 로딩 중...", width/2, height/2);
      return;
  }

  video.loadPixels();
  if (isBinaryView) loadPixels();

  let startY = Math.floor(height * 0.66);
  let endY = height;
  let sumX = 0;   
  let count = 0;  

  for (let y = startY; y < endY; y += 4) {
      for (let x = 0; x < width; x += 4) {
          let pixelX = isFlipped ? (width - 1 - x) : x;
          let index = (y * width + pixelX) * 4;
          
          let r = video.pixels[index];
          let g = video.pixels[index + 1];
          let b = video.pixels[index + 2];
          
          let brightness = (r + g + b) / 3;
          
          if (brightness > thresholdVal) {
              sumX += x;
              count++;
              if (isBinaryView) {
                  let canvasIndex = (y * width + x) * 4;
                  pixels[canvasIndex] = 255;   
                  pixels[canvasIndex+1] = 255; 
                  pixels[canvasIndex+2] = 255; 
                  pixels[canvasIndex+3] = 255; 
              }
          } else {
              if (isBinaryView) {
                  let canvasIndex = (y * width + x) * 4;
                  pixels[canvasIndex] = 0;
                  pixels[canvasIndex+1] = 0;
                  pixels[canvasIndex+2] = 0;
                  pixels[canvasIndex+3] = 255;
              }
          }
      }
  }

  if (isBinaryView) {
      updatePixels(); 
  } else {
      push();
      if (isFlipped) { translate(width, 0); scale(-1, 1); }
      image(video, 0, 0, width, height);
      pop();
  }

  if (count > 50) { 
      isLineDetected = true;
      let laneCenterX = sumX / count; 
      let screenCenterX = width / 2;  
      
      let rawError = laneCenterX - screenCenterX;
      currentError = Math.round(map(rawError, -width/2, width/2, -100, 100));
      currentError = constrain(currentError, -100, 100);

      fill(255, 0, 0); noStroke();
      circle(laneCenterX, height - 20, 15);
      
      stroke(0, 255, 0); strokeWeight(2); 
      line(screenCenterX, height, screenCenterX, height - 50);

      // 뱃지 상태 업데이트
      if (isTracking) {
          statusBadge.html(`전송 중: Error ${currentError}`);
          statusBadge.style('background-color', 'rgba(26, 115, 232, 0.8)'); // 파란색
      } else {
          statusBadge.html(`설정 모드: Error ${currentError}`);
          statusBadge.style('background-color', 'rgba(0,0,0,0.6)');
      }

  } else {
      isLineDetected = false;
      currentError = 999; 
      
      statusBadge.html("⚠️ 차선 없음");
      statusBadge.style('background-color', 'rgba(234, 67, 53, 0.8)');
  }

  updateGaugeUI();
  
  // [핵심] Tracking 상태일 때만 데이터 전송
  if (isTracking) {
      sendDataPeriodically();
  }

  noFill(); stroke(0, 255, 0); strokeWeight(2);
  rect(0, startY, width, height - startY);
}

function updateGaugeUI() {
    errorDisplayText.html(`Error: ${isLineDetected ? currentError : "Loss"}`);
    
    if (isLineDetected) {
        let percentage = Math.abs(currentError); 
        gaugeBar.style('width', `${percentage/2}%`); 
        
        if (currentError < 0) {
            gaugeBar.style('left', `${50 - percentage/2}%`);
            gaugeBar.style('background-color', '#EA4335'); 
        } else {
            gaugeBar.style('left', '50%');
            gaugeBar.style('background-color', '#1A73E8'); 
        }
    } else {
        gaugeBar.style('width', '0%');
        gaugeBar.style('left', '50%');
    }
}

function sendDataPeriodically() {
    let now = millis();
    if (now - lastSendTime > 50) {
        if (isConnected) {
            let dataToSend = String(currentError);
            sendBluetoothData(dataToSend);
            
            btDataDisplay.html(`전송됨: ${dataToSend}`);
            btDataDisplay.style('color', isLineDetected ? '#0f0' : '#EA4335');
        }
        lastSendTime = now;
    }
}

/* --- Bluetooth Logic --- */
// (기존과 동일)
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
    isConnected = true;
    bluetoothStatus = "연결됨: " + bluetoothDevice.name;
    updateBluetoothStatusUI(true);
  } catch (error) {
    console.error("Connection failed", error);
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

async function sendBluetoothData(data) {
  if (!rxCharacteristic || !isConnected) return;
  if (isSendingData) return;
  try {
    isSendingData = true;
    const encoder = new TextEncoder();
    await rxCharacteristic.writeValue(encoder.encode(data + "\n"));
  } catch (error) {
    console.error("Error sending data:", error);
  } finally {
    isSendingData = false;
  }
}
