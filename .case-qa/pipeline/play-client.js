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
    #fm-play-closing { margin-top: 12px; font-size: 14px; line-height: 1.55; }
    #fm-play-closing p { margin: 6px 0 0; }
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
    #fm-play-status, #fm-play-draft-status { font-size: 12px; color: var(--text-dim); min-height: 1.2em; }
    .fm-draft-banner, .fm-draft-tag { color: #fbbf24; font-size: 12.5px; font-weight: 700; margin: 8px 0; }
    .fm-edit-btn { font: inherit; font-size: 12px; color: var(--gold); background: transparent;
      border: 1px dashed var(--gold-soft); border-radius: 8px; padding: 6px 10px; cursor: pointer; margin-top: 6px; }
    .fm-editor { display: grid; gap: 8px; margin-top: 8px; }
    .fm-editor textarea { width: 100%; min-height: 96px; background: var(--bg-2); color: var(--text);
      border: 1px solid var(--line); border-radius: 8px; padding: 8px; font: inherit; font-size: 16px; }
    .fm-editor-note { margin: 0; font-size: 12px; color: var(--text-dim); }
    @media (max-width: 560px) {
      #fm-play-shell h1 { font-size: 22px; }
      .fm-meta div { grid-template-columns: 1fr; gap: 0; }
      .fm-actions button, .fm-eval-actions button, .fm-edit-btn { width: 100%; }
    }
  `;
  document.head.appendChild(style);
  const badge = document.querySelector('.badge-sim');
  if (badge) badge.textContent = 'Oynanış önizlemesi';
  const logo = document.querySelector('.logo small');
  if (logo) logo.textContent = 'OYNANIŞ ÖNİZLEMESİ';
  window.auditCase = function () { return ''; };

  const LOCAL_LABEL = 'Yerel düzenleme — yeniden değerlendirilmedi';
  const TEXT_PATH = /^(story|closing|(?:suspects|weapons|locations)\.[A-Za-z0-9_-]+\.description|clues\.[A-Za-z0-9_-]+\.(?:text|deductionHint))$/;
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
    note.textContent = 'Bu sayfa ' + manifest.commit + ' commit’indeki adayları gösterir. main’deki eski vaka burada açılmaz.';
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
    if (entry && entry.playable) {
      const copyChanges = document.createElement('button');
      copyChanges.type = 'button';
      copyChanges.textContent = 'Değişiklikleri kopyala';
      copyChanges.addEventListener('click', () => copyRevision(entry));
      const downloadChanges = document.createElement('button');
      downloadChanges.type = 'button';
      downloadChanges.textContent = 'Değişiklikleri indir';
      downloadChanges.addEventListener('click', () => downloadRevision(entry));
      const resetChanges = document.createElement('button');
      resetChanges.type = 'button';
      resetChanges.textContent = 'Bütün yerel değişiklikleri sıfırla';
      resetChanges.addEventListener('click', () => resetDraft(entry));
      actions.append(copyChanges, downloadChanges, resetChanges);
    }
    actions.append(restart, list);
    shell.append(actions);
    const draftStatus = document.createElement('p');
    draftStatus.id = 'fm-play-draft-status';
    draftStatus.className = 'fm-note';
    shell.append(draftStatus);
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
    input.value = JSON.stringify(draftedPayload(entry));
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
      ['Kaynak commit', manifest.commit],
      ['Aday içerik', entry ? entry.content_hash : '—'],
      ['Sürüm', 'Aday · bu önizlemenin commit’i. Üretim sürümü değil.'],
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
    p.textContent = 'Doğru tahmin kalite onayı, sertifika veya birleştirme oluşturmaz. Metin düzenlemesi yalnız bu tarayıcıda kalır; yerel düzenleme yeniden değerlendirilmedi sayılır. Yeni commit’in içeriği bu hash ile aynı değilse eski ızgara, değerlendirme ve metin taslağı ona ait değildir.';
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
      spoiler_fields: Array.isArray(previous.spoiler_fields) ? previous.spoiler_fields.slice() : [],
      bonus_penalty_seconds: Number(window.TEST_PENALTY) || 0,
      evaluation: previous.evaluation || {}
    };
  }
  const BUNDLED_BONUS_CONFIRM = 'İki yardımı aç: toplam +90 saniye ve iki bonusun puan kesintisi. Hafif yardım +30 saniye, güçlü yardım +60 saniye. İki kesinti 2 × 300 = 600 puan. Eklenen 90 saniye, süre hesabında 900 puan daha düşürür (10 puan/sn).';
  function bonusClueIndexes() {
    return (window.CASE && window.CASE.clues || []).reduce((order, clue, index) => {
      if (clue && clue.isBonus) order.push(index);
      return order;
    }, []);
  }
  function revealedBonusIndexes() {
    const open = [];
    document.querySelectorAll('.clue.bonus').forEach(node => {
      if (node.classList.contains('locked')) return;
      const index = Number(String(node.id).replace('clue', ''));
      if (Number.isInteger(index)) open.push(index);
    });
    return open;
  }
  function bonusOpenPlan(targetIndex) {
    const order = bonusClueIndexes();
    const opened = new Set(revealedBonusIndexes());
    if (!order.includes(targetIndex) || opened.has(targetIndex)) {
      return { steps: [], bundled: false, message: '' };
    }
    const light = order[0];
    if (targetIndex === light) {
      return {
        steps: [{ index: targetIndex, seconds: 30 }],
        bundled: false,
        message: 'Bu hafif yardım süreye +30 saniye ekler. Güçlü yardım ancak bu açıldıktan sonra kullanılabilir ve +60 saniye ekler. Her ek ipucu ayrıca 300 puan düşer. Eklenen her saniye, süre hesabında 10 puan daha düşürür.'
      };
    }
    if (!opened.has(light)) {
      return {
        steps: [{ index: light, seconds: 30 }, { index: targetIndex, seconds: 60 }],
        bundled: true,
        message: BUNDLED_BONUS_CONFIRM
      };
    }
    return {
      steps: [{ index: targetIndex, seconds: 60 }],
      bundled: false,
      message: 'Bu güçlü yardım süreye +60 saniye ekler. Toplam süre cezası +90 saniye olur. Bu açılış ayrıca 300 puan düşer. Süre etkisi süre satırındadır: saniye başına 10 puan (bu açılış 600 puan).'
    };
  }
  function refreshPenaltyLabels() {
    const order = bonusClueIndexes();
    const revealed = new Set(revealedBonusIndexes());
    const light = order[0];
    document.querySelectorAll('.clue.bonus.locked').forEach(card => {
      const cost = card.querySelector('.cost');
      if (!cost) return;
      const index = Number(String(card.id).replace('clue', ''));
      if (index === light) cost.textContent = '⏱ +30 sn';
      else if (light !== undefined && !revealed.has(light)) cost.textContent = '⏱ +60 sn · iki yardım +90 sn';
      else cost.textContent = '⏱ +60 sn';
    });
    const tracker = document.getElementById('penaltyTracker');
    if (tracker) tracker.textContent = `Playtest cezası: ${Number(window.TEST_PENALTY) || 0} sn`;
  }
  function displayedClosing(entry) {
    const draft = readDraft(entry);
    if (draft && Object.prototype.hasOwnProperty.call(draft.fields, 'closing')) return draft.fields.closing;
    return entry.closing || '';
  }
  function ensureClosing(entry) {
    const closing = displayedClosing(entry);
    if (!closing) return;
    const won = document.querySelector('#ptResult.win');
    const sol = document.getElementById('solBox');
    const open = sol && sol.style.display === 'block';
    if (!won && !open) return;
    markSpoiler(entry, 'closing');
    let node = document.getElementById('fm-play-closing');
    if (!node) {
      node = document.createElement('div');
      node.id = 'fm-play-closing';
      const title = document.createElement('strong');
      title.textContent = 'Vaka kapanışı';
      const body = document.createElement('p');
      body.textContent = closing;
      node.append(title, body);
      (sol && sol.parentElement ? sol.parentElement : document.getElementById('game')).append(node);
    } else {
      const body = node.querySelector('p');
      if (body) body.textContent = closing;
    }
    placeEditor(entry, node.querySelector('p') || node, 'closing', 'Kapanış');
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
    window.unlock = function (index) {
      const clue = window.CASE && window.CASE.clues && window.CASE.clues[index];
      const alreadyOpen = window.OPENED_BONUS && window.OPENED_BONUS.has(index);
      if (restoring) {
        if (clue) clue.pointCost = 0;
        baseUnlock(index);
        return;
      }
      if (alreadyOpen) {
        baseUnlock(index);
        return;
      }
      const plan = bonusOpenPlan(index);
      if (!plan.steps.length || !window.confirm(plan.message)) return;
      for (const step of plan.steps) {
        const target = window.CASE && window.CASE.clues && window.CASE.clues[step.index];
        if (target) target.pointCost = step.seconds;
        baseUnlock(step.index);
      }
      refreshPenaltyLabels();
      persist(entry);
      refreshStatus(entry);
    };
    window.checkPlaytest = function () { baseCheck(); scrubApproval(); ensureClosing(entry); persist(entry); };
    document.addEventListener('click', event => {
      const button = event.target && event.target.closest ? event.target.closest('button') : null;
      if (!button || !button.textContent.includes('Çözümü Göster')) return;
      setTimeout(() => ensureClosing(entry), 0);
    });
    window.openEnt = function (cat, id) {
      baseOpen(cat, id);
      const box = document.querySelector('#entModal .modal-box') || document.body;
      decorate(box);
      const sections = box.querySelectorAll ? box.querySelectorAll('.modal-sec') : [];
      sections.forEach(section => {
        const name = section.querySelector('.modal-lbl');
        if (!name || name.textContent.trim() !== 'Tanım') return;
        const paragraph = section.querySelector('p');
        if (paragraph) placeEditor(entry, paragraph, cat + '.' + id + '.description', 'Kart açıklaması');
      });
    };
    evaluation.addEventListener('input', () => {
      const state = currentState(entry);
      state.evaluation = formValue(evaluation);
      writeState(entry, state);
    });
  }
  function afterRender(entry) {
    document.querySelectorAll('.audit, .peek-btn').forEach(node => node.remove());
    decorate(document.getElementById('game'));
    attachTextEditors(entry);
    restore(entry);
    scrubApproval();
    refreshPenaltyLabels();
    refreshStatus(entry);
    refreshDraftBanner(entry);
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
      const savedSeconds = Number.isFinite(saved.bonus_penalty_seconds)
        ? saved.bonus_penalty_seconds
        : (saved.bonuses || []).length * 30;
      window.TEST_PENALTY = savedSeconds;
      refreshPenaltyLabels();
      ensureClosing(entry);
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
    document.getElementById('jsonIn').value = JSON.stringify(draftedPayload(entry));
    window.loadCase();
    const form = document.getElementById('fm-play-eval');
    if (form) form.reset();
    refreshStatus(entry);
    refreshDraftBanner(entry);
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
    const spoiler = state.solution_revealed || (state.spoiler_fields || []).length > 0;
    status.textContent = 'Açılan bonuslar: ' + ((state.bonuses || []).join(', ') || 'yok') +
      '. Çözüm gösterildi: ' + (state.solution_revealed ? 'evet' : 'hayır') + '.' +
      (spoiler ? ' Spoiler görüldü.' : '');
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
      commit: manifest.commit,
      content_hash: entry.content_hash,
      simulator_sha256: manifest.simulator.sha256,
      simulator_git_blob_sha: manifest.simulator.git_blob_sha,
      tier: entry.tier,
      difficulty: entry.difficulty,
      opened_bonuses: state.bonuses,
      solution_revealed: state.solution_revealed,
      local_revision: revisionPackage(entry).changes.length > 0,
      spoiler: state.solution_revealed || (state.spoiler_fields || []).length > 0,
      spoiler_fields: state.spoiler_fields || [],
      answers: state.evaluation,
      note: 'Bu dosya kalite onayı, sertifika veya birleştirme değildir.'
    };
  }

  function draftKey(entry) { return 'fm-play-draft:' + entry.id + ':' + entry.content_hash; }
  function readDraft(entry) {
    try {
      const draft = JSON.parse(localStorage.getItem(draftKey(entry)) || 'null');
      if (!draft || draft.schema !== 'fm_local_text_draft_v1') return null;
      if (draft.case_id !== entry.id || draft.content_hash !== entry.content_hash) return null;
      if (!draft.fields || typeof draft.fields !== 'object' || Array.isArray(draft.fields)) return null;
      return draft;
    } catch { return null; }
  }
  function writeDraft(entry, draft) {
    draft.schema = 'fm_local_text_draft_v1';
    draft.case_id = entry.id;
    draft.content_hash = entry.content_hash;
    draft.commit = manifest.commit;
    localStorage.setItem(draftKey(entry), JSON.stringify(draft));
  }
  function sourceText(entry, path) {
    if (path === 'story') return entry.payload.story || '';
    if (path === 'closing') return entry.closing || '';
    const card = path.match(/^(suspects|weapons|locations)\.([^.]+)\.description$/);
    if (card) {
      const entity = (entry.payload[card[1]] || []).find(item => item.id === card[2]);
      return entity ? entity.description || '' : '';
    }
    const clue = path.match(/^clues\.([^.]+)\.(text|deductionHint)$/);
    if (!clue) return '';
    const item = (entry.payload.clues || []).find(entryClue => entryClue.id === clue[1]);
    return item ? item[clue[2]] || '' : '';
  }
  function draftedPayload(entry) {
    const payload = JSON.parse(JSON.stringify(entry.payload));
    const draft = readDraft(entry);
    if (!draft) return payload;
    for (const [path, value] of Object.entries(draft.fields)) {
      if (!TEXT_PATH.test(path) || path === 'closing' || typeof value !== 'string') continue;
      if (path === 'story') { payload.story = value; continue; }
      const card = path.match(/^(suspects|weapons|locations)\.([^.]+)\.description$/);
      if (card) {
        const entity = (payload[card[1]] || []).find(item => item.id === card[2]);
        if (entity) entity.description = value;
        continue;
      }
      const clue = path.match(/^clues\.([^.]+)\.(text|deductionHint)$/);
      const item = clue && (payload.clues || []).find(entryClue => entryClue.id === clue[1]);
      if (item) item[clue[2]] = value;
    }
    return payload;
  }
  function revisionPackage(entry) {
    const draft = readDraft(entry);
    const changes = [];
    for (const [path, after] of Object.entries(draft ? draft.fields : {})) {
      if (!TEXT_PATH.test(path) || typeof after !== 'string') continue;
      const before = sourceText(entry, path);
      if (after === before) continue;
      changes.push({ path, before, after });
    }
    return {
      schema: 'fm_local_text_revision_v1',
      approval: 'not_reviewed',
      logic_safety: 'not_assessed',
      publication: 'not_performed',
      case_id: entry.id,
      commit: manifest.commit,
      content_hash: entry.content_hash,
      changes,
      note: LOCAL_LABEL + '. Kalite onayı, sertifika veya yayımlama değildir.'
    };
  }
  function setDraftStatus(message) {
    const status = document.getElementById('fm-play-draft-status');
    if (status) status.textContent = message;
  }
  function markSpoiler(entry, field) {
    const state = currentState(entry);
    const fields = new Set(state.spoiler_fields || []);
    fields.add(field);
    state.spoiler_fields = [...fields];
    writeState(entry, state);
    refreshStatus(entry);
  }
  function childBy(host, path, key) {
    return [...(host.children || [])].find(child => child.dataset && child.dataset[key] === path) || null;
  }
  function placeEditor(entry, anchor, path, label) {
    if (!TEXT_PATH.test(path) || !anchor) return;
    const host = anchor.parentElement || anchor;
    if (childBy(host, path, 'fmEdit')) {
      markDrafted(host, entry, path);
      return;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fm-edit-btn';
    button.dataset.fmEdit = path;
    button.textContent = 'Metni düzenle';
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      openEditor(entry, path, label, button);
    });
    if (anchor.after) anchor.after(button);
    else host.append(button);
    markDrafted(host, entry, path);
  }
  function markDrafted(host, entry, path) {
    const draft = readDraft(entry);
    const changed = !!(draft && draft.fields[path] !== undefined && draft.fields[path] !== sourceText(entry, path));
    const existing = childBy(host, path, 'fmDraft');
    if (!changed) { if (existing) existing.remove(); return; }
    if (existing) return;
    const tag = document.createElement('p');
    tag.className = 'fm-draft-tag';
    tag.dataset.fmDraft = path;
    tag.textContent = LOCAL_LABEL;
    host.append(tag);
  }
  function attachTextEditors(entry) {
    if (!entry || !entry.payload) return;
    const story = document.querySelector('.story-copy');
    if (story) placeEditor(entry, story, 'story', 'Hikâye');
    (entry.payload.clues || []).forEach((clue, index) => {
      const card = document.getElementById('clue' + index);
      if (!card || !clue || !clue.id) return;
      const body = card.querySelector('.clue-text');
      if (body) placeEditor(entry, body, 'clues.' + clue.id + '.text', 'İpucu ' + clue.id);
      const hint = document.getElementById('ded' + index);
      if (hint) placeEditor(entry, hint, 'clues.' + clue.id + '.deductionHint', 'Yönlendirici soru ' + clue.id);
    });
    refreshDraftBanner(entry);
  }
  function refreshDraftBanner(entry) {
    const shell = document.getElementById('fm-play-shell');
    if (!shell) return;
    let banner = document.getElementById('fm-play-draft-banner');
    if (!revisionPackage(entry).changes.length) { if (banner) banner.remove(); return; }
    if (!banner) {
      banner = document.createElement('p');
      banner.id = 'fm-play-draft-banner';
      banner.className = 'fm-draft-banner';
      shell.prepend(banner);
    }
    banner.textContent = LOCAL_LABEL;
  }
  function openEditor(entry, path, label, anchor) {
    if (path === 'closing') markSpoiler(entry, 'closing');
    const open = document.querySelector('.fm-editor');
    if (open) open.remove();
    const form = document.createElement('form');
    form.className = 'fm-editor';
    form.addEventListener('submit', event => event.preventDefault());
    const heading = document.createElement('strong');
    heading.textContent = label;
    const area = document.createElement('textarea');
    const draft = readDraft(entry);
    area.value = draft && draft.fields[path] !== undefined ? draft.fields[path] : sourceText(entry, path);
    const note = document.createElement('p');
    note.className = 'fm-editor-note';
    note.textContent = 'Kaydetmek oyuna yayımlamaz ve kalite onayı vermez.';
    const row = document.createElement('div');
    row.className = 'fm-actions';
    row.append(
      editorButton('Kaydet', () => saveField(entry, path, area.value)),
      editorButton('Vazgeç', () => form.remove()),
      editorButton('Alanı kaynak sürüme döndür', () => revertField(entry, path))
    );
    form.append(heading, area, note, row);
    if (anchor.after) anchor.after(form);
    else anchor.parentElement.append(form);
  }
  function editorButton(label, action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      action();
    });
    return button;
  }
  function saveField(entry, path, value) {
    if (!String(value || '').trim()) { setDraftStatus('Metin boş bırakılamaz.'); return; }
    const draft = readDraft(entry) || { fields: {} };
    if (value === sourceText(entry, path)) delete draft.fields[path];
    else draft.fields[path] = value;
    if (Object.keys(draft.fields).length) writeDraft(entry, draft);
    else localStorage.removeItem(draftKey(entry));
    setDraftStatus(LOCAL_LABEL);
    reloadPlay(entry);
  }
  function revertField(entry, path) {
    const draft = readDraft(entry);
    if (draft) {
      delete draft.fields[path];
      if (Object.keys(draft.fields).length) writeDraft(entry, draft);
      else localStorage.removeItem(draftKey(entry));
    }
    setDraftStatus('Alan kaynak sürüme döndü.');
    reloadPlay(entry);
  }
  function resetDraft(entry) {
    if (!window.confirm('Bütün yerel metin değişiklikleri silinsin mi? Kaynağa yazılmaz.')) return;
    localStorage.removeItem(draftKey(entry));
    setDraftStatus('Yerel metinler kaynak sürüme döndü.');
    reloadPlay(entry);
  }
  function reloadPlay(entry) {
    writeState(entry, currentState(entry));
    document.getElementById('jsonIn').value = JSON.stringify(draftedPayload(entry));
    window.loadCase();
    if (window.closeEnt) window.closeEnt();
  }
  async function copyRevision(entry) {
    const pack = revisionPackage(entry);
    if (!pack.changes.length) { setDraftStatus('Kopyalanacak yerel değişiklik yok.'); return; }
    try {
      await navigator.clipboard.writeText(JSON.stringify(pack, null, 2));
      setDraftStatus('Değişiklik paketi kopyalandı. GitHub’a gönderilmedi.');
    } catch { setDraftStatus('Kopyalanamadı. İndirmeyi kullan.'); }
  }
  function downloadRevision(entry) {
    const pack = revisionPackage(entry);
    if (!pack.changes.length) { setDraftStatus('İndirilecek yerel değişiklik yok.'); return; }
    const blob = new Blob([JSON.stringify(pack, null, 2) + '\n'], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'fm-text-' + entry.id + '-' + entry.content_hash.slice(0, 12) + '.json';
    link.click();
    URL.revokeObjectURL(link.href);
    setDraftStatus('Değişiklik paketi indirildi. GitHub’a gönderilmedi.');
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
