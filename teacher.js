(function () {
  const $ = (id) => document.getElementById(id);
  const store = window.ClassroomStore;
  const config = window.APP_CONFIG;

  let currentClassId = null;

  const els = {
    teacherName: $('teacherName'),
    sourceLang: $('sourceLang'),
    classTitle: $('classTitle'),
    targetLangs: $('targetLangs'),
    startClassBtn: $('startClassBtn'),
    endClassBtn: $('endClassBtn'),
    toggleMenuBtn: $('toggleMenuBtn'),
    teacherMenuPanel: $('teacherMenuPanel'),
    transmitBadge: $('transmitBadge'),
    transmitModeText: $('transmitModeText'),
    transmitHintText: $('transmitHintText'),
    classIdText: $('classIdText'),
    studentCountText: $('studentCountText'),
    classStatusText: $('classStatusText'),
    qrCanvas: $('qrCanvas'),
    joinUrl: $('joinUrl'),
    copyJoinUrlBtn: $('copyJoinUrlBtn'),
    glossaryFile: $('glossaryFile'),
    loadGlossaryBtn: $('loadGlossaryBtn'),
    glossaryPreview: $('glossaryPreview'),
    simulateBtn: $('simulateBtn'),
    pushImportantBtn: $('pushImportantBtn'),
    recentSourceList: $('recentSourceList'),
    systemLogList: $('systemLogList')
  };

  function log(message) {
    const li = document.createElement('li');
    li.textContent = `${new Date().toLocaleTimeString()} - ${message}`;
    els.systemLogList.prepend(li);
    if (els.systemLogList.children.length > 20) {
      els.systemLogList.removeChild(els.systemLogList.lastChild);
    }
  }

  function renderRecentSubtitles(subtitles) {
    els.recentSourceList.innerHTML = '';
    if (!subtitles.length) {
      const li = document.createElement('li');
      li.textContent = '尚无自动转写内容。';
      els.recentSourceList.appendChild(li);
      return;
    }
    subtitles.slice(-5).reverse().forEach((item) => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${item.sourceText}</strong><br><span class="muted">${new Date(item.timestamp).toLocaleTimeString()}</span>`;
      els.recentSourceList.appendChild(li);
    });
  }

  function renderClassInfo() {
    if (!currentClassId) return;
    const state = store.readClassState(currentClassId);
    if (!state) return;
    els.classIdText.textContent = state.classId;
    els.studentCountText.textContent = state.students;
    els.classStatusText.textContent = state.endedAt ? '已结束' : '进行中';
    renderRecentSubtitles(state.subtitles || []);
  }

  function buildJoinUrl(classId) {
    const base = location.href.replace(/teacher\.html.*$/, 'student.html');
    return `${base}?classId=${encodeURIComponent(classId)}`;
  }

  function renderQr(url) {
    if (!window.QRCode) return;
    els.qrCanvas.innerHTML = '';
    new window.QRCode(els.qrCanvas, {
      text: url,
      width: 220,
      height: 220,
      colorDark: '#111827',
      colorLight: '#ffffff',
      correctLevel: window.QRCode.CorrectLevel.M
    });
  }

  function toggleControls(enabled) {
    els.endClassBtn.disabled = !enabled;
    els.simulateBtn.disabled = !enabled;
    els.pushImportantBtn.disabled = !enabled;
    els.copyJoinUrlBtn.disabled = !enabled;
  }

  function setTransmitMode(isOn) {
    els.transmitBadge.textContent = isOn ? '发射中' : '待机中';
    els.transmitModeText.textContent = isOn ? '自动发射中' : '未开启';
    els.transmitHintText.textContent = isOn
      ? '教师讲话后将由系统自动识别、翻译并向学生端发射字幕。'
      : '点击“开始上课”后自动切换为发射中。';
  }

  function startClass() {
    const targetLangs = els.targetLangs.value.split(',').map(s => s.trim()).filter(Boolean);
    const state = store.createClass({
      teacherName: els.teacherName.value.trim(),
      sourceLang: els.sourceLang.value,
      classTitle: els.classTitle.value.trim(),
      targetLangs
    });
    currentClassId = state.classId;
    toggleControls(true);
    els.startClassBtn.disabled = true;
    els.classStatusText.textContent = '进行中';
    els.classIdText.textContent = state.classId;
    els.joinUrl.value = buildJoinUrl(state.classId);
    renderQr(els.joinUrl.value);
    setTransmitMode(true);
    log(`课堂 ${state.classId} 已开始，系统已自动进入发射模式。`);
    renderClassInfo();
  }

  function endClass() {
    if (!currentClassId) return;
    store.updateClass(currentClassId, (current) => ({ ...current, endedAt: Date.now() }));
    renderClassInfo();
    els.startClassBtn.disabled = false;
    toggleControls(false);
    setTransmitMode(false);
    log(`课堂 ${currentClassId} 已结束，发射模式已关闭。`);
    currentClassId = null;
  }

  function simulateSubtitle(isImportant = false) {
    if (!currentClassId) return;
    const lang = els.sourceLang.value;
    const samples = {
      zh: {
        sourceText: '今天我们学习“把”字句。',
        translations: {
          en: 'Today we will learn the ba-construction.',
          ja: '今日は「把」構文を学びます。',
          th: 'วันนี้เราจะเรียนประโยคแบบ ba',
          es: 'Hoy aprenderemos la construcción con ba.'
        }
      },
      en: {
        sourceText: 'Today we will review the key grammar pattern.',
        translations: {
          zh: '今天我们将复习重点语法结构。',
          ja: '今日は重要な文法パターンを復習します。'
        }
      },
      ja: {
        sourceText: '今日は方向補語を勉強します。',
        translations: {
          zh: '今天我们学习趋向补语。',
          en: 'Today we learn directional complements.'
        }
      }
    };
    const selected = samples[lang] || samples.zh;
    const subtitle = {
      sourceText: selected.sourceText,
      translations: selected.translations,
      timestamp: Date.now(),
      important: isImportant
    };
    store.pushSubtitle(currentClassId, subtitle);
    if (isImportant) {
      store.updateClass(currentClassId, (current) => ({ ...current, lastImportantAt: subtitle.timestamp }));
    }
    log(isImportant ? '已模拟一条重点句。' : '已模拟一条自动识别字幕。');
    renderClassInfo();
  }

  function loadGlossary() {
    const file = els.glossaryFile.files[0];
    if (!file) {
      alert('请先选择一个术语表文件。');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      els.glossaryPreview.textContent = text.slice(0, 2000);
      log(`已读取术语表：${file.name}`);
      if (currentClassId) {
        store.updateClass(currentClassId, (current) => ({ ...current, glossaryPreview: text.slice(0, 2000) }));
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  function copyJoinUrl() {
    if (!els.joinUrl.value) return;
    navigator.clipboard.writeText(els.joinUrl.value).then(() => log('已复制学生加入链接。'));
  }

  function toggleMenu() {
    els.teacherMenuPanel.classList.toggle('hidden');
  }

  function listenUpdates() {
    if (!store.channel) return;
    store.channel.onmessage = (event) => {
      const { type, classId } = event.data || {};
      if (type === 'class-updated' && classId === currentClassId) {
        renderClassInfo();
      }
    };
  }

  els.startClassBtn.addEventListener('click', startClass);
  els.endClassBtn.addEventListener('click', endClass);
  els.toggleMenuBtn.addEventListener('click', toggleMenu);
  els.simulateBtn.addEventListener('click', () => simulateSubtitle(false));
  els.pushImportantBtn.addEventListener('click', () => simulateSubtitle(true));
  els.loadGlossaryBtn.addEventListener('click', loadGlossary);
  els.copyJoinUrlBtn.addEventListener('click', copyJoinUrl);

  renderRecentSubtitles([]);
  setTransmitMode(false);
  listenUpdates();
  log(`页面已加载，当前为 ${config.mode === 'mock' ? '模拟模式' : '云端模式'}。`);
})();
