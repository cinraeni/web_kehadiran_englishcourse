import { db } from './firebase-config.js';
import { collection, getDocs, doc, deleteDoc, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // Logika login pakai PIN
    const loginModal = document.getElementById('login-modal');
    const mainContent = document.getElementById('main-content');
    const pinInput = document.getElementById('admin-pin');
    const btnLogin = document.getElementById('btn-login');
    const loginError = document.getElementById('login-error');

    const ADMIN_PIN = 'admin123';

    btnLogin.addEventListener('click', () => {
        if (pinInput.value === ADMIN_PIN) {
            loginModal.style.display = 'none';
            mainContent.style.display = 'block';
            loadData();
        } else {
            loginError.style.display = 'block';
        }
    });

    pinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            btnLogin.click();
        }
    });

    const historyContainer = document.getElementById('all-history');
    
    // Elemen Modal Edit
    const editModal = document.getElementById('edit-modal');
    const editInfo = document.getElementById('edit-info');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const saveEditBtn = document.getElementById('save-edit-btn');
    
    let currentEditDate = null;
    let currentEditId = null;
    let currentEditName = null;

    let data = {};
    let dates = [];

    // Fungsi mengambil data dari server
    async function loadData() {
        try {
            const q = query(collection(db, "riwayat_absensi"), orderBy("createdAt", "desc"));
            const querySnapshot = await getDocs(q);
            
            data = {};
            querySnapshot.forEach((docSnap) => {
                const record = docSnap.data();
                const id = docSnap.id;
                const dateStr = record.tanggal;
                
                if (!data[dateStr]) data[dateStr] = [];
                data[dateStr].push({
                    id: id,
                    name: record.nama,
                    nip: record.nip || record.nim || '-',
                    jabatan: record.jabatan || record.jurusan || '-',
                    opd: record.opd || record.instansi || '-',
                    email: record.email || '-',
                    noHp: record.noHp || '-',
                    ttd: record.ttd || '',
                    jamMasuk: record.jamMasuk || '-',
                    jamPulang: record.jamPulang || '-',
                    status: record.status
                });
            });
            
            dates = Object.keys(data).sort((a, b) => new Date(b) - new Date(a));
            renderHistory();
        } catch (error) {
            console.error('Error fetching data:', error);
            historyContainer.innerHTML = '<p style="text-align:center; color:red; padding: 1rem 0;">Gagal mengambil data dari Firebase. Pastikan konfigurasi Firebase sudah benar.</p>';
        }
    }

    // Menampilkan data ke halaman web
    function renderHistory() {
        historyContainer.innerHTML = '';

        if (dates.length === 0) {
            historyContainer.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding: 1rem 0;">Belum ada riwayat presensi.</p>';
            return;
        }

        dates.forEach(dateStr => {
            const dateObj = new Date(dateStr);
            const formattedDate = dateObj.toLocaleDateString('id-ID', {
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric'
            });

            const records = data[dateStr];
            
            const groupDiv = document.createElement('div');
            groupDiv.className = 'history-group glass-panel';
            
            groupDiv.innerHTML = `
                <div class="history-date">${formattedDate}</div>
                <ul class="attendance-list">
                    ${records.map((record) => {
                        // Status dihilangkan

                        return `
                            <li>
                                <div class="info" style="display: flex; flex-direction: column; gap: 0.2rem;">
                                    <div><strong>${record.name}</strong> <span style="font-size:0.85rem; color:var(--text-muted);">(${record.nip} - ${record.jabatan})</span></div>
                                    <div style="font-size:0.85rem; color: #4b5563;">Masuk: <b>${record.jamMasuk}</b> | Pulang: <b>${record.jamPulang}</b></div>
                                    <div style="margin-top: 0.4rem;">
                                        <button class="btn-small btn-detail" data-date="${dateStr}" data-id="${record.id}" style="font-size: 0.75rem; padding: 0.3rem 0.6rem; background-color: transparent; border: 1px solid #818cf8; color: #818cf8; border-radius: 4px; cursor: pointer;">Detail</button>
                                    </div>
                                </div>
                                <div style="display: flex; align-items: center; gap: 1rem;">
                                    <!-- Status removed -->
                                    <div class="action-btns" style="display: flex; gap: 0.5rem;">
                                        <button class="btn-small btn-edit" data-date="${dateStr}" data-id="${record.id}" data-name="${record.name}" data-status="${record.status}" title="Edit" style="background: none; border: none; padding: 0.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #3b82f6;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                        </button>
                                        <button class="btn-small btn-delete" data-date="${dateStr}" data-id="${record.id}" data-name="${record.name}" title="Hapus" style="background: none; border: none; padding: 0.2rem; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #ef4444;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                        </button>
                                    </div>
                                </div>
                            </li>
                        `;
                    }).join('')}
                </ul>
            `;

            historyContainer.appendChild(groupDiv);
        });
    }

    // Panggil loadData() hanya setelah login (sudah dipindah ke Auth Logic di atas)

    // Event Listener untuk Tombol Edit dan Hapus
    historyContainer.addEventListener('click', async (e) => {
        if (e.target.closest('.btn-delete')) {
            const btn = e.target.closest('.btn-delete');
            const id = btn.getAttribute('data-id');
            const name = btn.getAttribute('data-name');
            
            if (confirm(`Apakah Anda yakin ingin menghapus data presensi ${name}?`)) {
                try {
                    await deleteDoc(doc(db, "riwayat_absensi", id));
                    loadData(); // Tarik ulang datanya biar update
                } catch (error) {
                    console.error('Error deleting:', error);
                    alert('Gagal menghapus data.');
                }
            }
        }
        
        if (e.target.closest('.btn-edit')) {
            const btn = e.target.closest('.btn-edit');
            currentEditDate = btn.getAttribute('data-date');
            currentEditId = btn.getAttribute('data-id');
            const record = data[currentEditDate].find(r => r.id === currentEditId);

            editInfo.textContent = `Tanggal: ${currentEditDate}`;
            document.getElementById('edit-name').value = record.name !== '-' ? record.name : '';
            document.getElementById('edit-nip').value = record.nip !== '-' ? record.nip : '';
            document.getElementById('edit-jabatan').value = record.jabatan !== '-' ? record.jabatan : '';
            document.getElementById('edit-opd').value = record.opd !== '-' ? record.opd : '';
            document.getElementById('edit-email').value = record.email !== '-' ? record.email : '';
            document.getElementById('edit-nohp').value = record.noHp !== '-' ? record.noHp : '';
            
            
            editModal.classList.remove('hidden');
        }
        
        if (e.target.classList.contains('btn-detail')) {
            const dateStr = e.target.getAttribute('data-date');
            const id = e.target.getAttribute('data-id');
            const record = data[dateStr].find(r => r.id === id);
            
            if (record) {
                const detailContent = document.getElementById('detail-content');
                // Status color handling removed
                
                detailContent.innerHTML = `
                    <div style="margin-bottom: 0.8rem; background: var(--glass-bg); padding: 0.8rem 1rem; border-radius: 8px; border: 1px solid var(--glass-border); text-align: center;">
                        <span style="display: block; font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.3rem;">Tanggal Absen</span>
                        <div style="color: var(--text-main); font-size: 1.05rem; font-weight: 600;">${dateStr}</div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem;">
                        <div style="background: var(--glass-bg); padding: 0.8rem 1rem; border-radius: 8px; border: 1px solid var(--glass-border);">
                            <span style="display: block; font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.3rem;">Nama Lengkap</span>
                            <div style="color: var(--text-main); font-size: 0.95rem; font-weight: 500;">${record.name}</div>
                        </div>
                        <div style="background: var(--glass-bg); padding: 0.8rem 1rem; border-radius: 8px; border: 1px solid var(--glass-border);">
                            <span style="display: block; font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.3rem;">NIP / NIM</span>
                            <div style="color: var(--text-main); font-size: 0.95rem; font-weight: 500;">${record.nip}</div>
                        </div>
                        <div style="background: var(--glass-bg); padding: 0.8rem 1rem; border-radius: 8px; border: 1px solid var(--glass-border);">
                            <span style="display: block; font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.3rem;">Jabatan / Jurusan</span>
                            <div style="color: var(--text-main); font-size: 0.95rem; font-weight: 500;">${record.jabatan}</div>
                        </div>
                        <div style="background: var(--glass-bg); padding: 0.8rem 1rem; border-radius: 8px; border: 1px solid var(--glass-border);">
                            <span style="display: block; font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.3rem;">Organisasi Perangkat Daerah</span>
                            <div style="color: var(--text-main); font-size: 0.95rem; font-weight: 500;">${record.opd}</div>
                        </div>
                        <div style="background: var(--glass-bg); padding: 0.8rem 1rem; border-radius: 8px; border: 1px solid var(--glass-border);">
                            <span style="display: block; font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.3rem;">Email</span>
                            <div style="color: var(--text-main); font-size: 0.95rem; font-weight: 500; word-break: break-all;">${record.email}</div>
                        </div>
                        <div style="background: var(--glass-bg); padding: 0.8rem 1rem; border-radius: 8px; border: 1px solid var(--glass-border);">
                            <span style="display: block; font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.3rem;">No. HP</span>
                            <div style="color: var(--text-main); font-size: 0.95rem; font-weight: 500;">${record.noHp}</div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 0.8rem; display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.8rem;">
                        <div style="background: var(--glass-bg); padding: 0.8rem; border-radius: 8px; border: 1px solid var(--glass-border); text-align: center;">
                            <span style="display: block; font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 0.3rem;">Masuk</span>
                            <div style="color: var(--text-main); font-size: 1.05rem; font-weight: 500;">${record.jamMasuk}</div>
                        </div>
                        <div style="background: var(--glass-bg); padding: 0.8rem; border-radius: 8px; border: 1px solid var(--glass-border); text-align: center;">
                            <span style="display: block; font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 0.3rem;">Pulang</span>
                            <div style="color: var(--text-main); font-size: 1.05rem; font-weight: 500;">${record.jamPulang}</div>
                        </div>
                    </div>
                `;
                
                const signatureImg = document.getElementById('detail-signature');
                if (record.ttd) {
                    signatureImg.src = record.ttd;
                    signatureImg.style.display = 'inline-block';
                } else {
                    signatureImg.style.display = 'none';
                }
                
                document.getElementById('detail-modal').classList.remove('hidden');
            }
        }
    });

    // Event Listener untuk Modal Detail
    document.getElementById('close-detail-btn').addEventListener('click', () => {
        document.getElementById('detail-modal').classList.add('hidden');
    });

    // Event Listener untuk Modal Edit
    cancelEditBtn.addEventListener('click', () => {
        editModal.classList.add('hidden');
    });

    saveEditBtn.addEventListener('click', async () => {
        const newName = document.getElementById('edit-name').value.trim();
        const newNip = document.getElementById('edit-nip').value.trim();
        const newJabatan = document.getElementById('edit-jabatan').value.trim();
        const newOpd = document.getElementById('edit-opd').value.trim();
        const newEmail = document.getElementById('edit-email').value.trim();
        const newNoHp = document.getElementById('edit-nohp').value.trim();
        
        if (!newName) {
            alert('Nama harus diisi.');
            return;
        }

        saveEditBtn.textContent = 'Menyimpan...';
        saveEditBtn.disabled = true;
        
        try {
            const updateData = { 
                nama: newName,
                nip: newNip,
                jabatan: newJabatan,
                opd: newOpd,
                email: newEmail,
                noHp: newNoHp
            };

            await updateDoc(doc(db, "riwayat_absensi", currentEditId), updateData);
            editModal.classList.add('hidden');
            loadData(); // Refresh data
        } catch (error) {
            console.error('Error updating:', error);
            alert('Gagal memperbarui data.');
        } finally {
            saveEditBtn.textContent = 'Simpan Perubahan';
            saveEditBtn.disabled = false;
        }
    });

    // Fitur download ke Excel
    const btnExport = document.getElementById('btn-export');
    if(btnExport) {
        btnExport.addEventListener('click', exportToExcel);
    }

    function exportToExcel() {
        let csvContent = "Tanggal;Nama;NIP;Jabatan;Organisasi Perangkat Daerah;Email;No. HP;Jam Masuk;Jam Pulang\n";
        
        dates.forEach(dateStr => {
            const records = data[dateStr];
            records.forEach(record => {
                const row = [
                    dateStr,
                    record.name,
                    record.nip,
                    record.jabatan,
                    record.opd,
                    record.email,
                    record.noHp,
                    record.jamMasuk,
                    record.jamPulang
                ].map(val => `="${String(val).replace(/"/g, '""')}"`).join(";");
                
                csvContent += row + "\n";
            });
        });

        // Tambahkan BOM agar karakter terbaca benar di Excel (UTF-8)
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "Laporan_Presensi_Lengkap.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
});
