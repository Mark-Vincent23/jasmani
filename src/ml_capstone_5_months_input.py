import pandas as pd
import numpy as np
import json
import os
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.model_selection import train_test_split
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Input
import shutil

print("🚀 Building 5-Months Input Model - EXACT SAME as create_working_model...")
print(f"🧠 TensorFlow: {tf.__version__}")

# === Load Data (SAMA dengan create_working_model) ===
df = pd.read_csv('Data Garjas Unhan - Sheet1 fix.csv')
df['BULAN'] = pd.to_datetime(df['BULAN'], dayfirst=True)
df = df.sort_values(['ID', 'BULAN'])

features = ['PUSH UP', 'PULL UP', 'LARI 12 MENIT', 'SIT UP ', 'SHUTTLE RUN']

# Clean data (SAMA)
for col in features:
    df[col] = pd.to_numeric(df[col].astype(str).str.replace(',', '.'), errors='coerce')
df.dropna(inplace=True)

data = df[features].copy()
print(f"✅ Data loaded: {data.shape}")

# === Scale data (SAMA) ===
scaler = MinMaxScaler()
scaled = scaler.fit_transform(data)
print(f"✅ Data scaled: {scaled.shape}")

# === Create REAL DATA sequences dari 500 students ===
print("📊 Creating REAL sequences from 500 students...")
X_sequences = []
y_sequences = []

# Process each student to get 5-month sequences
for student_id, student_data in df.groupby('ID'):
    try:
        student_num = int(student_id[1:])  # P001 → 1
        student_data = student_data.sort_values('BULAN').reset_index(drop=True)
        
        if len(student_data) >= 6:  # Need 6 months: 5 input + 1 target
            values = student_data[features].values
            scaled_values = scaler.transform(values)
            
            # Create sequence: Month 1-5 → Month 6
            X_sequences.append(scaled_values[0:5])  # First 5 months
            y_sequences.append(scaled_values[5])    # 6th month
            
            # If more than 6 months, create additional sequences
            for i in range(1, len(scaled_values) - 5):
                X_sequences.append(scaled_values[i:i+5])
                y_sequences.append(scaled_values[i+5])
                
    except (ValueError, IndexError):
        continue

X_real = np.array(X_sequences) if X_sequences else np.array([]).reshape(0, 5, 5)
y_real = np.array(y_sequences) if y_sequences else np.array([]).reshape(0, 5)

print(f"✅ REAL sequences: X={X_real.shape}, y={y_real.shape}")

# === Create synthetic data dengan TREND logic (jika data real kurang) ===
print("📊 Adding synthetic data with TREND logic...")
np.random.seed(42)
synthetic_X = []
synthetic_y = []

# Generate 500 synthetic sequences
for i in range(500):
    # Pick random base from real scaled data
    if len(scaled) > 0:
        base_idx = np.random.randint(0, len(scaled))
        base = scaled[base_idx].copy()
    else:
        base = np.random.uniform(0.3, 0.7, 5)  # Fallback
    
    # Determine trend: 60% UP, 40% DOWN (simulate ID 1-250 vs 251-500)
    trend_type = 1 if i < 180 else 0  # 180 UP, 120 DOWN
    
    # Create 6-month sequence with trend
    sequence = []
    for step in range(6):
        if step == 0:
            current = base.copy()
        else:
            prev = sequence[step-1]
            if trend_type == 1:  # UP trend (like ID 1-250)
                change = np.random.uniform(0.02, 0.06)  # 2-6% increase per month
                current = prev * (1 + change)
            else:  # DOWN trend (like ID 251-500)
                change = np.random.uniform(0.01, 0.04)  # 1-4% decrease per month
                current = prev * (1 - change)
            
            # Add realistic noise
            noise = np.random.normal(1, 0.015, len(current))
            current = current * noise
            current = np.clip(current, 0, 1)  # Keep normalized
        
        sequence.append(current)
    
    # Input: first 5 months, Target: 6th month
    synthetic_X.append(np.array(sequence[:5]))
    synthetic_y.append(sequence[5])

# Combine real + synthetic
if len(X_real) > 0:
    X = np.vstack([X_real, synthetic_X])
    y = np.vstack([y_real, synthetic_y])
else:
    X = np.array(synthetic_X)
    y = np.array(synthetic_y)

print(f"✅ Combined sequences: X={X.shape}, y={y.shape}")
print(f"📊 Real sequences: {len(X_real)}")
print(f"📊 Synthetic sequences: {len(synthetic_X)}")

# === Build EXACT SAME Model (except input shape) ===
print("\n🧠 Building model - SAME as create_working_model but INPUT(5,5)...")
model = Sequential([
    Input(shape=(5, 5), name='input_layer'),                    # CHANGED: (5,5) instead of (3,5)
    LSTM(64, activation='relu', return_sequences=False, name='lstm_layer'),  # SAMA
    Dense(32, activation='relu', name='hidden_layer'),          # SAMA
    Dense(5, activation='linear', name='output_layer')          # SAMA
])

model.compile(optimizer='adam', loss='mse', metrics=['mae'])    # SAMA
model.summary()

# === Train model ===
print("🚀 Training model on 5-month sequences...")
history = model.fit(
    X, y, 
    epochs=100,         # SAMA
    batch_size=32,      # SAMA  
    validation_split=0.2,  # SAMA
    verbose=1
)

# === Create model directory ===
backend_dir = '../backend/model'
if os.path.exists(backend_dir):
    shutil.rmtree(backend_dir)
os.makedirs(backend_dir, exist_ok=True)

# === Save files EXACTLY like create_working_model ===

# 1. Save model weights (SAMA)
model.save_weights(f'{backend_dir}/model_weights.h5')
print("✅ Model weights saved")

# 2. Save model architecture (SAMA)
model_json = model.to_json()
with open(f'{backend_dir}/model_architecture.json', 'w') as f:
    json.dump(json.loads(model_json), f, indent=2)
print("✅ Model architecture saved")

# 3. Save scaler (SAMA)
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
print("✅ Scaler saved")

# 4. Create model.json dengan CORRECT weight specs for LSTM(5,5)
weights = model.get_weights()
print(f"🔍 Model weights info:")
for i, weight in enumerate(weights):
    print(f"  Weight {i}: {weight.shape}")

# Create EXACT weight specifications
simple_model = {
    "format": "layers-model",
    "generatedBy": "JasmaniAI 5-Month Predictor",
    "convertedBy": "manual_5month_conversion",
    "modelTopology": {
        "keras_version": "2.15.0",
        "backend": "tensorflow",
        "model_config": json.loads(model_json)
    },
    "weightsManifest": [{
        "paths": ["weights.bin"],
        "weights": [
            {"name": "lstm_layer/kernel", "shape": list(weights[0].shape), "dtype": "float32"},
            {"name": "lstm_layer/recurrent_kernel", "shape": list(weights[1].shape), "dtype": "float32"},
            {"name": "lstm_layer/bias", "shape": list(weights[2].shape), "dtype": "float32"},
            {"name": "hidden_layer/kernel", "shape": list(weights[3].shape), "dtype": "float32"},
            {"name": "hidden_layer/bias", "shape": list(weights[4].shape), "dtype": "float32"},
            {"name": "output_layer/kernel", "shape": list(weights[5].shape), "dtype": "float32"},
            {"name": "output_layer/bias", "shape": list(weights[6].shape), "dtype": "float32"}
        ]
    }]
}

with open(f'{backend_dir}/model.json', 'w') as f:
    json.dump(simple_model, f, indent=2)
print("✅ model.json created")

# 5. Create weights.bin (SAMA)
all_weights = np.concatenate([w.flatten() for w in weights])
with open(f'{backend_dir}/weights.bin', 'wb') as f:
    f.write(all_weights.astype(np.float32).tobytes())
print(f"✅ weights.bin saved ({len(all_weights):,} parameters)")

# === Test prediction dengan REAL data ===
print("\n🧪 Testing prediction with 5-month input...")

# Test dengan sequence terakhir
if len(X) > 0:
    test_input = X[-1:].reshape(1, 5, 5)  # Shape: (1, 5, 5)
    pred_scaled = model.predict(test_input, verbose=0)
    pred_real = scaler.inverse_transform(pred_scaled)[0]
    
    print("🔍 Test prediction (5 months → month 6):")
    for i, feat in enumerate(features):
        print(f"  {feat}: {pred_real[i]:.1f}")

# === Create test comparison data ===
print("\n📊 Creating test comparison data...")
test_comparisons = []

# Get some real 6-month sequences for comparison
for student_id, student_data in df.groupby('ID'):
    try:
        student_num = int(student_id[1:])
        if len(student_data) >= 6:
            student_data = student_data.sort_values('BULAN').reset_index(drop=True)
            values = student_data[features].values
            
            # Input: months 1-5, Target: month 6, Actual: month 6
            input_5months = values[0:5]
            actual_month6 = values[5]
            
            # Predict month 6
            input_scaled = scaler.transform(input_5months).reshape(1, 5, 5)
            pred_scaled = model.predict(input_scaled, verbose=0)
            pred_month6 = scaler.inverse_transform(pred_scaled)[0]
            
            test_comparisons.append({
                "student_id": student_id,
                "student_num": student_num,
                "trend_type": "UP" if student_num <= 250 else "DOWN",
                "input_months": input_5months.tolist(),
                "actual_month6": actual_month6.tolist(),
                "predicted_month6": pred_month6.tolist(),
                "mae": mean_absolute_error(actual_month6, pred_month6)
            })
            
            if len(test_comparisons) >= 10:  # First 10 students
                break
                
    except:
        continue

# Save test comparisons
with open(f'{backend_dir}/test_comparisons.json', 'w') as f:
    json.dump(test_comparisons, f, indent=2)
print("✅ Test comparisons saved")

# Show some comparison results
print("\n🔍 Sample Predictions vs Actual:")
for i, comp in enumerate(test_comparisons[:5]):
    print(f"\n{comp['student_id']} ({comp['trend_type']} trend):")
    print(f"  Actual month 6: {[round(x,1) for x in comp['actual_month6']]}")
    print(f"  Predicted: {[round(x,1) for x in comp['predicted_month6']]}")
    print(f"  MAE: {comp['mae']:.2f}")

# === Final report ===
print(f"\n📁 Files created in {backend_dir}:")
total_size = 0
for f in os.listdir(backend_dir):
    size = os.path.getsize(f'{backend_dir}/{f}')
    total_size += size
    print(f"  ✅ {f} ({size:,} bytes)")

print(f"Total size: {total_size:,} bytes")

# === Model evaluation ===
mae = mean_absolute_error(y.flatten(), model.predict(X, verbose=0).flatten())
print(f"\n📊 Model Performance:")
print(f"MAE: {mae:.4f}")
print(f"Training sequences: {len(X)}")
print(f"Real data sequences: {len(X_real)}")
print(f"Synthetic sequences: {len(synthetic_X)}")

print("\n✅ MODEL SIAP! 5 Months Input → Month 6 Prediction!")
print("🎯 Model architecture SAMA dengan create_working_model")
print("📊 Input shape: (5, 5) - 5 months × 5 features")
print("📈 Output: 5 features untuk bulan ke-6")
print("🔥 Bisa bandingin prediksi vs data real bulan ke-6!")

print("\n🚀 Next steps:")
print("1. cd ../backend")
print("2. node server.js") 
print("3. Input 5 bulan data → dapat prediksi bulan ke-6")
print("4. Bandingin sama data real bulan ke-6")

print(f"\n🏁 Script completed successfully!")