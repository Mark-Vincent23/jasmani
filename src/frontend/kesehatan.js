import './style.css';
// ...existing code from kesehatan.js...
document.getElementById('topicSelect').addEventListener('change', function() {
    const content = {
        lari: `<h2>Manfaat Lari</h2><ul><li>Meningkatkan kesehatan jantung dan paru-paru</li><li>Melatih daya tahan tubuh</li><li>Membakar kalori dan menjaga berat badan</li></ul>`,
        pushup: `<h2>Manfaat Push-up</h2><ul><li>Memperkuat otot dada, bahu, dan lengan</li><li>Meningkatkan stabilitas tubuh bagian atas</li><li>Meningkatkan kekuatan inti</li></ul>`,
        pullup: `<h2>Manfaat Pull-up</h2><ul><li>Melatih otot punggung dan lengan</li><li>Meningkatkan kekuatan genggaman</li><li>Menambah massa otot tubuh bagian atas</li></ul>`,
        situp: `<h2>Manfaat Sit-up</h2><ul><li>Memperkuat otot perut</li><li>Meningkatkan fleksibilitas pinggang</li><li>Mendukung postur tubuh yang baik</li></ul>`,
        shuttlerun: `<h2>Manfaat Shuttle Run</h2><ul><li>Melatih kelincahan dan kecepatan</li><li>Meningkatkan koordinasi tubuh</li><li>Baik untuk latihan interval</li></ul>`
    };
    const value = this.value;
    document.getElementById('topicContent').innerHTML = content[value] || '';
});
