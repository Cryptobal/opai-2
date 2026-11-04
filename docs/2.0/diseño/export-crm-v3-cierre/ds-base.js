(() => {
  const base = '_ds/opai-2-0-design-system-v2-44e4d7b9-7464-4771-bff8-07fcff4d573d';
  for (const p of ["tokens/fonts.css","tokens/colors.css","tokens/typography.css","tokens/spacing.css","tokens/base.css","tokens/icons.css","components/components.css","styles.css"]) {
    if (document.querySelector('link[data-dsb="' + p + '"]')) continue;
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = base + '/' + p; l.dataset.dsb = p;
    document.head.appendChild(l);
  }
  if (!document.querySelector('script[data-dsb]')) {
    const s = document.createElement('script');
    s.src = base + '/_ds_bundle.js'; s.dataset.dsb = '1';
    document.head.appendChild(s);
  }
})();
