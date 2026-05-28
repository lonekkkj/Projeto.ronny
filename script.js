/* =========================================================
   Ronny — Script principal (multi-página)
   - index.html: role gate
   - aluno.html: perfil editável + tabs + Blockly
   - professor.html: dashboards de turma e individual
   ========================================================= */

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const yEl = $('#year'); if (yEl) yEl.textContent = new Date().getFullYear();

  /* ---------- Menu mobile ---------- */
  const menuToggle = $('#menuToggle');
  const nav = $('.nav');
  menuToggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
  });
  $$('.nav a').forEach(a => a.addEventListener('click', () => {
    nav?.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  }));

  /* ---------- Role gate (index) ---------- */
  const roleGate = $('#roleGate');
  if (roleGate) {
    const openRoleGate = () => { roleGate.hidden = false; };
    const closeRoleGate = () => { roleGate.hidden = true; };
    roleGate.addEventListener('click', e => { if (e.target.hasAttribute('data-role-close')) closeRoleGate(); });
    $$('[data-open-login]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); openRoleGate(); }));
    if (!sessionStorage.getItem('ronny:gateShown')) {
      sessionStorage.setItem('ronny:gateShown', '1');
      setTimeout(openRoleGate, 500);
    }
  }

  /* ---------- Painel de acessibilidade ---------- */
  const a11yPanel = $('#a11yPanel');
  if (a11yPanel) {
    const openA11y = () => { a11yPanel.hidden = false; };
    const closeA11y = () => { a11yPanel.hidden = true; };
    $('#openA11y')?.addEventListener('click', openA11y);
    $('#closeA11y')?.addEventListener('click', closeA11y);
    $('#footerA11y')?.addEventListener('click', e => { e.preventDefault(); openA11y(); });

    const prefs = JSON.parse(localStorage.getItem('ronny:a11y') || '{}');
    const applyPref = (key, val) => {
      document.body.dataset[key] = val;
      prefs[key] = val;
      localStorage.setItem('ronny:a11y', JSON.stringify(prefs));
    };
    ['theme','font','motion','reduce'].forEach(k => { if (prefs[k]) document.body.dataset[k] = prefs[k]; });

    const syncSeg = () => {
      $$('.seg button[data-font]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.font === document.body.dataset.font)));
      $$('.seg button[data-theme]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.theme === document.body.dataset.theme)));
    };
    syncSeg();
    $$('.seg button[data-font]').forEach(b => b.addEventListener('click', () => { applyPref('font', b.dataset.font); syncSeg(); }));
    $$('.seg button[data-theme]').forEach(b => b.addEventListener('click', () => { applyPref('theme', b.dataset.theme); syncSeg(); }));
    $('#motionToggle')?.addEventListener('change', e => applyPref('motion', e.target.checked ? 'on' : 'off'));
    $('#reduceToggle')?.addEventListener('change', e => applyPref('reduce', e.target.checked ? 'on' : 'off'));

    let readerOn = false;
    $('#readerToggle')?.addEventListener('change', e => {
      readerOn = e.target.checked;
      document.body.style.cursor = readerOn ? 'help' : '';
    });
    document.addEventListener('click', e => {
      if (!readerOn) return;
      const el = e.target.closest('p, h1, h2, h3, li, button, a');
      if (!el || !el.textContent.trim()) return;
      if (!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(el.textContent.trim());
      u.lang = 'pt-BR'; u.rate = .95;
      speechSynthesis.speak(u);
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeA11y(); if (roleGate) roleGate.hidden = true; }
    });
  }

  let soundOn = false;
  $('#soundToggle')?.addEventListener('change', e => soundOn = e.target.checked);
  const beep = (freq = 440, dur = .15) => {
    if (!soundOn) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = freq; g.gain.value = .04;
      o.connect(g).connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + dur);
    } catch {}
  };

  /* ---------- Tabs (aluno / professor) ---------- */
  function activateTab(tabId) {
    const btn = document.querySelector(`.tab[data-tab="${tabId}"]`);
    if (!btn) return;
    const tablist = btn.closest('[role="tablist"]');
    const scope = tablist.parentElement;
    tablist.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', String(b === btn)));
    scope.querySelectorAll(':scope > .tab-panel').forEach(p => p.hidden = (p.id !== tabId));
    if (tabId === 'aluno-programar') setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
  }
  document.addEventListener('click', e => {
    const tabBtn = e.target.closest('.tab[data-tab]');
    if (tabBtn) { activateTab(tabBtn.dataset.tab); return; }
    const goto = e.target.closest('[data-goto-tab]');
    if (goto) activateTab(goto.dataset.gotoTab);
  });

  $('#focusMode')?.addEventListener('click', e => {
    const btn = e.currentTarget;
    const on = document.body.classList.toggle('focus-on');
    btn.textContent = on ? '🌤 Desativar modo foco' : '🎧 Ativar modo foco';
    if (on) activateTab('aluno-programar');
  });

  /* =========================================================
     PERFIL EDITÁVEL DO ALUNO (aluno.html)
     ========================================================= */
  const profileForm = $('#profileForm');
  if (profileForm) {
    const saved = JSON.parse(localStorage.getItem('ronny:perfil') || '{}');
    const fields = {
      nome: $('#fNome'), escola: $('#fEscola'), turma: $('#fTurma'),
      nivel: $('#fNivel'), bio: $('#fBio')
    };
    Object.entries(saved).forEach(([k,v]) => { if (fields[k] && v != null) fields[k].value = v; });
    if (saved.avatar) {
      const av = saved.avatar;
      $('#profAvatar').textContent = av;
      $('#sideAvatar') && ($('#sideAvatar').textContent = av);
      $$('.avatar-chip').forEach(b => b.setAttribute('aria-checked', String(b.dataset.emoji === av)));
    }
    const syncSide = () => {
      const firstName = (fields.nome.value || 'Aluno').trim().split(' ')[0];
      $('#alunoNome') && ($('#alunoNome').textContent = firstName);
      $('#sideNivel') && ($('#sideNivel').textContent = fields.nivel.value || '');
    };
    syncSide();

    $$('.avatar-chip').forEach(b => b.addEventListener('click', () => {
      $$('.avatar-chip').forEach(x => x.setAttribute('aria-checked','false'));
      b.setAttribute('aria-checked','true');
      const em = b.dataset.emoji;
      $('#profAvatar').textContent = em;
      $('#sideAvatar') && ($('#sideAvatar').textContent = em);
    }));

    profileForm.addEventListener('submit', e => {
      e.preventDefault();
      const avatar = ($$('.avatar-chip').find(b => b.getAttribute('aria-checked') === 'true')?.dataset.emoji) || '🦊';
      const data = {
        avatar,
        nome: fields.nome.value, escola: fields.escola.value, turma: fields.turma.value,
        nivel: fields.nivel.value, bio: fields.bio.value
      };
      localStorage.setItem('ronny:perfil', JSON.stringify(data));
      syncSide();
      const msg = $('#profileSaved');
      if (msg) { msg.textContent = '✓ Perfil salvo'; setTimeout(() => msg.textContent = '', 2500); }
    });
  }

  /* =========================================================
     PROFESSOR — troca de aluno individual
     ========================================================= */
  const indSelect = $('#indSelect');
  if (indSelect) {
    const STUDENTS = {
      lara:  { name: 'Lara M.',  avatar: '🦊', meta: 'Nível 3 · Explorador da Lógica · Turma 3ºA', foco: '22', hes: '9',  tent: '2,1', evo: '+18', chart: [25,40,50,55,68,74,82], plan: ['Reforçar repetições com blocos visuais','Trabalhar condicionais simples (se / senão)','Pausas guiadas a cada 15 min','Relatório AEE atualizado semanalmente'] },
      joao:  { name: 'João P.',  avatar: '🐼', meta: 'Nível 2 · Aprendiz · Turma 3ºA',              foco: '15', hes: '18', tent: '3,2', evo: '+8',  chart: [20,28,35,30,42,48,55], plan: ['Quebrar missões em passos menores','Apoio com leitor de texto','Revisar sequências básicas'] },
      sofia: { name: 'Sofia R.', avatar: '🐨', meta: 'Nível 4 · Avançada · Turma 3ºA',              foco: '28', hes: '6',  tent: '1,6', evo: '+22', chart: [45,55,60,68,72,80,88], plan: ['Introduzir funções','Desafios de lógica combinada','Mentoria entre pares'] },
      davi:  { name: 'Davi L.',  avatar: '🦁', meta: 'Nível 2 · Aprendiz · Turma 3ºA',              foco: '12', hes: '22', tent: '3,8', evo: '+5',  chart: [18,22,28,32,30,38,42], plan: ['Ambiente com menos estímulos','Sessões mais curtas (10 min)','Reforço positivo a cada etapa'] }
    };
    function renderStudent(id) {
      const s = STUDENTS[id]; if (!s) return;
      $('#indAvatar').textContent = s.avatar;
      $('#indName').textContent = s.name;
      $('#indMeta').textContent = s.meta;
      $('#indFoco').innerHTML = `${s.foco}<span>min</span>`;
      $('#indHes').innerHTML  = `${s.hes}<span>%</span>`;
      $('#indTent').textContent = s.tent;
      $('#indEvo').innerHTML  = `${s.evo}<span>%</span>`;
      $('#indChart').innerHTML = s.chart.map(h => `<div style="--h:${h}%"></div>`).join('');
      $('#indPlan').innerHTML = s.plan.map(p => `<li>${p}</li>`).join('');
      indSelect.value = id;
    }
    indSelect.addEventListener('change', e => renderStudent(e.target.value));
    document.addEventListener('click', e => {
      const b = e.target.closest('[data-student-btn]');
      if (!b) return;
      renderStudent(b.dataset.studentBtn);
      activateTab('prof-individual');
    });
  }

  /* =========================================================
     BLOCKLY — apenas em páginas com #blocklyDiv
     ========================================================= */
  const blocklyDiv = $('#blocklyDiv');
  if (!blocklyDiv || typeof Blockly === 'undefined') return;

  // Blocos customizados — Robô (Movimento/Lógica)
  Blockly.Blocks['ronny_avancar'] = { init() { this.appendDummyInput().appendField('→ avançar 1 passo'); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour('#7fb59a'); this.setTooltip('Move o robô uma casa para frente'); } };
  Blockly.Blocks['ronny_virar_esq'] = { init() { this.appendDummyInput().appendField('↺ virar à esquerda'); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour('#7fb59a'); } };
  Blockly.Blocks['ronny_virar_dir'] = { init() { this.appendDummyInput().appendField('↻ virar à direita'); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour('#7fb59a'); } };
  Blockly.Blocks['ronny_dizer'] = { init() { this.appendValueInput('MSG').setCheck(null).appendField('💬 dizer'); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour('#7fb59a'); } };
  Blockly.Blocks['ronny_tem_obstaculo'] = { init() { this.appendDummyInput().appendField('🚧 tem obstáculo à frente?'); this.setOutput(true, 'Boolean'); this.setColour('#d6a96a'); } };
  Blockly.Blocks['ronny_chegou'] = { init() { this.appendDummyInput().appendField('🌱 chegou ao objetivo?'); this.setOutput(true, 'Boolean'); this.setColour('#d6a96a'); } };

  // Blocos Python prontos (apenas arrastar)
  const PY = '#4b8bbe';
  Blockly.Blocks['py_declarar_int'] = { init(){ this.appendDummyInput()
      .appendField('🐍 declarar inteiro').appendField(new Blockly.FieldTextInput('x'),'NOME').appendField('=');
      this.appendValueInput('VAL').setCheck('Number');
      this.setInputsInline(true); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(PY); } };
  Blockly.Blocks['py_declarar_str'] = { init(){ this.appendDummyInput()
      .appendField('🐍 declarar texto').appendField(new Blockly.FieldTextInput('nome'),'NOME').appendField('=');
      this.appendValueInput('VAL').setCheck('String');
      this.setInputsInline(true); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(PY); } };
  Blockly.Blocks['py_imprimir'] = { init(){ this.appendValueInput('MSG').appendField('🖨 print(');
      this.appendDummyInput().appendField(')');
      this.setInputsInline(true); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(PY); } };
  Blockly.Blocks['py_imprimir_var'] = { init(){ this.appendDummyInput()
      .appendField('🖨 print(').appendField(new Blockly.FieldTextInput('x'),'NOME').appendField(')');
      this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(PY); } };
  Blockly.Blocks['py_somar'] = { init(){ this.appendDummyInput()
      .appendField('➕ ').appendField(new Blockly.FieldTextInput('soma'),'NOME').appendField('=');
      this.appendValueInput('A').setCheck('Number');
      this.appendDummyInput().appendField('+');
      this.appendValueInput('B').setCheck('Number');
      this.setInputsInline(true); this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(PY); } };
  Blockly.Blocks['py_ler_var'] = { init(){ this.appendDummyInput()
      .appendField(new Blockly.FieldTextInput('x'),'NOME');
      this.setOutput(true, null); this.setColour(PY); } };

  const JG = Blockly.JavaScript;
  JG.forBlock = JG.forBlock || {};
  const addGen = (name, fn) => { JG.forBlock[name] = fn; JG[name] = fn; };
  addGen('ronny_avancar', () => 'await api.avancar();\n');
  addGen('ronny_virar_esq', () => 'await api.virarEsq();\n');
  addGen('ronny_virar_dir', () => 'await api.virarDir();\n');
  addGen('ronny_dizer', (block) => { const msg = JG.valueToCode(block, 'MSG', JG.ORDER_NONE) || "''"; return `await api.dizer(${msg});\n`; });
  addGen('ronny_tem_obstaculo', () => ['api.temObstaculo()', JG.ORDER_FUNCTION_CALL]);
  addGen('ronny_chegou', () => ['api.chegou()', JG.ORDER_FUNCTION_CALL]);

  const safeName = (n) => 'v_' + String(n||'x').replace(/[^a-zA-Z0-9_]/g,'_');
  addGen('py_declarar_int', (b) => { const n = safeName(b.getFieldValue('NOME')); const v = JG.valueToCode(b,'VAL',JG.ORDER_NONE)||'0'; return `${n} = parseInt(${v});\n`; });
  addGen('py_declarar_str', (b) => { const n = safeName(b.getFieldValue('NOME')); const v = JG.valueToCode(b,'VAL',JG.ORDER_NONE)||"''"; return `${n} = String(${v});\n`; });
  addGen('py_imprimir', (b) => { const v = JG.valueToCode(b,'MSG',JG.ORDER_NONE)||"''"; return `api.imprimir(${v});\n`; });
  addGen('py_imprimir_var', (b) => { const n = safeName(b.getFieldValue('NOME')); return `api.imprimir(typeof ${n}!=='undefined'?${n}:'(${b.getFieldValue('NOME')} indefinido)');\n`; });
  addGen('py_somar', (b) => { const n = safeName(b.getFieldValue('NOME')); const a = JG.valueToCode(b,'A',JG.ORDER_NONE)||'0'; const c = JG.valueToCode(b,'B',JG.ORDER_NONE)||'0'; return `${n} = (${a})+(${c});\n`; });
  addGen('py_ler_var', (b) => [safeName(b.getFieldValue('NOME')), JG.ORDER_ATOMIC]);

  const MISSIONS = [
    { id:'m1', title:'Missão 1 — Caminho reto', desc:'Leve o robô 🤖 até a planta 🌱 andando em linha reta.', level:'Fácil', time:'5 min', size:5, start:{x:0,y:2,dir:1}, goal:{x:4,y:2}, walls:[], hint:'Use 4 blocos "avançar".' },
    { id:'m2', title:'Missão 2 — Use repetição', desc:'Mesmo caminho, mas use o bloco "repetir" para encurtar.', level:'Fácil', time:'6 min', size:5, start:{x:0,y:2,dir:1}, goal:{x:4,y:2}, walls:[], hint:'Coloque "avançar" dentro de "repetir 4 vezes".' },
    { id:'m3', title:'Missão 3 — Curva à direita', desc:'Avance, vire à direita e continue até a planta.', level:'Médio', time:'8 min', size:5, start:{x:0,y:0,dir:1}, goal:{x:3,y:3}, walls:[], hint:'Combine "avançar" e "virar à direita".' },
    { id:'m4', title:'Missão 4 — Desviar do obstáculo', desc:'Há um muro no caminho. Use a condição "se tem obstáculo".', level:'Médio', time:'10 min', size:5, start:{x:0,y:2,dir:1}, goal:{x:4,y:2}, walls:[{x:2,y:2}], hint:'Se tem obstáculo → vire, avance, vire de novo.' },
    { id:'m5', title:'Missão 5 — Python: variável e print', desc:'Use os blocos 🐍 Python para declarar uma variável inteira e imprimir seu valor na tela.', level:'Difícil', time:'8 min', python:true, expected:['10'], hint:'Arraste "declarar inteiro x = 10" e depois "print(x)".' },
    { id:'m6', title:'Missão 6 — Python: soma e print', desc:'Declare duas variáveis inteiras, some-as e imprima o resultado.', level:'Difícil', time:'10 min', python:true, expected:['7'], hint:'Use "declarar inteiro", o bloco "soma = a + b" e "print(soma)".' },
    { id:'m7', title:'Missão 7 — Python: olá mundo', desc:'Imprima a mensagem "Olá, mundo!" usando o bloco print.', level:'Difícil', time:'5 min', python:true, expected:['Olá, mundo!'], hint:'Arraste o bloco print com o texto "Olá, mundo!".' },
    { id:'m8', title:'Missão 8 — Livre', desc:'Sem objetivo. Explore os blocos no seu ritmo. 🌿', level:'Livre', time:'à vontade', size:6, start:{x:0,y:0,dir:1}, goal:null, walls:[] }
  ];


  const list = $('#missionList');
  MISSIONS.forEach(m => {
    const card = document.createElement('article');
    card.className = 'mission-card';
    card.innerHTML = `
      <div class="mission-top"><span class="mission-level lvl-${m.level.toLowerCase()}">${m.level}</span><span class="muted small">⏱ ${m.time}</span></div>
      <h3>${m.title}</h3><p class="muted">${m.desc}</p>
      <button class="btn btn-primary btn-sm" data-mission="${m.id}">Abrir atividade</button>`;
    list.appendChild(card);
  });
  list?.addEventListener('click', e => {
    const btn = e.target.closest('[data-mission]'); if (!btn) return;
    loadMission(btn.dataset.mission);
    activateTab('aluno-programar');
  });

  let current = MISSIONS[0];
  let robot = { x:0, y:0, dir:1 };
  let said = '';
  let pyOutput = [];
  const stageGrid = $('#stageGrid');
  const stageConsole = $('#stageConsole');
  const feedback = $('#feedback');
  const nextBtn = $('#nextBtn');

  function setFeedback(msg, type = '') { feedback.textContent = msg; feedback.className = 'feedback ' + type; }
  function renderGrid() {
    if (!current.size) { stageGrid.innerHTML = ''; return; }
    const n = current.size;
    stageGrid.style.setProperty('--n', n);
    stageGrid.innerHTML = '';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const c = document.createElement('div');
        c.className = 'cell';
        if ((current.walls||[]).some(w => w.x === x && w.y === y)) c.classList.add('wall');
        if (current.goal && current.goal.x === x && current.goal.y === y) { c.classList.add('goal-cell'); c.textContent = '🌱'; }
        if (robot.x === x && robot.y === y) {
          c.classList.add('robot-cell');
          const r = document.createElement('span');
          r.className = 'robot-mark';
          r.style.transform = `rotate(${robot.dir * 90}deg)`;
          r.textContent = '🤖';
          c.appendChild(r);
        }
        stageGrid.appendChild(c);
      }
    }
  }
  function renderConsole() {
    if (!stageConsole) return;
    stageConsole.textContent = pyOutput.length ? pyOutput.join('\n') : '# saída do print() aparece aqui';
  }
  function loadMission(id) {
    current = MISSIONS.find(m => m.id === id) || MISSIONS[0];
    robot = current.start ? { ...current.start } : { x:0,y:0,dir:1 };
    said = ''; pyOutput = [];
    $('#missionTitle').textContent = current.title;
    $('#missionDesc').textContent = current.desc + (current.hint ? ' 💡 ' + current.hint : '');
    $('#stageTitle').textContent = current.title;
    if (current.python) {
      stageGrid.hidden = true; stageConsole.hidden = false; renderConsole();
    } else {
      stageGrid.hidden = false; stageConsole.hidden = true; renderGrid();
    }
    if (nextBtn) nextBtn.hidden = true;
    if (workspace) workspace.clear();
    setFeedback('Pronto quando você estiver 😊');
  }

  const stepDelay = () => (document.body.dataset.motion === 'off' ? 60 : 380);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const dx = [0,1,0,-1], dy = [-1,0,1,0];
  const frontCell = () => ({ x: robot.x + dx[robot.dir], y: robot.y + dy[robot.dir] });
  const inBounds = c => c.x >= 0 && c.y >= 0 && c.x < current.size && c.y < current.size;
  const isWall = c => (current.walls||[]).some(w => w.x === c.x && w.y === c.y);

  const api = {
    async avancar() {
      const f = frontCell();
      if (!inBounds(f) || isWall(f)) { setFeedback('Ops, tem um obstáculo à frente. Tudo bem — tente outro caminho 🌿', 'gentle'); throw new Error('block'); }
      robot.x = f.x; robot.y = f.y; renderGrid(); beep(440, .05); await sleep(stepDelay());
    },
    async virarEsq() { robot.dir = (robot.dir + 3) % 4; renderGrid(); beep(360, .05); await sleep(stepDelay()/2); },
    async virarDir() { robot.dir = (robot.dir + 1) % 4; renderGrid(); beep(520, .05); await sleep(stepDelay()/2); },
    async dizer(msg) { said = String(msg); setFeedback('💬 ' + said); await sleep(stepDelay()); },
    temObstaculo() { const f = frontCell(); return !inBounds(f) || isWall(f); },
    chegou() { return !!(current.goal && current.goal.x === robot.x && current.goal.y === robot.y); },
    imprimir(v) { pyOutput.push(String(v)); renderConsole(); }
  };

  const workspace = Blockly.inject('blocklyDiv', {
    toolbox: document.getElementById('ronnyToolbox'),
    grid: { spacing: 24, length: 3, colour: '#2a3545', snap: true },
    zoom: { controls: true, wheel: false, startScale: 0.95, maxScale: 1.4, minScale: 0.6 },
    trashcan: true, renderer: 'zelos',
    theme: Blockly.Theme.defineTheme('ronnyDark', {
      'base': Blockly.Themes.Classic,
      'componentStyles': {
        'workspaceBackgroundColour': '#151c24', 'toolboxBackgroundColour': '#1b2330',
        'toolboxForegroundColour': '#e6edf5', 'flyoutBackgroundColour': '#222c3b',
        'flyoutForegroundColour': '#e6edf5', 'scrollbarColour': '#2a3545',
        'insertionMarkerColour': '#7fb59a', 'insertionMarkerOpacity': 0.4
      },
      'fontStyle': { 'family': 'Lexend, sans-serif', 'size': 13 }
    })
  });

  const onResize = () => Blockly.svgResize(workspace);
  window.addEventListener('resize', onResize);
  setTimeout(onResize, 100);

  function showNextIfAvailable() {
    if (!nextBtn) return;
    const idx = MISSIONS.findIndex(m => m.id === current.id);
    if (idx >= 0 && idx < MISSIONS.length - 1) {
      nextBtn.hidden = false;
      nextBtn.dataset.next = MISSIONS[idx + 1].id;
    }
  }
  nextBtn?.addEventListener('click', () => {
    const nx = nextBtn.dataset.next;
    if (nx) loadMission(nx);
  });

  $('#clearBtn')?.addEventListener('click', () => { workspace.clear(); pyOutput = []; renderConsole(); setFeedback('Espaço limpo. Recomece quando quiser 🌿'); });
  $('#resetBtn')?.addEventListener('click', () => {
    robot = current.start ? { ...current.start } : { x:0,y:0,dir:1 };
    pyOutput = [];
    if (current.python) renderConsole(); else renderGrid();
    if (nextBtn) nextBtn.hidden = true;
    setFeedback('Tudo no lugar de novo 🌿');
  });
  $('#runBtn')?.addEventListener('click', async () => {
    robot = current.start ? { ...current.start } : { x:0,y:0,dir:1 };
    pyOutput = [];
    if (current.python) renderConsole(); else renderGrid();
    if (nextBtn) nextBtn.hidden = true;
    setFeedback('Executando com calma...');
    let code = '';
    try { code = Blockly.JavaScript.workspaceToCode(workspace); }
    catch { setFeedback('Não consegui ler os blocos. Tente revisar a montagem 💛', 'gentle'); return; }
    if (!code.trim()) { setFeedback('Adicione alguns blocos primeiro 🧩', 'gentle'); return; }
    try {
      const fn = new Function('api', `return (async () => { ${code} })();`);
      await fn(api);
    } catch (err) {
      if (err && err.message !== 'block') { console.warn(err); setFeedback('Algo travou no caminho. Sem problema — vamos tentar de novo 🌿', 'gentle'); }
    }
    if (current.python) {
      const expected = current.expected || [];
      const ok = expected.length === 0 || expected.every(e => pyOutput.map(s=>s.trim()).includes(String(e).trim()));
      if (ok && pyOutput.length) { setFeedback('Saída correta! 🐍✨ Boa missão!', 'success'); beep(660,.2); showNextIfAvailable(); }
      else setFeedback('Quase lá 😊 Esperado: ' + (expected.join(', ') || '(qualquer saída)') + '. Ajuste os blocos.', 'gentle');
    } else if (current.goal) {
      if (api.chegou()) { setFeedback('Você chegou! 🌱 Boa missão!', 'success'); beep(660, .2); showNextIfAvailable(); }
      else setFeedback('Quase lá 😊 Ajuste os blocos e tente de novo.', 'gentle');
    } else {
      setFeedback('Execução concluída 🌿' + (said ? ' — você disse: "' + said + '"' : ''), 'success');
      showNextIfAvailable();
    }
  });

  loadMission('m1');
})();

