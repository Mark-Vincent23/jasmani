document.getElementById('jasmaniForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
        nama: form.nama.value,
        lari: Number(form.lari.value),
        pushup: Number(form.pushup.value),
        pullup: Number(form.pullup.value),
        situp: Number(form.situp.value),
        shuttlerun: Number(form.shuttlerun.value)
    };
    document.getElementById('result').textContent = 'Memproses...';
    try {
        const res = await fetch('http://localhost:5000/api/klasifikasi', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        document.getElementById('result').textContent = 'Kategori: ' + result.kategori;
    } catch (err) {
        document.getElementById('result').textContent = 'Terjadi kesalahan. Coba lagi.';
    }
});
