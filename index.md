---
layout: home
author_profile: false
title: ""   # prevents <title> from doubling with site.title
---

<!-- Manual HERO (bypasses theme header logic) -->
<div class="page__hero--overlay" style="background-image: linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.25)), url('/images/hero_looking_wide.jpg');">
  <div class="wrapper">
    <h1 class="page__title">Lucian Bessmer, PhD</h1>
    <p class="page__lead">Scholar, Historian, and Strategist of Higher Education.</p>
  </div>
</div>

<!-- Page-local styles: constrain and balance the three feature tiles -->
<style>
  /* Center the whole row and keep equal side gutters */
  #home-features {
    display: flex;
    justify-content: space-between;   /* even edges */
    gap: 1.25rem;                     /* space between tiles */
    max-width: 1200px;                /* keeps the row from stretching too wide */
    margin: 1.25rem auto 0;           /* centers the row on the page */
    flex-wrap: nowrap;                /* stay on one line on desktop */
  }
  /* Make exactly three across on desktop */
  #home-features .feature__item {
    flex: 0 0 calc(33.333% - 0.85rem);  /* three equal columns with room for gaps */
  }
  /* Responsive: stack on small screens */
  @media (max-width: 900px) {
    #home-features {
      flex-wrap: wrap;
      justify-content: center;
    }
    #home-features .feature__item {
      flex: 1 1 100%;
      max-width: 700px;
    }
  }
</style>

<!-- Feature Row with linked titles -->
<div id="home-features">

  <div class="feature__item">
    <div class="archive__item">
      <div class="archive__item-body">
        <h2 class="archive__item-title">
          <a href="/scholarship/">Scholarship</a>
        </h2>
        <div class="archive__item-excerpt">
          <p>Book project, publications, conference talks, and works in progress.</p>
        </div>
      </div>
    </div>
  </div>

  <div class="feature__item">
    <div class="archive__item">
      <div class="archive__item-body">
        <h2 class="archive__item-title">
          <a href="/portfolio/">Teaching</a>
        </h2>
        <div class="archive__item-excerpt">
          <p>Course syllabi and teaching philosophy.</p>
        </div>
      </div>
    </div>
  </div>

  <div class="feature__item">
    <div class="archive__item">
      <div class="archive__item-body">
        <h2 class="archive__item-title">
          <a href="/higheredissues/">Higher Ed Issues</a>
        </h2>
        <div class="archive__item-excerpt">
          <p>Explaining higher ed issues the way I’d want them explained to me.</p>
        </div>
      </div>
    </div>
  </div>

</div>
