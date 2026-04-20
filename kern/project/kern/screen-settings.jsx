// Kern — Settings + Sidebar (tag drawer) screens

function KernSettingsScreen({ dark = false }) {
  const seg = (items, active) => (
    <div className="seg">
      {items.map(i => <span key={i} className={i === active ? 'on' : ''}>{i}</span>)}
    </div>
  );

  return (
    <div className="kern" style={{ height: '100%', background: 'var(--bg)', color: 'var(--fg)', overflow: 'auto' }}>
      <div className="kern-header" style={{ paddingBottom: 8 }}>
        <div className="wm">settings.</div>
        <div className="count">kern 1.0</div>
      </div>

      <div className="kern-settings">
        <div className="section-head">typography</div>
        <div className="row">
          <span className="row-label">font</span>
          {seg(['mono', 'duo', 'serif'], 'mono')}
        </div>
        <div className="row">
          <span className="row-label">size</span>
          <span className="row-val">15 / 18 / 21</span>
        </div>
        <div className="row">
          <span className="row-label">measure</span>
          <span className="row-val">64 ch</span>
        </div>

        <div className="section-head">appearance</div>
        <div className="row">
          <span className="row-label">theme</span>
          {seg(['light', 'dark', 'system'], dark ? 'dark' : 'light')}
        </div>
        <div className="row">
          <span className="row-label">cursor</span>
          <span style={{
            display: 'inline-block', width: 20, height: 2,
            background: 'var(--accent)', transform: 'translateY(-2px)',
          }} />
        </div>

        <div className="section-head">editor</div>
        <div className="row">
          <span className="row-label">focus mode — default</span>
          {seg(['off', 'on'], 'off')}
        </div>
        <div className="row">
          <span className="row-label">syntax marks</span>
          {seg(['hide', 'show'], 'show')}
        </div>

        <div className="section-head">export</div>
        <div className="row">
          <span className="row-label">default format</span>
          {seg(['md', 'pdf', 'txt'], 'md')}
        </div>

        <div className="section-head">storage</div>
        <div className="row">
          <span className="row-label">location</span>
          <span className="row-val">on device</span>
        </div>
        <div className="row">
          <span className="row-label">notes</span>
          <span className="row-val">{KERN_NOTES.length} · 18.4 kb</span>
        </div>

        <div style={{
          padding: '28px 24px 40px',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--fg-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          lineHeight: 1.6,
        }}>
          no account. no cloud.<br/>
          notes are plain .md files.
        </div>
      </div>
    </div>
  );
}

function KernSidebarScreen({ dark = false }) {
  const pinned = KERN_NOTES.filter(n => n.pinned);
  // collect tags, flat + nested
  const all = {};
  KERN_NOTES.forEach(n => n.tags.forEach(t => all[t] = (all[t] || 0) + 1));
  const flat = Object.keys(all).filter(t => !t.includes('/')).sort();
  const nestedRoots = [...new Set(Object.keys(all).filter(t => t.includes('/')).map(t => t.split('/')[0]))];

  return (
    <div className="kern" style={{ height: '100%', background: 'var(--bg)', color: 'var(--fg)', overflow: 'auto' }}>
      <div className="kern-drawer">
        <div style={{
          marginBottom: 32,
          fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '-0.02em',
        }}>kern.</div>

        <div className="kern-drawer-section">
          <h2>pinned</h2>
          {pinned.map(n => (
            <div key={n.id} style={{
              fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--fg)',
              padding: '8px 0', borderBottom: '1px solid var(--rule)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {noteTitle(n.body).toLowerCase()}
            </div>
          ))}
        </div>

        <div className="kern-drawer-section">
          <h2>tags</h2>
          {flat.map(t => (
            <div key={t} className="tag">
              <span>#{t}</span>
              <span className="count">{all[t]}</span>
            </div>
          ))}
        </div>

        {nestedRoots.map(root => (
          <div key={root} className="kern-drawer-section">
            <h2>#{root}</h2>
            {Object.keys(all).filter(t => t.startsWith(root + '/')).sort().map(t => (
              <div key={t} className="tag nested">
                <span>/{t.split('/').slice(1).join('/')}</span>
                <span className="count">{all[t]}</span>
              </div>
            ))}
          </div>
        ))}

        <div style={{
          marginTop: 40,
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--fg-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>settings ↗</div>
      </div>
    </div>
  );
}

Object.assign(window, { KernSettingsScreen, KernSidebarScreen });
