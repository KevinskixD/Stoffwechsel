(function () {
  var KEY = 'uniformverwaltung.theme'
  var stored = localStorage.getItem(KEY)
  var wantsDark =
    stored === 'dark' ||
    ((stored === 'system' || !stored) && window.matchMedia('(prefers-color-scheme: dark)').matches)
  if (wantsDark) document.documentElement.classList.add('dark')
})()
