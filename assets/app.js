import { initUI } from '../core/ui.js';
import { loadLessonsList, loadLesson } from '../core/store.js';
import { initEditor, getCode, setCode } from '../core/editor.js';
import { runCode } from '../core/executor.js';

const state = { lessons: [], currentLessonId: null, currentLesson: null };

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

// Function to render sections-based lessons
function renderSections(sections) {
  let html = '';
  let starterCode = '';

  sections.forEach((section, index) => {
    switch(section.type) {
      case 'read':
        html += `<div class="section-read" style="margin-bottom: 1rem;">
          <p>${section.contentMarkdown.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>
        </div>`;
        break;

      case 'example':
        html += `<div class="section-example" style="margin-bottom: 1rem;">
          <h4 style="color: #3b82f6;">📝 Example:</h4>
          <pre style="background: #f5f5f7; padding: 1rem; border-radius: 8px; overflow-x: auto;">${section.starterCode}</pre>
          <p style="font-style: italic; color: #6b7280;">${section.explainMarkdown}</p>
        </div>`;
        if (!starterCode && section.starterCode) {
          starterCode = section.starterCode;
        }
        break;

      case 'exercise':
        html += `<div class="section-exercise" style="margin-bottom: 1rem; padding: 1rem; background: #fef3c7; border-radius: 8px;">
          <h4 style="color: #d97706;">💪 Exercise:</h4>
          <p>${section.promptMarkdown.replace(/`(.*?)`/g, '<code style="background: #fff; padding: 2px 4px; border-radius: 3px;">$1</code>')}</p>
          ${section.hints && section.hints.length > 0 ? `
            <details style="margin-top: 0.5rem;">
              <summary style="cursor: pointer; color: #3b82f6;">💡 Need hints?</summary>
              <ul style="margin-top: 0.5rem;">${section.hints.map(h => `<li>${h}</li>`).join('')}</ul>
            </details>` : ''}
        </div>`;
        // Use exercise starter code if it's not just "# TODO"
        if (!starterCode && section.starterCode && section.starterCode !== '# TODO') {
          starterCode = section.starterCode;
        }
        break;

      case 'quiz':
        html += `<div class="section-quiz" style="margin-bottom: 1rem; padding: 1rem; background: #ede9fe; border-radius: 8px;">
          <h4 style="color: #7c3aed;">❓ Quiz:</h4>
          <p><strong>${section.question}</strong></p>
          <ul style="list-style: none; padding-left: 0;">${section.choices.map((choice, i) => 
            `<li style="padding: 0.25rem 0;">${i === section.answerIndex ? '✅' : '○'} ${choice}</li>`
          ).join('')}</ul>
          <p style="font-style: italic; color: #6b7280; margin-top: 0.5rem;">${section.explainMarkdown}</p>
        </div>`;
        break;
    }
  });

  return { html, starterCode };
}

// Function to open a specific lesson
async function openLesson(lessonId) {
  const contentEl = document.getElementById('lessonContent');

  try {
    // Show loading state
    if (contentEl) {
      contentEl.innerHTML = '<div style="padding: 2rem; text-align: center; color: #6b7280;">Loading lesson...</div>';
    }

    console.log(`Opening lesson: ${lessonId}`);
    const lesson = await loadLesson(lessonId);
    state.currentLessonId = lessonId;
    state.currentLesson = lesson;

    if (contentEl) {
      let html = `<h2 style="color: #1f2937; margin-bottom: 1.5rem;">${lesson.title || lessonId}</h2>`;
      let starterCode = '';

      // Handle sections-based format
      if (lesson.sections && Array.isArray(lesson.sections)) {
        const rendered = renderSections(lesson.sections);
        html += rendered.html;
        starterCode = rendered.starterCode;
      } 
      // Handle traditional format (fallback)
      else {
        if (lesson.description) {
          html += `<p style="margin-bottom: 1rem;">${lesson.description}</p>`;
        }
        if (lesson.content) {
          html += `<div style="margin-bottom: 1rem;">${lesson.content}</div>`;
        }
        if (lesson.code) {
          html += `<pre style="background: #f5f5f7; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">${lesson.code}</pre>`;
        }
        starterCode = lesson.starterCode || lesson.code || '';
      }

      contentEl.innerHTML = html;

      // Load starter code into editor - handle both textarea and CodeMirror
      const editorEl = document.getElementById('editor');
      if (editorEl) {
        editorEl.value = starterCode || '# Write your Python code here...';
      } else {
        // Try to use setCode if editor is initialized differently
        try {
          setCode(starterCode || '# Write your Python code here...');
        } catch (e) {
          console.log('Could not set code in editor:', e);
        }
      }
    }

  } catch (error) {
    console.error('Error opening lesson:', error);
    if (contentEl) {
      contentEl.innerHTML = `
        <div style="padding: 2rem; background: #fee2e2; border-radius: 8px; color: #991b1b;">
          <h3>Error loading lesson</h3>
          <p>${error.message}</p>
          <p style="margin-top: 1rem; font-size: 0.875rem;">Make sure the lesson file exists at: lessons/${lessonId}.json</p>
        </div>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  console.log('App initializing...');

  // Initialize UI (may not exist)
  try {
    initUI();
  } catch (error) {
    console.log('UI initialization skipped:', error.message);
  }

  // Initialize editor (may not exist)
  try { 
    initEditor(); 
  } catch (error) {
    console.log('Editor initialization skipped:', error.message);
  }

  // Wire up Run button
  const runBtn = document.getElementById('runBtn');
  const outputEl = document.getElementById('output');
  const clearOutputBtn = document.getElementById('clearOutputBtn');
  const editorEl = document.getElementById('editor');

  if (runBtn && outputEl) {
    runBtn.addEventListener('click', async () => {
      outputEl.textContent = 'Running...\n';
      outputEl.style.color = '#6b7280';

      try {
        // Get code from textarea or editor
        let code = '';
        if (editorEl) {
          code = editorEl.value;
        } else {
          try {
            code = getCode();
          } catch (e) {
            code = '# No code to run';
          }
        }

        const result = await runCode(code);
        outputEl.style.color = '#1f2937';
        outputEl.textContent = result.stdout || 'No output';

        if (result.stderr) {
          outputEl.style.color = '#991b1b';
          outputEl.textContent = result.stderr;
        }
      } catch (error) {
        outputEl.style.color = '#991b1b';
        outputEl.textContent = 'Error: ' + error.message;
      }
    });
  }

  if (clearOutputBtn && outputEl) {
    clearOutputBtn.addEventListener('click', () => {
      outputEl.textContent = '';
      outputEl.style.color = '#1f2937';
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
      listEl.innerHTML = `
        <div style="padding: 1rem; background: #fee2e2; border-radius: 8px; color: #991b1b;">
          <p>Error loading lessons</p>
          <p style="font-size: 0.875rem; margin-top: 0.5rem;">${err.message}</p>
        </div>`;
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