const express = require('express');
const app = express();
const port = 80; // Sesuai proposal menggunakan port 80 (HTTP)
const http = require('http');

// Fungsi untuk mengambil Metadata ID Instance EC2 dari AWS IMDSv2
// Berguna saat demo untuk membuktikan ALB membagi trafik ke server yang berbeda
let instanceId = 'Local-Server-atau-EC2-Loading...';

function fetchInstanceId() {
    const options = {
        hostname: '169.254.169.254', // Alamat IP internal AWS metadata
        path: '/latest/api/token',
        method: 'PUT',
        headers: { 'X-aws-ec2-metadata-token-ttl-seconds': '21600' }
    };

    const req = http.request(options, (res) => {
        let token = '';
        res.on('data', (chunk) => { token += chunk; });
        res.on('end', () => {
            const reqId = http.request({
                hostname: '169.254.169.254',
                path: '/latest/meta-data/instance-id',
                method: 'GET',
                headers: { 'X-aws-ec2-metadata-token': token }
            }, (resId) => {
                let id = '';
                resId.on('data', (chunk) => { id += chunk; });
                resId.on('end', () => { if (id) instanceId = id; });
            });
            reqId.end();
        });
    });
    req.on('error', (e) => { console.log('Running outside EC2 or IMDS disabled.'); });
    req.end();
}

// Jalankan fungsi pencarian ID instance saat server menyala
fetchInstanceId();

// Middleware untuk mencatat log akses di terminal (untuk pembuktian log)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} request ke ${req.url}`);
    next();
});

// 1. Endpoint Utama (Root /) - Simulasi Halaman Depan KRS
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Portal KRS Online - Universitas Brawijaya</title>
            <style>
                body { font-family: 'Times New Roman', sans-serif; text-align: center; margin-top: 50px; background-color: #f4f6f9; }
                .container { border: 2px solid #333; display: inline-block; padding: 30px; background: white; border-radius: 8px; box-shadow: 0px 4px 10px rgba(0,0,0,0.1); }
                h1 { color: #003366; }
                .status { font-weight: bold; color: green; }
                .meta { background: #eee; padding: 10px; margin-top: 20px; font-family: monospace; border-radius: 4px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>SISTEM INFORMASI KRS ONLINE</h1>
                <p>Status Koneksi: <span class="status">TERHUBUNG DENGAN AMAN</span></p>
                <p>Selamat datang di simulasi pengisian KRS Mahasiswa.</p>
                <div class="meta">
                    Direspons oleh AWS EC2 Instance ID: <strong>${instanceId}</strong>
                </div>
            </div>
        </body>
        </html>
    `);
});

// 2. Endpoint Health Check (Sesuai konfigurasi ALB target group)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', instanceId: instanceId });
});

// 3. Endpoint Simulasi Beban (/load) - Menghitung Fibonacci secara tidak efisien
app.get('/load', (req, res) => {
    const startTime = Date.now();
    
    // Fungsi rekursif berat penumpuk CPU
    function slowFibonacci(n) {
        if (n < 2) return n;
        return slowFibonacci(n - 1) + slowFibonacci(n - 2);
    }
    
    // Angka 42 biasanya cukup membuat CPU t2.micro kelabakan selama beberapa detik
    const result = slowFibonacci(42); 
    const duration = Date.now() - startTime;

    res.send(`Simulasi beban KRS selesai! Menghitung Fibonacci ke-42 membutuhkan waktu ${duration} ms pada Instance: ${instanceId}`);
});

app.listen(port, () => {
    console.log(`Aplikasi Portal KRS berjalan di port ${port}`);
});
