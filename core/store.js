export async function loadLessonsList() {
  const basePath = window.location.pathname.endsWith('/') 
    ? window.location.pathname 
    : window.location.pathname + '/';

  const res = await fetch(`${basePath}lessons/index.json`);

  if (!res.ok) {
    throw new Error(`Failed to load lessons list: ${res.status}`);
  }

  const data = await res.json();

  return data.map(lesson => ({
    ...lesson,
    completed: !!localStorage.getItem(`lesson-${lesson.id}-completed`)
  }));
}

export async function loadLesson(id) {
  const basePath = window.location.pathname.endsWith('/') 
    ? window.location.pathname 
    : window.location.pathname + '/';

  // FIX: Load the individual lesson file, not index.json!
  const res = await fetch(`${basePath}lessons/${id}.json`);

  if (!res.ok) {
    throw new Error(`Failed to load lesson ${id}: ${res.status}`);
  }

  return await res.json();
}

export function completeLesson(id) {
  localStorage.setItem(`lesson-${id}-completed`, 'true');
}
