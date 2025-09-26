---
layout: single
title: "Which Colleges in My State Have High Graduation Rates?"
permalink: /viz/Grad_Map/
---

<!-- Mount node -->
<div id="us-gradrate-map"></div>

<!-- Threshold buttons -->
<div class="controls">
  <button class="threshold-btn" data-threshold="70">70%+</button>
  <button class="threshold-btn" data-threshold="60">60%+</button>
  <button class="threshold-btn" data-threshold="50">50%+</button>
</div>

<p class="note">
  Data: IPEDS 2022. Values show percent of first-time, full-time undergraduates completing within 6 years.
</p>

<link rel="stylesheet" href="./app.css?v=9" />

<!-- D3 + TopoJSON + PapaParse (no React) -->
<script src="https://unpkg.com/d3@7/dist/d3.min.js"></script>
<script src="https://unpkg.com/topojson-client@3"></script>
<script src="https://unpkg.com/papaparse@5.4.1/papaparse.min.js"></script>

<!-- Your vanilla JS app -->
<script defer src="./app.js?v=9"></script>
