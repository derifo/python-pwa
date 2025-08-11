export async function loadLessonsList() {
  const res = await fetch(`${window.location.pathname}lessons/index.json`);
  const data = await res.json();

  return data.map(lesson => ({
    ...lesson,
    completed: !!localStorage.getItem(`lesson-${lesson.id}-completed`)
  }));
}

export async function loadLesson(id) {
  const res = await fetch(`${window.location.pathname}lessons/index.json`);
  return await res.json();
}

export function completeLesson(id) {
  localStorage.setItem(`lesson-${id}-completed`, 'true');
}
