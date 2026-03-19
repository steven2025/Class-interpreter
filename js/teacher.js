(function () {
  const $ = (id) => document.getElementById(id);
  const store = window.ClassroomStore;
  const config = window.APP_CONFIG;

  let currentClassId = null;

  const els = {
    startClassBtn: $('startClassBtn'),
    endClassBtn: $('endClassBtn'),
    transmitBadge: $('transmitBadge'),
    transmitModeText: $('transmitModeText'),
    transmitHintText: $('transmitHintText'),
    classIdText: $('classIdText'),
    studentCountText: $('studentCountText'),
    classStatusText: $('classStatusText'),
    qrCanvas: $('qrCanvas')
  };

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

  function buildJoinUrl(classId) {
    const base = location.href.replace(/teacher\.html.*$/, 'student.html');
    return `${base}?classId=${encodeURIComponent(classId)}`;
  }

  function toggleControls(enabled) {
    els.endClassBtn.disabled = !enabled;
    els.startClassBtn.disabled = enabled;
  }

  function setTransmitMode(isOn) {
    els.transmitBadge.textContent = isOn ? '发射中' : '待机中';
    els.transmitModeText.textContent = isOn ? '自动发射中' : '未开启';
    els.transmitHintText.textContent = isOn
      ? '教师讲话后，系统会自动识别并向学生端发射字幕。'
      : '点击“开始上课”后自动进入发射模式';
  }

  function renderClassInfo() {
    if (!currentClassId) {
      els.classIdText.textContent = '未开始';
      els.studentCountText.textContent = '0';
      els.classStatusText.textContent = '未开课';
      return;
    }
    const state = store.readClassState(currentClassId);
    if (!state) return;
    els.classIdText.textContent = state.classId;
    els.studentCountText.textContent = state.students;
    els.classStatusText.textContent = state.endedAt ? '已结束' : '进行中';
  }

  function startClass() {
    const state = store.createClass({
      teacherName: '教师',
      sourceLang: 'zh',
      classTitle: '当前课堂',
      targetLangs: ['en', 'ja', 'th', 'es']
    });

    currentClassId = state.classId;
    toggleControls(true);
    setTransmitMode(true);
    renderClassInfo();
    renderQr(buildJoinUrl(state.classId));
  }

  function endClass() {
    if (!currentClassId) return;
    store.updateClass(currentClassId, (current) => ({ ...current, endedAt: Date.now() }));
    currentClassId = null;
    toggleControls(false);
    setTransmitMode(false);
    renderClassInfo();
    els.qrCanvas.innerHTML = '';
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

  setTransmitMode(false);
  renderClassInfo();
  listenUpdates();

  if (config.mode !== 'mock') {
    els.transmitHintText.textContent = '已切换为云端模式，发射状态将由实时服务驱动。';
  }
})();
