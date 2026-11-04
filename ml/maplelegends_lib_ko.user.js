// ==UserScript==
// @name         MapleLegends 라이브러리 한국어 번역
// @namespace    maplelegends-ko
// @version      1.2
// @description  legends.ml/lib (아이템·몬스터·맵·NPC·퀘스트·스킬 DB)을 한국어로 보여 줍니다. 이름은 한국 메이플 공식 명칭 우선, 없는 것은 번역.
// @updateURL    https://raw.githubusercontent.com/yallo3328/asgard-ko/main/ml/maplelegends_lib_ko.user.js
// @downloadURL  https://raw.githubusercontent.com/yallo3328/asgard-ko/main/ml/maplelegends_lib_ko.user.js
// @match        https://legends.ml/lib*
// @run-at       document-start
// @grant        none
// ==/UserScript==
(function () {
  'use strict';
  const BASE = 'https://raw.githubusercontent.com/yallo3328/asgard-ko/main/ml/';
  const VER = '3';
  const TYPES = ['ui', 'item', 'mob', 'npc', 'map', 'quest', 'skill', 'idx'];

  // 번역 전 영어가 잠깐 보이지 않게 가림 (최대 2.5초)
  const hide = document.createElement('style');
  hide.textContent = 'body{visibility:hidden}';
  (function add() { const r = document.head || document.documentElement; if (r) r.appendChild(hide); else setTimeout(add, 0); })();
  const reveal = () => hide.remove();
  setTimeout(reveal, 2500);

  // 사전: localStorage에 버전별로 저장 → 두 번째부터는 즉시 로드
  function load(name) {
    const key = 'mlko:' + VER + ':' + name;
    try { const c = localStorage.getItem(key); if (c) return Promise.resolve(JSON.parse(c)); } catch (e) {}
    return fetch(BASE + name + '.json', { cache: 'no-cache' }).then(r => r.ok ? r.text() : '{}').then(t => {
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) { const k = localStorage.key(i); if (k && k.startsWith('mlko:') && !k.startsWith('mlko:' + VER + ':')) localStorage.removeItem(k); }
        localStorage.setItem(key, t);
      } catch (e) {}
      return JSON.parse(t);
    }).catch(() => ({}));
  }

  let IDX = {}, D = {}, UI = { exact: {}, cats: {}, labels: {}, regions: {} };
  const ITEM_PAGES = { equip: 1, use: 1, setup: 1, etc: 1, cash: 1, item: 1 };
  const typeOf = p => ITEM_PAGES[p] ? 'item' : (p === 'monster' ? 'mob' : p);
  const HAS_LATIN = /[A-Za-z]/;
  const digits = s => (s.match(/\d+/g) || []);

  // 영어 원문 숫자와 번역 숫자가 다르면 원문 숫자로 맞춤 (층수·% 등 버전 차이 보정)
  function syncDigits(en, ko) {
    const a = digits(en), b = digits(ko);
    if (!a.length || a.join() === b.join() || a.length !== b.length) return ko;
    let i = 0; return ko.replace(/\d+/g, () => a[i++]);
  }

  function nameFor(type, id, en) {
    const d = D[type]; if (!d) return null;
    const v = d[String(+id)]; if (!v) return null;
    if (type === 'map') {
      const [st, nm] = v;
      const m = en.match(/^(.*?):\s+(.*)$/);
      if (m) return (st || UI.exact[m[1].trim()] || m[1]) + ': ' + syncDigits(m[2], nm);
      return syncDigits(en, nm);
    }
    return syncDigits(en, v);
  }

  // "라벨: 값" 형식
  function trValue(v) {
    v = v.trim();
    if (UI.cats[v]) return UI.cats[v];
    let m = v.match(/^(\w[\w ]*?) \((\d+)\)$/); // Fast (4)
    if (m && UI.cats[m[1]]) return UI.cats[m[1]] + ' (' + m[2] + ')';
    if (v.includes(',') && v.split(',').every(x => UI.cats[x.trim()])) return v.split(',').map(x => UI.cats[x.trim()]).join(', ');
    return v;
  }
  const PATTERNS = [
    [/^Show all (\d+) locations$/, (m) => '위치 ' + m[1] + '곳 모두 보기'],
    [/^Show all (\d+)$/, (m) => m[1] + '개 모두 보기'],
    [/^Showing ([\d,]+)-([\d,]+) of ([\d,]+)$/, (m) => '전체 ' + m[3] + '개 중 ' + m[1] + '-' + m[2]],
    [/^\[Master Level : (\d+)\]$/, (m) => '[마스터 레벨 : ' + m[1] + ']'],
    [/^EXP ([\d,]+) · HP ([\d,]+)$/, (m) => '경험치 ' + m[1] + ' · HP ' + m[2]],
    [/^Lv\. (\d+)$/, (m) => 'Lv. ' + m[1]],
    [/^Level: All Levels \(([\d,]+)\)$/, (m) => '레벨: 모든 레벨 (' + m[1] + ')'],
    [/^Region: (.+)$/, (m) => '지역: ' + (UI.exact[m[1]] || m[1])],
    [/^Type: (.+)$/, (m) => '종류: ' + (UI.exact[m[1]] || m[1])],
    [/^Category: (.+)$/, (m) => '분류: ' + (UI.cats[m[1]] || UI.exact[m[1]] || m[1])],
    [/^(.+?) \(([\d,]+)\)$/, (m) => (UI.exact[m[1]] || UI.cats[m[1]]) ? (UI.exact[m[1]] || UI.cats[m[1]]) + ' (' + m[2] + ')' : null],
    [/^([A-Za-z][\w .'/-]*?):\s*(.*)$/, (m) => UI.labels[m[1]] ? UI.labels[m[1]] + ': ' + trValue(m[2]) : null],
    [/^(.+?) ([↑↓])$/, (m) => { const k = SORT[m[1]] || UI.exact[m[1]]; return k ? k + ' ' + m[2] : null; }],
    [/^(P\.ATT|M\.ATT|STR|DEX|INT|LUK|HP|MP|ACC|AVOID|W\.DEF|M\.DEF|Speed|Jump) ([+-][\d,]+)$/, (m) => (STATS[m[1]] || m[1]) + ' ' + m[2]],
    [/^Critical rate \+(\d+)%, critical damage \+(\d+)%$/, (m) => '크리티컬 확률 +' + m[1] + '%, 크리티컬 데미지 +' + m[2] + '%'],
  ];

  const SORT = { 'W.Attack': '공격력', 'M.Attack': '마력', 'W.Def': '물리 방어', 'M.Def': '마법 방어', 'Accuracy': '명중률', 'Avoid': '회피율', 'Attack Speed': '공격 속도', 'Level': '레벨', 'EXP': '경험치', 'Name': '이름', 'STR': 'STR', 'DEX': 'DEX', 'INT': 'INT', 'LUK': 'LUK', 'HP': 'HP', 'MP': 'MP', 'Price': '가격', 'ID': 'ID' };
  const STATS = { 'P.ATT': '공격력', 'M.ATT': '마력', 'ACC': '명중', 'AVOID': '회피', 'W.DEF': '물방', 'M.DEF': '마방', 'Speed': '이속', 'Jump': '점프' };
  function trPlain(t) {
    if (UI.exact[t] !== undefined) return UI.exact[t];
    if (UI.cats[t] !== undefined) return UI.cats[t];
    for (const [re, f] of PATTERNS) { const m = t.match(re); if (m) { const r = f(m); if (r != null) return r; } }
    return null;
  }

  // 지금 페이지의 주인공(아이템·몬스터 등) 이름
  let PAGE = null;
  function pageInfo() {
    const m = location.pathname.match(/\/lib\/(\w+)/);
    const id = new URLSearchParams(location.search).get('id');
    if (!m || !id) return null;
    const type = typeOf(m[1]);
    const en = (document.title || '').split(' — ')[0].trim();
    const ko = en ? nameFor(type, id, en) : null;
    return ko ? { en, ko } : null;
  }

  function setText(n, nv) { if (n.nodeValue !== nv) n.nodeValue = nv; } // 같은 값 재설정 → 감시기 무한루프 방지
  function trText(n) {
    const v = n.nodeValue; if (!v || !HAS_LATIN.test(v)) return;
    const t = v.replace(/\s+/g, ' ').trim(); if (!t) return;
    const p = n.parentElement; if (!p || /^(SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(p.nodeName)) return;
    if (p.closest('#mlko-suggest')) return;
    const a = p.closest('a[href*="?id="]');
    if (a) {
      const m = a.getAttribute('href').match(/\/lib\/(\w+)\?id=(\d+)/);
      if (m) { const ko = nameFor(typeOf(m[1]), m[2], t); if (ko) { setText(n, v.replace(v.trim(), ko)); return; } }
    }
    if (PAGE && t.startsWith(PAGE.en)) { setText(n, v.replace(PAGE.en, PAGE.ko).replace(' (Boss)', ' (보스)')); return; }
    const r = trPlain(t); if (r != null) setText(n, v.replace(v.trim(), r));
  }
  function trAttrs(root) {
    if (!root.querySelectorAll) return;
    root.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el => {
      for (const at of ['placeholder', 'title', 'aria-label']) {
        const v = el.getAttribute(at); if (!v || !HAS_LATIN.test(v)) continue;
        const r = UI.exact[v] || (v.startsWith('Search') || v.startsWith('Global search') ? '검색 (한글·영어, 초성 가능)' : null);
        if (r) el.setAttribute(at, r);
      }
    });
  }
  function walk(root) {
    if (root.nodeType === 3) return trText(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const a = []; while (w.nextNode()) a.push(w.currentNode);
    a.forEach(trText); trAttrs(root);
  }


  // ───────── 한국어 검색 ─────────
  // 검색창에 한글을 입력하면 사이트 검색 대신 번역 사전에서 찾아 바로가기 목록을 보여 줌.
  const HANGUL = /[ㄱ-ㅎㅏ-ㅣ가-힣]/;
  const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  const choOf = s => s.replace(/[가-힣]/g, c => CHO[Math.floor((c.charCodeAt(0) - 0xAC00) / 588)]);
  const norm = s => s.replace(/\s+/g, '').toLowerCase();
  const BADGE = { monster: '몬스터', npc: 'NPC', map: '맵', quest: '퀘스트', skill: '스킬', equip: '장비', use: '소비', setup: '설치', etc: '기타', cash: '캐시' };
  const ORDER = { monster: 0, equip: 1, use: 2, etc: 3, setup: 4, map: 5, npc: 6, quest: 7, skill: 8, cash: 9 };
  let INDEX = null;
  function buildIndex() {
    INDEX = [];
    for (const path in IDX) {
      const d = D[typeOf(path)]; if (!d) continue;
      for (const id of IDX[path]) {
        const v = d[String(id)]; if (!v) continue;
        const ko = Array.isArray(v) ? (v[0] ? v[0] + ': ' : '') + v[1] : v;
        const n = norm(ko);
        const nn = Array.isArray(v) ? norm(v[1]) : n; // 맵은 '지역:' 뺀 이름 부분도 따로
        INDEX.push({ path, id, ko, n, c: choOf(n), nn, nc: choOf(nn) });
      }
    }
  }
  function searchKo(q) {
    if (!INDEX) buildIndex();
    const nq = norm(q); if (!nq) return [];
    const onlyCho = /^[ㄱ-ㅎ]+$/.test(nq);
    const here = (location.pathname.match(/\/lib\/(\w+)/) || [])[1]; // 지금 보는 목록 종류 우선
    const res = [];
    for (const e of INDEX) {
      const hay = onlyCho ? e.c : e.n, sub = onlyCho ? e.nc : e.nn;
      const pos = hay.indexOf(nq); if (pos < 0) continue;
      // 맵은 "지역: 이름"이라 이름 부분 기준으로도 점수 계산
      const rank = (hay === nq || sub === nq) ? 0 : (pos === 0 || sub.indexOf(nq) === 0) ? 1 : 2;
      const score = rank * 2000 + (here && e.path !== here ? 1000 : 0) + Math.min(sub.length, 999);
      res.push([score + ORDER[e.path] * 0.1, e]);
    }
    res.sort((a, b) => a[0] - b[0]);
    return res.slice(0, 40).map(x => x[1]);
  }

  const box = document.createElement('div');
  box.id = 'mlko-suggest';
  box.style.cssText = 'position:absolute;z-index:3000;max-height:60vh;overflow:auto;min-width:320px;display:none;box-shadow:0 4px 16px rgba(0,0,0,.35)';
  box.className = 'list-group';
  let boxFor = null, sel = -1;
  function hideBox() { box.style.display = 'none'; boxFor = null; sel = -1; }
  function iconUrl(path, id) { // 사이트 자동완성과 같은 아이콘 경로 규칙
    const P = (n, w) => String(n).padStart(w, '0'), L = '/static/images/lib/';
    if (path === 'monster' || path === 'npc') return L + path + '/' + P(id, 7) + '.png';
    if (path === 'equip') return L + 'character/' + P(id, 8) + '.png';
    if (path === 'cash' && Math.floor(id / 10000) === 500) return L + 'pet/' + id + '.png';
    if (path === 'use' || path === 'setup' || path === 'etc' || path === 'cash') return L + 'item/' + P(id, 8) + '.png';
    return null;
  }
  function showBox(input, items) {
    if (!box.isConnected) document.body.appendChild(box);
    box.innerHTML = '';
    if (!items.length) {
      box.innerHTML = '<div class="list-group-item small text-muted">한국어 이름으로 찾은 결과가 없습니다</div>';
    }
    items.forEach((e, i) => {
      const a = document.createElement('a');
      a.className = 'list-group-item list-group-item-action d-flex align-items-center gap-2 py-1';
      a.href = '/lib/' + e.path + '?id=' + e.id;
      a.dataset.mlko = '1';
      const ic = iconUrl(e.path, e.id);
      a.innerHTML = (ic ? '<img src="' + ic + '" style="width:24px;height:24px;object-fit:contain" onerror="this.style.visibility=\'hidden\'">' : '<span style="width:24px"></span>') +
        '<span class="flex-grow-1 text-truncate"></span><span class="badge text-bg-secondary"></span>';
      a.children[1].textContent = e.ko;
      a.children[2].textContent = BADGE[e.path] || e.path;
      box.appendChild(a);
    });
    const r = input.getBoundingClientRect();
    box.style.left = (r.left + window.scrollX) + 'px';
    box.style.top = (r.bottom + window.scrollY + 2) + 'px';
    box.style.width = Math.max(r.width, 360) + 'px';
    box.style.display = 'block';
    boxFor = input; sel = -1;
  }
  function moveSel(d) {
    const links = box.querySelectorAll('a'); if (!links.length) return;
    if (sel >= 0) links[sel].classList.remove('active');
    sel = (sel + d + links.length) % links.length;
    links[sel].classList.add('active'); links[sel].scrollIntoView({ block: 'nearest' });
  }
  const isSearchInput = el => el && el.tagName === 'INPUT' && (el.type === 'search' || el.name === 'search' || el.id === 'search');

  document.addEventListener('input', e => {
    const el = e.target; if (!isSearchInput(el)) return;
    if (HANGUL.test(el.value)) showBox(el, searchKo(el.value)); else if (boxFor === el) hideBox();
  }, true);
  // 한글 입력일 때는 사이트의 영어 자동완성 요청을 막음
  document.addEventListener('htmx:beforeRequest', e => {
    const el = e.detail && e.detail.elt;
    if (isSearchInput(el) && HANGUL.test(el.value)) e.preventDefault();
  });
  document.addEventListener('keydown', e => {
    if (!boxFor || e.target !== boxFor || box.style.display === 'none') return;
    if (e.key === 'ArrowDown') { e.preventDefault(); moveSel(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveSel(-1); }
    else if (e.key === 'Escape') { hideBox(); }
    else if (e.key === 'Enter') {
      const links = box.querySelectorAll('a'); const a = links[sel >= 0 ? sel : 0];
      e.preventDefault(); e.stopImmediatePropagation();
      if (a) location.href = a.href;
    }
  }, true);
  // 한글 그대로 제출되면 첫 번째 결과로 이동
  document.addEventListener('submit', e => {
    const el = e.target.querySelector && e.target.querySelector('input[name="search"]');
    if (!el || !HANGUL.test(el.value)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const r = searchKo(el.value); if (r.length) location.href = '/lib/' + r[0].path + '?id=' + r[0].id;
  }, true);
  document.addEventListener('click', e => { if (boxFor && !box.contains(e.target) && e.target !== boxFor) hideBox(); }, true);
  window.addEventListener('resize', hideBox);

  const ready = new Promise(r => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', r, { once: true }) : r());
  Promise.all(TYPES.map(load)).then(arr => {
    TYPES.forEach((t, i) => { if (t === 'ui') UI = Object.assign(UI, arr[i]); else if (t === 'idx') IDX = arr[i]; else D[t] = arr[i]; });
    return ready;
  }).then(() => {
    PAGE = pageInfo();
    if (PAGE) document.title = PAGE.ko + ' — 메이플레전드 라이브러리';
    else document.title = document.title.replace('MapleLegends Library', '메이플레전드 라이브러리');
    walk(document.body);
    document.documentElement.lang = 'ko';
    reveal();
    new MutationObserver(ms => {
      for (const m of ms) {
        if (m.type === 'characterData') { trText(m.target); continue; }
        for (const n of m.addedNodes) if (n.nodeType === 1 || n.nodeType === 3) walk(n);
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }).catch(reveal);
})();
