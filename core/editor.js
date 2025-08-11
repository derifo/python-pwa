let editorEl;

export function initEditor() {
  editorEl = document.getElementById('editor');
  editorEl.spellcheck = false;
  editorEl.style.whiteSpace = 'pre';
  editorEl.style.outline = 'none';
  editorEl.style.fontFamily = 'monospace';
  editorEl.textContent = "# Type your Python code here\nprint('Hello, World!')";
}

export function getCode() {
  return editorEl.textContent;
}

export function setCode(code) {
  editorEl.textContent = code;
}
