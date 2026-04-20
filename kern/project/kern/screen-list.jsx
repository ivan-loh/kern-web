// Kern — List screen (Note library)

function KernListScreen({ dark = false, platform = 'ios' }) {
  const notes = KERN_NOTES;
  const pinned = notes.filter(n => n.pinned);
  const rest = notes.filter(n => !n.pinned);
  const showSwipe = true; // demonstrate swipe-left delete on one row

  const row = (n, key, opts = {}) => (
    <div key={key} className="kern-row" style={opts.swiped ? { transform: 'translateX(-88px)', transition: 'transform 400ms cubic-bezier(0.22,1,0.36,1)' } : {}}>
      {n.pinned && <div className="kern-row-pin" title="pinned" />}
      <h3 className="kern-row-title">{noteTitle(n.body).toLowerCase()}</h3>
      <p className="kern-row-excerpt">{noteExcerpt(n.body)}</p>
      <div className="kern-row-meta">
        <span>{n.updated}</span>
        {n.tags.length > 0 && (
          <span style={{ color: 'var(--fg-3)' }}>
            {n.tags.map(t => `#${t}`).join('  ')}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="kern" style={{ height: '100%', background: 'var(--bg)', color: 'var(--fg)', position: 'relative', overflow: 'hidden' }}>
      <div className="kern-header">
        <div className="wm">kern.</div>
        <div className="count">{notes.length.toString().padStart(2, '0')} notes</div>
      </div>

      <div className="kern-search">
        <span className="hint" style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-3)' }}>⌕</span>
        <div className="kern-search-input" style={{ color: 'var(--fg-3)' }}>search — pull down</div>
        <span className="hint">⌘K</span>
      </div>

      {/* Pinned section header */}
      <div style={{
        padding: '18px 28px 6px',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--fg-3)',
      }}>pinned</div>

      {pinned.map((n, i) => row(n, `p-${i}`))}

      <div style={{
        padding: '18px 28px 6px',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: 'var(--fg-3)',
      }}>all</div>

      {/* one row shown mid-swipe to demonstrate */}
      <div style={{ position: 'relative' }}>
        <div className="kern-row-swipe-action" style={{ right: 0 }}>delete</div>
        {row(rest[0], 'r-0', { swiped: true })}
      </div>

      {rest.slice(1).map((n, i) => row(n, `r-${i + 1}`))}

      {/* FAB */}
      <button className="kern-fab" style={{ border: 'none', cursor: 'pointer' }}>+</button>
    </div>
  );
}

Object.assign(window, { KernListScreen });
