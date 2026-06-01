const fs = require('fs');
const pdfModule = require('pdf-parse');
const pdf = pdfModule.default || pdfModule;

const file = process.argv[2];
if(!file){
  console.error('Usage: node extract_pdf.cjs <file.pdf>');
  process.exit(1);
}

let dataBuffer = fs.readFileSync(file);

pdf(dataBuffer).then(function(data) {
    console.log(data.text);
}).catch(err=>{
    console.error('PDF parse error', err);
    process.exit(2);
});
