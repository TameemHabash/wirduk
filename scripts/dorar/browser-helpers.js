/* global window, document, DOMParser, fetch */
/**
 * Paste (or inject with Claude in Chrome's javascript tool) into a dorar.net tab.
 * Needs receiver.ts running on 127.0.0.1:8765.
 *
 *   await __dorar.save('/h/zq8ilghZ')            // one page → <out-dir>/h_zq8ilghZ.json
 *   await __dorar.save('/hadith/sharh/1568')
 *   await __dorar.search('سبحان الله وبحمده')    // search results (for looking, not saved)
 *
 * The parser reads Dorar's own fields; nothing is retyped. Dorar's layout
 * (div.border-bottom > article + div.d-block) was current on 2026-10-17.
 */
if (!/(^|\.)dorar\.net$/.test(document.location.hostname)) {
  throw new Error('Open a dorar.net tab first');
}

window.__dorar = {
  parse(doc) {
    const take = (info, re) => {
      const m = info.match(re);
      return m ? m[1].replace(/\s+/g, ' ').trim() : '';
    };
    return [...doc.querySelectorAll('div.border-bottom')]
      .map((block) => {
        const art = block.querySelector('article');
        const infoEl = block.querySelector('div.d-block');
        if (!art || !infoEl) return null;
        const info = infoEl.innerText;
        const href =
          [...infoEl.querySelectorAll('a')]
            .map((a) => a.getAttribute('href') || '')
            .find((h) => /(^|dorar\.net)\/h\//.test(h)) || '';
        const pane = block.closest('.tab-pane');
        return {
          pane: pane ? pane.id : '',
          // Pages start with "- ", search results with "12 - ".
          text: art.innerText.replace(/^\s*(\d+\s*)?-\s*/, '').trim(),
          grading: take(info, /خلاصة حكم المحدث\s*:\s*([^\n]*)/),
          rawi: take(info, /(?:^|\n|\|)\s*الراوي\s*:\s*([^|\n]*)/),
          muhaddith: take(info, /(?:^|\n|\|)\s*المحدث\s*:\s*([^|\n]*)/),
          book: take(info, /(?:^|\n|\|)\s*المصدر\s*:\s*(.*?)\s*(?:الصفحة أو الرقم|\||\n|$)/),
          number: take(info, /الصفحة أو الرقم\s*:\s*(.*?)\s*(?:التخريج|\n|$)/),
          sharePath: href.replace(/^https?:\/\/(www\.)?dorar\.net/, '').replace(/[?#].*$/, ''),
        };
      })
      .filter(Boolean);
  },

  async load(path) {
    const res = await fetch(path, { credentials: 'same-origin' });
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    return { status: res.status, results: this.parse(doc) };
  },

  async search(q) {
    return this.load('/hadith/search?q=' + encodeURIComponent(q));
  },

  /** Reads one page and saves it through the receiver. Returns a short summary. */
  async save(path) {
    const page = await this.load(path);
    if (page.status !== 200 || page.results.length === 0) {
      return { path, status: page.status, error: 'no hadith on this page' };
    }
    const body = {
      url: 'https://dorar.net' + path,
      savedOn: new Date().toISOString().slice(0, 10),
      results: page.results,
    };
    const name = path.replace(/^\//, '').replace(/[^\w.-]/g, '_');
    const sent = await fetch('http://127.0.0.1:8765/save/' + name, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const r = page.results[0];
    return {
      path,
      saved: sent.status,
      file: name + '.json',
      book: r.book,
      number: r.number,
      grading: r.grading,
    };
  },
};
