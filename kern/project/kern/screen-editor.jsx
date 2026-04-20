// Kern — Editor screen (focus mode, inline markdown, info panel variants)

function KernEditorScreen({
  dark = false,
  note = KERN_NOTES[1], // atlas HL7 note — rich content
  focus = false,
  infoPanel = false,
}) {
  // in focus mode, we spotlight a sentence in a specific paragraph block.
  // must be a real paragraph (not heading/quote/list/task/blank) because those
  // don't go through the sentence splitter.
  const lines = note.body.split('\n');
  let activeIdx = -1;
  if (focus) {
    const isPara = (l) => l.trim() && !/^#{1,4}\s+/.test(l) && !/^>/.test(l)
      && !/^\s*-\s+/.test(l) && !/^\s*\d+\.\s+/.test(l) && !/^---\s*$/.test(l);
    // prefer a multi-sentence paragraph so the dimming is visible
    for (let i = 0; i < lines.length; i++) {
      if (isPara(lines[i]) && /[.!?]\s+\S/.test(lines[i])) { activeIdx = i; break; }
    }
    if (activeIdx === -1) activeIdx = lines.findIndex(isPara);
  }

  const word_count = note.body.replace(/[#>\-\[\]*_`]/g, '').split(/\s+/).filter(Boolean).length;
  const char_count = note.body.replace(/\s+/g, ' ').length;
  const reading = Math.max(1, Math.round(word_count / 220));
  const headings = lines
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => /^#{1,4}\s+/.test(l))
    .map(({ l, i }) => {
      const m = /^(#{1,4})\s+(.*)$/.exec(l);
      return { level: m[1].length, text: m[2], i };
    });
  const tagsInNote = [...new Set(note.tags)];

  return (
    <div className="kern" style={{
      height: '100%', background: 'var(--bg)', color: 'var(--fg)',
      display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden',
    }}>
      {/* top micro-status bar (in-app, sits under platform status) */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '18px 24px 8px',
        fontFamily: 'var(--font-mono)', fontSize: 11,
        color: 'var(--fg-3)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        <span>← library</span>
        <span>{note.tags[0] ? `#${note.tags[0]}` : ''}</span>
        <span>⋯</span>
      </div>

      {/* body */}
      <div style={{
        flex: 1, overflow: 'auto',
        padding: '8px 28px 20px',
      }}>
        <MarkdownBody source={note.body} focus={focus} activeIdx={activeIdx} />
        {/* cursor visible at the end of the active line or after text */}
        {!focus && <span className="kern-cursor" />}
      </div>

      {/* bottom toolbar */}
      <div className="kern-toolbar">
        <span className="tb-item">#tag</span>
        <span className="tb-item">Aa</span>
        <span className={`tb-item ${focus ? 'tb-active' : ''}`}>
          {focus && <span className="tb-dot" />}
          focus
        </span>
        <span className="tb-item" style={{ flex: 1 }}></span>
        <span className="tb-item">⋯</span>
      </div>

      {/* Info panel slide-over */}
      {infoPanel && (
        <div className="kern-info">
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            marginBottom: 24,
          }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 11,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              color: 'var(--fg-2)',
            }}>info</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--fg-2)' }}>×</div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <div className="stat-row">
              <span className="stat-label">words</span>
              <span className="stat-val">{word_count}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">characters</span>
              <span className="stat-val">{char_count}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">reading</span>
              <span className="stat-val">~{reading} min</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">modified</span>
              <span className="stat-val">{note.updated}</span>
            </div>
          </div>

          <h2>tags</h2>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg)', marginBottom: 28 }}>
            {tagsInNote.map(t => (
              <div key={t} style={{ padding: '6px 0', borderBottom: '1px solid var(--rule)' }}>
                #{t}
              </div>
            ))}
          </div>

          <h2>contents</h2>
          <div>
            {headings.map((h, i) => (
              <div key={i} style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                color: h.level === 1 ? 'var(--fg)' : 'var(--fg-2)',
                padding: '6px 0',
                paddingLeft: (h.level - 1) * 16,
                letterSpacing: 0,
              }}>
                <span style={{ color: 'var(--fg-3)', marginRight: 8 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {h.text.toLowerCase()}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { KernEditorScreen });
