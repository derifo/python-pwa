// executor.js - Fixed version with Skulpt check
export async function runCode(code) {
  // Check if Skulpt is loaded
  if (typeof Sk === 'undefined') {
    console.error('Skulpt not loaded');
    return {
      stdout: '',
      errors: ['Python interpreter not loaded. Please refresh the page.']
    };
  }

  let output = '';
  let errors = [];

  // Configure Skulpt
  Sk.configure({
    output: function(text) {
      output += text;
    },
    read: function(x) {
      if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined) {
        throw "File not found: '" + x + "'";
      }
      return Sk.builtinFiles["files"][x];
    }
  });

  try {
    // Run the code
    await Sk.misceval.asyncToPromise(function() {
      return Sk.importMainWithBody("<stdin>", false, code, true);
    });
  } catch (error) {
    errors.push(error.toString());
  }

  return {
    stdout: output,
    errors: errors
  };
}