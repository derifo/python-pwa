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
    const lesson = await loadLesson(lessonId);
    state.currentLessonId = lessonId;

    const contentEl = document.getElementById('lessonContent');
    if (contentEl) {
      contentEl.innerHTML = `
        <h3>${lesson.title || lessonId}</h3>
        <div>${lesson.content || 'Loading lesson content...'}</div>
        ${lesson.code ? `<pre>${lesson.code}</pre>` : ''}
      `;
    }

    // If lesson has starter code, load it into editor
    if (lesson.starterCode) {
      setCode(lesson.starterCode);
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
  initUI();

  // Initialize editor
  try { 
    initEditor(); 
  } catch (error) {
    console.log('Editor initialization:', error);
  }

  // Wire up Run button
  const runBtn = document.getElementById('runBtn');
  const outputEl = document.getElementById('output');
  const clearOutputBtn = document.getElementById('clearOutputBtn');

  if (runBtn && outputEl) {
    runBtn.addEventListener('click', async () => {
      outputEl.textContent = 'Running...\n';
      try {
        const result = await runCode(getCode());
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
