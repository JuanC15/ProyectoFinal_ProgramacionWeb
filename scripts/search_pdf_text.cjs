const fs = require('fs');
const file = process.argv[2];
if(!file){
  console.error('Usage: node search_pdf_text.cjs <file.pdf>');
  process.exit(1);
}
const raw = fs.readFileSync(file, 'latin1');
const regex = /requisitos|REQUISITOS|Requisitos/gi;
let match;
let out = '';
while(match = regex.exec(raw)){
  const idx = match.index;
  const start = Math.max(0, idx-500);
  const end = Math.min(raw.length, idx+500);
  out += '\n----MATCH----\n';
  out += raw.slice(start, end);
}
if(!out) out = 'NO MATCHES FOUND';
console.log(out);
