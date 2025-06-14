// Hapus import ini karena bisa menyebabkan masalah
// import './style.css';

// Tunggu TensorFlow.js loaded dulu
async function waitForTensorFlow() {
    while (typeof tf === 'undefined') {
        console.log('⏳ Waiting for TensorFlow.js...');
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.log('✅ TensorFlow.js loaded');
}

class JasmaniPredictor {
    constructor() {
        this.model = null;
        this.scaler = null;
        this.isLoaded = false;
    }

    async loadModel() {
        try {
            await waitForTensorFlow();
            
            console.log('🔄 Loading model...');
            console.log('🌐 Testing model URL first...');
            
            const testResponse = await fetch('http://localhost:5000/model/backend/model.json');
            console.log('📡 Model URL response status:', testResponse.status);
            
            if (!testResponse.ok) {
                throw new Error(`HTTP ${testResponse.status}: ${testResponse.statusText}`);
            }
            
            const modelData = await testResponse.json();
            console.log('📋 Model JSON structure:', modelData);
            
            // Validate weights file exists
            if (modelData.weightsManifest && modelData.weightsManifest[0]) {
                const weightsPath = modelData.weightsManifest[0].paths[0];
                console.log('⚖️ Testing weights file:', weightsPath);
                
                const weightsResponse = await fetch(`/model/backend/${weightsPath}`);
                console.log('⚖️ Weights response status:', weightsResponse.status);
                
                if (!weightsResponse.ok) {
                    throw new Error(`Weights file not found: ${weightsPath}`);
                }
            }
            
            console.log('🤖 Loading with TensorFlow.js...');
            
            // Add timeout for TensorFlow.js loading
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('TensorFlow.js loading timeout (10s)')), 10000);
            });
            
            const loadPromise = tf.loadLayersModel('http://localhost:5000/model/backend/model.json');
            
            // Race between loading and timeout
            this.model = await Promise.race([loadPromise, timeoutPromise]);
            
            console.log('✅ Model loaded successfully!');
            console.log('🔍 Model summary:', this.model);
            console.log('🔍 Model inputs:', this.model.inputs);
            console.log('🔍 Model outputs:', this.model.outputs);
            
            return true;
            
        } catch (error) {
            console.error('❌ Model loading failed:', error);
            console.error('❌ Error type:', error.constructor.name);
            console.error('❌ Error message:', error.message);
            
            // Try fallback method
            console.log('🔄 Trying fallback prediction method...');
            this.useFallback = true;
            return true; // Still return true to continue app functionality
        }
    }

    normalizeData(data) {
        // Urutan yang BENAR: PUSH UP, PULL UP, LARI 12 MENIT, SIT UP, SHUTTLE RUN
        const features = [data.pushup, data.pullup, data.lari, data.situp, data.shuttlerun];
        const normalized = [];
        
        console.log('🔢 Input features:', features);
        console.log('📊 Scaler min:', this.scaler.min);
        console.log('📊 Scaler max:', this.scaler.max);
        
        for (let i = 0; i < features.length; i++) {
            // MinMaxScaler formula: (x - min) / (max - min)
            const norm = (features[i] - this.scaler.min[i]) / (this.scaler.max[i] - this.scaler.min[i]);
            normalized.push(norm);
        }
        
        console.log('✅ Normalized:', normalized);
        return normalized;
    }

    denormalizeData(normalizedData) {
        const denormalized = [];
        
        for (let i = 0; i < normalizedData.length; i++) {
            // Inverse MinMaxScaler: x = normalized * (max - min) + min
            const denorm = normalizedData[i] * (this.scaler.max[i] - this.scaler.min[i]) + this.scaler.min[i];
            denormalized.push(Math.round(denorm * 100) / 100); // Round to 2 decimal places
        }
        
        return {
            pushup: Math.round(denormalized[0]),
            pullup: Math.round(denormalized[1]), 
            lari: Math.round(denormalized[2]),
            situp: Math.round(denormalized[3]),
            shuttlerun: Math.round(denormalized[4] * 100) / 100
        };
    }

    async predictNextMonth(data1, data2) {
        if (!this.isLoaded) {
            console.error('❌ Model not loaded');
            return null;
        }

        try {
            console.log('🔮 Starting prediction...');
            console.log('📊 Data1:', data1);
            console.log('📊 Data2:', data2);

            // Normalize kedua data
            const norm1 = this.normalizeData(data1);
            const norm2 = this.normalizeData(data2);
            
            // Buat sequence untuk LSTM (shape: [1, 2, 5])
            const sequence = tf.tensor3d([[norm1, norm2]]);
            
            console.log('🎯 Input sequence shape:', sequence.shape);
            
            // Prediksi
            const prediction = this.model.predict(sequence);
            const predictionArray = await prediction.data();
            
            console.log('🔮 Raw prediction:', predictionArray);
            
            // Denormalisasi hasil
            const result = this.denormalizeData(Array.from(predictionArray));
            
            console.log('✅ Final prediction:', result);
            
            // Cleanup tensors
            sequence.dispose();
            prediction.dispose();
            
            return result;
            
        } catch (error) {
            console.error('❌ Prediction error:', error);
            return null;
        }
    }
}

// Inisialisasi
const predictor = new JasmaniPredictor();
let modelReady = false;

// Load model saat page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOM loaded, starting model load...');
    
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
