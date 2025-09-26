---
layout: single
title: "Which Colleges in My State Have High Graduation Rates?"
permalink: /viz/Grad_Map/
---

<!-- Mount node for the React app -->
<div id="us-gradrate-map"></div>

<!-- Threshold buttons the app wires up -->
<div class="controls">
  <button class="threshold-btn" data-threshold="70">70%+</button>
  <button class="threshold-btn" data-threshold="60">60%+</button>
  <button class="threshold-btn" data-threshold="50">50%+</button>
</div>

<p class="note">
  Data: IPEDS 2022. Values show percent of first-time, full-time undergraduates completing within 6 years.
</p>

<!-- Styles -->
<link rel="stylesheet" href="./app.css?v=2" />

<!-- Runtime dependencies (UMD builds expose globals) -->
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/react-simple-maps@3/dist/react-simple-maps.min.js"></script>
<script src="https://unpkg.com/papaparse@5.4.1/papaparse.min.js"></script>

<!-- Your app (UMD/no imports) -->
<script defer src="./app.js?v=2"></script>
