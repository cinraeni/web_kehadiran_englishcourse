import { db } from './firebase-config.js';
import { collection, addDoc, query, where, getDocs, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    const dateDisplay = document.getElementById('current-date');
    const form = document.getElementById('attendance-form');
    const submitBtn = document.getElementById('submit-btn');
    
    // Ambil data hari ini
    const currentDate = new Date();
    const dayOfWeek = currentDate.getDay(); // 0 = Minggu, 1 = Senin, dst
    
    // Format Tanggal dihapus

    // Cek apakah hari ini Senin-Jumat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Batasan weekend dihapus sesuai permintaan


    // --- BAGIAN TANDA TANGAN ---
    const canvas = document.getElementById('signature-pad');
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let signatureEmpty = true;

    // Resize canvas agar resolusi internal = ukuran tampilan (fix touch/mouse offset)
    function resizeCanvas() {
        const wrapper = canvas.parentElement;
        const displayWidth = wrapper.clientWidth - 16; // kurangi padding
        const displayHeight = 150;
        
        // Set CSS display size
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
        
        // Set internal resolution = display size (ratio 1:1, no scaling needed)
        const dpr = window.devicePixelRatio || 1;
        canvas.width = displayWidth * dpr;
        canvas.height = displayHeight * dpr;
        ctx.scale(dpr, dpr);

        // Background putih
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        signatureEmpty = true;
    }

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    function getPointerPos(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    function startDrawing(e) {
        e.preventDefault();
        isDrawing = true;
        const pos = getPointerPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    }

    function stopDrawing() {
        isDrawing = false;
        ctx.beginPath();
    }

    function draw(e) {
        if (!isDrawing) return;
        e.preventDefault();

        const pos = getPointerPos(e);

        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#1e3a8a"; // Biru tua

        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);

        signatureEmpty = false;
    }

    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Touch events — passive: false agar preventDefault() bisa jalan (cegah scroll saat menggambar)
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing);

    document.getElementById('btn-clear-signature').addEventListener('click', () => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        signatureEmpty = true;
    });
    // --- SELESAI BAGIAN TANDA TANGAN ---


    // Set nilai default input tanggal ke hari ini
    const tanggalInput = document.getElementById('tanggal');
    if (tanggalInput) {
        const tzoffset = (new Date()).getTimezoneOffset() * 60000; // offset in milliseconds
        const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, -1);
        tanggalInput.value = localISOTime.split('T')[0];
    }

    // Tombol untuk absen masuk dan pulang
    const btnMasuk = document.getElementById('btn-masuk');
    const btnPulang = document.getElementById('btn-pulang');

    if (btnMasuk) {
        btnMasuk.addEventListener('click', () => processAttendance('masuk'));
    }
    if (btnPulang) {
        btnPulang.addEventListener('click', () => processAttendance('pulang'));
    }

    async function processAttendance(type) {
        // Batasan weekend dihapus
        
        // Pastikan form sudah diisi semua (validasi bawaan HTML5)
        if (!form.reportValidity()) return;

        const name = document.getElementById('employee-name').value.trim();
        const nip = document.getElementById('nip').value.trim();
        const jabatan = document.getElementById('jabatan').value.trim();
        const opd = document.getElementById('opd').value.trim();
        const email = document.getElementById('email').value.trim();
        const noHp = document.getElementById('nohp').value.trim();
        const status = 'Hadir';
        
        // Gunakan tanggal yang dipilih dari form
        const realTanggal = document.getElementById('tanggal').value;

        if (!name || !nip || !jabatan || !opd || !email || !noHp) {
            showAlert('Silakan lengkapi semua data profil.', 'error');
            return;
        }

        if (signatureEmpty) {
            showAlert('Silakan isi Tanda Tangan Anda.', 'error');
            return;
        }

        const signatureBase64 = canvas.toDataURL('image/png');

        const activeBtn = type === 'masuk' ? btnMasuk : btnPulang;
        const originalText = activeBtn.textContent;
        activeBtn.disabled = true;
        activeBtn.textContent = 'Memproses...';

        try {
            // Cek apakah sudah absen masuk di tanggal real-time ini dengan NIP ini
            const q = query(collection(db, "riwayat_absensi"), where("nip", "==", nip), where("tanggal", "==", realTanggal));
            const querySnapshot = await getDocs(q);
            
            const currentTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

            if (type === 'masuk') {
                if (!querySnapshot.empty) {
                    showAlert(`Pegawai dengan NIP ${nip} sudah melakukan presensi masuk hari ini.`, 'error');
                } else {
                    // Simpan data presensi masuk ke database
                    const recordedJamMasuk = currentTime;
                    await addDoc(collection(db, "riwayat_absensi"), {
                        nama: name,
                        nip: nip,
                        jabatan: jabatan,
                        opd: opd,
                        email: email,
                        noHp: noHp,
                        ttd: signatureBase64,
                        status: status,
                        tanggal: realTanggal,
                        jamMasuk: recordedJamMasuk,
                        jamPulang: "-",
                        createdAt: new Date().toISOString()
                    });
                    showAlert('Presensi MASUK berhasil disimpan.', 'success');
                    form.reset();
                    resetDate();
                    document.getElementById('btn-clear-signature').click(); // Reset ttd
                }
            } else if (type === 'pulang') {
                if (querySnapshot.empty) {
                    showAlert(`Pegawai dengan NIP ${nip} belum melakukan presensi masuk hari ini.`, 'error');
                } else {
                    // Update data untuk jam pulang
                    const docId = querySnapshot.docs[0].id;
                    const existingData = querySnapshot.docs[0].data();
                    
                    if (existingData.jamPulang !== "-") {
                        showAlert(`Pegawai dengan NIP ${nip} sudah melakukan presensi pulang hari ini.`, 'error');
                    } else {
                        await updateDoc(doc(db, "riwayat_absensi", docId), {
                            jamPulang: currentTime
                        });
                        showAlert('Presensi PULANG berhasil dicatat.', 'success');
                        form.reset();
                        resetDate();
                        document.getElementById('btn-clear-signature').click(); // Reset ttd
                    }
                }
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('Terjadi kesalahan saat memproses data.', 'error');
        } finally {
            activeBtn.disabled = false;
            activeBtn.textContent = originalText;
        }
    }

    function resetDate() {
        if (tanggalInput) {
            const tzoffset = (new Date()).getTimezoneOffset() * 60000;
            tanggalInput.value = (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];
        }
    }

    function showAlert(message, type) {
        alert(message);
    }

    function disableForm() {
        document.getElementById('employee-name').disabled = true;
        // document.querySelectorAll('input[name="status"]').forEach(input => input.disabled = true);
        submitBtn.disabled = true;
    }
});
