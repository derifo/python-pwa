const K = {
  profile: 'pl_profile',
  achievements: 'pl_ach',
  lessons: 'pl_lessons_progress'
};

export function loadProfile(){ return JSON.parse(localStorage.getItem(K.profile) || '{"xp":0,"streak":0,"last":0}'); }
export function saveProfile(p){ localStorage.setItem(K.profile, JSON.stringify(p)); }

export function addXP(amount){
  const p = loadProfile(); p.xp = (p.xp||0) + amount; p.last = Date.now(); saveProfile(p); return p;
}

export function getAchievements(){ return JSON.parse(localStorage.getItem(K.achievements) || '[]'); }
export function addAchievement(code,label){
  const a = getAchievements();
  if (!a.some(x=>x.code===code)) { a.push({code,label,at:Date.now()}); localStorage.setItem(K.achievements, JSON.stringify(a)); }
  return a;
}

export function markLessonDone(id){
  const m = JSON.parse(localStorage.getItem(K.lessons) || '{}');
  if (!m[id]) m[id] = { done:true, runs:0, at:Date.now() };
  else m[id].done = true;
  localStorage.setItem(K.lessons, JSON.stringify(m));
  return m;
}

export function bumpRuns(id){
  const m = JSON.parse(localStorage.getItem(K.lessons) || '{}');
  if (!m[id]) m[id] = { done:false, runs:0, at:Date.now() };
  m[id].runs += 1; m[id].at = Date.now();
  localStorage.setItem(K.lessons, JSON.stringify(m));
  return m;
}

export function computeProgressPct(){
  const m = JSON.parse(localStorage.getItem(K.lessons) || '{}');
  const vals = Object.values(m);
  const total = vals.length || 1;
  const done = vals.filter(v=>v.done).length;
  return Math.round((done/total)*100);
}
