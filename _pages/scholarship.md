---
title: "Scholarship"
layout: single
permalink: /scholarship/
author_profile: true
header:
  overlay_image: /images/bg_books.jpg
  overlay_filter: 0.35
---

Here you’ll find selected publications, essays, and research agenda.

{% include base_path %}

{% for post in site.posts %}
  {% include archive-single.html %}
{% endfor %}
