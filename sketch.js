/**
 * sketch.js
 * Boundary X Teachable Machine Controller Logic (Square Crop Fixed)
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

// Video and ML variables
let video;
let classifier = null;
let label = "대기 중";
let isClassifying = false;

// Camera control variables
let isFlipped = false;
let facingMode = "user";
let isVideoLoaded = false; 

// UI elements
let modelInput, modelSelect, initializeModelButton, stopClassifyButton;
let flipButton, switchCameraButton, connectBluetoothButton, disconnectBluetoothButton;
let modelStatusDiv;

// 모델 리스트
const modelList = {
  "가위 바위 보 분류": "https://teachablemachine.withgoogle.com/models/vOi4Y0yiK/",
  "속도 표지판 분류": "https://teachablemachine.withgoogle.com/models/cTrp8ZF93/",
  "방향 표지판 분류": "https://teachablemachine.withgoogle.com/models/JX0oMMrn3/"
};

let isSendingData = false;
let canvas; // Canvas 객체 저장용

function setup() {
  // 400x400 정사각형 캔버스
  canvas = createCanvas(400, 400);
  canvas.parent('p5-container');
  
  setupCamera();
  createUI();
}

function setupCamera() {
  let constraints = {
    video: {
      facingMode: facingMode
      // width, height를 강제하지 않음 (카메라 고유 비율 사용)
    },
    audio: false
  };

  video = createCapture(constraints);
  
  video.elt.onloadeddata = function() {
    console.log("Video metadata loaded");
  };

  // [수정] video.size() 강제 설정을 제거하여 원본 비율 유지
  video.hide();

  let videoLoadCheck = setInterval(() => {
    if (isVideoLoaded) {
      clearInterval(videoLoadCheck);
      return;
    }
    // 데이터가 들어오기 시작하면 로드 완료
    if (video.elt.readyState >= 2 && video.width > 0) {
      isVideoLoaded = true;
      resizeCanvasToFit();
      clearInterval(videoLoadCheck);
      console.log(`Video Stream Ready: ${video.width}x${video.height}`);
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
  flipButton = createButton("좌우 반전");
  flipButton.parent('camera-control-buttons');
  flipButton.addClass('start-button');
  flipButton.mousePressed(toggleFlip);

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

  modelSelect = createSelect();
  modelSelect.parent('model-select-and-link');
  modelSelect.option("샘플 모델 선택 또는 직접 입력", "");
  for (const modelName in modelList) {
    modelSelect.option(modelName, modelList[modelName]);
  }
  modelSelect.changed(updateModelInput);

  createA("https://boundaryx.io", "데이터셋 및 설명 보기", "_blank")
    .parent('model-select-and-link')
    .style("color", "#666").style("font-size", "0.9rem").style("display", "block").style("margin-top", "5px");

  modelInput = createInput('');
  modelInput.parent('model-key-container');
  modelInput.attribute('placeholder', '모델 전체 주소 또는 짧은 ID 입력 (예: lSgKZj_c5)');

  modelStatusDiv = createDiv('모델을 로드해주세요.');
  modelStatusDiv.parent('model-key-container');
  modelStatusDiv.id('modelStatus');

  initializeModelButton = createButton('모델 로드 시작');
  initializeModelButton.parent('model-action-buttons');
  initializeModelButton.addClass('start-button');
  initializeModelButton.mousePressed(initializeModel);

  stopClassifyButton = createButton('분류 중지');
  stopClassifyButton.parent('model-action-buttons');
  stopClassifyButton.addClass('stop-button');
  stopClassifyButton.mousePressed(stopClassification);

  updateBluetoothStatusUI();
}

function toggleFlip() {
  isFlipped = !isFlipped;
}

function switchCamera() {
  stopVideo();
  isVideoLoaded = false; 
  facingMode = facingMode === "user" ? "environment" : "user";
  
  setTimeout(() => {
    setupCamera();
  }, 200); 
}

function updateModelInput() {
  const selectedModelURL = modelSelect.value();
  modelInput.value(selectedModelURL || "");
}

function initializeModel() {
  let inputVal = modelInput.value().trim();
  let finalModelURL = "";
  
  if (!inputVal) {
    alert('모델 주소 또는 ID를 입력하세요!');
    return;
  }

  if (inputVal.startsWith('http')) {
      finalModelURL = inputVal;
  } else {
      finalModelURL = "https://teachablemachine.withgoogle.com/models/" + inputVal + "/";
  }

  if (!finalModelURL.endsWith('model.json')) {
      if (!finalModelURL.endsWith('/')) {
          finalModelURL += '/';
      }
      finalModelURL += 'model.json';
  }

  if (modelStatusDiv) {
      modelStatusDiv.html("모델을 불러오는 중입니다...");
      modelStatusDiv.style("color", "#666");
      modelStatusDiv.style("background-color", "#F1F3F4");
  }

  console.log("Loading model from:", finalModelURL);

  try {
    classifier = ml5.imageClassifier(finalModelURL, modelLoaded);
  } catch (e) {
      console.error(e);
      if (modelStatusDiv) modelStatusDiv.html("모델 로드 실패. 주소나 ID를 확인해주세요.");
  }
}

function modelLoaded() {
  console.log('모델 로드 완료');
  if (modelStatusDiv) {
      modelStatusDiv.html("모델이 성공적으로 로드되었습니다!");
      modelStatusDiv.style("color", "#137333");
      modelStatusDiv.style("background-color", "#E6F4EA");
  }
  label = "준비됨";
  startClassification();
}

function startClassification() {
  if (!classifier) {
    console.error('모델이 로드되지 않았습니다.');
    return;
  }
  isClassifying = true;
  classifyVideo();
}

function stopClassification() {
  isClassifying = false;
  label = "중지됨";
  sendBluetoothData("stop");
  if (modelStatusDiv) {
      modelStatusDiv.html("모델 분류가 중지되었습니다.");
      modelStatusDiv.style("color", "#333");
      modelStatusDiv.style("background-color", "#F1F3F4");
  }
}

function classifyVideo() {
  if (!isClassifying) return;
  // [수정] 왜곡 없는 캔버스 화면 자체를 분류 (정확도 향상)
  // video를 직접 넣으면 원본(4:3)이 들어가서 AI가 찌그러진 상태로 인식할 수 있음
  classifier.classify(canvas, gotResults);
}

function gotResults(error, results) {
  if (error) {
    console.error("분류 오류:", error);
    return;
  }
  if (results && results.length > 0) {
    label = results[0].label;
    sendBluetoothData(label);
  }
  classifyVideo();
}

function draw() {
  background(0);
  
  if (!isVideoLoaded || video.width === 0) {
    textAlign(CENTER, CENTER);
    textSize(20);
    fill(255);
    text("카메라 로딩 중...", width / 2, height / 2);
    return;
  }

  // [핵심 수정] 센터 크롭 (Center Crop) 로직
  // 영상의 가로/세로 중 작은 쪽을 기준으로 1:1 비율을 만듦
  let vw = video.width;
  let vh = video.height;
  let minDim = min(vw, vh); // 정사각형 한 변의 길이
  
  // 영상의 정중앙 좌표 계산
  let sx = (vw - minDim) / 2;
  let sy = (vh - minDim) / 2;

  push();
  if (isFlipped) {
    translate(width, 0);
    scale(-1, 1);
  }
  
  // image(원본, 캔버스x, 캔버스y, 캔버스w, 캔버스h, 원본x, 원본y, 원본w, 원본h)
  // 원본 영상의 중앙(sx, sy)에서 정사각형(minDim)만큼 잘라내어 캔버스(400x400)에 꽉 차게 그림
  image(video, 0, 0, width, height, sx, sy, minDim, minDim);
  pop();

  // 결과 표시 바
  const boxHeight = 50;
  fill(0, 0, 0, 180);
  noStroke();
  rect(0, height - boxHeight, width, boxHeight);
  
  textSize(24);
  textAlign(CENTER, CENTER);
  fill(255);
  text(label, width / 2, height - (boxHeight/2));
}

function resizeCanvasToFit() {
  resizeCanvas(400, 400);
}

/* --- Bluetooth Logic --- */

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
    console.error("Bluetooth connection failed:", error);
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
