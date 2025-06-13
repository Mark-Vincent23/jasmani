# JasmaniAI

Website klasifikasi tes jasmani TNI berbasis Machine Learning.

## Struktur
- Frontend: HTML, CSS, JS (`src/frontend/`)
- Backend: Node.js REST API (`src/backend/`)
- Model ML: Python (.pkl, integrasi selanjutnya)

## Cara Menjalankan
1. Jalankan backend:
   ```powershell
   cd src/backend
   npm install express cors body-parser
   node server.js
   ```
2. Jalankan frontend:
   ```powershell
   cd src/frontend
   npm install
   npm run dev
   ```

## Catatan
- Endpoint API: `POST /api/klasifikasi`
- Integrasi model ML Python dapat dilakukan dengan child_process atau REST API Python.
