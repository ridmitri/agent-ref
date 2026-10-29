(function installPreviewSelectionContext() {
  const listenerKey = '__agentRefPreviewSelectionContextMenuListener';
  const previousListener = window[listenerKey];
  if (typeof previousListener === 'function') {
    document.removeEventListener('contextmenu', previousListener, true);
  }

  const handler = function updatePreviewSelectionContext() {
    const root = document.documentElement;
    if (!root) {
      return;
    }

    const selectedText = window.getSelection
      ? String(window.getSelection() || '')
      : '';
    let context = {};
    const existingContext = root.getAttribute('data-vscode-context');
    if (existingContext) {
      try {
        const parsedContext = JSON.parse(existingContext);
        if (
          parsedContext &&
          typeof parsedContext === 'object' &&
          !Array.isArray(parsedContext)
        ) {
          context = parsedContext;
        }
      } catch (_error) {
        // Ignore malformed context data; Agent Ref still needs to clear or
        // publish its own selection fields for this context-menu invocation.
      }
    }

    root.setAttribute(
      'data-vscode-context',
      JSON.stringify({
        ...context,
        agentRefPreviewContextVersion: 1,
        agentRefHasPreviewSelection: selectedText.length > 0,
        agentRefPreviewSelection: selectedText
      })
    );
  };

  document.addEventListener('contextmenu', handler, true);
  window[listenerKey] = handler;
})();
