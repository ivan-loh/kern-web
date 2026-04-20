// Shared bits for Kern screens — editor content, markdown rendering with visible syntax marks,
// focus-mode dimming by SENTENCE, tag extraction, TOC, etc.

// ---------- Seed notes ----------
// Richer content — essays, engineering specs, meeting notes, reading, fragments.
// Exercises the full range of markdown so the demo reads like a real writer's library.

const KERN_NOTES = [
  {
    id: 'n-rates',
    pinned: true,
    tags: ['writing', 'essay/rates'],
    updated: 'now',
    body: [
      '# on rates, and the quiet form of trust',
      '',
      'i used to think pricing was a spreadsheet problem. it is not. it is a trust problem wearing a number.',
      '',
      'the price you quote is a sentence about how much of your year you are willing to spend on someone else\'s problem. anyone who argues it is arguing with the sentence, not the math. a discount, carelessly given, is a retraction of the sentence — and retractions are remembered longer than the number.',
      '',
      '## three rules i keep coming back to',
      '',
      '- **quote the scope, not the hour.** hours are a measure of cost; scope is a measure of value. clients who ask for hours are looking for someone to manage; clients who ask for scope are looking for someone to trust.',
      '- **never discount without removing something.** if the number moves, the work must move with it. otherwise you teach the client that your quote was a first draft.',
      '- **write the number down before the meeting.** say it flatly, without a ladder of justifications. the number is the work. #rule',
      '',
      '> "cheap work finds you again later." — margaret, 2019',
      '',
      'there is a kind of dignity in a plain number, stated once, held through the meeting. it is not bravado and it is not stubbornness. it is the simplest form of respect for the thing you are about to build.',
      '',
      'the rest is follow-through.',
    ].join('\n'),
  },
  {
    id: 'n-hl7',
    pinned: true,
    tags: ['project/atlas', 'hl7', 'fhir'],
    updated: '11:04',
    body: [
      '# atlas — hl7 → fhir migration plan',
      '',
      'meeting with j. and the platform team on tuesday. they want a **timeline, not a proposal**. the ask is honest: eighteen months of pilot data, one claims backlog, and a compliance review that starts in may. we will not rebuild the intake layer; we will wrap it.',
      '',
      '## phase 01 — discovery',
      '',
      '- [x] shadow the intake desk for one shift (thursday, 7am)',
      '- [x] pull a week of `ADT^A01` feeds, anonymise',
      '- [ ] map `PID-3` assigning authorities → `Patient.identifier.system`',
      '- [ ] confirm sending-facility list with compliance',
      '- [ ] document the three known edge cases in the `MSH-4` field',
      '',
      '## phase 02 — build',
      '',
      '- [ ] mirth channel, staging only',
      '- [ ] golden-file tests, one per message type',
      '- [ ] `fhir_ig_validator` wired into CI on every PR',
      '- [ ] shadow-write to the FHIR store for two weeks before cutover',
      '',
      '## phase 03 — ship',
      '',
      '- [ ] dual-write window — minimum four weeks',
      '- [ ] reconciliation report, daily, emailed to j.',
      '- [ ] rollback playbook reviewed by _both_ ops leads',
      '',
      '## risks worth naming',
      '',
      '1. the vendor\'s `ORM^O01` dialect differs from the spec in three places; we own the translation.',
      '2. compliance has not signed off on the staging environment; block on this before week four.',
      '3. the audit log format is still under debate. default to `ndjson` and move on.',
      '',
      '> next review: fri 09:00, room 2b.',
      '',
      'estimate: **twelve weeks** from signed sow. buffer of two. after that we\'re borrowing time from ourselves. #project/atlas',
    ].join('\n'),
  },
  {
    id: 'n-tues',
    pinned: false,
    tags: ['meeting', 'project/meridian'],
    updated: 'yesterday',
    body: [
      '# tues standup — meridian',
      '',
      'present: a., k., p., me. p. out thursday, covered by a.',
      '',
      '## what moved',
      '',
      '- k. finished the claims parser; moving to reconciliation. handed off the fixtures cleanly, no tribal knowledge left on desktops.',
      '- a. blocked on SFTP creds from the client — escalating to j. this is the third week; we should set a hard deadline.',
      '- p. will draft the rollback doc before eod. short version, printed and signed, not a wiki page.',
      '',
      '## decisions',
      '',
      '1. freeze scope on the reconciliation view until the 30th. anything proposed after today goes to v2.',
      '2. audit log goes to s3, not the db. cheaper, append-only, and compliance already knows the bucket. #decision',
      '3. postpone the `export` feature to v2 — no user has asked for it and two have asked for import.',
      '',
      '## open threads',
      '',
      '- k. wants a pairing hour on the reconciliation query plan. wednesday after lunch.',
      '- the flaky test on `parse_remit_v3` is back. one of us owes it a proper afternoon.',
      '',
      '> next standup: thursday, 9.30. p. out, a. runs it.',
    ].join('\n'),
  },
  {
    id: 'n-reading',
    pinned: false,
    tags: ['reading', 'research'],
    updated: 'mon',
    body: [
      '# reading list — q2',
      '',
      'short list. anything longer i will not finish.',
      '',
      '- [ ] _the timeless way of building_ — alexander. bought in march, still on the pile. read slow, one pattern a night.',
      '- [x] _seeing like a state_ — scott. the best thing i read this year. legibility is not a feature; it is a tax.',
      '- [ ] _high output management_ — grove. reread. mark up the chapter on meetings.',
      '- [ ] papers on `CRDT` merge semantics #research — specifically the yjs work and automerge\'s 2023 retrospective.',
      '- [ ] _the design of everyday things_ — norman. skim only; i have read it twice.',
      '- [x] _a pattern language_ — alexander et al. reread pattern 159.',
      '',
      '## how i am reading',
      '',
      '- morning, twenty minutes, no phone on the desk.',
      '- margin notes in pencil. pen feels too final.',
      '- one sentence into the note app at the end of each session — the one sentence i would tell a friend.',
      '',
      'if a book does not change how i work by chapter three, i stop. there is no prize for finishing a book that does not owe you anything.',
    ].join('\n'),
  },
  {
    id: 'n-grocery',
    pinned: false,
    tags: ['todo'],
    updated: 'sat',
    body: [
      '# saturday',
      '',
      '- [ ] coffee — the ethiopian, not the blend',
      '- [ ] butter, unsalted',
      '- [x] bread, sourdough from the corner',
      '- [ ] lemons (3) and one lime, if they have them',
      '- [ ] tomatoes — on the vine, still warm if possible',
      '- [ ] call mum',
      '- [ ] drop the jacket at the tailor',
      '',
      'library closes at 5. if i am late it will be another week.',
    ].join('\n'),
  },
  {
    id: 'n-glyph',
    pinned: false,
    tags: ['writing', 'fragment'],
    updated: 'fri',
    body: [
      '# a fragment, for later',
      '',
      'a glyph is a small contract between a reader and a writer. it says: _i will give you this shape, and you will give me that sound_. the contract is invisible when it works and terrible when it does not.',
      '',
      'when the contract is good, the reading is invisible. when it is bad, the eye trips on every other word. a good face is one you never notice; a bad face is one you cannot stop noticing.',
      '',
      '## on kerning',
      '',
      'kerning is the apology a typographer makes for the alphabet. the letters were never going to fit. someone had to close the gaps.',
      '',
      '> design is just the contract, written very slowly.',
      '',
      'save this. use it somewhere — maybe the about page. maybe nowhere.',
    ].join('\n'),
  },
  {
    id: 'n-audit',
    pinned: false,
    tags: ['project/atlas', 'compliance'],
    updated: 'thu',
    body: [
      '# soc-2 audit — prep notes',
      '',
      'auditor arrives **12 may**. three things they will ask for, and we are short on one.',
      '',
      '1. access-review evidence, last two quarters. we have it, but it lives in three tools. consolidate by friday.',
      '2. incident postmortems — at least one with a blameless tone. we are short one.',
      '3. vendor list with data-processing addendums signed within the last year. missing two; chasing.',
      '',
      '## the missing postmortem',
      '',
      'write one from the **feb 14 page-out**. the facts: the on-call pager fired at 03:12, resolved at 04:48, no customer data touched. the lesson: our alert thresholds did not match reality after the march deploy.',
      '',
      '- [ ] draft by monday. one page.',
      '- [ ] circulate to k. and p. for tone',
      '- [ ] file under `/incidents/2026-02-14.md` #todo',
      '',
      '---',
      '',
      '> "if the auditor finds it, you will find it twice." — ops handbook, 2021',
    ].join('\n'),
  },
  {
    id: 'n-meridian-kickoff',
    pinned: false,
    tags: ['project/meridian', 'meeting'],
    updated: 'wed',
    body: [
      '# meridian — kickoff prep',
      '',
      'first meeting with the whole team on monday, 10am. sixty minutes. do not let it run over.',
      '',
      '## the agenda i will actually use',
      '',
      '1. fifteen minutes: what the product does, in their words, not ours.',
      '2. fifteen minutes: the three failure modes of the previous build.',
      '3. twenty minutes: draw the new data flow on the board, together.',
      '4. ten minutes: decide the first two weeks of work.',
      '',
      'no slides. if i cannot draw it in a marker, i do not understand it yet.',
      '',
      '## questions to hold in reserve',
      '',
      '- who owns the claims schema after go-live?',
      '- what does failure look like in month six?',
      '- what is the _one_ report the head of finance opens every monday?',
      '',
      '> short meetings, sharp notes.',
    ].join('\n'),
  },
  {
    id: 'n-interview',
    pinned: false,
    tags: ['hiring'],
    updated: 'wed',
    body: [
      '# interview — r. (staff eng, platform)',
      '',
      'strong. the kind of strong that is hard to see in a single hour.',
      '',
      '## signal',
      '',
      '- read the prompt twice before typing. not a nervous habit — a working habit.',
      '- talked about a rollback like someone who has written one in anger.',
      '- described a failed migration _without_ blaming the previous team. rare.',
      '',
      '## noise',
      '',
      '- overindexed on `kubernetes` in the architecture question. we are not that shop.',
      '- the writing sample was tidy but thin. ask for a longer one.',
      '',
      '## recommendation',
      '',
      '- [x] progress to on-site',
      '- [ ] pair on a real bug, not a contrived exercise',
      '- [ ] schedule the architecture deep-dive with j.',
      '',
      '> "hire for the second year, not the first three months." #rule',
    ].join('\n'),
  },
  {
    id: 'n-studio',
    pinned: false,
    tags: ['writing', 'essay/studio'],
    updated: 'tue',
    body: [
      '# notes toward a studio of three',
      '',
      'three is the number. two is a partnership, which is a different thing. four is a company, which is a different thing again. three is a studio — enough cover for illness, enough room for disagreement, too small to hide in.',
      '',
      '## what a studio of three owes itself',
      '',
      '- a weekly hour where nobody talks about work.',
      '- a shared document that is _only_ updated when something changes.',
      '- a rule about who decides when two agree and one does not.',
      '',
      '## what it owes its clients',
      '',
      'an invoice on the day. a draft on the day. a name at the bottom of every email — not the company, the person.',
      '',
      '> small, slow, specific.',
    ].join('\n'),
  },
  {
    id: 'n-errata',
    pinned: false,
    tags: ['writing', 'errata'],
    updated: 'mon',
    body: [
      '# errata — things i got wrong this year',
      '',
      'a running list. the point is not penance; the point is to notice the pattern.',
      '',
      '1. **quoted a fixed fee on a scope that was not fixed.** cost: four weeks. lesson: refuse the number until the scope is on paper.',
      '2. **hired for speed instead of judgment.** cost: two months of rework. lesson: the fast person who ships the wrong thing costs more than the slow person who ships the right thing.',
      '3. **skipped a postmortem because "everyone knew what happened."** cost: the next outage, which was the same outage. lesson: the postmortem is for the _next_ team, not this one.',
      '',
      '---',
      '',
      '> the only useful mistake is the one you write down.',
    ].join('\n'),
  },
  {
    id: 'n-commute',
    pinned: false,
    tags: ['fragment'],
    updated: 'sun',
    body: [
      '# seen on the commute',
      '',
      'a woman on the 38 bus reading a paperback with the cover torn off. she had wrapped it in brown paper and written the title on the paper in pencil. the title was in a language i did not recognise. she was most of the way through.',
      '',
      'i think about this more than i should.',
    ].join('\n'),
  },
];

// ---------- Markdown → spans (iA Writer "visible syntax" style) ----------
// Every markdown mark stays visible, rendered in --fg-3 (mid-grey).
// The content is rendered in --fg. Inline styling (bold, italic, code, link, strike) is real.
// Block types: h1-4, blockquote, hr, ul/ol, tasks, p.

function renderInline(text, key = 0) {
  const out = [];
  let i = 0, k = 0;
  const rx = /(\*\*[^*\n]+\*\*)|(_[^_\n]+_)|(`[^`\n]+`)|(\[[^\]\n]+\]\([^)\n]+\))|(~~[^~\n]+~~)|(#[A-Za-z][\w/]*)/g;
  let m;
  while ((m = rx.exec(text))) {
    if (m.index > i) out.push(<span key={`t-${key}-${k++}`}>{text.slice(i, m.index)}</span>);
    const tok = m[0];
    if (m[1]) {
      const inner = tok.slice(2, -2);
      out.push(
        <span key={`b-${key}-${k++}`}>
          <span className="md-mark">**</span>
          <strong style={{ fontWeight: 600 }}>{inner}</strong>
          <span className="md-mark">**</span>
        </span>
      );
    } else if (m[2]) {
      const inner = tok.slice(1, -1);
      out.push(
        <span key={`i-${key}-${k++}`}>
          <span className="md-mark">_</span>
          <em style={{ fontStyle: 'italic' }}>{inner}</em>
          <span className="md-mark">_</span>
        </span>
      );
    } else if (m[3]) {
      const inner = tok.slice(1, -1);
      out.push(
        <span key={`c-${key}-${k++}`} className="md-code">
          <span className="md-mark">`</span>{inner}<span className="md-mark">`</span>
        </span>
      );
    } else if (m[4]) {
      const linkM = /\[([^\]]+)\]\(([^)]+)\)/.exec(tok);
      out.push(
        <span key={`l-${key}-${k++}`} className="md-link">
          <span className="md-mark">[</span>
          <span style={{ borderBottom: '1px solid currentColor' }}>{linkM[1]}</span>
          <span className="md-mark">]({linkM[2]})</span>
        </span>
      );
    } else if (m[5]) {
      const inner = tok.slice(2, -2);
      out.push(
        <span key={`s-${key}-${k++}`}>
          <span className="md-mark">~~</span>
          <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{inner}</span>
          <span className="md-mark">~~</span>
        </span>
      );
    } else if (m[6]) {
      out.push(<span key={`h-${key}-${k++}`} className="md-tag">{tok}</span>);
    }
    i = m.index + tok.length;
  }
  if (i < text.length) out.push(<span key={`t-${key}-${k++}`}>{text.slice(i)}</span>);
  return out;
}

function splitSentences(text) {
  if (!text.trim()) return [text];
  const parts = text.split(/(?<=[.!?])\s+(?=[A-Za-z#*_\[\-"])/);
  return parts.length ? parts : [text];
}

function renderBlock(line, idx, opts = {}) {
  const { focus = false, activeIdx = -1 } = opts;

  if (/^\s*---\s*$/.test(line)) return <hr key={idx} className="md-hr" />;
  const h = /^(#{1,4})\s+(.*)$/.exec(line);
  if (h) {
    const level = h[1].length;
    const Tag = `h${level}`;
    return (
      <Tag key={idx} className={`md-h md-h${level}`} data-block={idx}>
        <span className="md-mark">{h[1]} </span>
        {renderInline(h[2], idx)}
      </Tag>
    );
  }
  if (/^>\s?/.test(line)) {
    return (
      <div key={idx} className="md-quote" data-block={idx}>
        <span className="md-mark">&gt; </span>
        {renderInline(line.replace(/^>\s?/, ''), idx)}
      </div>
    );
  }
  const tk = /^(\s*)-\s+\[( |x)\]\s+(.*)$/.exec(line);
  if (tk) {
    const done = tk[2] === 'x';
    return (
      <div key={idx} className="md-task" data-block={idx}>
        <span className="md-mark">- </span>
        <span className={`md-check ${done ? 'done' : ''}`} aria-hidden>
          {done ? '✓' : ''}
        </span>
        <span className={done ? 'md-task-done' : ''}>
          {renderInline(tk[3], idx)}
        </span>
      </div>
    );
  }
  const ol = /^(\s*)(\d+)\.\s+(.*)$/.exec(line);
  if (ol) {
    return (
      <div key={idx} className="md-li" data-block={idx}>
        <span className="md-mark">{ol[2]}. </span>
        {renderInline(ol[3], idx)}
      </div>
    );
  }
  const ul = /^(\s*)-\s+(.*)$/.exec(line);
  if (ul) {
    return (
      <div key={idx} className="md-li" data-block={idx}>
        <span className="md-mark">- </span>
        {renderInline(ul[2], idx)}
      </div>
    );
  }
  if (!line.trim()) return <div key={idx} className="md-blank" data-block={idx}>&nbsp;</div>;
  if (focus) {
    const sents = splitSentences(line);
    return (
      <p key={idx} className="md-p" data-block={idx}>
        {sents.map((s, si) => {
          const active = idx === activeIdx && si === 0;
          return (
            <span key={si} className={`md-sentence ${active ? 'md-sentence-on' : ''}`}>
              {renderInline(s, `${idx}-${si}`)}{si < sents.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </p>
    );
  }
  return (
    <p key={idx} className="md-p" data-block={idx}>
      {renderInline(line, idx)}
    </p>
  );
}

function MarkdownBody({ source, focus = false, activeIdx = -1 }) {
  const lines = source.split('\n');
  return (
    <div className={`md ${focus ? 'md-focus' : ''}`}>
      {lines.map((ln, i) => renderBlock(ln, i, { focus, activeIdx }))}
    </div>
  );
}

function noteTitle(body) {
  const line = body.split('\n').find(l => l.trim()) || 'untitled';
  return line.replace(/^#+\s*/, '');
}
function noteExcerpt(body) {
  const lines = body.split('\n');
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
}

Object.assign(window, {
  KERN_NOTES, MarkdownBody, noteTitle, noteExcerpt, renderInline, renderBlock,
});
