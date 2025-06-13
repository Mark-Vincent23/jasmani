import './style.css';

document.addEventListener('DOMContentLoaded', () => {
    console.log('📊 Loading data...');
    
    fetch('http://localhost:5000/api/data')
        .then(res => {
            if (!res.ok) {
                throw new Error('Network response was not ok');
            }
            return res.json();
        })
        .then(data => {
            console.log('✅ Data loaded:', data.length, 'records');
            
            const tbody = document.querySelector('#jasmani-table tbody');
            tbody.innerHTML = '';
            
            if (data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Belum ada data</td></tr>';
                return;
            }
            
            data.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${row.id}</td>
                    <td>${row.nama}</td>
                    <td>${row.pushup}</td>
                    <td>${row.pullup}</td>
                    <td>${row.lari}</td>
                    <td>${row.situp}</td>
                    <td>${row.shuttlerun}</td>
                    <td>${new Date(row.timestamp).toLocaleDateString('id-ID')}</td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(err => {
            console.error('❌ Error loading data:', err);
            const tbody = document.querySelector('#jasmani-table tbody');
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: red;">Gagal memuat data</td></tr>';
        });
});