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
let lastSendTime = 0; // 데이터 전송 주기 제어용

// Vision Variables
let video;
let thresholdSlider;
let thresholdVal = 150;
let isBinaryView = false; // 흑백 모드 보기 여부

// Data Variables
let currentError = 0;
let isLineDetected = false;

// UI Elements
let statusBadge;
let errorDisplayText;
let gaugeBar;
let btDataDisplay;
let toggleViewBtn;
let canvas;

// Camera
let facingMode = "environment"; // 후면 카메라 기본
let isFlipped = false;
let isVideoLoaded = false;

function setup() {
  // 320x240 해상도에 맞춰 캔버스 생성 (CSS로 400px로 늘려 보여줌)
  canvas = createCanvas(320, 240);
  canvas.parent('p5-container');
  pixelDensity(1); // 픽셀 처리를 위해 밀도 1로 고정

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

  // 비디오 로드 확인
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

  // 2. 뷰 모드 토글 버튼
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

  // 3. UI 요소 선택
  statusBadge = select('#status-badge');
  errorDisplayText = select('#error-display-text');
  gaugeBar = select('#gauge-bar');
  btDataDisplay = select('#bluetooth-data-display');

  // 4. 카메라 & 블루투스 버튼 생성
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

  updateBluetoothStatusUI();
}

function switchCamera() {
  stopVideo();
  isVideoLoaded = false;
  facingMode = facingMode === "user" ? "environment" : "user";
  setTimeout(setupCamera, 500);
}

// === [핵심] 비전 처리 및 라인 인식 알고리즘 ===

function draw() {
  background(0);

  if (!isVideoLoaded || video.width === 0) {
      fill(255); textAlign(CENTER); textSize(16);
      text("카메라 로딩 중...", width/2, height/2);
      return;
  }

  // 1. 픽셀 데이터 로드
  video.loadPixels();
  
  // 흑백 모드일 경우 시각화를 위해 캔버스 픽셀 로드
  if (isBinaryView) loadPixels();

  // ROI (관심 영역) 설정: 화면 하단 1/3
  let startY = Math.floor(height * 0.66);
  let endY = height;
  
  let sumX = 0;   // 흰색 픽셀들의 X좌표 합
  let count = 0;  // 흰색 픽셀 개수

  // 2. 픽셀 스캔 (속도를 위해 4픽셀씩 건너뛰며 검사)
  for (let y = startY; y < endY; y += 4) {
      for (let x = 0; x < width; x += 4) {
          
          // 영상이 반전되어 있다면 X좌표 계산 변경
          let pixelX = isFlipped ? (width - 1 - x) : x;
          let index = (y * width + pixelX) * 4;
          
          let r = video.pixels[index];
          let g = video.pixels[index + 1];
          let b = video.pixels[index + 2];
          
          // 밝기 계산 (평균)
          let brightness = (r + g + b) / 3;
          
          // 임계값 비교 (이진화)
          if (brightness > thresholdVal) {
              sumX += x; // 캔버스 기준 X좌표 누적
              count++;
              
              // 흑백 모드 시각화 (흰색으로 칠하기)
              if (isBinaryView) {
                  let canvasIndex = (y * width + x) * 4;
                  pixels[canvasIndex] = 255;   // R
                  pixels[canvasIndex+1] = 255; // G
                  pixels[canvasIndex+2] = 255; // B
                  pixels[canvasIndex+3] = 255; // Alpha
              }
          } else {
              // 흑백 모드 시각화 (검은색으로 칠하기)
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

  // 3. 그리기 (원본 영상 또는 처리된 흑백 영상)
  if (isBinaryView) {
      updatePixels(); // 처리된 픽셀을 캔버스에 적용
  } else {
      push();
      if (isFlipped) { translate(width, 0); scale(-1, 1); }
      image(video, 0, 0, width, height);
      pop();
  }

  // 4. 차선 중심 및 오차 계산
  if (count > 50) { // 흰색 점이 50개 이상이어야 유효
      isLineDetected = true;
      let laneCenterX = sumX / count; // 차선 무게중심
      let screenCenterX = width / 2;  // 화면 중심
      
      // 오차 계산 (-100 ~ 100 범위로 매핑)
      // 화면 폭(320)의 절반(160)을 100으로 변환
      let rawError = laneCenterX - screenCenterX;
      currentError = Math.round(map(rawError, -width/2, width/2, -100, 100));
      
      // 값 제한 (-100 ~ 100)
      currentError = constrain(currentError, -100, 100);

      // 시각화: 차선 중심점 (빨간 점)
      fill(255, 0, 0); noStroke();
      circle(laneCenterX, height - 20, 15);
      
      // [수정] 올바른 함수명 사용
      stroke(0, 255, 0); strokeWeight(2); 
      line(screenCenterX, height, screenCenterX, height - 50);

      // 텍스트 업데이트
      statusBadge.html(`인식 중: Error ${currentError}`);
      statusBadge.style('background-color', 'rgba(0,0,0,0.6)');

  } else {
      isLineDetected = false;
      currentError = 999; // 라인 없음 신호
      
      statusBadge.html("⚠️ 차선 없음");
      statusBadge.style('background-color', 'rgba(234, 67, 53, 0.8)');
  }

  // 5. UI 업데이트 및 데이터 전송
  updateGaugeUI();
  sendDataPeriodically();

  // 6. ROI 영역 표시 (녹색 박스 테두리)
  noFill(); stroke(0, 255, 0); strokeWeight(2);
  rect(0, startY, width, height - startY);
}

// === UI Update Logic ===

function updateGaugeUI() {
    errorDisplayText.html(`Error: ${isLineDetected ? currentError : "Loss"}`);
    
    // 게이지 바 움직임 구현
    if (isLineDetected) {
        let percentage = Math.abs(currentError); // 0 ~ 100
        gaugeBar.style('width', `${percentage/2}%`); // 전체 폭의 절반 내에서 움직임
        
        if (currentError < 0) {
            // 좌회전 (왼쪽으로 바 채우기)
            gaugeBar.style('left', `${50 - percentage/2}%`);
            gaugeBar.style('background-color', '#EA4335'); // 빨강
        } else {
            // 우회전 (오른쪽으로 바 채우기)
            gaugeBar.style('left', '50%');
            gaugeBar.style('background-color', '#1A73E8'); // 파랑
        }
    } else {
        gaugeBar.style('width', '0%');
        gaugeBar.style('left', '50%');
    }
}

function sendDataPeriodically() {
    // 50ms마다 데이터 전송 (과부하 방지)
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

/* --- Bluetooth Logic (동일) --- */

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
      
      if (connected) {
        statusElement.addClass('status-connected');
      } else if (error) {
        statusElement.addClass('status-error');
      }
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
