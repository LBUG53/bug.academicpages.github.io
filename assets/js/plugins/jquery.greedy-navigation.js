/*
* Greedy Navigation (simplified to a binary state)
*
* Originally based on http://codepen.io/lukejacksonn/pen/PwmwWV, which greedily
* moves individual overflowing items into the hamburger menu one at a time,
* leaving a hybrid state where some sections sit in the bar and others sit in
* the dropdown. This version instead collapses ALL non-persistent sections
* into the hamburger as soon as the full list stops fitting, so opening the
* menu always shows every section rather than only the ones pushed off.
*/

var $nav = $('#site-nav');
var $btn = $('#site-nav button');
var $vlinks = $('#site-nav .visible-links');
var $vlinks_persist_tail = $vlinks.children("*.persist.tail");
var $hlinks = $('#site-nav .hidden-links');

function restoreAll() {
  while ($hlinks.children().length > 0) {
    if ($vlinks_persist_tail.children().length > 0) {
      $hlinks.children().first().insertBefore($vlinks_persist_tail);
    } else {
      $hlinks.children().first().appendTo($vlinks);
    }
  }
}

function collapseAll() {
  $vlinks.children("*:not(.persist)").each(function () {
    $(this).appendTo($hlinks);
  });
}

function updateNav() {

  // Start from the fully-expanded state so we can measure whether
  // everything actually fits before deciding to collapse.
  restoreAll();

  if ($vlinks.width() > $nav.width()) {
    collapseAll();
    $btn.removeClass('hidden');
  } else {
    $btn.addClass('hidden');
    $btn.removeClass('close');
    $hlinks.addClass('hidden');
  }

  // update masthead height and the body/sidebar top padding
  var mastheadHeight = $('.masthead').height();
  $('body').css('padding-top', mastheadHeight + 'px');
  if ($(".author__urls-wrapper button").is(":visible")) {
    $(".sidebar").css("padding-top", "");
  } else {
    $(".sidebar").css("padding-top", mastheadHeight + "px");
  }

}

// Window listeners

$(window).on('resize', function () {
  updateNav();
});
screen.orientation.addEventListener("change", function () {
  updateNav();
});

$btn.on('click', function () {
  $hlinks.toggleClass('hidden');
  $(this).toggleClass('close');
});

updateNav();
