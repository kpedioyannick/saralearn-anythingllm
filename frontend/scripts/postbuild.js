import { renameSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log(`Running frontend post build script...`)
renameSync(path.resolve(__dirname, '../dist/index.html'), path.resolve(__dirname, '../dist/_index.html'));
console.log(`index.html renamed to _index.html so SSR of the index page can be assumed.`);

const version = new Date().toISOString();
writeFileSync(path.resolve(__dirname, '../dist/version.txt'), version + '\n');
console.log(`version.txt written: ${version}`);
