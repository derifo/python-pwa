import { initUI } from '../core/ui.js';
import { loadLessonsList, loadLesson } from '../core/store.js';
import { initEditor, getCode, setCode } from '../core/editor.js';
import { runCode } from '../core/executor.js';

const state = { lessons: [], currentLessonId: null };

// Function to render the lesson list
function renderLessonList() {
  const listEl = document.getElementById('lessonList');
  if (!listEl) return;

  if (state.lessons.length === 0) {
    listEl.innerHTML = '<div style="padding:8px;color:#9ca3af">No lessons found.</div>';
    return;
  }

  listEl.innerHTML = state.lessons.map(lesson => 
    `<button data-lesson-id="${lesson.id}" class="${lesson.completed ? 'completed' : ''}">
      ${lesson.title}
    </button>`
  ).join('');

  // Add click handlers
  listEl.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const lessonId = btn.dataset.lessonId;
      openLesson(lessonId);
    });
  });
}

// Function to open a specific lesson
async function openLesson(lessonId) {
  try {
    console.log(`Opening lesson: ${lessonId}`);
    const lesson = await loadLesson(lessonId);
    state.currentLessonId = lessonId;

    const contentEl = document.getElementById('lessonContent');
    if (contentEl) {
      // Simple HTML rendering without calling non-existent functions
      let html = `<h3>${lesson.title || lessonId}</h3>`;

      if (lesson.description) {
        html += `<p>${lesson.description}</p>`;
      }

      if (lesson.content) {
        html += `<div>${lesson.content}</div>`;
      }

      if (lesson.code) {
        html += `<pre style="background: #f5f5f7; padding: 1rem; border-radius: 8px; overflow-x: auto;">${lesson.code}</pre>`;
      }

      contentEl.innerHTML = html;
    }

    // If lesson has starter code, load it into editor
    const editorEl = document.getElementById('editor');
    if (lesson.starterCode && editorEl) {
      editorEl.value = lesson.starterCode;
    } else if (lesson.code && editorEl) {
      editorEl.value = lesson.code;
    }

  } catch (error) {
    console.error('Error opening lesson:', error);
    const contentEl = document.getElementById('lessonContent');
    if (contentEl) {
      contentEl.innerHTML = `<div style="color:#ef4444">Error loading lesson: ${error.message}</div>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('App initializing...');

  // Initialize UI
  try {
    initUI();
  } catch (error) {
    console.log('UI initialization error (may be normal):', error);
  }

  // Initialize editor
  try { 
    initEditor(); 
  } catch (error) {
    console.log('Editor initialization error (may be normal):', error);
  }

  // Wire up Run button
  const runBtn = document.getElementById('runBtn');
  const outputEl = document.getElementById('output');
  const clearOutputBtn = document.getElementById('clearOutputBtn');

  if (runBtn && outputEl) {
    runBtn.addEventListener('click', async () => {
      outputEl.textContent = 'Running...\n';
      try {
        const editorEl = document.getElementById('editor');
        const code = editorEl ? editorEl.value : getCode();
        const result = await runCode(code);
        outputEl.textContent = result.stdout || '';
        if (result.stderr) {
          outputEl.textContent += '\nError: ' + result.stderr;
        }
      } catch (error) {
        outputEl.textContent = 'Error running code: ' + error.message;
      }
    });
  }

  if (clearOutputBtn && outputEl) {
    clearOutputBtn.addEventListener('click', () => {
      outputEl.textContent = '';
    });
  }

  // Load lessons
  try {
    console.log('Loading lessons...');
    state.lessons = await loadLessonsList();
    console.log(`Loaded ${state.lessons.length} lessons`);

    renderLessonList();

    // Auto-open first lesson if available
    if (state.lessons.length > 0) {
      openLesson(state.lessons[0].id);
    }
  } catch (err) {
    console.error('Failed to load lessons:', err);
    const listEl = document.getElementById('lessonList');
    if (listEl) {
      listEl.innerHTML = `<div style="padding:8px;color:#ef4444">Error loading lessons: ${err.message}</div>`;
    }
  }

  // Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('pwa/sw.js')
        .then(reg => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker registration failed:', err));
    });
  }
});