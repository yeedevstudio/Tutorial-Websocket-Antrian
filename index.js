const express = require('express');
const path = require('path');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, { cors: { origin: '*' } });

app.get('/', (req, res) => {
    res.send(`
    Selamat Datang Di Aplikasi Antrian <br/>
    <a href="http://localhost:3000/loket" target="_blank">Buka Loket</a><br/>
    <a href="http://localhost:3000/layar" target="_blank">Buka Layar Antrian</a>`);
});

// halaman layar
app.get('/layar', function (req, res) {
    res.sendFile(path.join(__dirname, '/layar.html'));
});

// halaman loket
app.get('/loket', function (req, res) {
    res.sendFile(path.join(__dirname, '/loket.html'));
});

let no_antrian = 0; // nomor antrian awal
let status_panggil = 0; // status panggil
let loket = 0; // loket

io.on('connection', (socket) => {

    // untuk loket
    socket.on('hubungkan loket', async id_loket => {  // dapat data dari salah satu client "loket"
        io.emit(`loket ${id_loket} terhubung`, { no_antrian, status_panggil, loket }); // emit data ke loket terkait
    });

    // untuk layar
    socket.on('hubungkan layar', async data => {  // dapat data dari client "layar"
        io.emit('layar terhubung', { no_antrian, status_panggil, loket }); // emit data ke layar
    });

    socket.on('panggil', async data => { // dapat data dari salah satu client "loket"
        if (status_panggil == 0 || loket == data.loket) { // jika status pemanggilan tidak aktif maka loket bisa memanggil antrian || jika loket yg memanggil sebelumnya melakukan pemanggilan antrian lagi maka tetap bisa dilakukan
            no_antrian++; // increment nomor antrian
            let format_no_antrian = no_antrian.toString().padStart(4, '0'); // format angka '0001'
            loket = data.loket;
            status_panggil = 1;
            io.emit('update antrian', { // emit data ke semua client "loket" dan client "layar"
                loket: data.loket,
                no_antrian: format_no_antrian,
                status_panggil: status_panggil,
            });
        } else {
            let pesan = `Tidak Dapat Klik Panggil Karena Status Panggil Sedang Aktif Oleh Loket ${loket}`;
            io.emit(`peringatan ${data.loket}`, pesan); // emit pesan peringatan ke client "loket" terkait
        }
    });

    socket.on('stop panggil', async data => { // dapat data dari salah satu client "loket"
        if (parseInt(data.loket) == parseInt(loket) || status_panggil == 0) { // jika loket yg melakukan stop panggil sama persis || ketika lakukan stop panggil tapi status panggil Nol, yaa tidak terjadi apa apa lah
            status_panggil = 0;
            io.emit('stop status panggil', { // emit data ke layar
                status_panggil: status_panggil,
            });
        } else {
            let pesan = `Tidak Dapat Stop Panggil, Karena Loket ${loket} Sedang Memanggil Saat Ini`;
            io.emit(`peringatan ${data.loket}`, pesan); // emit pesan peringatan ke loket terkait
        }
    });

    socket.on('panggil custom antrian', async data => { // dapat data dari salah satu loket 
        if (status_panggil == 0 || loket == data.loket) {
            loket = data.loket;
            status_panggil = 1;
            io.emit('update antrian', { // emit data ke semua loket dan layar
                loket: data.loket,
                no_antrian: data.no_antrian.toString().padStart(4, '0'), // format angka '0001'
                status_panggil: status_panggil,
            });
        } else {
            let pesan = `Tidak Dapat Klik Panggil Karena Status Panggil Sedang Aktif Oleh Loket ${loket}`;
            io.emit(`peringatan ${data.loket}`, pesan); // emit pesan peringatan ke loket terkait
        }
    });

    socket.on('reset', async data => { // dapat data dari client "layar"
        no_antrian = '0000';
        loket = '-';
        status_panggil = 0;
        io.emit('update antrian', { // emit data ke semua client "loket" dan client "layar"
            loket: loket,
            no_antrian: no_antrian,
            status_panggil: status_panggil,
        });
    });

});

server.listen(3000, () => {
    console.log('listening on port: 3000');
});