(function() {
  const MAX_LOG_LINES = 30;
  const logContainer = document.createElement('div');
  logContainer.style.cssText = 'background:#000; color:#0f0; padding:10px; font-family:monospace; font-size:12px; max-height:300px; overflow:auto; white-space:pre-wrap;';
  document.body.appendChild(logContainer);

  function logToPage(type, args) {
    const msg = Array.from(args).map(arg => {
      try {
        if (typeof arg === 'object') return JSON.stringify(arg, null, 2);
      } catch (e) {
        return '[Object]';
      }
      return String(arg);
    }).join(' ');

    const line = document.createElement('div');
    line.textContent = `[${type}] ${msg}`;
    logContainer.appendChild(line);

    // Trim old lines
    while (logContainer.children.length > MAX_LOG_LINES) {
      logContainer.removeChild(logContainer.firstChild);
    }

    // Auto-scroll to bottom
    logContainer.scrollTop = logContainer.scrollHeight;
  }

  ['log', 'warn', 'error', 'info'].forEach(type => {
    const original = console[type];
    console[type] = function(...args) {
      original.apply(console, args); // keep native behavior
      logToPage(type, args);
    };
  });
})();
