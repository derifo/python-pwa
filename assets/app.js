import { initUI } from '../core/ui.js';
import { loadLessonsList, loadLesson } from '../core/store.js';
import { initEditor, getCode, setCode } from '../core/editor.js';
import { runCode } from '../core/executor.js';

const state = { lessons: [], currentLessonId: null };

document.addEventListener('DOMContentLoaded', async () => {
  initUI();
  initEditor();

  document.getElementById('runBtn').addEventListener('click', async () => {
    const outputEl = document.getElementById('output');
    outputEl.textContent = 'Running...\n';
    const result = await runCode(getCode());
    outputEl.textContent = result.stdout || '';
    if (result.stderr) outputEl.textContent += '\nError: ' + result.stderr;
  });

  document.getElementById('clearOutputBtn').addEventListener('click', () => {
    document.getElementById('output').textContent = '';
  });

  state.lessons = await loadLessonsList();
  renderLessonList();
  if (state.lessons.length > 0) openLesson(state.lessons[0].id);
});

function renderLessonList() {
  const listEl = document.getElementById('lessonList');
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
  const lesson = await loadLesson(id);
  state.currentLessonId = id;
  renderLessonContent(lesson);
}

function renderLessonContent(lesson) {
  const contentEl = document.getElementById('lessonContent');
  contentEl.innerHTML = '';

  lesson.sections.forEach(section => {
    if (section.type === 'read') {
      const div = document.createElement('div');
      div.innerHTML = marked.parse(section.contentMarkdown);
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
      section.choices.forEach((choice, idx) => {
        const btn = document.createElement('button');
        btn.textContent = choice;
        btn.addEventListener('click', () => {
          if (idx === section.answerIndex) {
            alert('✅ Correct! ' + section.explainMarkdown);
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
