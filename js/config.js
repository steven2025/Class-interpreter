window.APP_CONFIG = {
  appName: '多语课堂实时字幕系统',
  mode: 'mock',
  wsUrl: 'wss://replace-with-your-api-gateway.example.com/ws',
  apiBase: 'https://replace-with-your-scf-api.example.com',
  storageKeys: {
    classPrefix: 'rtclass:',
    notesPrefix: 'rtnotes:'
  },
  defaultTargetLanguages: ['en', 'ja', 'th', 'es'],
  languageMap: {
    zh: '中文',
    en: 'English',
    ja: '日本語',
    th: 'ไทย',
    es: 'Español'
  }
};
