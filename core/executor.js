let engine = 'skulpt';

export function setEngine(name) {
  engine = name;
}

export async function runCode(source, { inputs = [] } = {}) {
  if (engine === 'skulpt') {
    // Check if Skulpt is available
    if (typeof Sk === 'undefined') {
      throw new Error('Python interpreter not loaded. Please refresh the page.');
    }
    return await runSkulpt(source, inputs);
  }
  throw new Error(`Engine ${engine} not implemented`);
}

async function runSkulpt(source, inputs) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    const startTime = performance.now();
    let inputIndex = 0;

    function outf(text) {
      stdout += text;
    }

    function inf() {
      const val = inputs[inputIndex] || '';
      inputIndex++;
      return val;
    }

    // Check again before configuring
    if (typeof Sk === 'undefined') {
      resolve({
        stdout: '',
        stderr: 'Error: Python interpreter (Skulpt) is not loaded. Please refresh the page.',
        errors: ['Skulpt not loaded'],
        timeMs: 0
      });
      return;
    }

    Sk.configure({
      output: outf,
      read: builtinRead,
      inputfun: inf,
      inputfunTakesPrompt: true
    });

    function builtinRead(x) {
      if (Sk.builtinFiles === undefined || Sk.builtinFiles['files'][x] === undefined)
        throw `File not found: '${x}'`;
      return Sk.builtinFiles['files'][x];
    }

    Sk.misceval.asyncToPromise(() => Sk.importMainWithBody('<stdin>', false, source, true))
      .then(() => {
        resolve({
          stdout,
          stderr,
          errors: [],
          timeMs: performance.now() - startTime
        });
      })
      .catch(err => {
        stderr = err.toString();
        resolve({
          stdout,
          stderr,
          errors: [stderr],
          timeMs: performance.now() - startTime
        });
      });
  });
}