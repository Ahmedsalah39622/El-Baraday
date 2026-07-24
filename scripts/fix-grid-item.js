const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

let count = 0;
walkDir(path.join(__dirname, '../src'), (filePath) => {
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('<Grid item')) {
      let updated = content.replace(/<Grid\s+item/g, '<Grid');
      fs.writeFileSync(filePath, updated, 'utf8');
      console.log(`Updated: ${filePath}`);
      count++;
    }
  }
});

console.log(`Finished removing <Grid item ...> from ${count} files.`);
