const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());

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

// EXPLICIT MODEL ROUTES - HARUS di ATAS semua routes lain
app.get('/model/backend/model.json', (req, res) => {
    const modelPath = path.join(__dirname, 'model/backend/model.json');
    console.log('🎯 Explicit route - Serving model.json from:', modelPath);
    
    // Set headers explicitly
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    
    // Check if file exists
    const fs = require('fs');
    if (!fs.existsSync(modelPath)) {
        console.error('❌ Model file not found:', modelPath);
        return res.status(404).json({ error: 'Model file not found' });
    }
    
    // Send file
    res.sendFile(modelPath, (err) => {
        if (err) {
            console.error('❌ Error sending model.json:', err);
            res.status(500).json({ error: 'Error serving model' });
        } else {
            console.log('✅ Model.json served successfully');
        }
    });
});

app.get('/model/backend/scaler_lstm.json', (req, res) => {
    const scalerPath = path.join(__dirname, 'model/backend/scaler_lstm.json');
    console.log('🎯 Explicit route - Serving scaler.json from:', scalerPath);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    
    const fs = require('fs');
    if (!fs.existsSync(scalerPath)) {
        console.error('❌ Scaler file not found:', scalerPath);
        return res.status(404).json({ error: 'Scaler file not found' });
    }
    
    res.sendFile(scalerPath, (err) => {
        if (err) {
            console.error('❌ Error sending scaler.json:', err);
            res.status(500).json({ error: 'Error serving scaler' });
        } else {
            console.log('✅ Scaler.json served successfully');
        }
    });
});

app.get('/model/backend/weights.bin', (req, res) => {
    const weightsPath = path.join(__dirname, 'model/backend/weights.bin');
    console.log('🎯 Explicit route - Serving weights.bin from:', weightsPath);
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    
    const fs = require('fs');
    if (!fs.existsSync(weightsPath)) {
        console.error('❌ Weights file not found:', weightsPath);
        return res.status(404).json({ error: 'Weights file not found' });
    }
    
    res.sendFile(weightsPath, (err) => {
        if (err) {
            console.error('❌ Error sending weights.bin:', err);
            res.status(500).json({ error: 'Error serving weights' });
        } else {
            console.log('✅ Weights.bin served successfully');
        }
    });
});

// API routes
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

app.get('/api/data/:nama', (req, res) => {
    const nama = req.params.nama;
    db.all(
        'SELECT * FROM jasmani WHERE nama = ? ORDER BY timestamp DESC LIMIT 5',
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

// Test endpoint
app.get('/test-model-backend', (req, res) => {
    const modelPath = path.join(__dirname, 'model/backend');
    const fs = require('fs');
    try {
        const files = fs.readdirSync(modelPath);
        res.json({
            message: 'Model backend files found',
            files: files,
            modelPath: modelPath
        });
    } catch (error) {
        res.status(500).json({
            error: 'Model backend folder not found',
            path: modelPath
        });
    }
});

// Frontend static files - PALING BAWAH
app.use(express.static(path.join(__dirname, '../frontend')));

const PORT = 5000;
app.listen(PORT, () => {
    console.log('🚀 JasmaniAI Backend running on http://localhost:' + PORT);
    console.log('📁 Serving frontend from:', path.join(__dirname, '../frontend'));
    console.log('🤖 Model routes:');
    console.log('   - http://localhost:' + PORT + '/model/backend/model.json');
    console.log('   - http://localhost:' + PORT + '/model/backend/scaler_lstm.json');
    console.log('   - http://localhost:' + PORT + '/model/backend/weights.bin');
    console.log('🔍 Test endpoint: http://localhost:' + PORT + '/test-model-backend');
});

