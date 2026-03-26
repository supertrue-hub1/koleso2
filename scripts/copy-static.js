const fs = require('fs');
const path = require('path');

const srcStatic = path.join(__dirname, '..', '.next', 'static');
const destStatic = path.join(__dirname, '..', '.next', 'standalone', '.next', 'static');

const srcPublic = path.join(__dirname, '..', 'public');
const destPublic = path.join(__dirname, '..', '.next', 'standalone', 'public');

if (fs.existsSync(srcStatic)) {
  fs.cpSync(srcStatic, destStatic, { recursive: true });
  console.log('✅ Copied .next/static');
}

if (fs.existsSync(srcPublic)) {
  fs.cpSync(srcPublic, destPublic, { recursive: true });
  console.log('✅ Copied public');
}
