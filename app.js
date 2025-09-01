// ============================
// MVP Парсер словарей (браузер)
// ============================

/*
  ВАЖНО:
  - Экспорт в Excel реализован в виде CSV, который открывается в Excel.
  - URL-анализ может блокироваться CORS: предпочитайте вставку текста.
  - Перевод через API требует ключей/эндпоинтов; без них оставьте сервис 'none' и редактируйте вручную.
*/

// --- Состояние ---
const LS_KEY = 'vocab_parser_state_v1'; // храним все словари и настройки
let state = {
  activeDict: null,
  dictionaries: {}, // { dictName: [{word, translation, example}], ... }
  settings: {
    langFrom: 'uk',
    langTo: 'en',
    translateService: 'libre', // libre | mymemory | lingva | google | deepl | none
    
    lingvaUrl: '',
    libreUrl: 'https://libretranslate.de'
  }
};


// --- Временное состояние анализа ---
let tempAnalysis = {
  sourceText: '',
  freqList: [], // [{word,count}, ...]
  cursor: 0
};

// --- Инициализация ---
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  bindUI();
  applyThemeAuto();
  renderDictSelect();
  initTabs();
  ensureAtLeastOneDict();
  renderWordsTable();
  refreshPreview();
});

// --- Тема ---
// --- i18n (RU/UK) ---
const I18N = {
  ru: {
    titleTxt: 'Парсер словарей — MVP',
    hSettings: 'Настройки',
    hDicts: 'Словари',
    hSource: 'Источник данных',
    hWork: 'Работа со словами (активный словарь)',
    hExport: 'Предпросмотр и экспорт',
    lblFrom: 'Родной язык (из):',
    lblTo: 'Изучаемый язык (в):',
    btnRename: 'Переименовать',
    btnDeleteDict: 'Удалить словарь',
    btnClearDict: 'Очистить текущий словарь',
    btnLoadDemo: 'Загрузить демо-словарь',
    btnAnalyzeUrl: 'Анализировать URL',
    btnAnalyzeText: 'Анализировать текст',
    btnAddWord: 'Добавить своё слово',
    thWord: 'Слово',
    thTranslation: 'Перевод',
    thExample: 'Пример',
    btnRefreshPreview: 'Обновить предпросмотр',
    btnExportCsv: 'Экспорт CSV (Excel)',
    btnExportJson: 'Экспорт JSON',
    lblImport: 'Импорт CSV/JSON:',
    btnImport: 'Импорт',
    phText: 'Или вставьте текст сюда...',
    summaryApi: 'Настройки API (опционально)',
    apiHint: '⚠️ Прямые запросы к сторонним сайтам/страницам могут блокироваться CORS. Для URL используйте вставку текста или собственный прокси.',
    next10: 'Ещё 10 слов',
    add10: 'Добавить эти 10 слов в словарь',
    added10: 'Добавлено 10 слов.',
    emptyBatch: 'Слова закончились.'
  },
  uk: {
    titleTxt: 'Парсер словників — MVP',
    hSettings: 'Налаштування',
    hDicts: 'Словники',
    hSource: 'Джерело даних',
    hWork: 'Робота зі словами (активний словник)',
    hExport: 'Попередній перегляд і експорт',
    lblFrom: 'Рідна мова:',
    lblTo: 'Мова вивчення:',
    btnRename: 'Перейменувати',
    btnDeleteDict: 'Видалити словник',
    btnClearDict: 'Очистити поточний словник',
    btnLoadDemo: 'Завантажити демо-словник',
    btnAnalyzeUrl: 'Аналізувати URL',
    btnAnalyzeText: 'Аналізувати текст',
    btnAddWord: 'Додати власне слово',
    thWord: 'Слово',
    thTranslation: 'Переклад',
    thExample: 'Приклад',
    btnRefreshPreview: 'Оновити перегляд',
    btnExportCsv: 'Експорт CSV (Excel)',
    btnExportJson: 'Експорт JSON',
    lblImport: 'Імпорт CSV/JSON:',
    btnImport: 'Імпорт',
    phText: 'Або вставте текст сюди...',
    summaryApi: 'Налаштування API (за бажанням)',
    apiHint: '⚠️ Прямі запити до сторонніх сайтів можуть блокуватися CORS. Для URL використовуйте вставку тексту або власний проксі.',
    next10: 'Ще 10 слів',
    add10: 'Додати ці 10 слів до словника',
    added10: 'Додано 10 слів.',
    emptyBatch: 'Слова закінчилися.'
  }
};

function applyLocale(){
  const loc = (state.settings.langFrom || 'uk').toLowerCase() === 'uk' ? 'uk' : 'ru';
  const t = I18N[loc];
  const map = {
    titleTxt: 'titleTxt',
    hSettings: 'hSettings',
    hDicts: 'hDicts',
    hSource: 'hSource',
    hWork: 'hWork',
    hExport: 'hExport',
    lblImport: 'lblImport',
    summaryApi: 'summaryApi',
    apiHint: 'apiHint'
  };
  for (const k in map){
    const el = document.getElementById(map[k]);
    if (el) el.textContent = t[k];
  }
  // labels and buttons with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    if (t[key]) el.textContent = t[key];
  });
  // placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el=>{
    const key = el.getAttribute('data-i18n-placeholder');
    if (t[key]) el.setAttribute('placeholder', t[key]);
  });
  // labels for selects
  const lblFrom = document.getElementById('lblFrom');
  const lblTo = document.getElementById('lblTo');
  if (lblFrom) lblFrom.childNodes[0].textContent = t.lblFrom + ' ';
  if (lblTo) lblTo.childNodes[0].textContent = t.lblTo + ' ';
  // tabs
  document.querySelectorAll('.tabs .tab-btn').forEach(btn=>{
    if (btn.dataset.tab === 'workTab') btn.textContent = (loc==='uk'?'Робота зі словами':'Работа со словами');
    if (btn.dataset.tab === 'exportTab') btn.textContent = (loc==='uk'?'Попередній перегляд і експорт':'Предпросмотр и экспорт');
  });
}

function applyThemeAuto(){
  const hour = new Date().getHours();
  const isDark = hour < 7 || hour >= 19; // ночь/вечер
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  document.getElementById('themeIndicator').textContent = 'Тема: ' + (isDark ? 'тёмная' : 'светлая');
}

// --- LocalStorage ---
function loadState(){
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) state = JSON.parse(raw);
  } catch(e){ console.warn('Load state error', e); }
}

function saveState(){
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch(e){ console.warn('Save state error', e); }
}

// --- Связка UI ---
function bindUI(){
  // Настройки
  const langFrom = document.getElementById('langFrom');
  const langTo = document.getElementById('langTo');
  const translateService = document.getElementById('translateService');
  
  const lingvaUrl = document.getElementById('lingvaUrl');
  const libreUrl = document.getElementById('libreUrl');

  langFrom.value = state.settings.langFrom;
  langTo.value = state.settings.langTo;
  translateService.value = state.settings.translateService;
  
  lingvaUrl.value = state.settings.lingvaUrl || '';
  libreUrl.value = state.settings.libreUrl || 'https://libretranslate.de';

  [langFrom, langTo, translateService, lingvaUrl, libreUrl].forEach(el => {
    el.addEventListener('change', () => {
      state.settings.langFrom = langFrom.value.trim() || 'ru';
      state.settings.langTo = langTo.value.trim() || 'en';
      state.settings.translateService = translateService.value;
      
      state.settings.lingvaUrl = lingvaUrl.value;
      state.settings.libreUrl = libreUrl.value || 'https://libretranslate.de';
      saveState();
    });
  });

  // Словари
  document.getElementById('createDictBtn').addEventListener('click', createDict);
  document.getElementById('renameDictBtn').addEventListener('click', renameDict);
  document.getElementById('deleteDictBtn').addEventListener('click', deleteDict);
  document.getElementById('loadDemoBtn').addEventListener('click', loadDemo);
  document.getElementById('clearDictBtn').addEventListener('click', clearCurrentDict);

  document.getElementById('dictSelect').addEventListener('change', e=>{
    state.activeDict = e.target.value;
    saveState();
    renderWordsTable();
    refreshPreview();
  });

  // Источник
  document.getElementById('analyzeTextBtn').addEventListener('click', analyzeText);
  document.getElementById('analyzeUrlBtn').addEventListener('click', analyzeUrl);
  document.getElementById('nextBatchBtn').addEventListener('click', ()=>{ tempAnalysis.cursor += 10; renderCurrentBatch(); });

  // Работа со словами
  document.getElementById('addCustomWordBtn').addEventListener('click', addCustomWord);

  // Экспорт
  document.getElementById('refreshPreviewBtn').addEventListener('click', refreshPreview);
  document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);
  document.getElementById('exportJsonBtn').addEventListener('click', exportJSON);
}

// --- Словари ---
function ensureAtLeastOneDict(){
  const names = Object.keys(state.dictionaries);
  if (names.length === 0){
    const def = 'Мой словарь';
    state.dictionaries[def] = [];
    state.activeDict = def;
    saveState();
    renderDictSelect();
  initTabs();
  } else if (!state.activeDict){
    state.activeDict = names[0];
    saveState();
    renderDictSelect();
  initTabs();
  }
}

function renderDictSelect(){
  const sel = document.getElementById('dictSelect');
  sel.innerHTML = '';
  Object.keys(state.dictionaries).forEach(name=>{
    const opt = document.createElement('option');
    opt.value = name; opt.textContent = name;
    if (name === state.activeDict) opt.selected = true;
    sel.appendChild(opt);
  });
}

function createDict(){
  const name = document.getElementById('newDictName').value.trim();
  if (!name) return alert('Введите имя словаря');
  if (state.dictionaries[name]) return alert('Словарь с таким именем уже существует');
  state.dictionaries[name] = [];
  state.activeDict = name;
  saveState();
  renderDictSelect();
  initTabs();
  renderWordsTable();
  refreshPreview();
  document.getElementById('newDictName').value='';
}

function renameDict(){
  if (!state.activeDict) return;
  const newName = document.getElementById('renameDictName').value.trim();
  if (!newName) return alert('Введите новое имя');
  if (state.dictionaries[newName]) return alert('Такое имя уже занято');
  state.dictionaries[newName] = state.dictionaries[state.activeDict];
  delete state.dictionaries[state.activeDict];
  state.activeDict = newName;
  saveState();
  renderDictSelect();
  initTabs();
  document.getElementById('renameDictName').value='';
}

function deleteDict(){
  if (!state.activeDict) return;
  if (!confirm('Удалить словарь "'+state.activeDict+'"?')) return;
  delete state.dictionaries[state.activeDict];
  state.activeDict = null;
  saveState();
  renderDictSelect();
  initTabs();
  ensureAtLeastOneDict();
  renderWordsTable();
  refreshPreview();
}

function loadDemo(){
  const demoName = 'Demo — Универсальный';
  const data = [
    {word:'cat', translation:'кошка', example:'The cat sat on the mat.'},
    {word:'house', translation:'дом', example:'This is a big house.'},
    {word:'travel', translation:'путешествовать', example:'I like to travel in summer.'},
    {word:'food', translation:'еда', example:'The food was delicious.'},
    {word:'learn', translation:'учить', example:'I want to learn new words.'},
    {word:'city', translation:'город', example:'The city is very old.'}
  ];
  state.dictionaries[demoName] = data;
  state.activeDict = demoName;
  saveState();
  renderDictSelect();
  initTabs();
  renderWordsTable();
  refreshPreview();
}


function renderCurrentBatch(){
  const wordsPreview = document.getElementById('wordsPreview');
  const nextBtn = document.getElementById('nextBatchBtn');
  const batch = tempAnalysis.freqList.slice(tempAnalysis.cursor, tempAnalysis.cursor + 10);
  if (!batch.length){
    wordsPreview.innerHTML = '<em>' + (state.settings.langFrom==='uk'? I18N.uk.emptyBatch : I18N.ru.emptyBatch) + '</em>';
    nextBtn.style.display = 'none';
    return;
  }
  wordsPreview.innerHTML = renderTopWords(batch);

  const btn = document.createElement('button');
  btn.textContent = (state.settings.langFrom==='uk'? I18N.uk.add10 : I18N.ru.add10);
  btn.addEventListener('click', async () => {
    for (const item of batch){
      const example = findExampleSentence(tempAnalysis.sourceText, item.word) || '';
      const translation = await translateWord(item.word);
      addEntryToActiveDict(item.word, translation, example);
    }
    renderWordsTable();
    refreshPreview();
    tempAnalysis.cursor += 10;
    renderCurrentBatch();
  });
  wordsPreview.appendChild(document.createElement('br'));
  wordsPreview.appendChild(btn);

  nextBtn.style.display = 'inline-block'; nextBtn.textContent = (state.settings.langFrom==='uk'? I18N.uk.next10 : I18N.ru.next10);
}

// --- Анализ текста/URL ---

// Обработать текст → выделить слова → top-10
function analyzeText(){
  const nextBtn = document.getElementById('nextBatchBtn');
  nextBtn.style.display = 'none';
  const text = document.getElementById('textInput').value.trim();
  if (!text) return alert('Вставьте текст');
  const wordsPreview = document.getElementById('wordsPreview');
  // Сохранить временный анализ
  tempAnalysis.sourceText = text;
  tempAnalysis.freqList = getTopWords(extractWords(text), 500);
  tempAnalysis.cursor = 0;

  renderCurrentBatch();
}

async function analyzeUrl(){
  const nextBtn = document.getElementById('nextBatchBtn');
  nextBtn.style.display = 'none';
  const url = document.getElementById('urlInput').value.trim();
  if (!url) return alert('Вставьте URL');
  const wordsPreview = document.getElementById('wordsPreview');
  wordsPreview.textContent = 'Загрузка и анализ URL... (возможно, CORS заблокирует запрос)';
  try {
    // ПРИМЕЧАНИЕ: прямой fetch может быть заблокирован правилами CORS.
    const res = await fetch(url);
    const html = await res.text();
    const text = htmlToVisibleText(html);
    // Сохранить временный анализ
    tempAnalysis.sourceText = text;
    tempAnalysis.freqList = getTopWords(extractWords(text), 500);
    tempAnalysis.cursor = 0;
    renderCurrentBatch();

  } catch(e){
    console.warn(e);
    wordsPreview.textContent = 'Не удалось загрузить страницу. Вероятно, CORS. Скопируйте текст вручную.';
  }
}

// --- Обработка слов/предложений ---

// Стоп-слова (минимальный набор для RU/EN, можно расширять)
/* STOP moved to dynamic getter */
const STOP = null; // unused
  'и','в','во','на','с','со','о','а','то','же','как','к','до','за','из','под','по','от','у','не','что','это','то','для','он','она','они','мы','вы','я',
  'the','a','an','is','are','to','of','in','on','at','and','or','for','with','as','by','it','that','be','was','were','this','from'
]);


function getStopwordSet(){
  const lang = (state.settings.langFrom || 'auto').toLowerCase();
  const base = new Set([
    'the','a','an','is','are','to','of','in','on','at','and','or','for','with','as','by','it','that','be','was','were','this','from'
  ]);
  if (lang.startsWith('ru')){
    ['и','в','во','на','с','со','о','а','то','же','как','к','до','за','из','под','по','от','у','не','что','это','то','для','он','она','они','мы','вы','я'].forEach(w=>base.add(w));
  }
  if (lang.startsWith('en')){
    // add common English stopwords
    ['i','you','he','she','we','they','my','your','his','her','our','their','but','if','because','while','so','not','no','do','does','did','have','has','had','can','could','should','would','will','just'].forEach(w=>base.add(w));
  }
  return base;
}

function extractWords(text){
  const clean = text
    .toLowerCase()
    .replace(/['’]/g,'') // убрать апострофы внутри слов
    .replace(/[^a-zа-яё\u0400-\u04FF\s-]/gi, ' '); // буквы латиницы/кириллицы и пробелы
  const STOPSET = getStopwordSet();
  return clean.split(/\s+/).filter(w => w.length > 2 && !STOPSET.has(w));
}

function getTopWords(words, limit=10){
  const freq = new Map();
  for (const w of words){
    freq.set(w, (freq.get(w)||0)+1);
  }
  return [...freq.entries()]
    .map(([word,count])=>({word, count}))
    .sort((a,b)=>b.count-a.count)
    .slice(0, limit);
}

function findExampleSentence(text, word){
  const sentences = text.split(/(?<=[\.\!\?])\s+/);
  const w = word.toLowerCase();
  // найти первое предложение, где встречается слово как отдельный токен
  for (const s of sentences){
    const has = new RegExp(`(^|\\W)${escapeRegExp(w)}(\\W|$)`, 'i').test(s);
    if (has) return s.trim();
  }
  return '';
}

function htmlToVisibleText(html){
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  // убрать скрипты/стили
  [...tmp.querySelectorAll('script,style,noscript')].forEach(n=>n.remove());
  return tmp.textContent || '';
}

function escapeRegExp(str){
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderTopWords(arr){
  if (!arr.length) return '<em>Не найдено частотных слов.</em>';
  return `<ol>${arr.map(x=>`<li>${x.word} <span class="muted">(${x.count})</span></li>`).join('')}</ol>`;
}

// --- Перевод ---

async function translateWord(word){
  const { translateService, googleKey, deeplKey, lingvaUrl, libreUrl } = state.settings;
  const source = (state.settings.langFrom || 'auto').toLowerCase();
  const target = (state.settings.langTo || 'en').toLowerCase();

  try {
    if (translateService === 'libre'){
      // LibreTranslate public demo (rate-limited). POST /translate
      const url = (libreUrl || 'https://libretranslate.de').replace(/\/+$/,'') + '/translate';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: word, source: source === 'auto' ? 'auto' : source, target, format: 'text' })
      });
      if (!res.ok) return '';
      const data = await res.json();
      return (data && (data.translatedText || data.translation || '')) || '';
    }

    if (translateService === 'mymemory'){
      // Simple GET without key. Example: https://api.mymemory.translated.net/get?q=cat&langpair=en|ru
      const lp = `${source === 'auto' ? 'en' : source}|${target}`;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=${encodeURIComponent(lp)}`;
      const res = await fetch(url);
      if (!res.ok) return '';
      const data = await res.json();
      // data.responseData.translatedText
      return (data && data.responseData && data.responseData.translatedText) ? data.responseData.translatedText : '';
    }

    if (translateService === 'lingva'){
      if (!lingvaUrl) return '';
      const base = lingvaUrl.replace(/\/+$/,'');
      const src = source === 'auto' ? 'auto' : source;
      const url = `${base}/api/v1/${encodeURIComponent(src)}/${encodeURIComponent(target)}/${encodeURIComponent(word)}`;
      const res = await fetch(url);
      if (!res.ok) return '';
      const data = await res.json();
      return (data && (data.translation || data.result || '')) || '';
    }

    if (translateService === 'google'){
      if (!googleKey) return '';
      // Placeholder: browser calls to Google often require a proxy due to CORS.
      return '';
    }

    if (translateService === 'deepl'){
      if (!deeplKey) return '';
      // Placeholder: DeepL also usually requires server-side due to CORS.
      return '';
    }
  } catch(e){
    console.warn('Translate error:', e);
    return '';
  }
  return '';
}

    if (translateService === 'deepl'){
      if (!deeplKey) return '';
      // Аналогично, DeepL требует ключ и CORS-совместимый вызов через их API/прокси.
      return '';
    }
    if (translateService === 'lingva'){
      if (!lingvaUrl) return '';
      // Некоторые инстансы Lingva поддерживают GET /api/v1/{source}/{target}/{text}
      const url = `${lingvaUrl.replace(/\/+$/,'')}/api/v1/${encodeURIComponent(source)}/${encodeURIComponent(target)}/${encodeURIComponent(word)}`;
      const res = await fetch(url);
      if (!res.ok) return '';
      const data = await res.json();
      // Ожидаемый формат: { translation: "..." }
      return (data && (data.translation || data.result || '')) || '';
    }
  } catch(e){
    console.warn('Translate error:', e);
    return '';
  }
  // Режим без перевода
  return '';
}

// --- Добавление/редактирование слов ---
function addEntryToActiveDict(word, translation, example){
  if (!state.activeDict) return;
  const arr = state.dictionaries[state.activeDict] || [];
  // не добавлять дубликаты точного слова
  if (arr.some(x=>x.word === word)) return;
  arr.push({word, translation, example});
  state.dictionaries[state.activeDict] = arr;
  saveState();
}

function removeEntry(idx){
  const arr = state.dictionaries[state.activeDict] || [];
  arr.splice(idx,1);
  saveState();
  renderWordsTable();
  refreshPreview();
}

function addCustomWord(){
  const w = prompt('Введите слово:');
  if (!w) return;
  const t = prompt('Введите перевод (можно пусто):') || '';
  const e = prompt('Введите пример (можно пусто):') || '';
  addEntryToActiveDict(w.trim(), t.trim(), e.trim());
  renderWordsTable();
  refreshPreview();
}

// Автосейв перевода/примера
function onCellEdit(idx, field, value){
  const arr = state.dictionaries[state.activeDict] || [];
  if (!arr[idx]) return;
  arr[idx][field] = value;
  saveState();
}

// --- Рендер таблиц ---
function renderWordsTable(){
  const tbody = document.querySelector('#wordsTable tbody');
  tbody.innerHTML = '';
  const arr = state.dictionaries[state.activeDict] || [];
  arr.forEach((item, idx)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${idx+1}</td>
      <td>${escapeHtml(item.word)}</td>
      <td><input type="text" value="${escapeHtml(item.translation||'')}" data-idx="${idx}" data-field="translation"/></td>
      <td><textarea rows="2" data-idx="${idx}" data-field="example">${escapeHtml(item.example||'')}</textarea></td>
      <td><button class="danger" data-remove="${idx}">Удалить</button></td>
    `;
    tbody.appendChild(tr);
  });

  // повесить обработчики
  tbody.querySelectorAll('input,textarea').forEach(el=>{
    el.addEventListener('input', (e)=>{
      const idx = +e.target.getAttribute('data-idx');
      const field = e.target.getAttribute('data-field');
      onCellEdit(idx, field, e.target.value);
    });
  });
  tbody.querySelectorAll('button[data-remove]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const idx = +e.target.getAttribute('data-remove');
      removeEntry(idx);
    });
  });
}

function refreshPreview(){
  const tbody = document.querySelector('#previewTable tbody');
  tbody.innerHTML = '';
  const arr = state.dictionaries[state.activeDict] || [];
  arr.forEach(item=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(item.word||'')}</td>
      <td>${escapeHtml(item.translation||'')}</td>
      <td>${escapeHtml(item.example||'')}</td>
    `;
    tbody.appendChild(tr);
  });
}


// --- Импорт CSV/JSON ---
document.getElementById('importBtn').addEventListener('click', async ()=>{
  const fileInput = document.getElementById('importFile');
  const f = fileInput.files && fileInput.files[0];
  if (!f) return alert('Выберите файл CSV или JSON');
  const text = await f.text();
  try {
    if (f.name.toLowerCase().endswith('.json')){
      const data = JSON.parse(text);
      const entries = data.entries || data || [];
      bulkAddEntries(entries);
    } else {
      // простейший CSV: "word","translation","example"
      const lines = text.split(/\r?\n/).filter(Boolean);
      const rows = lines.map(line=>{
        // CSV naive split: handle quoted commas
        const cells = [];
        let cur = '', inQ = false;
        for (let i=0;i<line.length;i++){
          const ch = line[i];
          if (ch === '"' ){
            if (inQ && line[i+1] === '"'){ cur+='"'; i++; }
            else inQ = !inQ;
          } else if (ch === ',' && !inQ){
            cells.push(cur); cur='';
          } else cur += ch;
        }
        cells.push(cur);
        return cells.map(c=>c.replace(/^"|"$/g,'').trim());
      });
      // drop header if present
      const start = rows[0] && rows[0][0].toLowerCase() === 'word' ? 1 : 0;
      const entries = rows.slice(start).map(r=>({word:r[0]||'', translation:r[1]||'', example:r[2]||''}));
      bulkAddEntries(entries);
    }
  } catch(e){
    console.warn(e);
    alert('Не удалось импортировать файл.');
  } finally {
    fileInput.value = '';
  }
});

function bulkAddEntries(entries){
  if (!state.activeDict) return;
  const arr = state.dictionaries[state.activeDict] || [];
  for (const e of entries){
    if (!e || !e.word) continue;
    if (arr.some(x=>x.word === e.word)) continue;
    arr.push({ word: e.word, translation: e.translation||'', example: e.example||'' });
  }
  state.dictionaries[state.activeDict] = arr;
  saveState();
  renderWordsTable();
  refreshPreview();
}

// --- Экспорт ---
function exportCSV(){
  const arr = state.dictionaries[state.activeDict] || [];
  if (!arr.length) return alert('Словарь пуст');
  const rows = [['word','translation','example'], ...arr.map(x=>[x.word||'', x.translation||'', x.example||''])];
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g,'""')}"`).join(',')).join('\r\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${state.activeDict || 'dictionary'}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportJSON(){
  const arr = state.dictionaries[state.activeDict] || [];
  const json = JSON.stringify({ name: state.activeDict, langFrom: state.settings.langFrom, langTo: state.settings.langTo, entries: arr }, null, 2);
  const blob = new Blob([json], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${state.activeDict || 'dictionary'}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// --- Utils ---
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
}

function clearCurrentDict(){
  if (!state.activeDict) return;
  if (!confirm('Очистить все записи текущего словаря?')) return;
  state.dictionaries[state.activeDict] = [];
  saveState();
  renderWordsTable();
  refreshPreview();
}


// --- Tabs ---
function initTabs(){
  const btns = Array.from(document.querySelectorAll('.tab-btn'));
  function activate(name){
    btns.forEach(b=>b.classList.toggle('active', b.dataset.tab===name));
    document.querySelectorAll('.tab-content').forEach(c=>c.style.display = (c.id===name?'block':'none'));
    saveState();
  }
  btns.forEach(b=>b.addEventListener('click', ()=>activate(b.dataset.tab)));
  activate('workTab');
}
