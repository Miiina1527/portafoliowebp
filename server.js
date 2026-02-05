const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const app = express();
const cors = require('cors');

app.use(cors());

const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Serve frontend static files (index.html, script.js, style.css) from project root
app.use(express.static(path.join(__dirname)));

// Serve uploaded files under /files
app.use('/files', express.static(UPLOADS_DIR, { index: false }));

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
                url: `/files/${parts}`
            });
        }
    }
    return results;
}

app.get('/api/downloads', async (req, res) => {
    try{
        // Ensure uploads dir exists
        await fs.access(UPLOADS_DIR);
    }catch(err){
        return res.json([]);
    }
    try{
        const files = await walk(UPLOADS_DIR);
        res.json(files);
    }catch(err){
        console.error(err);
        res.status(500).json({ error: 'Error leyendo archivos' });
    }
});

app.get('/api/status', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log(`Server listening on http://localhost:${PORT}`));
