import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

async function zipDist() {
  const zip = new JSZip();
  const distPath = path.resolve(process.cwd(), 'dist');

  if (!fs.existsSync(distPath)) {
    console.error('dist folder does not exist. Run npm run build first.');
    return;
  }

  function addFolderToZip(folderPath, zipFolder) {
    const items = fs.readdirSync(folderPath);
    for (const item of items) {
      const fullPath = path.join(folderPath, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        const subZip = zipFolder.folder(item);
        addFolderToZip(fullPath, subZip);
      } else {
        const content = fs.readFileSync(fullPath);
        zipFolder.file(item, content);
      }
    }
  }

  addFolderToZip(distPath, zip);

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(path.resolve(process.cwd(), 'hh-reply-ai.zip'), buffer);
  console.log('Successfully created hh-reply-ai.zip from dist folder!');
}

zipDist().catch(console.error);
