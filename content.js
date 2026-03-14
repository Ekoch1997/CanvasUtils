/* Canvas Utilities content script
   - Provides a modular `tools` object
   - Listens for messages {type: 'runTool', tool: 'wrap-text'}
*/

// Small on-page toast notification. Creates a transient element in the page.
function showToast(message, duration = 3000) {
  try {
    const id = 'canvasutils-toast';
    let toast = document.getElementById(id);
    if (!toast) {
      toast = document.createElement('div');
      toast.id = id;
      toast.style.position = 'fixed';
      toast.style.right = '16px';
      toast.style.bottom = '16px';
      toast.style.zIndex = 2147483647;
      toast.style.fontFamily = 'Arial, Helvetica, sans-serif';
      toast.style.fontSize = '13px';
      toast.style.background = 'rgba(0,0,0,0.8)';
      toast.style.color = '#fff';
      toast.style.padding = '8px 12px';
      toast.style.borderRadius = '6px';
      toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
      toast.style.transition = 'opacity 220ms ease-in-out, transform 220ms ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      document.documentElement.appendChild(toast);
    }
    toast.textContent = message;
    // show
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });
    // hide after duration
    clearTimeout(toast._cuTimeout);
    toast._cuTimeout = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
    }, duration);
  } catch (e) {
    // ignore toast errors
  }
}

const tools = {
  'wrap-text': (options = {}) => {
    let count = 0;

    // Helper to style an element so text wraps and save previous inline style
    function applyWrapping(el){
      if (!el) return false;
      if (el.dataset && el.dataset.canvasutilsWrapped) return false;
      // save previous inline style so we can revert
      try {
        if (el.dataset) el.dataset.canvasutilsPrevStyle = el.style.cssText || '';
      } catch (e) {}
      el.style.whiteSpace = 'pre-wrap';
      el.style.overflowWrap = 'break-word';
      el.style.wordBreak = 'break-word';
      if (el.tagName === 'TEXTAREA') {
        try {
          const prevWrap = el.getAttribute('wrap');
          if (el.dataset) el.dataset.canvasutilsPrevWrap = prevWrap === null ? '' : prevWrap;
        } catch (e) {}
        el.setAttribute('wrap', 'soft');
      }
      if (el.dataset) el.dataset.canvasutilsWrapped = '1';
      return true;
    }

    // Apply to existing textareas
    document.querySelectorAll('textarea').forEach(t => { if (applyWrapping(t)) count++; });

    // Apply to contenteditable elements
    document.querySelectorAll('[contenteditable="true"], [contenteditable]').forEach(el => { if (applyWrapping(el)) count++; });

    // Replace single-line inputs with textareas to enable wrapping
    const inputSelector = 'input[type="text"], input[type="search"], input[type="url"], input[type="tel"], input[type="email"]';
    document.querySelectorAll(inputSelector).forEach(input => {
      if (input.dataset && input.dataset.canvasutilsReplaced) return;
      try {
        const ta = document.createElement('textarea');
        // copy basic attributes that matter
        if (input.id) ta.id = input.id + '_cu';
        if (input.name) ta.name = input.name;
        if (input.className) ta.className = input.className;
        if (input.placeholder) ta.placeholder = input.placeholder;
        // copy inline style
        ta.style.cssText = input.style.cssText || '';
        ta.value = input.value || '';
        // store the original input HTML so we can restore it later
        ta.dataset.canvasutilsOriginalHtml = input.outerHTML;
        applyWrapping(ta);
        ta.dataset.canvasutilsReplaced = '1';
        ta.dataset.canvasutilsOriginalType = input.type;
        input.parentNode.replaceChild(ta, input);
        count++;
      } catch (e) {
        // ignore replacement errors
      }
    });

    // notify user
    try { showToast(`Wrapped ${count} element${count === 1 ? '' : 's'}`); } catch (e) {}
    return {status: 'wrapped', count};
  },

  'revert': (options = {}) => {
    let restored = 0;

    // Restore replaced inputs from stored original HTML
    document.querySelectorAll('textarea[data-canvasutils-replaced]').forEach(ta => {
      try {
        const originalHtml = ta.dataset && ta.dataset.canvasutilsOriginalHtml;
        if (originalHtml) {
          const container = document.createElement('div');
          container.innerHTML = originalHtml;
          const orig = container.firstElementChild;
          if (orig && ta.parentNode) {
            // try to preserve current value if orig is input
            if ('value' in orig && 'value' in ta) orig.value = ta.value;
            ta.parentNode.replaceChild(orig, ta);
            restored++;
          }
        }
      } catch (e) {
        // ignore
      }
    });

    // Revert styles on wrapped elements
    document.querySelectorAll('[data-canvasutils-wrapped]').forEach(el => {
      try {
        if (el.dataset && 'canvasutilsPrevStyle' in el.dataset) {
          el.style.cssText = el.dataset.canvasutilsPrevStyle || '';
          delete el.dataset.canvasutilsPrevStyle;
        } else {
          el.style.whiteSpace = '';
          el.style.overflowWrap = '';
          el.style.wordBreak = '';
        }
        if (el.tagName === 'TEXTAREA') {
          if (el.dataset && 'canvasutilsPrevWrap' in el.dataset) {
            const prev = el.dataset.canvasutilsPrevWrap;
            if (prev === '') el.removeAttribute('wrap'); else el.setAttribute('wrap', prev);
            delete el.dataset.canvasutilsPrevWrap;
          }
        }
        delete el.dataset.canvasutilsWrapped;
        restored++;
      } catch (e) {}
    });

    try { showToast(`Reverted ${restored} element${restored === 1 ? '' : 's'}`); } catch (e) {}
    return {status: 'reverted', restored};
  }
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.type !== 'runTool') return;
  const tool = msg.tool;
  if (!tool || !tools[tool]) {
    sendResponse({status: 'unknown-tool'});
    return;
  }
  try {
    const result = tools[tool](msg.options);
    sendResponse({status: 'ok', result});
  } catch (err) {
    sendResponse({status: 'error', message: err && err.message});
  }
});
