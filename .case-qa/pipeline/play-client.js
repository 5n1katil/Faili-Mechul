(() => {
  const manifestNode = document.getElementById('fm-play-manifest');
  if (!manifestNode) return;
  const manifest = JSON.parse(manifestNode.textContent);
  const style = document.createElement('style');
  style.textContent = `
    .loader, body > footer { display: none !important; }
    #fm-play-shell, #fm-play-eval { margin: 0 0 18px; }
    #fm-play-shell, #fm-play-eval, #fm-play-list {
      background: linear-gradient(180deg, var(--panel), var(--bg-2));
      border: 1px solid var(--line); border-radius: 16px; padding: 16px;
    }
    #fm-play-shell h1 { font-family: Cinzel, serif; font-size: 26px; line-height: 1.25; margin: 4px 0 10px; }
    .fm-kicker { color: var(--gold); letter-spacing: .08em; font-size: 11px; }
    .fm-meta { display: grid; gap: 6px; margin: 0 0 12px; font-size: 12px; }
    .fm-meta div { display: grid; grid-template-columns: 132px 1fr; gap: 8px; }
    .fm-meta dt { color: var(--text-dim); }
    .fm-meta dd { margin: 0; overflow-wrap: anywhere; }
    .fm-note, .fm-gap { font-size: 12.5px; line-height: 1.5; color: var(--text); }
    .fm-gap { border: 1px solid #7c2d12; background: rgba(180,83,9,.12); border-radius: 10px; padding: 10px; margin-top: 10px; }
    .fm-rules { margin-top: 12px; font-size: 12.5px; }
    .fm-rules p { white-space: pre-wrap; margin: 8px 0 0; }
    .fm-actions, .fm-eval-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .fm-actions button, .fm-eval-actions button, .fm-list a {
      font: inherit; color: var(--text); background: var(--panel-2); border: 1px solid var(--line);
      border-radius: 10px; padding: 9px 12px; text-decoration: none; cursor: pointer;
    }
    #fm-play-eval label, #fm-play-eval legend { display: block; margin-top: 12px; font-size: 13px; }
    #fm-play-eval .fm-choice { display: flex; gap: 12px; margin-top: 6px; font-size: 13px; }
    #fm-play-eval textarea, #fm-play-eval select { width: 100%; margin-top: 6px; background: var(--bg-2);
      color: var(--text); border: 1px solid var(--line); border-radius: 8px; padding: 8px; font: inherit; font-size: 16px; }
    .fm-missing { font-size: 8px; line-height: 1.15; text-align: center; color: var(--text-dim); }
    .ic img, .hicon img, .vicon img, .modal-ic img { width: 100%; height: 100%; object-fit: cover; border-radius: inherit; display: block; }
    #fm-play-list { margin-bottom: 18px; }
    #fm-play-list h1 { font-family: Cinzel, serif; font-size: 24px; margin-bottom: 8px; }
    #fm-play-list ul { list-style: none; display: grid; gap: 8px; margin-top: 12px; }
    #fm-play-status { font-size: 12px; color: var(--text-dim); min-height: 1.2em; }
    @media (max-width: 560px) {
      #fm-play-shell h1 { font-size: 22px; }
      .fm-meta div { grid-template-columns: 1fr; gap: 0; }
      .fm-actions button, .fm-eval-actions button { width: 100%; }
    }
  `;
  document.head.appendChild(style);
  const badge = document.querySelector('.badge-sim');
  if (badge) badge.textContent = 'Oynanış önizlemesi';
  const logo = document.querySelector('.logo small');
  if (logo) logo.textContent = 'OYNANIŞ ÖNİZLEMESİ';
  window.auditCase = function () { return ''; };

  let restoring = false;
  const params = new URLSearchParams(location.search);
  const selectedId = params.get('case');
  const wrap = document.querySelector('.wrap');
  if (!selectedId) { renderList(wrap); return; }
  const item = manifest.cases.find(entry => entry.id === selectedId);
  renderCase(wrap, item);

  function renderList(parent) {
    const box = document.createElement('section');
    box.id = 'fm-play-list';
    const title = document.createElement('h1');
    title.textContent = 'Oynanış önizlemesi';
    const note = document.createElement('p');
    note.className = 'fm-note';
    note.textContent = 'Altyapı build ' + manifest.build_commit + '. Vaka içeriği ' + manifest.content_commit + '. main’deki eski vaka bu içerik commit’inin yerine geçmez.';
    box.append(title, note, rulesBlock());
    const playable = document.createElement('ul');
    const blocked = document.createElement('ul');
    for (const entry of manifest.cases) {
      const li = document.createElement('li');
      if (entry.playable) {
        const link = document.createElement('a');
        link.className = 'fm-list';
        link.href = '/oyna/?case=' + encodeURIComponent(entry.id);
        link.textContent = entry.title + ' · ' + entry.difficulty_label;
        li.append(link);
        playable.append(li);
      } else {
        li.textContent = entry.title + ' — ' + entry.gaps.join(' ');
        blocked.append(li);
      }
    }
    const playableTitle = document.createElement('h2');
    playableTitle.textContent = 'Oynanabilir vakalar';
    const blockedTitle = document.createElement('h2');
    blockedTitle.textContent = 'Bu önizlemede oynatılamayanlar';
    box.append(playableTitle, playable, blockedTitle, blocked);
    parent.prepend(box);
  }

  function renderCase(parent, entry) {
    const shell = document.createElement('section');
    shell.id = 'fm-play-shell';
    const kicker = document.createElement('p');
    kicker.className = 'fm-kicker';
    kicker.textContent = 'OYNANIŞ ÖNİZLEMESİ';
    const title = document.createElement('h1');
    title.textContent = entry ? entry.title : 'Vaka bulunamadı';
    shell.append(kicker, title, metaList(entry), note(entry), rulesBlock());
    const actions = document.createElement('div');
    actions.className = 'fm-actions';
    const restart = document.createElement('button');
    restart.type = 'button';
    restart.textContent = 'Yeniden başlat';
    restart.addEventListener('click', () => restartCase(entry));
    const list = document.createElement('a');
    list.href = '/oyna/';
    list.textContent = 'Vaka listesi';
    actions.append(restart, list);
    shell.append(actions);
    const gap = document.createElement('div');
    gap.className = 'fm-gap';
    gap.hidden = true;
    shell.append(gap);
    parent.prepend(shell);
    document.title = (entry ? entry.title + ' · ' : '') + 'Oynanış önizlemesi';
    if (!entry) { showGap(gap, ['Bu commit’te bu vaka kimliği yok.']); return; }
    if (!entry.playable) { showGap(gap, entry.gaps); return; }
    const evaluation = evaluationForm(entry);
    parent.append(evaluation);
    wireSimulator(entry, evaluation);
    const input = document.getElementById('jsonIn');
    input.value = JSON.stringify(entry.payload);
    window.loadCase();
    const error = document.getElementById('err');
    if (error && error.style.display === 'block') showGap(gap, [error.textContent]);
    afterRender(entry);
  }

  function metaList(entry) {
    const dl = document.createElement('dl');
    dl.className = 'fm-meta';
    const rows = [
      ['Vaka', entry ? entry.id : '—'],
      ['Altyapı build', manifest.build_commit],
      ['Vaka içeriği', manifest.content_commit],
      ['Aday içerik', entry ? entry.content_hash : '—'],
      ['Sürüm', 'Aday. Üretim sürümü değil. Altyapı build’i ile vaka içeriği ayrı commit’lerdir.'],
      ['Kategori', entry ? entry.tier + ' · ' + entry.difficulty_label : '—'],
      ['Simülatör', manifest.simulator.sha256]
    ];
    for (const [label, value] of rows) {
      const row = document.createElement('div');
      const dt = document.createElement('dt');
      dt.textContent = label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      row.append(dt, dd);
      dl.append(row);
    }
    return dl;
  }
  function note() {
    const p = document.createElement('p');
    p.className = 'fm-note';
    p.textContent = 'Doğru tahmin kalite onayı, sertifika veya birleştirme oluşturmaz. Yeni commit’in içeriği bu hash ile aynı değilse eski ızgara ve değerlendirme ona ait değildir.';
    return p;
  }
  function rulesBlock() {
    const box = document.createElement('div');
    box.className = 'fm-rules';
    const heading = document.createElement('strong');
    heading.textContent = 'Oyun kuralları';
    box.append(heading);
    for (const statement of manifest.matching_rules.statements || []) {
      const p = document.createElement('p');
      p.textContent = statement;
      box.append(p);
    }
    return box;
  }
  function showGap(gap, lines) {
    gap.hidden = false;
    gap.textContent = '';
    const strong = document.createElement('strong');
    strong.textContent = 'Bu vaka bu önizlemede oynatılamıyor.';
    gap.append(strong);
    for (const line of lines) {
      const p = document.createElement('p');
      p.textContent = line;
      gap.append(p);
    }
  }

  function storageKey(entry) { return 'fm-play:' + entry.id + ':' + entry.content_hash; }
  function readState(entry) {
    try { return JSON.parse(localStorage.getItem(storageKey(entry)) || 'null'); }
    catch { return null; }
  }
  function writeState(entry, state) { localStorage.setItem(storageKey(entry), JSON.stringify(state)); }
  function currentState(entry) {
    const previous = readState(entry) || {};
    const cells = {};
    document.querySelectorAll('.gcell').forEach(cell => {
      if (cell.classList.contains('v')) cells[cell.id] = 'v';
      else if (cell.classList.contains('x') && !cell.classList.contains('auto')) cells[cell.id] = 'x';
    });
    const bonuses = [];
    document.querySelectorAll('.clue.bonus').forEach(node => {
      if (node.classList.contains('locked')) return;
      const index = Number(String(node.id).replace('clue', ''));
      const clue = entry.payload.clues[index];
      if (clue && clue.isBonus) bonuses.push(clue.id);
    });
    const revealed = document.getElementById('solBox') && document.getElementById('solBox').style.display === 'block';
    return {
      cells, bonuses, solution_revealed: Boolean(revealed || previous.solution_revealed),
      evaluation: previous.evaluation || {}
    };
  }
  function persist(entry) { writeState(entry, currentState(entry)); }

  function wireSimulator(entry, evaluation) {
    const baseRender = window.render;
    const baseCycle = window.cycleCell;
    const baseUnlock = window.unlock;
    const baseCheck = window.checkPlaytest;
    const baseOpen = window.openEnt;
    window.render = function () { baseRender(); afterRender(entry); };
    window.cycleCell = function (cell) { baseCycle(cell); if (!restoring) persist(entry); };
    window.unlock = function (index) { baseUnlock(index); if (!restoring) { persist(entry); refreshStatus(entry); } };
    window.checkPlaytest = function () { baseCheck(); scrubApproval(); persist(entry); };
    window.openEnt = function (cat, id) { baseOpen(cat, id); decorate(document.querySelector('#entModal .modal-box') || document.body); };
    evaluation.addEventListener('input', () => {
      const state = currentState(entry);
      state.evaluation = formValue(evaluation);
      writeState(entry, state);
    });
  }
  function afterRender(entry) {
    document.querySelectorAll('.audit, .peek-btn').forEach(node => node.remove());
    decorate(document.getElementById('game'));
    restore(entry);
    scrubApproval();
    refreshStatus(entry);
  }
  function decorate(root) {
    if (!root) return;
    root.querySelectorAll('.ic, .hicon, .vicon, .modal-ic').forEach(node => {
      if (node.querySelector('img, .fm-missing')) return;
      const key = node.textContent.trim();
      if (!isAssetKey(key)) return;
      node.textContent = '';
      const url = manifest.assets[key];
      if (url) {
        const image = document.createElement('img');
        image.src = url;
        image.alt = labelOf(node);
        node.append(image);
      } else {
        const missing = document.createElement('span');
        missing.className = 'fm-missing';
        missing.textContent = 'Görsel yok';
        node.append(missing);
      }
    });
  }
  function isAssetKey(value) {
    return value.startsWith('pa:') || /^noun-/i.test(value) || /\.(png|jpe?g|svg|webp|gif)$/i.test(value);
  }
  function labelOf(node) {
    const title = node.getAttribute('title') || (node.closest('button') && node.closest('button').getAttribute('title')) || 'Kart';
    return title.replace(/ — bilgi için tıkla$/, '');
  }
  function restore(entry) {
    const saved = readState(entry);
    if (!saved) return;
    restoring = true;
    try {
      for (const id of saved.bonuses || []) {
        const index = entry.payload.clues.findIndex(clue => clue.id === id);
        const node = document.getElementById('clue' + index);
        if (index >= 0 && node && node.classList.contains('locked')) window.unlock(index);
      }
      for (const [id, mark] of Object.entries(saved.cells || {})) {
        if (mark !== 'v') continue;
        const cell = document.getElementById(id);
        if (cell) { window.setCell(cell, 'v'); window.applyAutoCross(cell); }
      }
      for (const [id, mark] of Object.entries(saved.cells || {})) {
        if (mark !== 'x') continue;
        const cell = document.getElementById(id);
        if (cell && !cell.classList.contains('v') && !cell.classList.contains('x')) window.setCell(cell, 'x');
      }
      if (saved.solution_revealed) {
        const box = document.getElementById('solBox');
        if (box) box.style.display = 'block';
      }
      const form = document.getElementById('fm-play-eval');
      if (form && saved.evaluation) applyForm(form, saved.evaluation);
    } finally {
      restoring = false;
    }
  }
  function scrubApproval() {
    const result = document.getElementById('ptResult');
    if (!result) return;
    result.innerHTML = result.innerHTML.replace(
      'Çözülebilirlik (40/40) manuel olarak ONAYLANDI.',
      'Bu yalnızca oynanış denemesidir. Kalite onayı, sertifika veya birleştirme değildir.'
    );
  }
  function restartCase(entry) {
    if (!entry || !entry.playable) return;
    localStorage.removeItem(storageKey(entry));
    document.getElementById('jsonIn').value = JSON.stringify(entry.payload);
    window.loadCase();
    const form = document.getElementById('fm-play-eval');
    if (form) form.reset();
    refreshStatus(entry);
  }

  function evaluationForm(entry) {
    const form = document.createElement('form');
    form.id = 'fm-play-eval';
    const heading = document.createElement('h2');
    heading.textContent = 'Oynanış değerlendirmesi';
    form.append(heading);
    const questions = [
      ['story', 'Hikâye akıcı ve merak uyandırıcı mı?'],
      ['clues', 'İpuçları anlaşılır ve çıkarımlar adil mi?'],
      ['difficulty', 'Zorluk kategoriye uygun mu?'],
      ['distinct', 'Eğlenceli ve yeterince farklı mı?']
    ];
    for (const [name, label] of questions) form.append(choice(name, label));
    form.append(area('problem', 'Sorunlu ipucu veya kart'));
    form.append(area('comment', 'Serbest yorum'));
    const verdict = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = 'Sonuç';
    verdict.append(legend);
    const row = document.createElement('div');
    row.className = 'fm-choice';
    for (const value of ['uygun', 'revizyon gerekli']) {
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'radio'; input.name = 'verdict'; input.value = value;
      label.append(input, document.createTextNode(' ' + value));
      row.append(label);
    }
    verdict.append(row);
    form.append(verdict);
    const status = document.createElement('p');
    status.id = 'fm-play-status';
    const actions = document.createElement('div');
    actions.className = 'fm-eval-actions';
    const copy = document.createElement('button');
    copy.type = 'button'; copy.textContent = 'Değerlendirmeyi kopyala';
    const download = document.createElement('button');
    download.type = 'button'; download.textContent = 'Değerlendirmeyi indir';
    copy.addEventListener('click', async () => {
      const report = reportFor(entry, form);
      try { await navigator.clipboard.writeText(JSON.stringify(report, null, 2)); status.textContent = 'Değerlendirme kopyalandı.'; }
      catch { status.textContent = 'Kopyalanamadı. İndirmeyi kullan.'; }
    });
    download.addEventListener('click', () => {
      const report = reportFor(entry, form);
      const blob = new Blob([JSON.stringify(report, null, 2) + '\n'], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'fm-play-' + entry.id + '-' + entry.content_hash.slice(0, 12) + '.json';
      link.click();
      URL.revokeObjectURL(link.href);
      status.textContent = 'Değerlendirme indirildi. GitHub’a gönderilmedi.';
    });
    actions.append(copy, download);
    form.append(actions, status);
    return form;
  }
  function choice(name, label) {
    const field = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = label;
    field.append(legend);
    const row = document.createElement('div');
    row.className = 'fm-choice';
    for (const value of ['evet', 'kısmen', 'hayır']) {
      const item = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'radio'; input.name = name; input.value = value;
      item.append(input, document.createTextNode(' ' + value));
      row.append(item);
    }
    field.append(row);
    return field;
  }
  function area(name, label) {
    const wrap = document.createElement('label');
    wrap.textContent = label;
    const input = document.createElement('textarea');
    input.name = name; input.rows = 3;
    wrap.append(input);
    return wrap;
  }
  function formValue(form) {
    const data = new FormData(form);
    return {
      story: data.get('story'), clues: data.get('clues'), difficulty: data.get('difficulty'),
      distinct: data.get('distinct'), problem: data.get('problem') || '', comment: data.get('comment') || '',
      verdict: data.get('verdict')
    };
  }
  function applyForm(form, value) {
    for (const [name, saved] of Object.entries(value || {})) {
      if (saved == null) continue;
      const fields = form.querySelectorAll('[name="' + name + '"]');
      fields.forEach(field => {
        if (field.type === 'radio') field.checked = field.value === saved;
        else field.value = saved;
      });
    }
  }
  function refreshStatus(entry) {
    const status = document.getElementById('fm-play-status');
    if (!status) return;
    const state = readState(entry) || { bonuses: [], solution_revealed: false };
    status.textContent = 'Açılan bonuslar: ' + ((state.bonuses || []).join(', ') || 'yok') +
      '. Çözüm gösterildi: ' + (state.solution_revealed ? 'evet' : 'hayır') + '.';
  }
  function reportFor(entry, form) {
    const state = currentState(entry);
    state.evaluation = formValue(form);
    writeState(entry, state);
    return {
      schema: 'fm_play_evaluation_v1',
      approval: 'playtest_only',
      case_id: entry.id,
      title: entry.title,
      build_commit: manifest.build_commit,
      content_commit: manifest.content_commit,
      commit: manifest.content_commit,
      content_hash: entry.content_hash,
      simulator_sha256: manifest.simulator.sha256,
      simulator_git_blob_sha: manifest.simulator.git_blob_sha,
      tier: entry.tier,
      difficulty: entry.difficulty,
      opened_bonuses: state.bonuses,
      solution_revealed: state.solution_revealed,
      answers: state.evaluation,
      note: 'Bu dosya kalite onayı, sertifika veya birleştirme değildir.'
    };
  }

  document.getElementById('game').addEventListener('click', event => {
    const button = event.target.closest && event.target.closest('button');
    if (!button || !button.textContent.includes('Çözümü Göster')) return;
    const entry = manifest.cases.find(item => item.id === selectedId);
    if (!entry) return;
    const state = currentState(entry);
    state.solution_revealed = true;
    writeState(entry, state);
    refreshStatus(entry);
  });
})();
