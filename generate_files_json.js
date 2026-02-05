const fs = require('fs').promises;
const path = require('path');

async function walk(dir, base = ''){
  const entries = await fs.readdir(dir, { withFileTypes: true });
  let results = [];
  for(const ent of entries){
    const full = path.join(dir, ent.name);
    const rel = base ? path.join(base, ent.name) : ent.name;
    if(ent.isDirectory()){
      const nested = await walk(full, rel);
      results = results.concat(nested);
    } else if(ent.isFile()){
      const stat = await fs.stat(full);
      const parts = rel.split(path.sep).map(encodeURIComponent).join('/');
      results.push({
        name: ent.name,
        relPath: rel.replace(/\\/g, '/'),
        size: stat.size,
        url: `/uploads/${parts}`
      });
    }
  }
  return results;
}

(async ()=>{
  try{
    const UP = path.join(__dirname, 'uploads');
    const files = await walk(UP);
    await fs.writeFile(path.join(__dirname, 'files.json'), JSON.stringify(files, null, 2), 'utf8');
    console.log('files.json written with', files.length, 'entries');
  }catch(err){
    console.error(err);
    process.exit(1);
  }
})();
