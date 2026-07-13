// ShopStock client helpers — no framework, no build step.

// Remember who is using this phone/PC so mutations can be attributed
// without accounts. Prefills every hidden person field and the checkout name.
(function () {
  const KEY = 'shopstock_person';

  function currentName() {
    try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
  }

  function remember(name) {
    try { if (name && name.trim()) localStorage.setItem(KEY, name.trim()); } catch {}
  }

  function fillHiddenFields(root) {
    const name = currentName();
    for (const el of (root || document).querySelectorAll('.person-hidden')) {
      el.value = name;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    fillHiddenFields(document);

    // Prefill visible checkout name inputs
    for (const input of document.querySelectorAll('.person-input')) {
      if (!input.value) input.value = currentName();
      input.addEventListener('change', () => remember(input.value));
    }

    // Save the name whenever a checkout form is submitted
    document.addEventListener('submit', (e) => {
      const nameInput = e.target.querySelector?.('input[name="person_name"]');
      if (nameInput) remember(nameInput.value);
      fillHiddenFields(e.target);
    }, true);

    // Person-name suggestions for checkout fields
    const datalist = document.getElementById('people-list');
    const personInput = document.querySelector('.person-input');
    if (datalist && personInput) {
      fetch('/api/people/suggest')
        .then(r => r.json())
        .then(names => {
          for (const n of names) {
            const opt = document.createElement('option');
            opt.value = n;
            datalist.appendChild(opt);
          }
        })
        .catch(() => {});
    }
  });

  // htmx swaps in new fragments (qty controls) — refill hidden fields
  document.addEventListener('htmx:afterSwap', (e) => fillHiddenFields(e.target));
})();
