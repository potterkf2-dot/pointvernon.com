(function () {
  "use strict";

  function initialiseFinder(limit = Infinity) {
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
      let shownCount = 0;

      cards.forEach(function (card) {
        const matchesTopic = topic.value === "all" || topic.value === card.category;
        const matchesSearch = terms.every(function (term) { return card.text.includes(term); });
        const visible = matchesTopic && matchesSearch;
        if (visible) guideCount += 1;
        const shown = visible && shownCount < limit;
        card.element.hidden = !shown;
        if (shown) shownCount += 1;
      });

      groups.forEach(function (group) {
        group.hidden = !cards.some(function (card) {
          return card.category === group.dataset.guideGroup && !card.element.hidden;
        });
      });

      const count = guideCount;
      const filtered = terms.length > 0 || topic.value !== "all";
      status.textContent = guideCount > shownCount
        ? "Showing " + shownCount + " of " + guideCount + " matching guides. Browse every guide below for more."
        : filtered
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
    // Filtering stays on this page; no query is sent, stored or added to the URL.
    filterGuides();
    filters.hidden = false;
    return filterGuides;
  }

  const homeForm = document.querySelector('[data-home-search]');
  if (!homeForm) {
    initialiseFinder();
    return;
  }

  // Load the same directory used on /guides/; never send the visitor's query.
  // No query is stored or added to the URL, including when analytics is allowed.
  homeForm.hidden = false;
  const results = document.getElementById('home-search-results');
  const status = document.getElementById('guide-results-count');
  const submit = homeForm.querySelector('[type="submit"]');
  let filterHome;
  let loading = false;
  homeForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (loading) return;
    results.hidden = false;
    if (filterHome) {
      filterHome();
      return;
    }
    loading = true;
    submit.disabled = true;
    results.setAttribute('aria-busy', 'true');
    status.textContent = 'Loading the local guides…';
    try {
      const response = await fetch('/guides/', {credentials: 'same-origin'});
      if (!response.ok) throw new Error('Directory unavailable');
      const source = new DOMParser().parseFromString(await response.text(), 'text/html');
      const groups = source.querySelectorAll('[data-guide-group]');
      if (!groups.length) throw new Error('Directory missing');
      document.getElementById('guide-results').replaceChildren(
        ...Array.from(groups, function (group) { return document.importNode(group, true); })
      );
      filterHome = initialiseFinder(6);
    } catch (error) {
      status.textContent = 'Search is unavailable just now. Use the browse link below to open the guides.';
    } finally {
      loading = false;
      submit.disabled = false;
      results.removeAttribute('aria-busy');
    }
  });
}());
