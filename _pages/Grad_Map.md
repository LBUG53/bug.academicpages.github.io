
<p style="display:none">build=20250924194422</p>
---
title: "Which Local Colleges Graduate the Most Students?"
layout: single
permalink: /viz/Grad_Map/
sidebar: false
---

<div class="viz-wrap">
  <div class="viz-controls">
    <button class="threshold-btn" data-threshold="70">70%+</button>
    <button class="threshold-btn" data-threshold="60">60%+</button>
    <button class="threshold-btn" data-threshold="50">50%+</button>
  </div>

  <div id="us-gradrate-map"></div>
  <div id="state-summary" class="state-summary"></div>
  <div id="table-wrap" class="table-wrap" aria-live="polite"></div>

  <p class="footnote">
    Data: IPEDS 2022 (six-year graduation rates). Columns used: <code>tot_grad</code> (Total),
    <code>nonres_grad</code> (Non-resident), <code>pell_grad</code> (Pell), <code>urm_grad</code> (URM).
    Values show percent of first-time, full-time undergraduates completing within 150% of program time.
  </p>
</div>

<style>
  .viz-wrap { max-width: 1100px; margin: 0 auto; padding: 1rem; }
  .viz-controls { display: flex; gap: .5rem; margin-bottom: .5rem; }
  .threshold-btn {
    border: 1px solid #CBD5E1; background: #fff; padding: .4rem .7rem; border-radius: 999px;
    font-size: .9rem; cursor: pointer;
  }
  .threshold-btn.active { background: #2563EB; color: #fff; border-color: #1D4ED8; }
  #us-gradrate-map { width: 100%; height: auto; }
  .tooltip {
    position: fixed; transform: translate(-50%, -120%); pointer-events: none;
    background: rgba(255,255,255,.96); border: 1px solid #E5E7EB; border-radius: .375rem;
    padding: .25rem .5rem; font-size: .8rem; color: #111827; z-index: 50; box-shadow: 0 1px 4px rgba(0,0,0,.08);
  }
  .state-summary { margin: .5rem 0 0.5rem; font-weight: 600; }
  .table-wrap { overflow-x: auto; }
  table { min-width: 640px; border-collapse: collapse; width: 100%; font-size: .92rem; }
  thead tr { background: #F8FAFC; }
  th, td { padding: .5rem .6rem; border-top: 1px solid #E5E7EB; text-align: left; }
  th.num, td.num { text-align: right; white-space: nowrap; }
  tbody tr:nth-child(odd) { background: #FAFAFA; }
  .footnote { margin-top: .5rem; color: #6B7280; font-size: .8rem; }
  .clear-btn { font-size: .85rem; color: #2563EB; background: none; border: none; padding: 0; cursor: pointer; }
</style>

<link rel="preconnect" href="https://esm.sh" />
<script type="module" src="/viz/Grad_Map/app.js?v=1"></script>
