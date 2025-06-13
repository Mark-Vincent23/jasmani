const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// IMPORTANT: Serve model files FIRST (sebelum static files lain)
app.use('/model', express.static(path.join(__dirname, 'public/model')));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Database
const db = new sqlite3.Database(path.join(__dirname, 'jasmani.db'));

// Create table
db.run(`CREATE TABLE IF NOT EXISTS jasmani (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL,
    pushup INTEGER NOT NULL,
    pullup INTEGER NOT NULL,
    lari INTEGER NOT NULL,
    situp INTEGER NOT NULL,
    shuttlerun REAL NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// API simpan data
app.post('/api/simpan', (req, res) => {
    const { nama, pushup, pullup, lari, situp, shuttlerun } = req.body;
    
    console.log('📝 Menyimpan data:', { nama, pushup, pullup, lari, situp, shuttlerun });
    
    db.run(
        `INSERT INTO jasmani (nama, pushup, pullup, lari, situp, shuttlerun) VALUES (?, ?, ?, ?, ?, ?)`,
        [nama, pushup, pullup, lari, situp, shuttlerun],
        function(err) {
            if (err) {
                console.error('❌ Error insert:', err);
                return res.status(500).json({ error: 'Gagal simpan data' });
            }
            console.log('✅ Data tersimpan dengan ID:', this.lastID);
            res.json({ id: this.lastID, message: 'Data berhasil disimpan' });
        }
    );
});

// Get semua data
app.get('/api/data', (req, res) => {
    db.all('SELECT * FROM jasmani ORDER BY timestamp DESC', [], (err, rows) => {
        if (err) {
            console.error('❌ Error get data:', err);
            return res.status(500).json({ error: 'Gagal ambil data' });
        }
        console.log('📊 Mengirim', rows.length, 'data');
        res.json(rows);
    });
});

// Get data by nama
app.get('/api/data/:nama', (req, res) => {
    const nama = req.params.nama;
    
    db.all(
        'SELECT * FROM jasmani WHERE nama = ? ORDER BY timestamp DESC LIMIT 10',
        [nama],
        (err, rows) => {
            if (err) {
                console.error('❌ Error get data by nama:', err);
                return res.status(500).json({ error: 'Gagal ambil data' });
            }
            console.log('🔍 Data untuk', nama, ':', rows.length, 'records');
            res.json(rows);
        }
    );
});

// Test endpoint untuk model
app.get('/test-model', (req, res) => {
    const modelPath = path.join(__dirname, '../frontend/model');
    const fs = require('fs');
    
    try {
        const files = fs.readdirSync(modelPath);
        res.json({
            message: 'Model files found',
            files: files,
            modelPath: modelPath
        });
    } catch (error) {
        res.status(500).json({
            error: 'Model folder not found',
            path: modelPath
        });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log('🚀 JasmaniAI Backend running on http://localhost:' + PORT);
    console.log('📁 Serving frontend from:', path.join(__dirname, '../frontend'));
    console.log('🤖 Serving model from:', path.join(__dirname, '../frontend/model'));
    console.log('🔍 Test model endpoint: http://localhost:' + PORT + '/test-model');
});

