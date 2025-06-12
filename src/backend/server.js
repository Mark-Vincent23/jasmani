const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Inisialisasi database
const dbPath = path.join(__dirname, 'jasmani.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Gagal koneksi ke database:', err.message);
    } else {
        console.log('Terhubung ke database SQLite.');
    }
});

// Buat tabel jika belum ada
const createTableQuery = `CREATE TABLE IF NOT EXISTS jasmani (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT,
    lari REAL,
    pushup INTEGER,
    pullup INTEGER,
    situp INTEGER,
    shuttlerun REAL,
    skor REAL,
    kategori TEXT,
    timestamp DATE DEFAULT CURRENT_DATE
)`;
db.run(createTableQuery);

// Dummy ML logic, replace with Python integration
function klasifikasiJasmani({ lari, pushup, pullup, situp, shuttlerun }) {
    // Skor sederhana (dummy):
    let skor = lari/30 + pushup*2 + pullup*3 + situp*2 - shuttlerun;
    let kategori = 'E';
    if (skor >= 85) kategori = 'A';
    else if (skor >= 70) kategori = 'B';
    else if (skor >= 55) kategori = 'C';
    else if (skor >= 40) kategori = 'D';
    return { kategori, skor };
}

app.post('/api/klasifikasi', (req, res) => {
    const data = req.body;
    const hasil = klasifikasiJasmani(data);
    // Simpan ke database
    const { nama, lari, pushup, pullup, situp, shuttlerun } = data;
    db.run(
        `INSERT INTO jasmani (nama, lari, pushup, pullup, situp, shuttlerun, skor, kategori, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, date('now'))`,
        [nama, lari, pushup, pullup, situp, shuttlerun, hasil.skor, hasil.kategori],
        function(err) {
            if (err) {
                console.error('Gagal menyimpan ke database:', err.message);
                return res.status(500).json({ error: 'Gagal menyimpan data' });
            }
            res.json({ id: this.lastID, ...hasil });
        }
    );
});

// Tambahkan endpoint baru untuk frontend lihatdata.html
app.get('/api/data', (req, res) => {
    db.all('SELECT * FROM jasmani ORDER BY timestamp DESC', [], (err, rows) => {
        if (err) {
            console.error('Gagal mengambil data:', err.message);
            return res.status(500).json({ error: 'Gagal mengambil data' });
        }
        res.json(rows);
    });
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log('JasmaniAI backend running on port', PORT);
});
