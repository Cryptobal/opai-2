(() => {
  const base = '_ds/opai-2-0-design-system-v2-44e4d7b9-7464-4771-bff8-07fcff4d573d';
  for (const p of ["tokens/fonts.css","tokens/colors.css","tokens/typography.css","tokens/spacing.css","tokens/base.css","tokens/icons.css","components/components.css","styles.css"]) {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = base + '/' + p; document.head.appendChild(l);
  }
  const s = document.createElement('script'); s.src = base + '/_ds_bundle.js'; document.head.appendChild(s);
})();
