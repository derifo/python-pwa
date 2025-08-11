// app.js - Complete version with module organization
import { loadLessons, loadLesson } from './store.js';
import { runCode } from '../core/executor.js';

let currentLesson = null;
let lessons = [];
let modules = {};

// Initialize app
async function init() {
  console.log('App initializing...');

  // Load lessons
  await loadLessonsData();

  // Setup event listeners
  setupEventListeners();

  // Register service worker
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('/python-pwa/sw.js');
      console.log('Service Worker registered');
    } catch (error) {
      console.log('Service Worker registration failed:', error);
    }
  }
}

// Load and organize lessons
async function loadLessonsData() {
  try {
    console.log('Loading lessons...');
    lessons = await loadLessons();
    console.log(`Loaded ${lessons.length} lessons`);

    // Organize lessons into modules
    organizeModules();

    // Render module list
    renderModuleList();

    // Update progress
    updateProgress();

  } catch (error) {
    console.error('Failed to load lessons:', error);
    document.getElementById('moduleList').innerHTML = 
      '<div style="padding: 20px; color: var(--error);">Failed to load lessons</div>';
  }
}

// Organize lessons into modules
function organizeModules() {
  modules = {};

  // Sort lessons properly (M1L1, M1L2, ..., M1L10, M2L1, etc.)
  lessons.sort((a, b) => {
    const aMatch = a.id.match(/m(\d+)-l(\d+)/);
    const bMatch = b.id.match(/m(\d+)-l(\d+)/);

    if (aMatch && bMatch) {
      const aModule = parseInt(aMatch[1]);
      const bModule = parseInt(bMatch[1]);
      const aLesson = parseInt(aMatch[2]);
      const bLesson = parseInt(bMatch[2]);

      if (aModule !== bModule) {
        return aModule - bModule;
      }
      return aLesson - bLesson;
    }
    return a.id.localeCompare(b.id);
  });

  // Group by module
  lessons.forEach(lesson => {
    const match = lesson.id.match(/m(\d+)-l(\d+)/);
    if (match) {
      const moduleNum = parseInt(match[1]);
      const moduleName = `Module ${moduleNum}`;

      if (!modules[moduleName]) {
        modules[moduleName] = {
          name: moduleName,
          number: moduleNum,
          lessons: []
        };
      }

      modules[moduleName].lessons.push(lesson);
    }
  });
}

// Render module list in sidebar
function renderModuleList() {
  const moduleList = document.getElementById('moduleList');
  const completedLessons = JSON.parse(localStorage.getItem('completedLessons') || '[]');

  let html = '';

  // Sort modules by number
  const sortedModules = Object.values(modules).sort((a, b) => a.number - b.number);

  sortedModules.forEach(module => {
    const moduleId = `module-${module.number}`;
    const isExpanded = localStorage.getItem(`${moduleId}-expanded`) === 'true';

    html += `
      <div class="module">
        <div class="module-header ${isExpanded ? 'expanded' : ''}" onclick="toggleModule('${moduleId}')">
          <div class="module-title">
            <span class="module-arrow">▶</span>
            <span>${module.name}</span>
          </div>
          <span style="font-size: 12px; color: var(--text-muted);">
            ${module.lessons.length} lessons
          </span>
        </div>
        <div class="module-lessons ${isExpanded ? 'expanded' : ''}" id="${moduleId}">
    `;

    module.lessons.forEach(lesson => {
      const isCompleted = completedLessons.includes(lesson.id);
      const lessonNum = lesson.id.match(/l(\d+)/)?.[1] || '';

      html += `
        <button class="lesson-item ${isCompleted ? 'completed' : ''}" 
                onclick="openLesson('${lesson.id}')"
                data-lesson-id="${lesson.id}">
          <span>Lesson ${lessonNum}: ${lesson.title}</span>
        </button>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  moduleList.innerHTML = html;
}

// Toggle module expansion
window.toggleModule = function(moduleId) {
  const header = document.querySelector(`#${moduleId}`).previousElementSibling;
  const lessons = document.getElementById(moduleId);

  header.classList.toggle('expanded');
  lessons.classList.toggle('expanded');

  // Save state
  localStorage.setItem(`${moduleId}-expanded`, lessons.classList.contains('expanded'));
}

// Open a lesson
window.openLesson = async function(lessonId) {
  console.log('Opening lesson:', lessonId);

  try {
    // Update active state
    document.querySelectorAll('.lesson-item').forEach(item => {
      item.classList.remove('active');
    });
    document.querySelector(`[data-lesson-id="${lessonId}"]`)?.classList.add('active');

    // Load lesson data
    const lessonData = await loadLesson(lessonId);
    currentLesson = lessonData;

    // Render lesson content
    renderLessonContent(lessonData);

    // Update editor with starter code
    const editor = document.getElementById('editor');
    if (editor && lessonData.starterCode) {
      editor.value = lessonData.starterCode;
    }

    // Mark as current lesson
    localStorage.setItem('currentLesson', lessonId);

    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
      document.getElementById('sidebar').classList.remove('open');
    }

  } catch (error) {
    console.error('Failed to load lesson:', error);
    document.getElementById('lessonContent').innerHTML = 
      '<div style="padding: 40px; text-align: center; color: var(--error);">Failed to load lesson</div>';
  }
}

// Render lesson content with proper styling
function renderLessonContent(lesson) {
  const content = document.getElementById('lessonContent');

  let html = `<h2>${lesson.title}</h2>`;

  if (lesson.description) {
    html += `<p style="font-size: 18px; color: var(--text-secondary); margin-bottom: 32px;">${lesson.description}</p>`;
  }

  // Handle sections format
  if (lesson.sections && Array.isArray(lesson.sections)) {
    lesson.sections.forEach(section => {
      const sectionClass = section.type ? `section-${section.type}` : 'section-read';

      html += `<div class="${sectionClass}">`;

      if (section.title) {
        html += `<h3>${section.title}</h3>`;
      }

      if (section.content) {
        // Convert markdown-style content to HTML
        let content = section.content;

        // Convert code blocks
        content = content.replace(/```python
([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
        content = content.replace(/```
([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

        // Convert inline code
        content = content.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Convert line breaks to paragraphs
        content = content.split('

').map(para => 
          para.trim() ? `<p>${para}</p>` : ''
        ).join('');

        html += content;
      }

      if (section.code) {
        html += `<pre><code>${section.code}</code></pre>`;
      }

      html += `</div>`;
    });
  } else if (lesson.content) {
    // Handle old format
    html += `<div class="section-read">${lesson.content}</div>`;
  }

  // Add completion button
  html += `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--border);">
      <button class="btn btn-primary" onclick="markAsComplete('${lesson.id}')">
        Mark as Complete ✓
      </button>
    </div>
  `;

  content.innerHTML = html;
}

// Mark lesson as complete
window.markAsComplete = function(lessonId) {
  const completedLessons = JSON.parse(localStorage.getItem('completedLessons') || '[]');

  if (!completedLessons.includes(lessonId)) {
    completedLessons.push(lessonId);
    localStorage.setItem('completedLessons', JSON.stringify(completedLessons));

    // Update UI
    document.querySelector(`[data-lesson-id="${lessonId}"]`)?.classList.add('completed');
    updateProgress();

    // Show success message
    showNotification('Lesson completed! 🎉');

    // Auto-advance to next lesson
    setTimeout(() => {
      const nextLesson = getNextLesson(lessonId);
      if (nextLesson) {
        openLesson(nextLesson.id);
      }
    }, 1500);
  }
}

// Get next lesson
function getNextLesson(currentLessonId) {
  const currentIndex = lessons.findIndex(l => l.id === currentLessonId);
  if (currentIndex >= 0 && currentIndex < lessons.length - 1) {
    return lessons[currentIndex + 1];
  }
  return null;
}

// Update progress display
function updateProgress() {
  const completed = JSON.parse(localStorage.getItem('completedLessons') || '[]');
  const total = lessons.length;
  const percent = total > 0 ? Math.round((completed.length / total) * 100) : 0;

  document.getElementById('completedCount').textContent = completed.length;
  document.getElementById('totalCount').textContent = total;
  document.getElementById('progressPercent').textContent = percent + '%';
  document.getElementById('progressBar').style.width = percent + '%';
}

// Show notification
function showNotification(message) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background: var(--success);
    color: white;
    padding: 16px 24px;
    border-radius: var(--radius);
    box-shadow: var(--shadow-lg);
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Setup event listeners
function setupEventListeners() {
  // Run button
  document.getElementById('runBtn')?.addEventListener('click', async () => {
    const code = document.getElementById('editor').value;
    const output = document.getElementById('output');

    output.textContent = 'Running...';

    try {
      const result = await runCode(code);

      if (result.errors && result.errors.length > 0) {
        output.textContent = 'Error:\n' + result.errors.join('\n');
        output.style.color = 'var(--error)';
      } else {
        output.textContent = result.stdout || 'No output';
        output.style.color = 'var(--text-primary)';
      }
    } catch (error) {
      output.textContent = 'Error: ' + error.message;
      output.style.color = 'var(--error)';
    }
  });

  // Clear button
  document.getElementById('clearBtn')?.addEventListener('click', () => {
    document.getElementById('output').textContent = '';
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Enter to run code
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('runBtn')?.click();
    }

    // Ctrl/Cmd + S to save progress
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveProgress();
    }
  });
}

// Save progress
function saveProgress() {
  if (currentLesson) {
    const code = document.getElementById('editor').value;
    localStorage.setItem(`lesson-${currentLesson.id}-code`, code);
    showNotification('Progress saved!');
  }
}

// Load saved progress
function loadProgress(lessonId) {
  const savedCode = localStorage.getItem(`lesson-${lessonId}-code`);
  if (savedCode) {
    document.getElementById('editor').value = savedCode;
  }
}

// Start the app
init();

// Export for use in other modules
window.openLesson = openLesson;
window.markAsComplete = markAsComplete;
window.toggleModule = toggleModule;