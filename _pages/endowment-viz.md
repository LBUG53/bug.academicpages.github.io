---
layout: single
title: "An endowment is not a piggy bank"
permalink: /endowment/
classes: wide
sidebar: false
author_profile: false
---

<!-- Optional headline/dek (can delete these two lines if you want) -->
<p style="font-size:1.1rem; margin: 0 0 16px 0; color:#334155;">
  Most funds are legally restricted. Try allocating this year’s payout and see how overspending affects the next decade.
</p>

<!-- Full-bleed, centered iframe -->
<div class="viz-bleed">
  <iframe
    src="/viz/endowment/"
    title="An endowment is not a piggy bank"
    loading="eager"
    referrerpolicy="no-referrer-when-downgrade"
    style="width:100%; height:1600px; border:0; display:block;">
  </iframe>
</div>

<style>
/* Break out of the theme’s content column and go edge-to-edge */
.viz-bleed{
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  display: flex;
  justify-content: center; /* center the iframe on ultra-wide screens */
}

/* Let the viz breathe on large displays */
.viz-bleed > iframe{
  max-width: 1800px; /* bump to 2000px if you want it even wider */
  width: 100%;
  height: 1600px; /* tweak to taste */
}

/* Responsive height tweaks */
@media (max-width: 1024px){ .viz-bleed > iframe{ height: 1400px; } }
@media (max-width: 640px) { .viz-bleed > iframe{ height: 1200px; } }
</style>
