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

  const aliases = { dogs: "dog", beaches: "beach", walks: "walk", parks: "park", buses: "bus", cafes: "coffee", cafe: "coffee" };

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
      text: normalise(element.dataset.guideTitle + " " + element.textContent + " " + (link ? link.getAttribute("href") : ""))
    };
  });

  let pending;

  function filterGuides() {
    const terms = normalise(search.value).split(" ").filter(Boolean).map(function (term) {
      return aliases[term] || term;
    });
    let guideCount = 0;
    let siteCount = 0;

    cards.forEach(function (card) {
      const matchesTopic = topic.value === "all" || topic.value === card.category;
      const matchesSearch = terms.every(function (term) { return card.text.includes(term); });
      const visible = matchesTopic && matchesSearch;
      card.element.hidden = !visible;
      if (visible) {
        if (card.category === "site") siteCount += 1;
        else guideCount += 1;
      }
    });

    groups.forEach(function (group) {
      group.hidden = !cards.some(function (card) {
        return card.category === group.dataset.guideGroup && !card.element.hidden;
      });
    });

    const count = guideCount + siteCount;
    const filtered = terms.length > 0 || topic.value !== "all";
    status.textContent = filtered
      ? count + (count === 1 ? " page found" : " pages found")
      : guideCount + " guides and " + siteCount + " site information pages";
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

  // Progressive enhancement: all links remain visible if this script is unavailable.
  // Search stays in this page. It sends no requests, stores no query and changes no URL.
  filterGuides();
  filters.hidden = false;
}());
