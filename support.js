/* In-app help. Tours only explain the UI; they never operate training or Bluetooth. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const support = $('support-card');
  support.innerHTML = `
    <summary><span><strong>사용 가이드 및 지원</strong><small>사용법 · 예제 코드 · 문제 해결</small></span><span class="support-chevron" aria-hidden="true">⌄</span></summary>
    <div class="support-content">
      <p>선을 움직이며 좌우 바퀴 속도가 달라지는 과정을 확인해보세요.</p>
      <div class="support-actions"><button type="button" data-tour="all" class="support-primary">사용법 둘러보기 <span aria-hidden="true">→</span></button></div>
      <details class="support-section" id="help-examples"><summary>마이크로비트 예제 코드</summary><div class="support-answer example-codes">
        <div class="example-code"><a href="https://makecode.microbit.org/S49771-77509-50114-72682" target="_blank" rel="noopener noreferrer">블루투스 이름 확인 코드 ↗</a><p>연결할 마이크로비트의 장치 이름을 확인합니다. 마이크로비트의 LED 매트릭스에 출력되는 이름(알파벳 소문자 5자리)을 확인한 뒤 프로젝트 코드를 다운로드하세요.</p></div>
        <div class="example-code"><strong>프로젝트 예제 코드</strong><p>준비 중입니다. 프로젝트 예제 링크는 추후 추가됩니다.</p></div>
        <p class="support-caption">이름 확인 코드는 로봇 주행 코드가 아닙니다. 로봇 코드에서 수신 데이터와 L000R000을 처리하고, 일정 시간 데이터가 들어오지 않으면 모터가 정지하도록 설정하세요.</p>
      </div></details>
      <details class="support-section" id="help-troubleshooting"><summary>문제 해결 <span class="support-meta">증상별 안내</span></summary><div class="support-answer support-faq">
        <details><summary>카메라가 켜지지 않아요</summary><p>카메라 권한을 허용하고 다른 앱의 카메라 사용을 종료하세요. 오류 메시지 아래의 ‘카메라 다시 연결’을 눌러주세요.</p></details>
        <details><summary>인식 엔진이 준비되지 않아요</summary><p>인터넷 연결을 확인하고 새로고침하세요. 학교 네트워크에서 OpenCV 제공 사이트가 차단되었는지도 확인해주세요.</p></details>
        <details><summary>라인이 감지되지 않아요</summary><p>노란색 인식 영역 안에 선이 보이게 하세요. 어두운 선·밝은 선을 선택하고 ‘인식 영역 확인’을 켠 뒤 선은 흰색, 배경은 검은색이 되도록 라인 구분 기준을 조절하세요.</p></details>
        <details><summary>그림자나 바닥을 라인으로 인식해요</summary><p>현재는 인식 영역에서 가장 큰 흰색 영역을 라인 후보로 선택합니다. 바닥과 대비가 큰 테이프를 사용하고 그림자를 줄여주세요. 인식 영역 높이와 라인 구분 기준도 조절해보세요.</p></details>
        <details><summary>로봇이 반대 방향으로 움직여요</summary><p>화면 왼쪽의 라인은 왼쪽 모터를 느리게, 오른쪽 모터를 빠르게 합니다. 왼쪽은 모터 3·4, 오른쪽은 모터 1·2입니다. 좌우 반전을 바꾸면 화면과 데이터 방향이 함께 바뀝니다. 모터 배선을 확인하고 후방 카메라의 좌우 반전을 끈 상태에서 테스트하세요.</p></details>
        <details><summary>블루투스 연결이나 전송이 안 돼요</summary><p>마이크로비트에 L000R000 형식의 모터 속도를 처리하는 수신 코드가 있어야 합니다. 다른 앱과의 연결을 해제하고 지원 브라우저에서 연결하세요. 연결 후 ‘전송 시작’을 눌러야 데이터가 전송됩니다. ‘전송됨’은 브라우저의 쓰기 성공을 뜻하며 로봇의 동작 완료를 뜻하지 않습니다.</p></details>
        <details><summary>전송이 중지되었어요</summary><p>카메라 전환·좌우 반전·인식 설정 변경·사용법 안내·탭 숨김 시 전송을 중지합니다. 설정을 확인한 뒤 다시 ‘전송 시작’을 누르세요. 연결이 끊어지면 정지 명령도 전달할 수 없으므로 로봇 코드에서 미수신 시 정지를 처리해야 합니다.</p></details>
      </div></details>
      <details class="support-section"><summary>수업 자료</summary><div class="support-answer"><p>준비 중입니다. 수업 자료 링크는 추후 추가됩니다.</p></div></details>
      <details class="support-section"><summary>업데이트 노트 <span class="support-meta">최근 변경</span></summary><div class="support-answer"><p class="support-release">2026.09.21</p><ul><li>웹앱에서 좌우 모터 속도를 계산해 전송 · 기본 속도와 회전 민감도 조절</li><li>카메라 비율·반응형 화면과 상태 안내 개선</li><li>정지 명령 우선 전송 및 연결 해제 처리</li><li>사용법 둘러보기와 증상별 문제 해결 추가</li></ul></div></details>
    </div>`;
  const allSteps = [
    ['#p5-container','카메라를 라인에 맞추세요','후방 카메라가 자동으로 시작됩니다. 권한을 허용하고 바닥의 선이 화면 하단에 보이도록 기기를 고정하세요.'],
    ['#camera-control-buttons','카메라 방향을 확인하세요','전후방 전환과 좌우 반전을 사용할 수 있습니다. 화면의 방향이 전송 좌표의 기준입니다.'],
    ['#line-type-select','선의 밝기를 선택하세요','검은 테이프는 어두운 선, 밝은 테이프는 밝은 선으로 선택하세요.'],
    ['#threshold-slider','선과 배경을 구분하세요','인식 영역 확인을 켜면 흑백 화면이 나옵니다. 선은 흰색, 배경은 검은색으로 보이도록 기준을 조절하세요.'],
    ['#roi-slider','인식할 범위를 조절하세요','화면 하단에서 사용할 높이를 정합니다. 노란 테두리 안의 가장 큰 영역을 기준으로 라인을 찾습니다.'],
    ['#result-display','인식 결과를 먼저 확인하세요','연결하지 않아도 중심점과 오차를 확인할 수 있습니다. 중앙은 오차 0, 왼쪽은 양수, 오른쪽은 음수입니다.'],
    ['#drive-settings','주행 속도를 정하세요','기본 속도와 회전 민감도를 조절하세요. 속도 막대는 계산된 미리보기입니다. 설정을 바꾸면 전송이 중지됩니다.'],
    ['#principle','왜 회전할까요?','원리 보기에서 선의 위치 → 오차 → 좌우 속도 계산을 확인하세요. 왼쪽 바퀴가 더 느리면 왼쪽으로 회전합니다.'],
    ['#help-examples','기기 코드를 준비하세요','이름 확인 코드로 장치 이름을 확인하세요. 프로젝트 예제는 준비 중입니다. 블루투스 UART와 L000R000을 처리하는 코드가 있어야 로봇을 제어할 수 있습니다.'],
    ['#bluetooth-control-buttons','마이크로비트를 연결하세요','기기 연결을 누르고 내 장치를 선택하세요. 연결만으로 데이터가 전송되지는 않습니다.'],
    ['#object-control-buttons','확인한 결과를 전송하세요','전송 시작을 누르면 좌우 모터 속도를 전송합니다. 라인이 없으면 L000R000을 보냅니다. 전송 중지 후에도 인식 미리보기는 계속됩니다.'],
    ['#dataDisplay','실제 전송 상태를 확인하세요','전송됨 표시는 블루투스 쓰기 성공 후 표시됩니다. 연결과 전송 오류가 있으면 이 영역의 안내를 확인하세요.']
  ];
  const chapters = [{label:'카메라',start:0},{label:'인식 설정',start:2},{label:'기기 연결·전송',start:8}];
  const dialog = document.createElement('dialog');
  dialog.id = 'guide-dialog';
  dialog.setAttribute('aria-labelledby', 'guide-title');
  dialog.setAttribute('aria-describedby', 'guide-description');
  dialog.innerHTML = `<div id="guide-spotlight" aria-hidden="true"></div><section id="guide-panel"><div class="guide-topline"><span id="guide-progress"></span><button id="guide-close" type="button" aria-label="화면 안내 종료">닫기 ×</button></div><nav class="guide-chapters" aria-label="안내 구간">${chapters.map((chapter, i) => `<button type="button" data-chapter="${i}" aria-pressed="false">${chapter.label}</button>`).join('')}</nav><div aria-live="polite" aria-atomic="true"><h2 id="guide-title"></h2><p id="guide-description"></p></div><p class="guide-caption">안내를 시작하면 전송이 중지됩니다. 닫은 뒤 직접 눌러보세요.</p><button id="guide-skip-device" type="button" hidden>기기 연결 건너뛰기 →</button><div class="guide-navigation"><button id="guide-prev" type="button">이전</button><button id="guide-next" type="button">다음</button></div></section>`;
  document.body.appendChild(dialog);
  let steps = [], index = 0, target = null, opener = null, originalScroll = 0, pendingFrame = 0;

  let examplesWereOpen = false, principleWasOpen = false;

  function openHelp(section) {
    support.open = true;
    if (section) {
      $('help-troubleshooting').open = true;
      $(section).open = true;
    }
    const heading = (section ? $(section) : support).querySelector('summary');
    heading.scrollIntoView({block: 'center', behavior: 'instant'});
    heading.focus({preventScroll: true});
  }
  document.querySelectorAll('[data-help]').forEach(button => button.addEventListener('click', () => openHelp(button.dataset.help || null)));

  function renderStep() {
    const [selector, title, description] = steps[index];
    if (selector === '#help-examples') $('help-examples').open = true;
    if (selector === '#principle') $('principle').open = true;
    target = document.querySelector(selector);
    const chapterIndex = index < chapters[1].start ? 0 : index < chapters[2].start ? 1 : 2;
    dialog.querySelectorAll('[data-chapter]').forEach((button, i) => button.setAttribute('aria-pressed', String(i === chapterIndex)));
    $('guide-skip-device').hidden = true;
    $('guide-progress').textContent = `${chapters[chapterIndex].label} · ${index + 1} / ${steps.length}`;
    $('guide-title').textContent = title;
    $('guide-description').textContent = description;
    if (selector === '#training-list' && !target.querySelector('.train-btn')) {
      $('guide-title').textContent = 'ID별 학습 버튼이 표시될 자리예요';
      $('guide-description').textContent = 'ID를 추가하면 이곳에 ‘학습하기’ 버튼이 나타납니다. 손이 감지될 때 짧게 눌러 1개, 길게 눌러 연속 수집할 수 있습니다.';
    }
    $('guide-prev').disabled = index === 0;
    $('guide-next').textContent = index === steps.length - 1 ? '안내 마치기' : '다음';
    if (target) target.scrollIntoView({block: 'center', behavior: 'instant'});
    positionGuide(true);
  }

  function positionGuide(reveal = false) {
    if (!dialog.open) return;
    const panel = $('guide-panel'), spot = $('guide-spotlight');
    const width = window.innerWidth, height = window.innerHeight, gap = 16;
    panel.style.width = Math.min(360, width - 24) + 'px';
    const ph = panel.getBoundingClientRect().height, pw = panel.getBoundingClientRect().width;
    const headerBottom = document.querySelector('header').getBoundingClientRect().bottom;
    let r = target ? target.getBoundingClientRect() : null;
    // Narrow screens reserve the lower area for the explanation. A temporary bottom
    // spacer allows the last control to scroll above it without altering saved data.
    const narrow = width < 700;
    if (reveal && r && narrow) {
      const top = Math.max(12, headerBottom + 16);
      window.scrollBy({top: r.top - top, behavior: 'instant'});
      r = target.getBoundingClientRect();
    }
    let x = width - pw - 12, y = height - ph - 12;
    if (r && !narrow) {
      const candidates = [
        [r.left - pw - gap, Math.max(12, Math.min(r.top, height - ph - 12))],
        [r.right + gap, Math.max(12, Math.min(r.top, height - ph - 12))],
        [Math.max(12, Math.min(r.left, width - pw - 12)), r.bottom + gap],
        [Math.max(12, Math.min(r.left, width - pw - 12)), r.top - ph - gap]
      ];
      const fit = candidates.find(([cx, cy]) => cx >= 12 && cy >= 12 && cx + pw <= width - 12 && cy + ph <= height - 12);
      if (fit) [x,y] = fit;
    }
    panel.style.left = x + 'px'; panel.style.top = Math.max(12, y) + 'px';
    if (r) {
      const top = Math.max(4, r.top - 5), left = Math.max(4, r.left - 5);
      const bottom = Math.min(height - 4, narrow ? y - 12 : height - 4, r.bottom + 5);
      spot.hidden = bottom <= top || r.right <= 0 || r.left >= width;
      Object.assign(spot.style, {left: left + 'px', top: top + 'px', width: Math.max(0, Math.min(width - 4, r.right + 5) - left) + 'px', height: Math.max(0, bottom - top) + 'px'});
    } else spot.hidden = true;
  }
  function startTour(kind, button) {
    if (kind !== 'all') return;
    window.dispatchEvent(new Event('line-guide-start'));
    opener = button; originalScroll = window.scrollY;
    steps = allSteps; index = 0;
    examplesWereOpen = $('help-examples').open;
    principleWasOpen = $('principle').open;
    document.body.classList.add('guide-active');
    dialog.showModal();
    renderStep();
    $('guide-next').focus({preventScroll:true});
  }
  support.querySelectorAll('[data-tour]').forEach(button => button.addEventListener('click', () => startTour(button.dataset.tour, button)));
  $('guide-prev').addEventListener('click', () => { if (index > 0) { index--; renderStep(); } });
  $('guide-next').addEventListener('click', () => { if (index === steps.length - 1) dialog.close(); else { index++; renderStep(); } });
  dialog.querySelectorAll('[data-chapter]').forEach(button => button.addEventListener('click', () => { index = chapters[Number(button.dataset.chapter)].start; renderStep(); }));
  $('guide-skip-device').addEventListener('click', () => { index = chapters[2].start; renderStep(); $('guide-next').focus({preventScroll:true}); });
  $('guide-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.body.classList.remove('guide-active');
    $('help-examples').open = examplesWereOpen;
    $('principle').open = principleWasOpen;
    window.scrollTo({top:originalScroll, behavior:'instant'});
    if (opener) opener.focus({preventScroll:true});
  });
  const reposition = () => {
    if (!dialog.open || pendingFrame) return;
    pendingFrame = requestAnimationFrame(() => { pendingFrame = 0; positionGuide(); });
  };
  window.addEventListener('resize', () => { if (dialog.open) renderStep(); });
  window.addEventListener('scroll', reposition, {passive:true});
  if (location.hash === '#support-card') requestAnimationFrame(() => openHelp());
})();

