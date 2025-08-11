import { initUI } from '../core/ui.js';
import { loadLessonsList, loadLesson } from '../core/store.js';
import { initEditor, getCode, setCode } from '../core/editor.js';
import { runCode } from '../core/executor.js';

const state = { lessons: [], currentLessonId: null };

document.addEventListener('DOMContentLoaded', async () => {
  initUI();
  // If you’re using Monaco from index.html, initEditor() is harmless; otherwise it sets up the simple editor.
  try { initEditor(); } catch (_) {}

  // --- Optional wiring for classic editor/runner (only if elements exist) ---
  const runBtn = document.getElementById('runBtn');
  const outputEl = document.getElementById('output');            // may not exist in your new UI
  const clearOutputBtn = document.getElementById('clearOutputBtn');

  if (runBtn && outputEl) {
    runBtn.addEventListener('click', async () => {
      outputEl.textContent = 'Running...\n';
      const result = await runCode(getCode());
      outputEl.textContent = result.stdout || '';
      if (result.stderr) outputEl.textContent += '\nError: ' + result.stderr;
    });
  }

  if (clearOutputBtn && outputEl) {
    clearOutputBtn.addEventListener('click', () => (outputEl.textContent = ''));
  }

  // --- Lessons load with diagnostics ---
  try {
    state.lessons = await loadLessonsList();
    renderLessonList();
    if (state.lessons.length > 0) openLesson(state.lessons[0].id);
    if (state.lessons.length === 0) {
      document.getElementById('lessonList').innerHTML =
        '<div style="padding:8px;color:#9ca3af">No lessons found.</div>';
    }
  } catch (err) {
    console.error('Failed to load lessons/index.json:', err);
    const listEl = document.getElementById('lessonList');
    if (listEl) listEl.innerHTML =
      '<div style="padding:8px;color:#ef4444">Error loading lessons. Check lessons/index.json path.</div>';
  }
});

// ----------------- UI renderers -----------------
function renderLessonList() {
  const listEl = document.getElementById('lessonList');
  if (!listEl) return;
  listEl.innerHTML = '';
  state.lessons.forEach(lesson => {
    const btn = document.createElement('button');
    btn.textContent = lesson.title;
    if (lesson.completed) btn.classList.add('completed');
    btn.addEventListener('click', () => openLesson(lesson.id));
    listEl.appendChild(btn);
  });
}

async function openLesson(id) {
  try {
    const lesson = await loadLesson(id);
    state.currentLessonId = id;
    renderLessonContent(lesson);
  } catch (e) {
    console.error('Failed to load lesson', id, e);
  }
}

function renderLessonContent(lesson) {
  const contentEl = document.getElementById('lessonContent');
  if (!contentEl) return;
  contentEl.innerHTML = '';

  lesson.sections.forEach(section => {
    if (section.type === 'read') {
      const div = document.createElement('div');
      div.innerHTML = marked.parse(section.contentMarkdown || '');
      contentEl.appendChild(div);
    } else if (section.type === 'example') {
      const div = document.createElement('div');
      div.innerHTML = `<pre>${section.starterCode}</pre><button>Run Example</button>`;
      div.querySelector('button').addEventListener('click', () => setCode(section.starterCode));
      contentEl.appendChild(div);
    } else if (section.type === 'exercise') {
      const div = document.createElement('div');
      div.innerHTML = `<p>${section.promptMarkdown}</p>`;
      const btn = document.createElement('button');
      btn.textContent = 'Load in Editor';
      btn.addEventListener('click', () => setCode(section.starterCode));
      div.appendChild(btn);
      contentEl.appendChild(div);
    } else if (section.type === 'quiz') {
      const div = document.createElement('div');
      div.innerHTML = `<p>${section.question}</p>`;
      (section.choices || []).forEach((choice, idx) => {
        const btn = document.createElement('button');
        btn.textContent = choice;
        btn.addEventListener('click', () => {
          if (idx === section.answerIndex) {
            alert('✅ Correct! ' + (section.explainMarkdown || ''));
          } else {
            alert('❌ Try again.');
          }
        });
        div.appendChild(btn);
      });
      contentEl.appendChild(div);
    }
  });
}
