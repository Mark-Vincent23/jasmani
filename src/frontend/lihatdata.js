import './style.css';
// ...existing code from lihatdata.js...
document.addEventListener('DOMContentLoaded', () => {
    fetch('http://localhost:5000/api/data')
        .then(res => res.json())
        .then(data => {
            const tbody = document.querySelector('#jasmani-table tbody');
            tbody.innerHTML = '';
            data.forEach(row => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${row.id}</td>
                    <td>${row.nama}</td>
                    <td>${row.lari}</td>
                    <td>${row.pushup}</td>
                    <td>${row.pullup}</td>
                    <td>${row.situp}</td>
                    <td>${row.shuttlerun}</td>
                    <td>${row.skor}</td>
                    <td>${row.kategori}</td>
                    <td>${row.timestamp}</td>
                `;
                tbody.appendChild(tr);
            });
        })
        .catch(err => {
            alert('Gagal mengambil data: ' + err);
        });
});