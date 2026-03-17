const { execSync } = require('child_process');
const fs = require('fs');

function run(cmd, label) {
  let output = `\n=== ${label} ===\n`;
  try {
    const result = execSync(cmd, {
      cwd: 'C:/Users/mitch/PycharmProjects/afl_coaching_board',
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024,
      timeout: 180000,
    });
    output += result || '(no output - success)';
  } catch (e) {
    output += 'STDOUT:\n' + (e.stdout || '(none)');
    output += '\nSTDERR:\n' + (e.stderr || '(none)');
    output += '\nExit code: ' + e.status;
  }
  return output;
}

const tscOutput = run('npx tsc --noEmit', 'TSC CHECK');
const buildOutput = run('npm run build', 'BUILD');

const combined = tscOutput + '\n' + buildOutput;
fs.writeFileSync('C:/Users/mitch/PycharmProjects/afl_coaching_board/check_output.txt', combined, 'utf8');
console.log('Done. Output written to check_output.txt');
