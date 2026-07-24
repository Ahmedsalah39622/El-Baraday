const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDir(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('<Grid item') || content.includes('<Grid  item')) {
        console.log('Replacing <Grid item in:', fullPath);
        // Replace <Grid item with <Grid
        content = content.replace(/<Grid\s+item\s+/g, '<Grid ');
        content = content.replace(/<Grid\s+item>/g, '<Grid>');
        fs.writeFileSync(fullPath, content, 'utf8');
      }
    }
  }
}

processDir('d:/Novix Works/El-Baraday/el-baraday-pos/src');
console.log('✅ Grid item replacement done.');
