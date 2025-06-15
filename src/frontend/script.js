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
            
            console.log('🔄 Loading LSTM model...');
            
            // Load TensorFlow.js LSTM model
            this.model = await tf.loadLayersModel('http://localhost:5000/model/backend/model.json');
            console.log('✅ LSTM model loaded successfully!');
            console.log('🏗️ Model architecture:');
            console.log('   - Input shape:', this.model.inputs[0].shape); // [null, 3, 5]
            console.log('   - Output shape:', this.model.outputs[0].shape); // [null, 5]
            console.log('   - Layers:', this.model.layers.length);
            
            // Load scaler with proper format
            const scalerResponse = await fetch('http://localhost:5000/model/backend/scaler_lstm.json');
            if (!scalerResponse.ok) {
                throw new Error('Scaler file not found');
            }
            
            this.scaler = await scalerResponse.json();
            console.log('✅ Scaler loaded with ranges:');
            console.log('   - Min values:', this.scaler.min);
            console.log('   - Max values:', this.scaler.max);
            console.log('   - Features:', this.scaler.feature_names);
            
            this.isLoaded = true;
            console.log('🎯 LSTM Machine Learning Model Ready!');
            
            return true;
            
        } catch (error) {
            console.error('❌ CRITICAL: LSTM Model loading failed:', error);
            this.isLoaded = false;
            throw error;
        }
    }

    normalizeData(data) {
        if (!this.scaler) {
            throw new Error('Scaler not loaded');
        }
        
        // Sesuai urutan feature_names dari scaler
        const features = [
            data.pushup,    // PUSH UP
            data.pullup,    // PULL UP  
            data.lari,      // LARI 12 MENIT
            data.situp,     // SIT UP
            data.shuttlerun // SHUTTLE RUN
        ];
        
        console.log('🔢 Raw features:', features);
        
        const normalized = [];
        for (let i = 0; i < features.length; i++) {
            // MinMaxScaler normalization: (X - min) / (max - min)
            const normalizedValue = (features[i] - this.scaler.min[i]) / (this.scaler.max[i] - this.scaler.min[i]);
            normalized.push(normalizedValue);
        }
        
        console.log('✅ Normalized features:', normalized);
        return normalized;
    }

    denormalizeData(normalizedArray) {
        if (!this.scaler) {
            throw new Error('Scaler not loaded for denormalization');
        }
        
        const denormalized = [];
        for (let i = 0; i < normalizedArray.length; i++) {
            // Inverse MinMaxScaler: X = normalized * (max - min) + min
            const denormalizedValue = normalizedArray[i] * (this.scaler.max[i] - this.scaler.min[i]) + this.scaler.min[i];
            denormalized.push(denormalizedValue);
        }
        
        return {
            pushup: Math.max(0, Math.round(denormalized[0])),
            pullup: Math.max(0, Math.round(denormalized[1])),
            lari: Math.max(0, Math.round(denormalized[2])),
            situp: Math.max(0, Math.round(denormalized[3])),
            shuttlerun: Math.max(0, Math.round(denormalized[4] * 100) / 100)
        };
    }

    async predictNextMonth(historyData) {
        if (!this.isLoaded) {
            throw new Error('LSTM Model not loaded');
        }

        if (historyData.length < 5) { // CHANGED: 5 bukan 3
            throw new Error('LSTM model requires minimum 5 data points for sequence prediction');
        }

        try {
            console.log('🧠 Starting LSTM prediction...');
            console.log('📊 History data points:', historyData.length);
            
            // Ambil 5 data terakhir untuk sequence input [timesteps=5, features=5]
            const last5Data = historyData.slice(-5).reverse(); // CHANGED: 5 bukan 3
            
            console.log('🔄 Preparing 5-month sequence data:', last5Data);
            
            // Normalize setiap data point
            const normalizedSequence = [];
            for (let i = 0; i < last5Data.length; i++) {
                const normalizedPoint = this.normalizeData(last5Data[i]);
                normalizedSequence.push(normalizedPoint);
            }
            
            console.log('✅ Normalized sequence (5 months):', normalizedSequence);
            
            // Buat tensor dengan shape [1, 5, 5] sesuai model input
            // batch_size=1, timesteps=5, features=5
            const inputTensor = tf.tensor3d([normalizedSequence]);
            console.log('🎯 Input tensor shape:', inputTensor.shape); // Should be [1, 5, 5]
            
            // LSTM Prediction
            console.log('🧠 Running LSTM Neural Network...');
            const prediction = this.model.predict(inputTensor);
            
            if (!prediction) {
                throw new Error('LSTM prediction returned null');
            }
            
            const predictionArray = await prediction.data();
            console.log('🔮 Raw LSTM output:', Array.from(predictionArray));
        
            // Denormalize prediction results
            const denormalizedPrediction = this.denormalizeData(Array.from(predictionArray));
            
            console.log('✅ Final LSTM prediction:', denormalizedPrediction);
            
            // Cleanup tensors
            inputTensor.dispose();
            prediction.dispose();
            
            return denormalizedPrediction;
            
        } catch (error) {
            console.error('❌ LSTM Prediction Error:', error);
            throw error;
        }
    }
}

// Initialize predictor
const predictor = new JasmaniPredictor();
let modelReady = false;

// Load LSTM model on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Loading LSTM Machine Learning Model...');
    
    const statusEl = document.getElementById('ml-status');
    if (statusEl) {
        statusEl.innerHTML = '🔄 Loading LSTM Neural Network...';
        statusEl.style.color = 'orange';
    }
    
    try {
        modelReady = await predictor.loadModel();
        
        if (modelReady && statusEl) {
            statusEl.innerHTML = '✅ LSTM Model Ready - Time Series Prediction Active';
            statusEl.style.color = 'green';
            statusEl.style.fontWeight = 'bold';
        }
    } catch (error) {
        console.error('❌ CRITICAL: LSTM Model Load Failed:', error);
        if (statusEl) {
            statusEl.innerHTML = '❌ LSTM Model Error: ' + error.message;
            statusEl.style.color = 'red';
        }
        
        alert('CRITICAL ERROR: LSTM Machine Learning model gagal dimuat!\n\n' + 
              'Model: LSTM Sequential dengan 5 timesteps (5 bulan → prediksi bulan 6)\n' +
              'Error: ' + error.message + '\n\n' + 
              'Aplikasi memerlukan LSTM model untuk 5-month time series prediction.');
    }
});

// Handle form submission
document.getElementById('jasmaniForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!modelReady) {
        alert('❌ LSTM Model belum siap! Refresh halaman dan tunggu model loading.');
        return;
    }
    
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
    resultDiv.innerHTML = '🔄 Saving data and running LSTM prediction...';
    
    try {
        // 1. Save to database
        const response = await fetch('http://localhost:5000/api/simpan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error('Failed to save data to database');
        }
        
        const saveResult = await response.json();
        console.log('✅ Data saved:', saveResult);
        
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
        
        // 2. LSTM Time Series Prediction
        console.log('🧠 Fetching history for LSTM prediction...');
        
        const historyRes = await fetch(`http://localhost:5000/api/data/${encodeURIComponent(data.nama)}`);
        const history = await historyRes.json();
        
        console.log('📊 History retrieved:', history.length, 'records');
        
        if (history.length >= 5) {
            console.log('🎯 Running LSTM Time Series Prediction...');
            
            const prediction = await predictor.predictNextMonth(history);
            
            html += `
                <div class="prediction-card">
                    <h3>🧠 LSTM Time Series Prediction</h3>
                    <div class="prediction-data">
                        <p><strong>Push-up:</strong> ${prediction.pushup} kali</p>
                        <p><strong>Pull-up:</strong> ${prediction.pullup} kali</p>
                        <p><strong>Lari 12 menit:</strong> ${prediction.lari} meter</p>
                        <p><strong>Sit-up:</strong> ${prediction.situp} kali</p>
                        <p><strong>Shuttle Run:</strong> ${prediction.shuttlerun} detik</p>
                    </div>
                    <p class="ai-info">🤖 Model: LSTM Neural Network (64 units + Dense layers)</p>
                    <p class="ai-info">📊 Sequence Length: 5 months → predict month 6</p>
                    <p class="ai-info">🎯 Model trained on 500 real students with trend patterns</p>
                </div>
            `;
        } else {
            html += `
                <div class="info-card">
                    <h3>📊 LSTM Training Data Required</h3>
                    <p>LSTM model memerlukan minimal <strong>5 sequential data points</strong> untuk time series prediction.</p>
                    <p>Data saat ini: <strong>${history.length}</strong> untuk "${data.nama}"</p>
                    <p>Masukkan ${5 - history.length} data lagi untuk aktivasi LSTM prediction! 🧠📈</p>
                    <p><strong>Cara kerja:</strong> Input 5 bulan berurutan → Prediksi bulan ke-6</p>
                </div>
            `;
        }
        
        resultDiv.innerHTML = html;
        
    } catch (error) {
        console.error('❌ LSTM Process Error:', error);
        resultDiv.innerHTML = `
            <div class="error-card">
                <h3>❌ LSTM Prediction Error</h3>
                <p><strong>Error:</strong> ${error.message}</p>
                <p>LSTM model requirement: Sequential time series data dengan minimum 3 points.</p>
            </div>
        `;
    }
});
