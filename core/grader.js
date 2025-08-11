import { runCode } from './executor.js';

export async function gradeExercise(exercise) {
  const results = [];

  for (const test of exercise.tests) {
    const res = await runCode(exercise.solutionCode, { inputs: test.inputs || [] });
    let pass = false;

    if (test.type === 'includes') {
      pass = res.stdout.includes(test.match);
    }
    else if (test.type === 'equals') {
      pass = res.stdout.trim() === test.match.trim();
    }
    else if (test.type === 'regex') {
      pass = new RegExp(test.pattern, 'm').test(res.stdout);
    }

    results.push({ pass, detail: test });
  }

  return {
    passed: results.every(r => r.pass),
    results
  };
}
