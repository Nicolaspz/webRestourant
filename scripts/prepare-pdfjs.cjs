// Serve PDF.js as native ES modules; do not re-bundle its internal webpack runtime.
const fs = require('node:fs');
const path = require('node:path');
const root = path.dirname(require.resolve('pdfjs-dist/package.json'));
const output = path.join(__dirname, '../public/pdfjs');
fs.mkdirSync(output, { recursive: true });
for (const file of ['pdf.min.mjs', 'pdf.worker.min.mjs']) {
  fs.copyFileSync(path.join(root, 'build', file), path.join(output, file));
}
console.log('PDF.js and matching worker prepared.');
