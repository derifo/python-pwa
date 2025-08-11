// store.js - Fixed version
const BASE_PATH = '/lessons/';

export async function loadLessons() {
  try {
    console.log('Fetching lessons index...');
    const response = await fetch(BASE_PATH + 'index.json');

    if (!response.ok) {
      throw new Error(`Failed to load lessons index: ${response.status}`);
    }

    const data = await response.json();
    console.log('Lessons index loaded:', data);
    return data.lessons || [];
  } catch (error) {
    console.error('Error loading lessons:', error);
    // Return empty array instead of throwing
    return [];
  }
}

export async function loadLesson(lessonId) {
  try {
    console.log(`Loading lesson: ${lessonId}`);
    const response = await fetch(`${BASE_PATH}${lessonId}.json`);

    if (!response.ok) {
      throw new Error(`Failed to load lesson ${lessonId}: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Lesson ${lessonId} loaded:`, data);
    return data;
  } catch (error) {
    console.error(`Error loading lesson ${lessonId}:`, error);
    throw error;
  }
}