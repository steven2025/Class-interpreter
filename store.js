(function () {
  const { storageKeys } = window.APP_CONFIG;
  const channel = ('BroadcastChannel' in window) ? new BroadcastChannel('rt-classroom-channel') : null;

  function classKey(classId) {
    return `${storageKeys.classPrefix}${classId}`;
  }

  function notesKey(classId) {
    return `${storageKeys.notesPrefix}${classId}`;
  }

  function readClassState(classId) {
    const raw = localStorage.getItem(classKey(classId));
    return raw ? JSON.parse(raw) : null;
  }

  function writeClassState(classId, data) {
    localStorage.setItem(classKey(classId), JSON.stringify(data));
    if (channel) {
      channel.postMessage({ type: 'class-updated', classId, data });
    }
  }

  function createClass(payload) {
    const classId = String(Math.floor(100000 + Math.random() * 900000));
    const state = {
      classId,
      classTitle: payload.classTitle || '未命名课堂',
      teacherName: payload.teacherName || '教师',
      sourceLang: payload.sourceLang || 'zh',
      targetLangs: payload.targetLangs || window.APP_CONFIG.defaultTargetLanguages,
      createdAt: Date.now(),
      endedAt: null,
      students: 0,
      subtitles: [],
      glossaryPreview: '',
      lastImportantAt: null
    };
    writeClassState(classId, state);
    return state;
  }

  function updateClass(classId, updater) {
    const current = readClassState(classId);
    if (!current) return null;
    const next = typeof updater === 'function' ? updater(current) : { ...current, ...updater };
    writeClassState(classId, next);
    return next;
  }

  function pushSubtitle(classId, subtitle) {
    return updateClass(classId, (current) => {
      const subtitles = [...current.subtitles, subtitle].slice(-100);
      return { ...current, subtitles };
    });
  }

  function addStudent(classId) {
    return updateClass(classId, (current) => ({ ...current, students: current.students + 1 }));
  }

  function saveNote(classId, note) {
    const raw = localStorage.getItem(notesKey(classId));
    const list = raw ? JSON.parse(raw) : [];
    const next = [note, ...list].slice(0, 50);
    localStorage.setItem(notesKey(classId), JSON.stringify(next));
    return next;
  }

  function getNotes(classId) {
    const raw = localStorage.getItem(notesKey(classId));
    return raw ? JSON.parse(raw) : [];
  }

  window.ClassroomStore = {
    channel,
    createClass,
    readClassState,
    writeClassState,
    updateClass,
    pushSubtitle,
    addStudent,
    saveNote,
    getNotes
  };
})();
