import './style.css';

// Dokumen sudah menampilkan semua informasi kesehatan dalam grid
// Kode ini hanya untuk tujuan kompatibilitas jika dibutuhkan nanti
document.addEventListener('DOMContentLoaded', function() {
    // Menambahkan interaktivitas tambahan jika dibutuhkan
    const healthCards = document.querySelectorAll('.health-card');
    
    healthCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.transition = 'transform 0.3s ease';
            this.style.boxShadow = '0 8px 15px rgba(0,0,0,0.1)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
        });
    });
});
