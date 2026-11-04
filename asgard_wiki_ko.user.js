// ==UserScript==
// @name         신의 영역(아스가르드) 위키 한국어 번역
// @namespace    asgard-ko
// @version      2.1
// @updateURL    https://raw.githubusercontent.com/yallo3328/asgard-ko/main/asgard_wiki_ko.user.js
// @downloadURL  https://raw.githubusercontent.com/yallo3328/asgard-ko/main/asgard_wiki_ko.user.js
// @description  lizhengqun7-wq.github.io/asgard-website 서버 위키를 한국어로 바꿔 보여 줍니다 (번역 사전은 GitHub yallo3328/asgard-ko)
// @match        https://lizhengqun7-wq.github.io/asgard-website/*
// @run-at       document-start
// @grant        none
// ==/UserScript==
(function () {
  'use strict';
  const BASE = 'https://raw.githubusercontent.com/yallo3328/asgard-ko/main/ko/';
  const VER = '2';

  // 번역 전 중국어가 잠깐 보이지 않게 본문을 가렸다가, 번역 후(또는 3초 뒤) 보여 줌
  const hide = document.createElement('style');
  hide.textContent = 'main,footer,nav.cats,header{visibility:hidden}';
  (function add() { const r = document.head || document.documentElement; if (r) r.appendChild(hide); else setTimeout(add, 0); })();
  // 스크롤 렉 줄이기: 고정 배경 해제, 화면 밖 카드·표는 그리지 않음
  const perf = document.createElement('style');
  perf.textContent = 'body{background-attachment:scroll!important}.mc,.tw,.card,.mcs>*,article>section,article>div{content-visibility:auto;contain-intrinsic-size:auto 160px}';
  (function add2() { const r = document.head || document.documentElement; if (r) r.appendChild(perf); else setTimeout(add2, 0); })();
  const reveal = () => hide.remove();
  setTimeout(reveal, 3000);

  let path = decodeURIComponent(location.pathname.replace(/^.*?\/asgard-website\//, '')) || 'index.html';
  let slug = 'index';
  let m;
  if ((m = path.match(/^p\/(\d+)\.html$/))) slug = 'p/' + m[1];
  else if ((m = path.match(/^c\/(m-[a-z]+|\d+[a-z]?)/))) slug = 'c/' + m[1];

  const mem = {};
  function get(name) {
    if (mem[name]) return mem[name];
    const key = 'asko:' + VER + ':' + name;
    try { const c = sessionStorage.getItem(key); if (c) return (mem[name] = Promise.resolve(JSON.parse(c))); } catch (e) {}
    return (mem[name] = fetch(BASE + name + '.json').then(r => r.ok ? r.text() : '{}').then(t => {
      try { sessionStorage.setItem(key, t); } catch (e) {}
      return JSON.parse(t);
    }).catch(() => ({})));
  }

  const RX = [
    [/^內容翻譯自日版 wiki（wikiwiki\.jp\/asgard）玩家整理的資料，僅供參考；原文著作權屬原作者。遊戲圖片取自神之領域遊戲畫面。$/,
      '일본판 wiki(wikiwiki.jp/asgard) 플레이어들이 정리한 자료를 번역한 것으로 참고용입니다. 원문 저작권은 원작자에게 있습니다. 게임 이미지는 신의 영역 게임 화면에서 가져왔습니다. (한국어 번역: 비공식)'],
    [/^「(.*)」找到 (\d+) 頁$/, (x, a, b) => '「' + a + '」 검색 결과 ' + b + '페이지'],
  ];
  const CJK = /[㐀-鿿]/;
  let D = {}, TT = {};

  function trTitle(t) { return D[t] || TT[t] || t.split('/').map(s => D[s] || TT[s] || s).join('/'); }
  function trText(n) {
    const v = n.nodeValue;
    if (!v || !CJK.test(v)) return;
    const t = v.trim();
    let k = D[t];
    if (k === undefined && n.parentNode && n.parentNode.closest && n.parentNode.closest('#results')) k = trTitle(t);
    if (k !== undefined && k !== t) { n.nodeValue = v.replace(t, k); return; }
    for (const [r, f] of RX) if (r.test(t)) { n.nodeValue = v.replace(t, t.replace(r, f)); return; }
  }
  function trAttrs(root) {
    if (!root.querySelectorAll) return;
    root.querySelectorAll('[placeholder],[title],[aria-label],[alt]').forEach(el => {
      for (const a of ['placeholder', 'title', 'aria-label', 'alt']) {
        const v = el.getAttribute(a);
        if (v && CJK.test(v)) { const k = D[v.trim()]; if (k !== undefined) el.setAttribute(a, k); }
      }
    });
  }
  function walk(root) {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => (n.parentNode && /^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentNode.nodeName)) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    const a = [];
    while (w.nextNode()) a.push(w.currentNode);
    a.forEach(trText);
    trAttrs(root);
  }

  const ready = new Promise(r => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', r, { once: true }) : r());
  Promise.all([get('common'), get(slug), slug === 'index' ? get('titles') : Promise.resolve({}), ready]).then(([c, p, tt]) => {
    D = Object.assign({}, c, p); TT = tt;
    const t = document.title.trim();
    document.title = D[t] || t.split('｜').map(x => D[x.trim()] || x).join('｜');
    document.documentElement.lang = 'ko';
    walk(document.body);
    reveal();
    new MutationObserver(ms => {
      for (const m of ms) {
        if (m.type === 'characterData') { trText(m.target); continue; }
        for (const n of m.addedNodes) { if (n.nodeType === 3) trText(n); else if (n.nodeType === 1) walk(n); }
      }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  });
})();
