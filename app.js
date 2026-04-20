import { SEED_NOTES } from './notes.js';

// ────────────────────────────────────────────────────────────
// Persistence
// ────────────────────────────────────────────────────────────
const LS_NOTES = 'kern.notes.v1';
const LS_STATE = 'kern.state.v1';

function loadNotes() {
  try {
    const raw = localStorage.getItem(LS_NOTES);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) return null;
    return parsed.map(n => ({
      id: String(n.id),
      body: String(n.body ?? ''),
      pinned: Boolean(n.pinned),
      tags: Array.isArray(n.tags) ? n.tags.filter(t => typeof t === 'string') : [],
      created: Number(n.created) || Date.now(),
      updated: Number(n.updated) || Date.now(),
    }));
  } catch { return null; }
}
function saveNotes(notes) {
  try { localStorage.setItem(LS_NOTES, JSON.stringify(notes)); } catch {}
}
function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(LS_STATE)) || {}; } catch { return {}; }
}
function savePrefs(p) {
  try { localStorage.setItem(LS_STATE, JSON.stringify(p)); } catch {}
}

// ────────────────────────────────────────────────────────────
// State
// ────────────────────────────────────────────────────────────
const prefs = loadPrefs();
const state = {
  notes: loadNotes() || SEED_NOTES,
  selectedId: prefs.selectedId || null,
  selectedTag: prefs.selectedTag || null,
  focus: false,
  info: false,
  theme: prefs.theme === 'dark' ? 'dark' : 'light',
  typewriter: Boolean(prefs.typewriter),
  tagFilter: '',
  pinned: null, // { noteId, lineIdx, subIdx } — alongside the caret sentence
};
if (!state.notes.find(n => n.id === state.selectedId)) {
  state.selectedId = state.notes[0]?.id || null;
}

let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveNotes(state.notes), 400);
}
function persistPrefs() {
  savePrefs({
    selectedId: state.selectedId,
    selectedTag: state.selectedTag,
    theme: state.theme,
    typewriter: state.typewriter,
  });
}

// ────────────────────────────────────────────────────────────
// Utilities
// ────────────────────────────────────────────────────────────
const $ = (s, root = document) => root.querySelector(s);
const el = (tag, props = {}, ...children) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'value') node.value = v;
    else if (k === 'data') for (const [dk, dv] of Object.entries(v)) node.dataset[dk] = dv;
    else if (k === 'style') Object.assign(node.style, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'aria') for (const [ak, av] of Object.entries(v)) node.setAttribute(`aria-${ak}`, av);
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
};

function genId() {
  return `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function relativeTime(ts) {
  const now = Date.now();
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(diff / 3_600_000);
  if (hr < 24) return `${hr}h`;
  const d = Date.now();
  const today = new Date(d); today.setHours(0, 0, 0, 0);
  const that = new Date(ts); that.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((today - that) / 86_400_000);
  if (dayDiff === 1) return 'yesterday';
  if (dayDiff < 7) return new Date(ts).toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase();
}

const noteTitle = (body) => {
  const line = (body || '').split('\n').find(l => l.trim()) || '';
  return line.replace(/^#+\s*/, '').trim() || 'untitled';
};
const noteExcerpt = (body) => {
  const lines = (body || '').split('\n');
  let past = 0;
  for (const l of lines) {
    if (!l.trim()) continue;
    if (past === 0) { past = 1; continue; }
    return l
      .replace(/^[#>\-]\s*/, '')
      .replace(/^\d+\.\s*/, '')
      .replace(/\*\*|__|`|~~/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  }
  return '';
};
const wordCount = (body) => (body || '').replace(/[#>\-\[\]*_`]/g, '').split(/\s+/).filter(Boolean).length;
const readingTime = (w) => Math.max(1, Math.round(w / 220));

function extractBodyTags(body) {
  const out = new Set();
  const rx = /(?:^|[^\w])#([A-Za-z][\w/]*)/g;
  let m;
  while ((m = rx.exec(body || ''))) out.add(m[1]);
  return [...out];
}
function tagsForNote(n) {
  const merged = new Set([...(n.tags || []), ...extractBodyTags(n.body)]);
  return [...merged];
}

function sortedNotes() {
  return [...state.notes].sort((a, b) => (b.updated || 0) - (a.updated || 0));
}

function noteMatchesTag(n, tag) {
  if (!tag) return true;
  return tagsForNote(n).some(t => t === tag || t.startsWith(tag + '/'));
}

// ────────────────────────────────────────────────────────────
// Markdown — block markers (hanging, iA Writer style) + inline marks
// ────────────────────────────────────────────────────────────
function matchBlockMarker(line) {
  let m;
  m = /^(#{1,4})\s/.exec(line);
  if (m) return { marker: m[0], kind: 'h', level: m[1].length };
  m = /^-\s\[[ x]\]\s/.exec(line);
  if (m) return { marker: m[0], kind: 'task', done: /\[x\]/.test(m[0]) };
  m = /^[-*]\s/.exec(line);
  if (m) return { marker: m[0], kind: 'ul' };
  m = /^\d+\.\s/.exec(line);
  if (m) return { marker: m[0], kind: 'ol' };
  m = /^>\s/.exec(line);
  if (m) return { marker: m[0], kind: 'q' };
  return null;
}

const INLINE_RX = /(\*\*[^*\n]+\*\*)|(_[^_\n]+_)|(`[^`\n]+`)|(\[[^\]\n]+\]\([^)\n]+\))|(~~[^~\n]+~~)|((?:^|(?<=\s))#[A-Za-z][\w/]*)/g;

function mk(cls, text) { const s = document.createElement('span'); s.className = cls; s.textContent = text; return s; }
function wrapInline(cls, inner, markL, markR) {
  const s = document.createElement('span');
  s.className = cls;
  s.appendChild(mk('kd-mk', markL));
  s.appendChild(document.createTextNode(inner));
  s.appendChild(mk('kd-mk', markR));
  return s;
}
function appendInline(container, text) {
  let i = 0, m;
  INLINE_RX.lastIndex = 0;
  while ((m = INLINE_RX.exec(text))) {
    if (m.index > i) container.appendChild(document.createTextNode(text.slice(i, m.index)));
    const tok = m[0];
    if (m[1]) container.appendChild(wrapInline('kd-b', tok.slice(2, -2), '**', '**'));
    else if (m[2]) container.appendChild(wrapInline('kd-i', tok.slice(1, -1), '_', '_'));
    else if (m[3]) container.appendChild(wrapInline('kd-c', tok.slice(1, -1), '`', '`'));
    else if (m[4]) {
      const lm = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok);
      container.appendChild(wrapInline('kd-l', lm[1], '[', `](${lm[2]})`));
    }
    else if (m[5]) container.appendChild(wrapInline('kd-strike', tok.slice(2, -2), '~~', '~~'));
    else if (m[6]) container.appendChild(mk('kd-tag', tok));
    i = m.index + tok.length;
  }
  if (i < text.length) container.appendChild(document.createTextNode(text.slice(i)));
}

// ────────────────────────────────────────────────────────────
// Sidebar
// ────────────────────────────────────────────────────────────
function renderSidebar() {
  const root = $('#sidebar');
  const filterActive = document.activeElement?.matches?.('.kd-side-filter input');
  const caretPos = filterActive ? document.activeElement.selectionStart : null;
  root.replaceChildren();

  root.appendChild(el('div', { class: 'kd-brand' },
    el('span', { text: 'kern.' }),
    el('span', { class: 'ver', text: '1.0' }),
  ));

  const filter = el('div', { class: `kd-side-filter${state.tagFilter ? ' has-value' : ''}` });
  const filterInput = el('input', {
    type: 'text',
    placeholder: 'filter tags (⌘t)',
    value: state.tagFilter,
    spellcheck: 'false',
    autocomplete: 'off',
    oninput: (e) => { state.tagFilter = e.target.value; renderSidebar(); },
    onkeydown: (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const first = root.querySelector('.kd-side .row[data-tag]');
        if (first) first.click();
        filterInput.blur();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        clearTagFilter();
      }
    },
  });
  filter.appendChild(filterInput);
  root.appendChild(filter);

  const counts = {};
  state.notes.forEach(n => tagsForNote(n).forEach(t => counts[t] = (counts[t] || 0) + 1));
  const match = (t) => !state.tagFilter || t.toLowerCase().includes(state.tagFilter.toLowerCase());
  const flat = Object.keys(counts).filter(t => !t.includes('/')).filter(match).sort();
  const nestedRoots = [...new Set(Object.keys(counts).filter(t => t.includes('/')).filter(match).map(t => t.split('/')[0]))].sort();
  const pinned = sortedNotes().filter(n => n.pinned);

  if (!state.tagFilter) {
    const allRow = el('div', {
      class: `row${state.selectedTag == null ? ' sel' : ''}`,
      onclick: () => { state.selectedTag = null; persistPrefs(); renderSidebar(); renderList(); },
    },
      el('span', { text: 'all' }),
      el('span', { class: 'c', text: String(state.notes.length) }),
    );
    root.appendChild(allRow);

    if (pinned.length) {
      root.appendChild(el('h2', { text: 'pinned' }));
      pinned.forEach(n => root.appendChild(el('div', {
        class: `row pin${n.id === state.selectedId ? ' sel-pin' : ''}`,
        onclick: () => selectNote(n.id),
        text: noteTitle(n.body).toLowerCase(),
      })));
    }
  }

  if (flat.length) {
    if (!state.tagFilter) root.appendChild(el('h2', { text: 'tags' }));
    flat.forEach(t => root.appendChild(el('div', {
      class: `row${t === state.selectedTag ? ' sel' : ''}`,
      data: { tag: t },
      onclick: () => { state.selectedTag = t; persistPrefs(); renderSidebar(); renderList(); },
    },
      el('span', { text: `#${t}` }),
      el('span', { class: 'c', text: String(counts[t]) }),
    )));
  }

  nestedRoots.forEach(rootTag => {
    const nested = Object.keys(counts).filter(t => t.startsWith(rootTag + '/')).filter(match).sort();
    if (!nested.length) return;
    root.appendChild(el('h2', { text: `#${rootTag}` }));
    nested.forEach(t => root.appendChild(el('div', {
      class: `row nested${t === state.selectedTag ? ' sel' : ''}`,
      data: { tag: t },
      onclick: () => { state.selectedTag = t; persistPrefs(); renderSidebar(); renderList(); },
    },
      el('span', { text: `/${t.split('/').slice(1).join('/')}` }),
      el('span', { class: 'c', text: String(counts[t]) }),
    )));
  });

  if (filterActive) {
    const newInput = $('.kd-side-filter input');
    if (newInput) {
      newInput.focus();
      if (caretPos != null) newInput.setSelectionRange(caretPos, caretPos);
    }
  }
}

// ────────────────────────────────────────────────────────────
// List
// ────────────────────────────────────────────────────────────
function renderList() {
  const root = $('#list');
  root.replaceChildren();

  const filter = state.selectedTag;
  const visible = sortedNotes().filter(n => noteMatchesTag(n, filter));

  const header = el('div', { class: 'kd-list-head' });
  header.appendChild(el('div', { class: 'head-l' },
    el('span', { class: 'title', text: filter ? `#${filter}` : 'library' }),
    el('button', {
      class: 'new',
      onclick: createNote,
      title: 'new note (⌘N)',
      aria: { label: 'new note' },
      text: '+',
    }),
  ));
  header.appendChild(el('span', {
    class: 'meta',
    text: `${visible.length} · sorted by modified`,
  }));
  root.appendChild(header);

  if (!visible.length) {
    root.appendChild(el('div', { class: 'kd-empty-list', text: 'no notes match this tag.' }));
    return;
  }

  visible.forEach(n => {
    const row = el('div', {
      class: `kd-list-row${n.id === state.selectedId ? ' sel' : ''}`,
      onclick: (e) => {
        if (e.target.closest('.pin-dot, .pin-slot')) return;
        selectNote(n.id);
      },
    });
    row.appendChild(el('button', {
      class: `pin-slot${n.pinned ? ' on' : ''}`,
      onclick: (e) => { e.stopPropagation(); togglePin(n.id); },
      title: n.pinned ? 'unpin' : 'pin',
      aria: { label: n.pinned ? 'unpin note' : 'pin note' },
    }));
    row.appendChild(el('h3', { class: 't', text: noteTitle(n.body).toLowerCase() }));
    const ex = noteExcerpt(n.body);
    row.appendChild(el('p', { class: 'e', text: ex || '…' }));
    const meta = el('div', { class: 'm' }, el('span', { text: relativeTime(n.updated) }));
    tagsForNote(n).slice(0, 2).forEach(t => meta.appendChild(el('span', { text: `#${t}` })));
    row.appendChild(meta);
    root.appendChild(row);
  });
}

// ────────────────────────────────────────────────────────────
// Editor
// ────────────────────────────────────────────────────────────
function renderEditor() {
  const note = state.notes.find(n => n.id === state.selectedId);
  const body = $('#editor-body');
  const bar = $('#editor-bar');
  const panel = $('#info-panel');

  bar.replaceChildren();
  body.replaceChildren();
  panel.replaceChildren();

  if (!note) {
    body.appendChild(el('div', { class: 'kd-empty' },
      el('div', { class: 'kd-empty-title', text: 'no note selected.' }),
      el('button', { class: 'kd-empty-cta', onclick: createNote, text: 'new note' }),
    ));
    return;
  }

  // Editor bar
  const tags = tagsForNote(note);
  const tagWrap = el('div', { class: 'tags' });
  tags.forEach((t, i) => {
    if (i > 0) tagWrap.appendChild(el('span', { class: 'sep', text: '·' }));
    tagWrap.appendChild(el('span', { text: `#${t}` }));
  });
  if (!tags.length) tagWrap.appendChild(el('span', { class: 'sep', text: 'no tags — add with #tag in body' }));
  bar.appendChild(tagWrap);

  const tools = el('div', { class: 'tools' });
  tools.appendChild(el('button', {
    class: state.focus ? 'on' : '',
    onclick: () => setFocus(!state.focus),
    title: 'focus mode (⌘.)',
    text: 'focus',
  }));
  tools.appendChild(el('button', {
    class: state.typewriter ? 'on' : '',
    onclick: () => setTypewriter(!state.typewriter),
    title: 'typewriter scroll (⌘⇧.)',
    text: 'typewriter',
  }));
  tools.appendChild(el('button', {
    onclick: toggleTheme,
    title: 'theme (⌘⇧D)',
    style: { fontFamily: 'var(--font-display)', fontSize: '12px' },
    text: state.theme === 'dark' ? '◐' : '◑',
  }));
  tools.appendChild(el('button', { class: 'words', text: `${wordCount(note.body).toLocaleString()} words` }));
  tools.appendChild(el('button', {
    class: state.info ? 'on' : '',
    onclick: () => setInfo(!state.info),
    title: 'info (⌘I)',
    text: 'info',
  }));
  tools.appendChild(el('button', {
    class: 'trash',
    onclick: () => deleteNote(note.id),
    title: 'delete (⌘⌫)',
    aria: { label: 'delete note' },
    text: '×',
  }));
  bar.appendChild(tools);

  // Body — single-mode editor, contenteditable with live sentence spans
  const editor = el('div', {
    class: 'kd-editor',
    contenteditable: 'true',
    spellcheck: 'true',
    autocorrect: 'off',
    autocapitalize: 'off',
    'data-placeholder': 'start writing.',
  });
  const storedPos = editorCaret.has(note.id) ? editorCaret.get(note.id) : note.body.length;
  renderSentences(editor, note.body, storedPos);
  attachEditorHandlers(editor, note.id);
  body.appendChild(editor);
  requestAnimationFrame(() => {
    editor.focus();
    setCaretOffset(editor, storedPos);
    if (state.typewriter) scrollCaretLineToMiddle(editor);
  });

  // Info panel
  panel.classList.toggle('open', state.info);
  panel.appendChild(el('div', { class: 'kd-info-head' },
    el('span', { text: 'info' }),
    el('button', { onclick: () => setInfo(false), text: '×', aria: { label: 'close info' } }),
  ));
  const words = wordCount(note.body);
  const stats = el('div', { class: 'kd-info-stats' });
  stats.appendChild(el('div', { class: 'stat' }, el('span', { text: 'words' }), el('span', { class: 'v', text: String(words) })));
  stats.appendChild(el('div', { class: 'stat' }, el('span', { text: 'reading' }), el('span', { class: 'v', text: `~${readingTime(words)} min` })));
  stats.appendChild(el('div', { class: 'stat' }, el('span', { text: 'updated' }), el('span', { class: 'v', text: relativeTime(note.updated) })));
  stats.appendChild(el('div', { class: 'stat' }, el('span', { text: 'created' }), el('span', { class: 'v', text: new Date(note.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase() })));
  panel.appendChild(stats);

  const headings = (note.body || '').split('\n')
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => /^#{1,4}\s+/.test(l))
    .map(({ l }) => {
      const m = /^(#{1,4})\s+(.*)$/.exec(l);
      return { level: m[1].length, text: m[2] };
    });

  const tocWrap = el('div');
  tocWrap.appendChild(el('div', { class: 'kd-info-toc-label', text: 'contents' }));
  const toc = el('div', { class: 'kd-info-toc' });
  if (!headings.length) {
    toc.appendChild(el('div', { class: 'toc-row l1', style: { color: 'var(--fg-3)' }, text: '— no headings yet' }));
  } else {
    headings.forEach((h, i) => {
      const row = el('div', { class: `toc-row l${h.level}` });
      row.appendChild(el('span', { class: 'n', text: String(i + 1).padStart(2, '0') }));
      row.appendChild(document.createTextNode(h.text.toLowerCase()));
      toc.appendChild(row);
    });
  }
  tocWrap.appendChild(toc);
  panel.appendChild(tocWrap);
}

// Remember caret per note so switching away & back keeps the position
const editorCaret = new Map();

// ────────────────────────────────────────────────────────────
// Sentence splitter — per-line, on . ! ? boundaries
// ────────────────────────────────────────────────────────────
function splitLineSentences(lineText) {
  if (!lineText) return [{ text: '', start: 0 }];
  const parts = [];
  const rx = /(?<=[.!?])\s+(?=[A-Za-z#*_\[\-"])/g;
  let start = 0, m;
  while ((m = rx.exec(lineText))) {
    const end = m.index + m[0].length;
    parts.push({ text: lineText.slice(start, end), start });
    start = end;
  }
  if (start < lineText.length) parts.push({ text: lineText.slice(start), start });
  if (!parts.length) parts.push({ text: '', start: 0 });
  return parts;
}

// Each textual line becomes a <div class="kd-line"> so trailing newlines
// live between blocks (not inside text nodes) — avoids Chromium eating the
// terminal \n when caret sits at end of a text node.
function renderSentences(editor, text, caretOffset) {
  const lines = text.split('\n');
  const lineStarts = [];
  {
    let pos = 0;
    for (const l of lines) { lineStarts.push(pos); pos += l.length + 1; }
  }

  let activeLine = -1, activeSub = -1;
  if (caretOffset != null) {
    for (let i = 0; i < lines.length; i++) {
      const a = lineStarts[i], b = a + lines[i].length;
      if (caretOffset >= a && caretOffset <= b) {
        activeLine = i;
        const subs = splitLineSentences(lines[i]);
        for (let j = subs.length - 1; j >= 0; j--) {
          const sa = a + subs[j].start;
          const sb = sa + subs[j].text.length;
          if (caretOffset >= sa && caretOffset <= sb) { activeSub = j; break; }
        }
        if (activeSub < 0) activeSub = subs.length - 1;
        break;
      }
    }
  }

  const frag = document.createDocumentFragment();
  lines.forEach((lineText, lineIdx) => {
    const lineEl = document.createElement('div');
    let lineCls = 'kd-line';

    if (!lineText) {
      lineEl.className = lineCls + ' kd-line-blank';
      lineEl.appendChild(document.createElement('br'));
      frag.appendChild(lineEl);
      return;
    }

    let contentStart = 0;
    const bm = matchBlockMarker(lineText);
    if (bm) {
      const mkSpan = document.createElement('span');
      mkSpan.className = `kd-bm kd-bm-${bm.kind}${bm.level ? ` kd-bm-l${bm.level}` : ''}${bm.done ? ' kd-bm-done' : ''}`;
      mkSpan.textContent = bm.marker;
      lineEl.appendChild(mkSpan);
      contentStart = bm.marker.length;
      if (bm.kind === 'h') lineCls += ` kd-line-h${bm.level}`;
      else if (bm.kind === 'q') lineCls += ' kd-line-q';
      else if (bm.kind === 'task' && bm.done) lineCls += ' kd-line-done';
    }

    const restText = lineText.slice(contentStart);
    if (!restText) {
      lineEl.className = lineCls;
      frag.appendChild(lineEl);
      return;
    }

    const subs = splitLineSentences(restText);
    const pin = (state.pinned && state.pinned.noteId === state.selectedId) ? state.pinned : null;
    subs.forEach((sub, subIdx) => {
      const span = document.createElement('span');
      const isActive = (lineIdx === activeLine && subIdx === activeSub);
      const isPinned = pin && pin.lineIdx === lineIdx && pin.subIdx === subIdx;
      span.className = `kd-s${isActive ? ' on' : ''}${isPinned ? ' pin' : ''}`;
      appendInline(span, sub.text);
      lineEl.appendChild(span);
    });

    lineEl.className = lineCls;
    frag.appendChild(lineEl);
  });

  editor.replaceChildren(frag);
}

// ────────────────────────────────────────────────────────────
// Caret <-> text-offset (line-div aware)
// ────────────────────────────────────────────────────────────
function lineChildren(editor) {
  return [...editor.children].filter(c => c.classList && c.classList.contains('kd-line'));
}

function readEditorText(editor) {
  const lines = lineChildren(editor);
  if (!lines.length) return editor.textContent || '';
  return lines.map(l => l.textContent).join('\n');
}

function getCaretOffset(root) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.endContainer)) return null;

  const lines = lineChildren(root);
  if (!lines.length) {
    const pre = range.cloneRange();
    pre.selectNodeContents(root);
    pre.setEnd(range.endContainer, range.endOffset);
    return pre.toString().length;
  }

  let line = range.endContainer;
  while (line && line.parentNode !== root) line = line.parentNode;
  if (!line || !line.classList?.contains('kd-line')) return null;

  const inLine = range.cloneRange();
  inLine.selectNodeContents(line);
  inLine.setEnd(range.endContainer, range.endOffset);
  let offset = inLine.toString().length;
  for (const prev of lines) {
    if (prev === line) break;
    offset += prev.textContent.length + 1;
  }
  return offset;
}

function placeCaretInLine(line, pos) {
  const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT, null);
  let accum = 0, node;
  while ((node = walker.nextNode())) {
    const nlen = node.nodeValue.length;
    if (accum + nlen >= pos) {
      const range = document.createRange();
      range.setStart(node, Math.max(0, pos - accum));
      range.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    accum += nlen;
  }
  const range = document.createRange();
  range.selectNodeContents(line);
  range.collapse(false);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

function setCaretOffset(root, offset) {
  if (offset == null) return;
  const lines = lineChildren(root);
  if (!lines.length) return;
  let remaining = offset;
  for (const line of lines) {
    const len = line.textContent.length;
    if (remaining <= len) {
      placeCaretInLine(line, remaining);
      return;
    }
    remaining -= len + 1;
  }
  const last = lines[lines.length - 1];
  placeCaretInLine(last, last.textContent.length);
}

function scrollCaretLineToMiddle(editor) {
  const body = editor.closest('.kd-edit-body');
  if (!body) return;
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return;
  let line = sel.getRangeAt(0).endContainer;
  while (line && line.parentNode !== editor) line = line.parentNode;
  if (!line || !line.classList?.contains('kd-line')) return;
  const lineRect = line.getBoundingClientRect();
  const bodyRect = body.getBoundingClientRect();
  const lineMid = lineRect.top + lineRect.height / 2;
  const bodyMid = bodyRect.top + bodyRect.height / 2;
  body.scrollTop += lineMid - bodyMid;
}

// ────────────────────────────────────────────────────────────
// Editor input handlers
// ────────────────────────────────────────────────────────────
function getSelectionOffsets(editor) {
  const sel = window.getSelection();
  if (!sel || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  if (!editor.contains(range.startContainer) || !editor.contains(range.endContainer)) return null;

  const lines = lineChildren(editor);
  const toOffset = (container, off) => {
    if (!lines.length) {
      const pre = document.createRange();
      pre.selectNodeContents(editor);
      pre.setEnd(container, off);
      return pre.toString().length;
    }
    let line = container;
    while (line && line.parentNode !== editor) line = line.parentNode;
    if (!line || !line.classList?.contains('kd-line')) return null;
    const inLine = document.createRange();
    inLine.selectNodeContents(line);
    inLine.setEnd(container, off);
    let offset = inLine.toString().length;
    for (const prev of lines) {
      if (prev === line) break;
      offset += prev.textContent.length + 1;
    }
    return offset;
  };

  const s = toOffset(range.startContainer, range.startOffset);
  const e = toOffset(range.endContainer, range.endOffset);
  if (s == null || e == null) return null;
  return { start: Math.min(s, e), end: Math.max(s, e) };
}

function attachEditorHandlers(editor, id) {
  let lastActiveKey = '';

  const refresh = (saveCaret = true) => {
    const offset = getCaretOffset(editor);
    const text = readEditorText(editor);
    const note = state.notes.find(n => n.id === id);
    if (!note) return;
    const changed = note.body !== text;
    if (changed) {
      note.body = text;
      note.updated = Date.now();
      scheduleSave();
    }
    if (saveCaret && offset != null) editorCaret.set(id, offset);

    // Cheap key combining the active (lineIdx, subIdx) to avoid pointless re-renders
    const lines = text.split('\n');
    let activeLine = -1, activeSub = -1;
    if (offset != null) {
      let pos = 0;
      for (let i = 0; i < lines.length; i++) {
        const end = pos + lines[i].length;
        if (offset >= pos && offset <= end) {
          activeLine = i;
          const subs = splitLineSentences(lines[i]);
          for (let j = subs.length - 1; j >= 0; j--) {
            const sa = pos + subs[j].start;
            const sb = sa + subs[j].text.length;
            if (offset >= sa && offset <= sb) { activeSub = j; break; }
          }
          break;
        }
        pos = end + 1;
      }
    }
    const key = `${activeLine}:${activeSub}`;
    const needRender = changed || key !== lastActiveKey;
    lastActiveKey = key;
    if (needRender) {
      renderSentences(editor, text, offset);
      setCaretOffset(editor, offset);
    }
    if (changed) {
      renderList();
      renderSidebar();
      refreshBarLight(note);
    }
    if (state.typewriter) scrollCaretLineToMiddle(editor);
  };

  editor.__kdRefresh = refresh;

  const applyChange = (start, end, insertion) => {
    const text = readEditorText(editor);
    const newText = text.slice(0, start) + insertion + text.slice(end);
    const newOffset = start + insertion.length;
    const note = state.notes.find(n => n.id === id);
    if (note) {
      note.body = newText;
      note.updated = Date.now();
      scheduleSave();
      editorCaret.set(id, newOffset);
    }
    renderSentences(editor, newText, newOffset);
    setCaretOffset(editor, newOffset);
    if (note) {
      renderList();
      renderSidebar();
      refreshBarLight(note);
    }
    lastActiveKey = '';
  };

  editor.addEventListener('input', () => refresh(true));
  editor.addEventListener('keyup', (e) => {
    if (e.key.startsWith('Arrow') || ['Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
      refresh(true);
    }
  });
  editor.addEventListener('click', () => refresh(true));

  // Enter — explicit so browser quirks around block-element contenteditable never eat characters.
  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const sel = getSelectionOffsets(editor);
      if (!sel) return;
      applyChange(sel.start, sel.end, '\n');
    }
  });

  // Paste plain text only — route through the text model.
  editor.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData)?.getData('text/plain') || '';
    const sel = getSelectionOffsets(editor);
    if (!sel) return;
    applyChange(sel.start, sel.end, text);
  });
}

function refreshBarLight(note) {
  const bar = $('#editor-bar');
  const tagWrap = bar.querySelector('.tags');
  const wordsBtn = bar.querySelector('.words');
  if (tagWrap) {
    tagWrap.replaceChildren();
    const tags = tagsForNote(note);
    tags.forEach((t, i) => {
      if (i > 0) tagWrap.appendChild(el('span', { class: 'sep', text: '·' }));
      tagWrap.appendChild(el('span', { text: `#${t}` }));
    });
    if (!tags.length) tagWrap.appendChild(el('span', { class: 'sep', text: 'no tags — add with #tag in body' }));
  }
  if (wordsBtn) wordsBtn.textContent = `${wordCount(note.body).toLocaleString()} words`;
}

function selectNote(id) {
  if (state.selectedId === id) return;
  state.selectedId = id;
  state.pinned = null;
  persistPrefs();
  renderSidebar();
  renderList();
  renderEditor();
  $('#editor-body').scrollTop = 0;
}

function createNote() {
  const now = Date.now();
  const note = {
    id: genId(),
    body: '# ',
    pinned: false,
    tags: [],
    created: now,
    updated: now,
  };
  state.notes.unshift(note);
  state.selectedId = note.id;
  state.focus = false;
  editorCaret.set(note.id, note.body.length);
  persistPrefs();
  scheduleSave();
  renderSidebar();
  renderList();
  renderEditor();
}

function deleteNote(id) {
  const note = state.notes.find(n => n.id === id);
  if (!note) return;
  if (!confirm(`Delete “${noteTitle(note.body).toLowerCase()}”? this cannot be undone.`)) return;
  const idx = state.notes.findIndex(n => n.id === id);
  state.notes.splice(idx, 1);
  editorCaret.delete(id);
  if (state.selectedId === id) {
    state.selectedId = state.notes[Math.min(idx, state.notes.length - 1)]?.id || null;
  }
  persistPrefs();
  scheduleSave();
  renderSidebar();
  renderList();
  renderEditor();
}

function togglePin(id) {
  const note = state.notes.find(n => n.id === id);
  if (!note) return;
  note.pinned = !note.pinned;
  scheduleSave();
  renderSidebar();
  renderList();
}

function setFocus(v) {
  state.focus = v;
  $('.kern.kd').classList.toggle('focus-on', v);
  renderEditor();
}
function setInfo(v) { state.info = v; renderEditor(); }
function setTypewriter(v) {
  state.typewriter = v;
  $('.kern.kd').classList.toggle('typewriter-on', v);
  persistPrefs();
  renderEditor();
}
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  document.body.dataset.theme = state.theme;
  persistPrefs();
  renderEditor();
}

function togglePinAtCaret() {
  const editor = $('.kd-editor');
  if (!editor) return;
  const offset = getCaretOffset(editor);
  if (offset == null) return;
  const text = readEditorText(editor);
  const lines = text.split('\n');
  let pos = 0, line = -1, sub = -1;
  for (let i = 0; i < lines.length; i++) {
    const end = pos + lines[i].length;
    if (offset >= pos && offset <= end) {
      line = i;
      const subs = splitLineSentences(lines[i]);
      for (let j = subs.length - 1; j >= 0; j--) {
        const sa = pos + subs[j].start;
        const sb = sa + subs[j].text.length;
        if (offset >= sa && offset <= sb) { sub = j; break; }
      }
      if (sub < 0) sub = Math.max(0, subs.length - 1);
      break;
    }
    pos = end + 1;
  }
  if (line < 0) return;
  const p = state.pinned;
  if (p && p.noteId === state.selectedId && p.lineIdx === line && p.subIdx === sub) {
    state.pinned = null;
  } else {
    state.pinned = { noteId: state.selectedId, lineIdx: line, subIdx: sub };
  }
  editor.__kdRefresh?.(false);
  if (!editor.__kdRefresh) renderSentences(editor, text, offset);
}

function clearPinned() {
  if (!state.pinned) return;
  state.pinned = null;
  const editor = $('.kd-editor');
  if (editor?.__kdRefresh) editor.__kdRefresh(false);
}

function focusTagFilter() {
  const input = $('.kd-side-filter input');
  if (!input) return;
  input.focus();
  input.select();
}
function clearTagFilter() {
  state.tagFilter = '';
  renderSidebar();
  const input = $('.kd-side-filter input');
  input?.blur();
}

// ────────────────────────────────────────────────────────────
// Keyboard
// ────────────────────────────────────────────────────────────
window.addEventListener('keydown', (e) => {
  const target = e.target;
  const inText = target && (target.matches('input, textarea') || target.isContentEditable);
  const mod = e.metaKey || e.ctrlKey;

  if (mod && e.key === 'n' && !e.shiftKey) { e.preventDefault(); createNote(); return; }
  if (mod && e.key === '.' && e.shiftKey) { e.preventDefault(); setTypewriter(!state.typewriter); return; }
  if (mod && e.key === '.' && !e.shiftKey) { e.preventDefault(); setFocus(!state.focus); return; }
  if (mod && (e.key === 'l' || e.key === 'L')) { e.preventDefault(); togglePinAtCaret(); return; }
  if (mod && (e.key === 't' || e.key === 'T') && !e.shiftKey) { e.preventDefault(); focusTagFilter(); return; }
  if (mod && (e.key === 'p' || e.key === 'P') && !e.shiftKey) { e.preventDefault(); window.print(); return; }
  if (mod && (e.key === 'i' || e.key === 'I')) { e.preventDefault(); setInfo(!state.info); return; }
  if (mod && e.shiftKey && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); toggleTheme(); return; }
  if (mod && (e.key === 'Backspace' || e.key === 'Delete')) {
    e.preventDefault();
    if (state.selectedId) deleteNote(state.selectedId);
    return;
  }

  if (e.key === 'Escape') {
    if (state.info) { setInfo(false); return; }
    if (state.focus) { setFocus(false); return; }
    if (state.pinned) { clearPinned(); return; }
    if (state.tagFilter) { clearTagFilter(); return; }
  }

  if (!inText && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    e.preventDefault();
    const list = sortedNotes().filter(n => noteMatchesTag(n, state.selectedTag));
    const idx = list.findIndex(n => n.id === state.selectedId);
    if (idx < 0) return;
    const next = e.key === 'ArrowDown' ? Math.min(list.length - 1, idx + 1) : Math.max(0, idx - 1);
    selectNote(list[next].id);
  }
});

// Save on close
window.addEventListener('beforeunload', () => {
  clearTimeout(saveTimer);
  saveNotes(state.notes);
  persistPrefs();
});

// Keep relative times fresh
setInterval(() => {
  if (document.hidden) return;
  renderList();
}, 60_000);

// ────────────────────────────────────────────────────────────
// Boot
// ────────────────────────────────────────────────────────────
document.body.dataset.theme = state.theme;
if (state.typewriter) $('.kern.kd').classList.add('typewriter-on');
renderSidebar();
renderList();
renderEditor();

// Expose for testing / debugging
window.__kern = { state };
