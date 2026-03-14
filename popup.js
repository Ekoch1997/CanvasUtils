document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('wrap-toggle');
  const status = document.getElementById('status');
  let running = false;

  async function sendTool(tool) {
    if (running) return;
    running = true;
    toggle.disabled = true;
    // show running spinner + text
    status.innerHTML = `Status: <span class="spinner" aria-hidden="true"></span> Running...`;
    try {
      const tabs = await chrome.tabs.query({active: true, currentWindow: true});
      if (!tabs || !tabs[0]) throw new Error('No active tab');
      let settled = false;
      // fallback timeout in case content script doesn't respond
      const fallback = setTimeout(() => {
        if (!settled) {
          settled = true;
          running = false;
          toggle.disabled = false;
          status.textContent = 'Status: Command sent (no response)';
        }
      }, 8000);

      chrome.tabs.sendMessage(tabs[0].id, {type: 'runTool', tool}, (resp) => {
        if (settled) return;
        settled = true;
        clearTimeout(fallback);
        running = false;
        toggle.disabled = false;
        if (chrome.runtime.lastError) {
          status.textContent = 'Status: Command sent (no content script response)';
        } else {
          const msg = resp && resp.status ? resp.status : 'Done';
          status.textContent = 'Status: ' + msg;
        }
      });
    } catch (err) {
      running = false;
      toggle.disabled = false;
      status.textContent = 'Status: Error: ' + err.message;
    }
  }

  // Toggle change triggers wrap or revert immediately
  toggle.addEventListener('change', () => {
    const tool = toggle.checked ? 'wrap-text' : 'revert';
    sendTool(tool);
  });
  
});
