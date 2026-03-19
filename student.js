(function () {
  const $ = (id) => document.getElementById(id);
  const store = window.ClassroomStore;
  const config = window.APP_CONFIG;
  const params = new URLSearchParams(location.search);

  const els = {
    studentClassTitle: $('studentClassTitle'),
    studentConnectionText: $('studentConnectionText'),
    studentStatusBadge: $('studentStatusBadge'),
    sourceLangLabel: $('sourceLangLabel'),
    subtitleSource: $('subtitleSource'),
    subtitleTarget: $('subtitleTarget'),
    importantBanner: $('importantBanner'),
    toggleLangPanelBtn: $('toggleLangPanelBtn'),
    langPanel: $('langPanel'),
    studentLangSelect: $('studentLangSelect'),
    historyBtn: $('historyBtn'),
    saveNoteBtn: $('saveNoteBtn'),
    refreshBtn: $('refreshBtn'),
    historyPanel: $('historyPanel'),
    notesPanel: $('notesPanel'),
    subtitleHistoryList: $('subtitleHistoryList'),
    notesList: $('notesList')
  };

  let classId = params.get('classId') || '';
  let selectedLang = localStorage.getItem('student:selectedLang') || 'en';

  function renderState() {
    if (!classId) {
      els.studentConnectionText.textContent = '链接中没有 classId，请从教师二维码进入。';
      return;
    }
    const state = store.readClassState(classId);
    if (!state) {
      els.studentConnectionText.textContent = `课堂 ${classId} 不存在或尚未开始。`;
      els.studentStatusBadge.textContent = '未找到';
      return;
    }

    els.studentClassTitle.textContent = `${state.classTitle} · ${state.teacherName}`;
    els.studentConnectionText.textContent = `课堂号 ${state.classId} · 当前模式：${config.mode === 'mock' ? '模拟模式' : '云端模式'}`;
    els.studentStatusBadge.textContent = state.endedAt ? '已结束' : '已连接';
    els.sourceLangLabel.textContent = config.languageMap[state.sourceLang] || state.sourceLang;

    const langList = Array.from(new Set([...(state.targetLangs || []), state.sourceLang]));
    renderLanguageSelect(langList);
    renderLatestSubtitle(state);
    renderHistory(state);
    renderNotes();
  }

  function renderLanguageSelect(langList) {
    els.studentLangSelect.innerHTML = '';
    langList.forEach((lang) => {
      const option = document.createElement('option');
      option.value = lang;
      option.textContent = config.languageMap[lang] || lang;
      if (lang === selectedLang) option.selected = true;
      els.studentLangSelect.appendChild(option);
    });
  }

  function renderLatestSubtitle(state) {
    const latest = state.subtitles[state.subtitles.length - 1];
    if (!latest) {
      els.subtitleSource.textContent = '等待教师发送字幕…';
      els.subtitleTarget.textContent = '请选择语言并等待字幕。';
      els.importantBanner.classList.add('hidden');
      return;
    }

    els.subtitleSource.textContent = latest.sourceText || '';
    const translated = latest.translations?.[selectedLang];
    if (selectedLang === state.sourceLang) {
      els.subtitleTarget.textContent = latest.sourceText || '';
    } else {
      els.subtitleTarget.textContent = translated || '该句暂未提供此语种翻译。';
    }

    if (latest.important) {
      els.importantBanner.classList.remove('hidden');
    } else {
      els.importantBanner.classList.add('hidden');
    }
  }

  function renderHistory(state) {
    els.subtitleHistoryList.innerHTML = '';
    state.subtitles.slice(-20).reverse().forEach((item) => {
      const li = document.createElement('li');
      const translated = item.translations?.[selectedLang] || '未提供该语种';
      li.innerHTML = `<strong>${item.sourceText}</strong><br><span>${translated}</span><br><span class="muted">${new Date(item.timestamp).toLocaleTimeString()}</span>`;
      els.subtitleHistoryList.appendChild(li);
    });
  }

  function renderNotes() {
    const notes = store.getNotes(classId);
    els.notesList.innerHTML = '';
    notes.forEach((note) => {
      const li = document.createElement('li');
      li.innerHTML = `<strong>${note.sourceText}</strong><br><span>${note.targetText}</span><br><span class="muted">${new Date(note.timestamp).toLocaleString()}</span>`;
      els.notesList.appendChild(li);
    });
    if (!notes.length) {
      const li = document.createElement('li');
      li.textContent = '暂无笔记。';
      els.notesList.appendChild(li);
    }
  }

  function saveCurrentNote() {
    const sourceText = els.subtitleSource.textContent.trim();
    const targetText = els.subtitleTarget.textContent.trim();
    if (!classId || !sourceText || sourceText.includes('等待教师')) {
      alert('当前没有可保存的字幕。');
      return;
    }
    store.saveNote(classId, { sourceText, targetText, timestamp: Date.now(), selectedLang });
    renderNotes();
    els.notesPanel.classList.remove('hidden');
  }

  function bindEvents() {
    els.toggleLangPanelBtn.addEventListener('click', () => {
      els.langPanel.classList.toggle('hidden');
    });

    els.studentLangSelect.addEventListener('change', (e) => {
      selectedLang = e.target.value;
      localStorage.setItem('student:selectedLang', selectedLang);
      renderState();
    });

    els.historyBtn.addEventListener('click', () => {
      els.historyPanel.classList.toggle('hidden');
    });

    els.saveNoteBtn.addEventListener('click', saveCurrentNote);

    els.refreshBtn.addEventListener('click', renderState);
  }

  function initClass() {
    if (!classId) return;
    const state = store.readClassState(classId);
    if (state) {
      const flagKey = `joined:${classId}`;
      if (!sessionStorage.getItem(flagKey)) {
        store.addStudent(classId);
        sessionStorage.setItem(flagKey, '1');
      }
    }
    renderState();
  }

  function listenUpdates() {
    if (!store.channel) return;
    store.channel.onmessage = (event) => {
      const { type, classId: updatedId } = event.data || {};
      if (type === 'class-updated' && updatedId === classId) {
        renderState();
      }
    };
  }

  bindEvents();
  initClass();
  listenUpdates();
})();
