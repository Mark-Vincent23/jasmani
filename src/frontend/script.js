import './style.css';

class JasmaniPredictor {
    constructor() {
        this.model = null;
        this.scaler = null;
        this.isLoaded = false;
    }

    async loadModel() {
        try {
            console.log('🔄 Loading TensorFlow.js...');
            
            // Load TensorFlow.js dari CDN
            const script = document.createElement('script');
            script.src = '<script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.21.0/dist/tf.min.js"></script>';
            document.head.appendChild(script);
            
            // Wait for TensorFlow to load
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                setTimeout(reject, 10000); // 10 second timeout
            });
            
            console.log('✅ TensorFlow.js loaded');
            
            // Load model
            console.log('🔄 Loading LSTM model from /model/model.json');
            this.model = await tf.loadLayersModel('http://localhost:5000/model/model.json');
            console.log('✅ LSTM model loaded:', this.model);
            
            // Load scaler
            console.log('🔄 Loading scaler from /model/scaler_lstm.json');
            const response = await fetch('/model/scaler_lstm.json');
            if (!response.ok) {
                throw new Error(`Scaler not found: ${response.status}`);
            }
            this.scaler = await response.json();
            console.log('✅ Scaler loaded:', this.scaler);
            
            this.isLoaded = true;
            return true;
        } catch (error) {
            console.error('❌ Error loading model:', error);
            return false;
        }
    }

    normalizeData(data) {
        // Urutan: PUSH UP, PULL UP, LARI 12 MENIT, SIT UP, SHUTTLE RUN
        const features = [data.pushup, data.pullup, data.lari, data.situp, data.shuttlerun];
        const normalized = [];
        
        for (let i = 0; i < features.length; i++) {
            // Menggunakan MinMaxScaler formula: (x - min) / (max - min)
            const norm = (features[i] - this.scaler.min[i]) / (this.scaler.max[i] - this.scaler.min[i]);
            normalized.push(norm);
        }
        return normalized;
    }

    denormalizeData(normalizedData) {
        const denormalized = [];
        for (let i = 0; i < normalizedData.length; i++) {
            // Inverse MinMaxScaler: x * (max - min) + min
            const original = normalizedData[i] * (this.scaler.max[i] - this.scaler.min[i]) + this.scaler.min[i];
            denormalized.push(Math.round(original * 100) / 100);
        }
        return denormalized;
    }

    async predictNextMonth(data1, data2) {
        if (!this.isLoaded || !window.tf) {
            console.error('❌ Model not loaded');
            return null;
        }

        try {
            console.log('🔄 Predicting with data:', data1, data2);
            
            const norm1 = this.normalizeData(data1);
            const norm2 = this.normalizeData(data2);
            
            console.log('📊 Normalized data:', norm1, norm2);
            
            // LSTM input shape: [batch, timesteps, features]
            const inputTensor = tf.tensor3d([[norm1, norm2]]);
            console.log('📊 Input tensor shape:', inputTensor.shape);
            
            const prediction = this.model.predict(inputTensor);
            const predArray = await prediction.data();
            console.log('🎯 Raw prediction:', Array.from(predArray));
            
            const result = this.denormalizeData(Array.from(predArray));
            console.log('✨ Denormalized result:', result);
            
            // Cleanup tensors
            inputTensor.dispose();
            prediction.dispose();
            
            return {
                pushup: Math.max(0, Math.round(result[0])),
                pullup: Math.max(0, Math.round(result[1])),
                lari: Math.max(1000, Math.round(result[2])),
                situp: Math.max(0, Math.round(result[3])),
                shuttlerun: Math.max(10, Math.round(result[4] * 100) / 100)
            };
        } catch (error) {
            console.error('❌ Prediction error:', error);
            return null;
        }
    }
}

const predictor = new JasmaniPredictor();
let modelReady = false;

// Load model saat page load
document.addEventListener('DOMContentLoaded', async () => {
    const statusEl = document.getElementById('ml-status');
    
    if (statusEl) {
        statusEl.innerHTML = '🔄 Memuat Model AI...';
        statusEl.style.color = 'orange';
    }
    
    try {
        modelReady = await predictor.loadModel();
        
        if (modelReady && statusEl) {
            statusEl.innerHTML = '✅ AI Prediksi Siap';
            statusEl.style.color = 'green';
            statusEl.style.fontWeight = 'bold';
        } else if (statusEl) {
            statusEl.innerHTML = '❌ Gagal Memuat Model AI';
            statusEl.style.color = 'red';
        }
    } catch (error) {
        console.error('❌ Error:', error);
        if (statusEl) {
            statusEl.innerHTML = '❌ AI Error: ' + error.message;
            statusEl.style.color = 'red';
        }
    }
});

// Handle form submit
document.getElementById('jasmaniForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        nama: formData.get('nama'),
        pushup: parseInt(formData.get('pushup')),
        pullup: parseInt(formData.get('pullup')),
        lari: parseInt(formData.get('lari')),
        situp: parseInt(formData.get('situp')),
        shuttlerun: parseFloat(formData.get('shuttlerun'))
    };
    
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '🔄 Memproses dan memprediksi...';
    
    try {
        // 1. Simpan data
        const response = await fetch('http://localhost:5000/api/simpan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error('Gagal menyimpan data');
        }
        
        const result = await response.json();
        
        let html = `
            <div class="result-card">
                <h3>✅ Data Tersimpan</h3>
                <p><strong>Nama:</strong> ${data.nama}</p>
                <p><strong>Push-up:</strong> ${data.pushup} kali</p>
                <p><strong>Pull-up:</strong> ${data.pullup} kali</p>
                <p><strong>Lari 12 menit:</strong> ${data.lari} meter</p>
                <p><strong>Sit-up:</strong> ${data.situp} kali</p>
                <p><strong>Shuttle Run:</strong> ${data.shuttlerun} detik</p>
            </div>
        `;
        
        // 2. Prediksi jika model ready
        if (modelReady) {
            try {
                const historyRes = await fetch(`http://localhost:5000/api/data/${encodeURIComponent(data.nama)}`);
                const history = await historyRes.json();
                
                console.log('📊 History data:', history);
                
                if (history.length >= 2) {
                    const data1 = history[1]; // Bulan sebelumnya
                    const data2 = history[0]; // Bulan ini (terbaru)
                    
                    const prediction = await predictor.predictNextMonth(data1, data2);
                    
                    if (prediction) {
                        html += `
                            <div class="prediction-card">
                                <h3>🔮 Prediksi Bulan Berikutnya</h3>
                                <div class="prediction-data">
                                    <p><strong>Push-up:</strong> ${prediction.pushup} kali</p>
                                    <p><strong>Pull-up:</strong> ${prediction.pullup} kali</p>
                                    <p><strong>Lari 12 menit:</strong> ${prediction.lari} meter</p>
                                    <p><strong>Sit-up:</strong> ${prediction.situp} kali</p>
                                    <p><strong>Shuttle Run:</strong> ${prediction.shuttlerun} detik</p>
                                </div>
                                <p class="ai-info">🧠 Prediksi menggunakan Model LSTM</p>
                            </div>
                        `;
                    } else {
                        html += `<div class="error-card"><p>⚠️ Gagal melakukan prediksi</p></div>`;
                    }
                } else {
                    html += `
                        <div class="info-card">
                            <h3>ℹ️ Butuh Data Lebih Banyak</h3>
                            <p>Untuk prediksi ML, butuh minimal <strong>2 data</strong> dengan nama yang sama.</p>
                            <p>Data saat ini: <strong>${history.length}</strong> untuk "${data.nama}"</p>
                            <p>Masukkan data bulan berikutnya untuk mulai prediksi! 📈</p>
                        </div>
                    `;
                }
            } catch (err) {
                console.error('❌ Prediction error:', err);
                html += `<div class="error-card"><p>⚠️ Error prediksi: ${err.message}</p></div>`;
            }
        } else {
            html += `<div class="info-card"><p>⚠️ Model AI belum siap. Refresh halaman.</p></div>`;
        }
        
        resultDiv.innerHTML = html;
        
    } catch (error) {
        console.error('❌ Error:', error);
        resultDiv.innerHTML = `<div class="error-card"><p>❌ Error: ${error.message}</p></div>`;
    }
});
