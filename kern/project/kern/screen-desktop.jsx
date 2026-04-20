// Kern desktop — three-pane window (tags · list · editor)

function KernDesktop({ dark = false, note = KERN_NOTES[0], focus = false, infoPanel = false, selectedId }) {
  const notes = KERN_NOTES;
  const pinned = notes.filter(n => n.pinned);
  const all = {};
  notes.forEach(n => n.tags.forEach(t => all[t] = (all[t] || 0) + 1));
  const flat = Object.keys(all).filter(t => !t.includes('/')).sort();
  const nestedRoots = [...new Set(Object.keys(all).filter(t => t.includes('/')).map(t => t.split('/')[0]))];
  const selId = selectedId || note.id;

  // focus idx
  let activeIdx = -1;
  if (focus) {
    const lines = note.body.split('\n');
    const isPara = (l) => l.trim() && !/^#{1,4}\s+/.test(l) && !/^>/.test(l)
      && !/^\s*-\s+/.test(l) && !/^\s*\d+\.\s+/.test(l) && !/^---\s*$/.test(l);
    for (let i = 0; i < lines.length; i++) {
      if (isPara(lines[i]) && /[.!?]\s+\S/.test(lines[i])) { activeIdx = i; break; }
    }
    if (activeIdx === -1) activeIdx = lines.findIndex(isPara);
  }

  const lines = note.body.split('\n');
  const headings = lines
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => /^#{1,4}\s+/.test(l))
    .map(({ l, i }) => {
      const m = /^(#{1,4})\s+(.*)$/.exec(l);
      return { level: m[1].length, text: m[2], i };
    });
  const wc = note.body.replace(/[#>\-\[\]*_`]/g, '').split(/\s+/).filter(Boolean).length;

  return (
    <div className="kern kd" data-theme={dark ? 'dark' : 'light'}>
      {/* Sidebar */}
      <div className="kd-col kd-side">
        <div className="kd-brand">
          <span>kern.</span>
          <span className="ver">1.0</span>
        </div>

        <h2>pinned</h2>
        {pinned.map(n => (
          <div key={n.id} className="row pin">
            {noteTitle(n.body).toLowerCase()}
          </div>
        ))}

        <h2>tags</h2>
        {flat.map(t => (
          <div key={t} className={`row ${t === 'writing' ? 'sel' : ''}`} style={{ position: 'relative' }}>
            <span>#{t}</span>
            <span className="c">{all[t]}</span>
          </div>
        ))}

        {nestedRoots.map(root => (
          <div key={root}>
            <h2>#{root}</h2>
            {Object.keys(all).filter(t => t.startsWith(root + '/')).sort().map(t => (
              <div key={t} className="row nested">
                <span>/{t.split('/').slice(1).join('/')}</span>
                <span className="c">{all[t]}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Middle list */}
      <div className="kd-col kd-list">
        <div className="kd-list-head">
          <span className="title">library</span>
          <span className="meta">{notes.length} · sorted by modified</span>
        </div>
        {notes.map(n => (
          <div key={n.id} className={`kd-list-row ${n.id === selId ? 'sel' : ''}`}>
            {n.pinned && <div className="pin-dot" />}
            <h3 className="t">{noteTitle(n.body).toLowerCase()}</h3>
            <p className="e">{noteExcerpt(n.body)}</p>
            <div className="m">
              <span>{n.updated}</span>
              {n.tags.slice(0, 2).map(t => <span key={t}>#{t}</span>)}
            </div>
          </div>
        ))}
      </div>

      {/* Editor */}
      <div className="kd-col kd-edit" style={{ position: 'relative' }}>
        <div className="kd-edit-bar">
          <span>
            {note.tags.map(t => `#${t}`).join('  ·  ')}
          </span>
          <span className="tools">
            <span className={focus ? 'on' : ''}>focus</span>
            <span>Aa</span>
            <span>{wc} words</span>
            <span>info</span>
          </span>
        </div>
        <div className="kd-edit-body">
          <MarkdownBody source={note.body} focus={focus} activeIdx={activeIdx} />
          {!focus && <span className="kern-cursor" />}
        </div>

        {infoPanel && (
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: 300,
            background: 'var(--bg)', borderLeft: '1px solid var(--rule)',
            padding: '24px 28px', overflow: 'auto',
            display: 'flex', flexDirection: 'column', gap: 20,
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontFamily: 'var(--font-mono)', fontSize: 10,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              color: 'var(--fg-3)',
            }}>
              <span>info</span>
              <span>×</span>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-2)', display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--rule)' }}>
                <span>words</span><span style={{ color: 'var(--fg)' }}>{wc}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-2)', display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--rule)' }}>
                <span>reading</span><span style={{ color: 'var(--fg)' }}>~{Math.max(1, Math.round(wc / 220))} min</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-2)', display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--rule)' }}>
                <span>modified</span><span style={{ color: 'var(--fg)' }}>{note.updated}</span>
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--fg-3)', marginBottom: 8 }}>contents</div>
              {headings.map((h, i) => (
                <div key={i} style={{
                  fontFamily: 'var(--font-mono)', fontSize: 12,
                  color: h.level === 1 ? 'var(--fg)' : 'var(--fg-2)',
                  padding: '5px 0', paddingLeft: (h.level - 1) * 14,
                  letterSpacing: 0,
                }}>
                  <span style={{ color: 'var(--fg-3)', marginRight: 8 }}>{String(i + 1).padStart(2, '0')}</span>
                  {h.text.toLowerCase()}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Minimal macOS-style chrome — ERIAD flavor: flat, hairlines, traffic lights only
function KernMacWindow({ width = 1280, height = 800, dark = false, children }) {
  return (
    <div style={{
      width, height,
      background: dark ? '#0E0E10' : '#FAFAF7',
      border: `1px solid ${dark ? '#2A2A2E' : '#E8E8E3'}`,
      borderRadius: 10,
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 40px 100px rgba(0,0,0,0.18), 0 0 0 0.5px rgba(0,0,0,0.08)',
    }}>
      {/* titlebar */}
      <div style={{
        height: 36, flexShrink: 0,
        borderBottom: `1px solid ${dark ? '#2A2A2E' : '#E8E8E3'}`,
        display: 'flex', alignItems: 'center', padding: '0 14px',
        position: 'relative',
        background: dark ? '#0E0E10' : '#FAFAF7',
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['#ff5f57', '#febc2e', '#28c840'].map(c => (
            <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c, border: '0.5px solid rgba(0,0,0,0.1)' }} />
          ))}
        </div>
        <div style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: dark ? '#9A9A9E' : '#6B6B70',
          textTransform: 'uppercase', letterSpacing: '0.1em',
        }}>kern</div>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}

Object.assign(window, { KernDesktop, KernMacWindow });
