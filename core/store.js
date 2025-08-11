export async function loadLessonsList() {
  try {
    // Fix: Use a more reliable path construction
    const basePath = window.location.pathname.endsWith('/') 
      ? window.location.pathname 
      : window.location.pathname + '/';
    const res = await fetch(`${basePath}lessons/index.json`);

    if (!res.ok) {
      throw new Error(`Failed to load lessons: ${res.status}`);
    }

    const data = await res.json();

    return data.map(lesson => ({
      ...lesson,
      completed: !!localStorage.getItem(`lesson-${lesson.id}-completed`)
    }));
  } catch (error) {
    console.error('Error loading lessons list:', error);
    throw error;
  }
}

export async function loadLesson(id) {
  try {
    const basePath = window.location.pathname.endsWith('/') 
      ? window.location.pathname 
      : window.location.pathname + '/';
    const res = await fetch(`${basePath}lessons/${id}.json`);

    if (!res.ok) {
      throw new Error(`Failed to load lesson ${id}: ${res.status}`);
    }

    return await res.json();
  } catch (error) {
    console.error(`Error loading lesson ${id}:`, error);
    throw error;
  }
}

export function completeLesson(id) {
  localStorage.setItem(`lesson-${id}-completed`, 'true');
}
