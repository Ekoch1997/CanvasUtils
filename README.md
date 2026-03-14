# Canvas Utilities

Simple Chrome extension scaffold providing modular utilities.

Install (developer mode):

1. Open Chrome and go to `chrome://extensions`.
2. Enable "Developer mode".
3. Click "Load unpacked" and choose the `CanvasUtils` folder.
4. The extension popup appears in the toolbar. Open a page, click the extension, choose "Wrap text boxes", and click "Apply".

Notes:
- The `wrap-text` tool applies wrapping styles to `textarea` and `[contenteditable]` elements, and replaces some single-line `input` elements with `textarea` clones to enable wrapping.
- This is intentionally simple and modular; additional utilities can be added to `content.js` under the `tools` object and added to `popup.html`.
