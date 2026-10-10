(function () {
  "use strict";

  const filters = document.querySelector("[data-guide-filters]");
  const search = document.getElementById("guide-search");
  const topic = document.getElementById("guide-topic");
  const status = document.getElementById("guide-results-count");
  const emptyState = document.querySelector("[data-guide-no-results]");
  const clearButtons = Array.from(document.querySelectorAll("[data-guide-clear]"));
  const groups = Array.from(document.querySelectorAll("[data-guide-group]"));

  if (!filters || !search || !topic || !status || !emptyState) return;

  const aliases = { dogs: "dog", beaches: "beach", walks: "walk", walking: "walk", parks: "park", buses: "bus", cafes: "coffee", cafe: "coffee", bbqs: "barbecue", bbq: "barbecue", barbeque: "barbecue", toilets: "toilet", bathrooms: "toilet", bathroom: "toilet", wheelchairs: "wheelchair", caravans: "caravan", bikes: "bike", cycling: "bike", bicycle: "bike", kids: "family", children: "family", families: "family", playgrounds: "playground", prams: "pram", stroller: "pram", strollers: "pram", accessible: "access", accessibility: "access", disability: "access" };
  const questionWords = new Set(["a", "an", "the", "and", "or", "in", "at", "for", "to", "of", "with", "where", "what", "which", "can", "could", "do", "does", "is", "are", "i", "we", "you", "get", "find", "near", "me", "please"]);

  function normalise(value) {
    return String(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  const cards = Array.from(document.querySelectorAll("[data-guide-card]")).map(function (element) {
    const link = element.querySelector("a");
    return {
      element: element,
      category: element.dataset.guideCategory,
      text: normalise(element.dataset.guideTitle + " " + element.textContent + " " + (element.dataset.guideKeywords || "") + " " + (link ? link.getAttribute("href") : "")).split(" ").map(function (term) { return aliases[term] || term; }).join(" ")
    };
  });

  let pending;

  function searchTerms(value) {
    return normalise(value)
      .replace(/\bpoint vernon\b/g, " ")
      .split(" ")
      .filter(function (term) { return term && !questionWords.has(term); })
      .map(function (term) { return aliases[term] || term; });
  }

  function filterGuides() {
    const terms = searchTerms(search.value);
    let guideCount = 0;

    cards.forEach(function (card) {
      const matchesTopic = topic.value === "all" || topic.value === card.category;
      const matchesSearch = terms.every(function (term) { return card.text.includes(term); });
      const visible = matchesTopic && matchesSearch;
      card.element.hidden = !visible;
      if (visible) {
        guideCount += 1;
      }
    });

    groups.forEach(function (group) {
      group.hidden = !cards.some(function (card) {
        return card.category === group.dataset.guideGroup && !card.element.hidden;
      });
    });

    const count = guideCount;
    const filtered = terms.length > 0 || topic.value !== "all";
    status.textContent = filtered
      ? count + (count === 1 ? " guide found" : " guides found")
      : guideCount + " local guides";
    emptyState.hidden = count !== 0;
    clearButtons.forEach(function (button) {
      button.disabled = search.value.length === 0 && topic.value === "all";
    });
  }

  search.addEventListener("input", function () {
    window.clearTimeout(pending);
    pending = window.setTimeout(filterGuides, 180);
  });

  topic.addEventListener("change", function () {
    window.clearTimeout(pending);
    filterGuides();
  });

  clearButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      window.clearTimeout(pending);
      search.value = "";
      topic.value = "all";
      filterGuides();
      search.focus();
    });
  });

  document.querySelectorAll('[data-guide-query]').forEach(function (button) {
    button.addEventListener('click', function () {
      window.clearTimeout(pending);
      search.value = button.dataset.guideQuery;
      topic.value = 'all';
      filterGuides();
      search.focus();
    });
  });
  const quickSearches = document.querySelector('[data-guide-quick-searches]');
  if (quickSearches) quickSearches.hidden = false;

  // Progressive enhancement: all links remain visible if this script is unavailable.
  // Search stays in this page. It sends no requests, stores no query and changes no URL.
  filterGuides();
  filters.hidden = false;
}());
