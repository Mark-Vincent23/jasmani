import pandas as pd
import numpy as np
import json
import os
import tensorflow as tf
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Input

print("🚀 Creating working AI model...")
print(f"🧠 TensorFlow: {tf.__version__}")

# Load data
df = pd.read_csv('../Data Garjas Unhan - Sheet1.csv')
df['BULAN'] = pd.to_datetime(df['BULAN'], dayfirst=True)
df = df.sort_values(['ID', 'BULAN'])

features = ['PUSH UP', 'PULL UP', 'LARI 12 MENIT', 'SIT UP ', 'SHUTTLE RUN']
data = df[features].copy()

# Clean data
for col in features:
    data[col] = pd.to_numeric(data[col].astype(str).str.replace(',', '.'), errors='coerce')
data.dropna(inplace=True)

print(f"✅ Data loaded: {data.shape}")
print("Data:")
print(data)

# Scale data
scaler = MinMaxScaler()
scaled = scaler.fit_transform(data)
print(f"✅ Data scaled: {scaled.shape}")

# Create synthetic training data (karena data asli cuma 3 rows)
print("📊 Creating synthetic training data...")
np.random.seed(42)
synthetic_data = []

# Generate 200 synthetic samples
for i in range(200):
    # Pick random base from real data
    base_idx = np.random.randint(0, len(scaled))
    base = scaled[base_idx].copy()
    
    # Add random variations
    noise = np.random.normal(0, 0.15, len(base))
    synthetic = base + noise
    synthetic = np.clip(synthetic, 0, 1)  # Keep normalized
    synthetic_data.append(synthetic)

# Combine real and synthetic data
all_data = np.vstack([scaled, synthetic_data])
print(f"✅ Total training data: {all_data.shape}")

# Create sequences for LSTM (3 timesteps -> 1 prediction)
def create_sequences(data, steps=3):
    X, y = [], []
    for i in range(len(data) - steps):
        X.append(data[i:i+steps])
        y.append(data[i+steps])
    return np.array(X), np.array(y)

X, y = create_sequences(all_data)
print(f"✅ Sequences created: X={X.shape}, y={y.shape}")

# Build LSTM model
model = Sequential([
    Input(shape=(3, 5), name='input_layer'),
    LSTM(64, activation='relu', return_sequences=False, name='lstm_layer'),
    Dense(32, activation='relu', name='hidden_layer'),
    Dense(5, activation='linear', name='output_layer')
])

model.compile(optimizer='adam', loss='mse', metrics=['mae'])
model.summary()

# Train model
print("🚀 Training model...")
history = model.fit(
    X, y, 
    epochs=100, 
    batch_size=32, 
    validation_split=0.2,
    verbose=1
)

# Create model directory
backend_dir = '../backend/model'
if os.path.exists(backend_dir):
    import shutil
    shutil.rmtree(backend_dir)
os.makedirs(backend_dir, exist_ok=True)

# Save model weights untuk manual conversion
model.save_weights(f'{backend_dir}/model_weights.h5')

# Save model architecture
model_json = model.to_json()
with open(f'{backend_dir}/model_architecture.json', 'w') as f:
    json.dump(json.loads(model_json), f, indent=2)

# Save scaler
scaler_data = {
    "min": scaler.data_min_.tolist(),
    "max": scaler.data_max_.tolist(),
    "scale": scaler.scale_.tolist(),
    "min_": scaler.min_.tolist(),
    "feature_names": features,
    "data_range": scaler.data_range_.tolist()
}

with open(f'{backend_dir}/scaler_lstm.json', 'w') as f:
    json.dump(scaler_data, f, indent=2)

# Create simple model.json for TensorFlow.js compatibility
simple_model = {
    "format": "layers-model",
    "generatedBy": "JasmaniAI",
    "convertedBy": "manual",
    "modelTopology": {
        "keras_version": "2.15.0",
        "backend": "tensorflow",
        "model_config": json.loads(model_json)
    },
    "weightsManifest": [{
        "paths": ["weights.bin"],
        "weights": [
            {"name": "lstm_layer/kernel", "shape": [5, 256], "dtype": "float32"},
            {"name": "lstm_layer/recurrent_kernel", "shape": [64, 256], "dtype": "float32"},
            {"name": "lstm_layer/bias", "shape": [256], "dtype": "float32"},
            {"name": "hidden_layer/kernel", "shape": [64, 32], "dtype": "float32"},
            {"name": "hidden_layer/bias", "shape": [32], "dtype": "float32"},
            {"name": "output_layer/kernel", "shape": [32, 5], "dtype": "float32"},
            {"name": "output_layer/bias", "shape": [5], "dtype": "float32"}
        ]
    }]
}

with open(f'{backend_dir}/model.json', 'w') as f:
    json.dump(simple_model, f, indent=2)

# Create dummy weights file
weights = model.get_weights()
all_weights = np.concatenate([w.flatten() for w in weights])
all_weights.astype(np.float32).tobytes()
with open(f'{backend_dir}/weights.bin', 'wb') as f:
    f.write(all_weights.astype(np.float32).tobytes())

print("✅ Model files created!")

# Test prediction
test_input = all_data[-3:].reshape(1, 3, 5)
pred = model.predict(test_input, verbose=0)
pred_real = scaler.inverse_transform(pred)[0]

print("\n🧪 Test prediction:")
for i, feat in enumerate(features):
    print(f"  {feat}: {pred_real[i]:.1f}")

print(f"\n📁 Files created in {backend_dir}:")
for f in os.listdir(backend_dir):
    size = os.path.getsize(f'{backend_dir}/{f}')
    print(f"  - {f} ({size:,} bytes)")

print("\n✅ SELESAI! Model AI siap digunakan!")
print("🚀 Next steps:")
print("1. cd ../backend")
print("2. node server.js")
print("3. Open: http://localhost:5000")