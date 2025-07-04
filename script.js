document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('mainContent');
    const addNewCardButton = document.getElementById('addNewCardButton');

    // ** UBAH INI JIKA BACKEND BERJALAN DI LOKASI BERBEDA **
    const API_BASE_URL = 'https://ovfsldqbdjhxuxcrpugu.supabase.co/functions/v1/get-savings';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92ZnNsZHFiZGpoeHV4Y3JwdWd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4OTY0ODMsImV4cCI6MjA2NjQ3MjQ4M30.VE0k4IMLahiImnd7KJmNu7a7bjKhneWsf6FFJvuCuOM';

    // Fungsi helper untuk membersihkan teks nominal dan mengkonversinya ke angka
    const cleanAndParseAmount = (text) => parseFloat(text.replace(/[^0-9]/g, '')) || 0;

    // Fungsi untuk mengambil semua data kartu dari backend
    async function fetchAllCards() {
        try {
            const response = await fetch(API_BASE_URL, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            }
);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching cards:', error);
            // Fallback: Jika gagal fetch, kembalikan array kosong
            alert('Gagal memuat data dari server. Pastikan backend berjalan dengan benar.');
            return [];
        }
    }

    // Fungsi untuk menyimpan data kartu ke backend (update atau create)
    // Akan melakukan POST jika cardData.id belum ada (kartu baru)
    // Akan melakukan PUT jika cardData.id sudah ada (update kartu)
    async function saveCardToBackend(cardData) {
        try {
            const method = cardData.id ? 'PUT' : 'POST';
            const url = cardData.id ? `${API_BASE_URL}/${cardData.id}` : API_BASE_URL;

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(cardData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message}`);
            }
            const savedData = await response.json();
            return savedData;
        } catch (error) {
            console.error('Error saving card to backend:', error);
            alert(`Gagal menyimpan data ke server: ${error.message}. Coba lagi.`);
            return null;
        }
    }

    // Fungsi untuk menghapus kartu dari backend (jika Anda ingin menambah fungsionalitas hapus)
    // async function deleteCardFromBackend(cardId) {
    //     try {
    //         const response = await fetch(`${API_BASE_URL}/${cardId}`, {
    //             method: 'DELETE',
    //         });
    //         if (!response.ok) {
    //             throw new Error(`HTTP error! status: ${response.status}`);
    //         }
    //         return true;
    //     } catch (error) {
    //         console.error('Error deleting card from backend:', error);
    //         alert('Gagal menghapus kartu dari server. Coba lagi.');
    //         return false;
    //     }
    // }


    // --- Fungsi Inisialisasi Kartu ---
    // Sekarang menerima cardData sebagai parameter langsung, bukan dari localStorage
    async function initializeCard(cardElement, initialCardData) {
        const cardHeader = cardElement.querySelector('.card-header');
        const targetAmountDisplay = cardElement.querySelector('.target-amount span');
        const editTargetAmountIcon = cardElement.querySelector('.target-amount .edit-icon-text');
        const weeklySavingText = cardElement.querySelector('.weekly-saving');
        let addButton = weeklySavingText ? weeklySavingText.querySelector('.add-button') : null;
        const estimationText = cardElement.querySelector('.estimation');
        const progressBar = cardElement.querySelector('.progress-bar');
        const progressPercentageText = cardElement.querySelector('.progress-percentage-text');

        const imagePlaceholder = cardElement.querySelector('.placeholder-image');
        const imageUploadInput = imagePlaceholder ? imagePlaceholder.querySelector('input[type="file"]') : null;
        const uploadedImage = imagePlaceholder ? imagePlaceholder.querySelector('.uploaded-image-display') : null;
        const plusIcon = imagePlaceholder ? imagePlaceholder.querySelector('.plusIconStyle') : null;
        const editImageIcon = imagePlaceholder ? imagePlaceholder.querySelector('.edit-icon') : null;

        if (!targetAmountDisplay || !editTargetAmountIcon || !weeklySavingText || !estimationText || !progressBar || !progressPercentageText) {
            console.error(`Missing core elements in card. Skipping initialization.`);
            return;
        }

        let cardData = initialCardData;

        // Jika cardData tidak memiliki ID, berarti ini kartu baru yang perlu disimpan ke backend
        if (!cardData.id) {
            const savedCard = await saveCardToBackend(cardData);
            if (savedCard) {
                cardData = savedCard;
                cardElement.dataset.cardId = cardData.id; // Set ID ke elemen DOM
            } else {
                console.error("Failed to save new card to backend. Card will not be fully functional.");
                // Jika gagal menyimpan, mungkin sembunyikan atau berikan pesan error
                cardElement.remove();
                return;
            }
        }

        // Pastikan properti status ada
        if (typeof cardData.status === 'undefined') {
            cardData.status = 'inProgress';
            await saveCardToBackend(cardData); // Simpan status default ke backend
        }

        // Perbarui tampilan berdasarkan cardData yang dimuat atau dibuat
        cardHeader.textContent = cardData.title;
        targetAmountDisplay.textContent = `Rp. ${cardData.targetAmount.toLocaleString('id-ID')}`;
        weeklySavingText.innerHTML = `Rp. ${cardData.savingRate.toLocaleString('id-ID')}/${cardData.savingPeriod} <button class="add-button">+</button>`;
        addButton = weeklySavingText.querySelector('.add-button'); // Re-assign addButton after innerHTML change

        if (imagePlaceholder && imageUploadInput && uploadedImage && plusIcon && editImageIcon) {
            if (cardData.uploadedImage) {
                uploadedImage.src = cardData.uploadedImage;
                uploadedImage.style.display = 'block';
                plusIcon.style.display = 'none';
                editImageIcon.style.display = 'flex';
            } else {
                uploadedImage.style.display = 'none';
                plusIcon.style.display = 'flex';
                editImageIcon.style.display = 'none';
            }

            plusIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                imageUploadInput.click();
            });

            editImageIcon.addEventListener('click', (e) => {
                e.stopPropagation();
                imageUploadInput.click();
            });

            imageUploadInput.addEventListener('change', async (event) => {
                const file = event.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        uploadedImage.src = e.target.result;
                        uploadedImage.style.display = 'block';
                        plusIcon.style.display = 'none';
                        editImageIcon.style.display = 'flex';
                        cardData.uploadedImage = e.target.result;
                        await saveCardToBackend(cardData); // Simpan perubahan gambar ke backend
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // Event listener untuk tombol Add (+)
        if (addButton) {
            addButton.addEventListener('click', async () => {
                const amountToAddStr = prompt(`Masukkan nominal yang ingin ditambahkan ke ${cardData.title} (contoh: 100000):`);
                if (amountToAddStr === null) {
                    return;
                }

                let amountToAdd = parseFloat(amountToAddStr);

                if (isNaN(amountToAdd) || amountToAdd <= 0) {
                    alert("Nominal tidak valid. Harap masukkan angka positif.");
                    return;
                }

                cardData.currentAmount += amountToAdd;
                if (cardData.currentAmount > cardData.targetAmount) {
                    cardData.currentAmount = cardData.targetAmount;
                }
                await saveCardToBackend(cardData); // Simpan perubahan ke backend
                updateCardDisplay();
                alert(`Berhasil menambahkan Rp. ${amountToAdd.toLocaleString('id-ID')} ke ${cardData.title}. Total terkumpul: Rp. ${cardData.currentAmount.toLocaleString('id-ID')}`);
            });
        }

        editTargetAmountIcon.addEventListener('click', () => {
            const currentTarget = cardData.targetAmount;

            const inputField = document.createElement('input');
            inputField.type = 'number';
            inputField.value = currentTarget;
            inputField.style.width = '120px';
            inputField.style.fontSize = '18px';
            inputField.style.fontWeight = 'bold';
            inputField.style.border = '1px solid #ccc';
            inputField.style.borderRadius = '3px';
            inputField.style.padding = '2px 5px';
            inputField.style.boxSizing = 'border-box';

            targetAmountDisplay.parentNode.replaceChild(inputField, targetAmountDisplay);
            editTargetAmountIcon.style.display = 'none';
            inputField.focus();

            const saveTargetAmount = async () => {
                let newTarget = parseFloat(inputField.value) || 0;
                if (newTarget < 0) newTarget = 0;
                cardData.targetAmount = newTarget;
                await saveCardToBackend(cardData); // Simpan perubahan ke backend

                targetAmountDisplay.textContent = `Rp. ${newTarget.toLocaleString('id-ID')}`;
                inputField.parentNode.replaceChild(targetAmountDisplay, inputField);
                editTargetAmountIcon.style.display = 'inline-block';
                updateCardDisplay();
            };

            inputField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveTargetAmount();
                }
            });
            inputField.addEventListener('blur', saveTargetAmount);
        });

        cardHeader.addEventListener('click', () => {
            const currentTitle = cardData.title;
            const inputField = document.createElement('input');
            inputField.type = 'text';
            inputField.value = currentTitle;
            inputField.style.width = '100%';
            inputField.style.fontSize = 'inherit';
            inputField.style.fontWeight = 'bold';
            inputField.style.backgroundColor = 'transparent';
            inputField.style.border = 'none';
            inputField.style.color = 'white';
            inputField.style.textAlign = 'left';
            inputField.style.padding = '0';

            cardHeader.parentNode.replaceChild(inputField, cardHeader);
            inputField.focus();

            const saveTitle = async () => {
                let newTitle = inputField.value.trim();
                if (newTitle === '') newTitle = 'Tabungan Tanpa Nama';
                cardData.title = newTitle;
                await saveCardToBackend(cardData); // Simpan perubahan ke backend

                cardHeader.textContent = newTitle;
                inputField.parentNode.replaceChild(cardHeader, inputField);
            };

            inputField.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveTitle();
                }
            });
            inputField.addEventListener('blur', saveTitle);
        });

        weeklySavingText.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') return;

            const currentRate = cardData.savingRate;
            const currentPeriod = cardData.savingPeriod;

            const rateInput = document.createElement('input');
            rateInput.type = 'number';
            rateInput.value = currentRate;
            rateInput.style.width = '80px';
            rateInput.style.marginRight = '5px';
            rateInput.style.fontSize = '14px';

            const periodSelect = document.createElement('select');
            ['Hari', 'Minggu', 'Bulan'].forEach(period => {
                const option = document.createElement('option');
                option.value = period;
                option.textContent = period;
                if (period === currentPeriod) {
                    option.selected = true;
                }
                periodSelect.appendChild(option);
            });
            periodSelect.style.width = '70px';
            periodSelect.style.marginRight = '5px';
            periodSelect.style.fontSize = '14px';

            weeklySavingText.innerHTML = '';
            weeklySavingText.appendChild(rateInput);
            weeklySavingText.appendChild(document.createTextNode('/'));
            weeklySavingText.appendChild(periodSelect);
            weeklySavingText.appendChild(document.createTextNode(' '));
            const saveButton = document.createElement('button');
            saveButton.textContent = 'Simpan';
            saveButton.style.fontSize = '12px';
            saveButton.style.padding = '3px 8px';
            saveButton.style.backgroundColor = '#4682b4';
            saveButton.style.color = 'white';
            saveButton.style.border = 'none';
            saveButton.style.borderRadius = '5px';
            saveButton.style.cursor = 'pointer';
            weeklySavingText.appendChild(saveButton);

            rateInput.focus();

            const saveRateAndPeriod = async () => {
                let newRate = parseFloat(rateInput.value) || 0;
                if (newRate < 0) newRate = 0;
                let newPeriod = periodSelect.value;

                cardData.savingRate = newRate;
                cardData.savingPeriod = newPeriod;
                await saveCardToBackend(cardData); // Simpan perubahan ke backend

                weeklySavingText.innerHTML = `Rp. ${newRate.toLocaleString('id-ID')}/${newPeriod} <button class="add-button">+</button>`;
                addButton = weeklySavingText.querySelector('.add-button');
                // Re-attach event listener for the new add-button
                if (addButton) {
                    addButton.addEventListener('click', async () => {
                        const amountToAddStr = prompt(`Masukkan nominal yang ingin ditambahkan ke ${cardData.title} (contoh: 100000):`);
                        if (amountToAddStr === null) {
                            return;
                        }
                        let amountToAdd = parseFloat(amountToAddStr);
                        if (isNaN(amountToAdd) || amountToAdd <= 0) {
                            alert("Nominal tidak valid. Harap masukkan angka positif.");
                            return;
                        }
                        cardData.currentAmount += amountToAdd;
                        if (cardData.currentAmount > cardData.targetAmount) {
                            cardData.currentAmount = cardData.targetAmount;
                        }
                        await saveCardToBackend(cardData);
                        updateCardDisplay();
                        alert(`Berhasil menambahkan Rp. ${amountToAdd.toLocaleString('id-ID')} ke ${cardData.title}. Total terkumpul: Rp. ${cardData.currentAmount.toLocaleString('id-ID')}`);
                    });
                }
                updateCardDisplay();
            };

            saveButton.addEventListener('click', saveRateAndPeriod);
            rateInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') saveRateAndPeriod();
            });
            periodSelect.addEventListener('change', saveRateAndPeriod);
        });

        function updateCardDisplay() {
            // Sembunyikan atau tampilkan kartu berdasarkan status
            // filterCards akan menangani display: none/flex, jadi kita tidak perlu mengaturnya di sini
            const percentage = cardData.targetAmount === 0 ? 0 : (cardData.currentAmount / cardData.targetAmount) * 100;
            progressBar.style.width = `${percentage}%`;
            progressPercentageText.textContent = `${percentage.toFixed(0)}%`;

            let remainingAmount = cardData.targetAmount - cardData.currentAmount;
            let remainingUnits = 0;

            if (remainingAmount > 0 && cardData.savingRate > 0) {
                remainingUnits = Math.ceil(remainingAmount / cardData.savingRate);
            } else if (remainingAmount <= 0) {
                remainingUnits = 0;
            }

            if (cardData.currentAmount >= cardData.targetAmount) {
                estimationText.textContent = `Estimation: Selesai!`;
                if (cardData.status !== 'complete') {
                    cardData.status = 'complete';
                    saveCardToBackend(cardData); // Simpan status 'complete' ke backend
                }
            } else if (remainingAmount > 0 && cardData.savingRate === 0) {
                estimationText.textContent = `Estimation: Perlu atur target/tabungan`;
            } else {
                estimationText.textContent = `Estimation: ${remainingUnits} ${cardData.savingPeriod}`;
                if (cardData.status !== 'inProgress') {
                    cardData.status = 'inProgress';
                    saveCardToBackend(cardData); // Simpan status 'inProgress' ke backend
                }
            }
        }

        updateCardDisplay(); // Panggil saat inisialisasi
    }

    // Fungsionalitas Tambah Kartu Baru
    addNewCardButton.addEventListener('click', async () => {
        const newCardHTML = `
            <div class="card" data-card-id=""> <div class="card-header">Tabungan Baru</div>
                <div class="placeholder-image">
                    <input type="file" accept="image/*" style="display: none;">
                    <img class="uploaded-image-display" src="" alt="Uploaded Image" style="display: none;">
                    <span class="plusIconStyle" style="cursor: pointer;">+</span>
                    <span class="edit-icon" style="display: none; cursor: pointer;">&#9998;</span>
                </div>
                <div class="card-content">
                    <div class="target-amount">
                        <span>Rp. 0</span>
                        <span class="edit-icon-text" style="cursor: pointer;">&#9998;</span>
                    </div>
                    <div class="weekly-saving">
                        Rp. 0/Minggu
                        <button class="add-button">+</button>
                    </div>
                </div>
                <div class="estimation">
                    Estimation: 0 Minggu
                </div>
                <div class="progress-container-with-percentage">
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: 0%;"></div>
                    </div>
                    <span class="progress-percentage-text">0%</span>
                </div>
            </div>
        `;

        addNewCardButton.insertAdjacentHTML('beforebegin', newCardHTML);

        const newlyAddedCardElement = document.querySelector('.card:nth-last-child(2)'); // Pilih kartu yang baru ditambahkan
        
        // Buat objek cardData awal untuk dikirim ke backend
        const initialCardDataForNew = {
            title: 'Tabungan Baru',
            targetAmount: 0,
            currentAmount: 0,
            savingRate: 0,
            savingPeriod: 'Minggu',
            uploadedImage: null,
            status: 'inProgress'
        };

        // InitializeCard akan menyimpan ke backend dan mengisi ID
        await initializeCard(newlyAddedCardElement, initialCardDataForNew);
        loadAndDisplayCards(currentFilter); // Muat ulang semua kartu setelah penambahan
    });

    // --- Fungsi untuk memuat dan menampilkan semua kartu dari backend ---
    let currentFilter = 'all'; // Menyimpan filter yang sedang aktif

    async function loadAndDisplayCards(filterStatus = 'all') {
        currentFilter = filterStatus; // Update filter yang aktif

        // Hapus semua kartu yang ada sebelum memuat yang baru, kecuali tombol 'Add New Card'
        document.querySelectorAll('.card:not(.add-new-card)').forEach(card => card.remove());

        const cardsData = await fetchAllCards();

        cardsData.forEach(cardData => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card';
            cardElement.dataset.cardId = cardData.id;
            cardElement.innerHTML = `
                <div class="card-header">${cardData.title}</div>
                <div class="placeholder-image">
                    <input type="file" accept="image/*" style="display: none;">
                    <img class="uploaded-image-display" src="${cardData.uploadedImage || ''}" alt="Uploaded Image" style="display: ${cardData.uploadedImage ? 'block' : 'none'};">
                    <span class="plusIconStyle" style="cursor: pointer; display: ${cardData.uploadedImage ? 'none' : 'flex'};">+</span>
                    <span class="edit-icon" style="display: ${cardData.uploadedImage ? 'flex' : 'none'}; cursor: pointer;">&#9998;</span>
                </div>
                <div class="card-content">
                    <div class="target-amount">
                        <span>Rp. ${cardData.targetAmount.toLocaleString('id-ID')}</span>
                        <span class="edit-icon-text" style="cursor: pointer;">&#9998;</span>
                    </div>
                    <div class="weekly-saving">
                        Rp. ${cardData.savingRate.toLocaleString('id-ID')}/${cardData.savingPeriod}
                        <button class="add-button">+</button>
                    </div>
                </div>
                <div class="estimation">
                    Estimation: Loading...
                </div>
                <div class="progress-container-with-percentage">
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: 0%;"></div>
                    </div>
                    <span class="progress-percentage-text">0%</span>
                </div>
            `;
            addNewCardButton.insertAdjacentElement('beforebegin', cardElement);
            // Inisialisasi dengan data yang sudah ada dari backend
            initializeCard(cardElement, cardData);
        });

        // Terapkan filter setelah semua kartu dimuat
        filterCards(filterStatus);
    }

    // Panggil saat DOMContentLoaded untuk memuat kartu awal
    loadAndDisplayCards();


    // --- Fungsionalitas Menu Dropdown ---
    const menuIcon = document.querySelector('.menu-icon');
    let dropdownMenu = null;

    if (menuIcon) {
        menuIcon.addEventListener('click', (e) => {
            e.stopPropagation();

            if (!dropdownMenu) {
                dropdownMenu = document.createElement('ul');
                dropdownMenu.className = 'dropdown-menu';
                dropdownMenu.innerHTML = `
                    <li data-filter="all">Semua Tabungan</li>
                    <li data-filter="inProgress">Dalam Proses</li>
                    <li data-filter="complete">Selesai</li>
                `;
                document.body.appendChild(dropdownMenu);

                dropdownMenu.addEventListener('click', (e) => {
                    const filter = e.target.dataset.filter;
                    if (filter) {
                        loadAndDisplayCards(filter); // Panggil loadAndDisplayCards dengan filter baru
                        dropdownMenu.classList.remove('active');
                    }
                });
            }
            dropdownMenu.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (dropdownMenu && dropdownMenu.classList.contains('active') && !menuIcon.contains(e.target) && !dropdownMenu.contains(e.target)) {
                dropdownMenu.classList.remove('active');
            }
        });
    }

    // Fungsi untuk menyaring kartu berdasarkan status
    // Fungsi ini sekarang hanya mengatur display CSS, data sudah dimuat oleh loadAndDisplayCards
    function filterCards(status) {
        document.querySelectorAll('.card:not(.add-new-card)').forEach(cardElement => {
            const cardId = cardElement.dataset.cardId;
            // Kita perlu mendapatkan data kartu yang valid.
            // Cara terbaik adalah memiliki array global `allCardsData` yang diperbarui oleh `fetchAllCards`
            // Untuk sementara, kita akan mengambil data dari DOM atau mengasumsikan initializeCard sudah menyetelnya
            // Namun, lebih baik mengambil dari sumber data terpusat.
            // Karena `initializeCard` sekarang menerima data langsung, kita bisa mengandalkan `cardData` di dalam scope `initializeCard`
            // atau kembali fetch data jika `cardData` tidak tersedia.

            // Karena kita memuat ulang semua kartu dengan `loadAndDisplayCards` saat filter berubah,
            // kita bisa mengandalkan `initializeCard` yang sudah menampilkan kartu yang relevan.
            // Jadi, fungsi `filterCards` ini hanya perlu membaca status yang sudah ada di DOM atau cardData yang terakhir diinisialisasi.

            // Untuk membuat ini lebih robust, kita perlu tahu status kartu yang sebenarnya setelah semua async ops selesai.
            // Mari kita asumsikan `initializeCard` akan memastikan `cardElement` memiliki data yang benar.
            const cardDataFromElement = { // Buat objek sementara dari data yang ada di DOM jika belum lengkap
                status: cardElement.querySelector('.estimation').textContent.includes('Selesai') ? 'complete' : 'inProgress'
                // Ini kurang ideal, sebaiknya ada atribut dataset di cardElement yang menyimpan status
            };

            // Idealnya, simpan status ke dataset cardElement saat inisialisasi
            // Misalnya: cardElement.dataset.status = cardData.status;
            // Lalu di sini: const currentStatus = cardElement.dataset.status;

            // Untuk mengatasi ini, `initializeCard` harus memastikan `cardData.status` sudah ada dan diperbarui
            // dan bahwa filterCards dipanggil setelah semua kartu diinisialisasi.

            // Solusi paling bersih: loadAndDisplayCards mengambil data dari backend, lalu filtercards hanya membaca data yang ada di DOM (jika sudah diset)
            // ATAU, loadAndDisplayCards yang melakukan filtering setelah fetch.

            // Mari kita ubah sedikit: filterCards akan menggunakan data yang sudah ada di memori (jika ada) atau dari DOM.
            // Namun, yang paling akurat adalah jika loadAndDisplayCards yang melakukan filter setelah mendapatkan semua data.

            // Karena `loadAndDisplayCards` sekarang menerima `filterStatus` dan memanggil `filterCards` setelah memuat semua data,
            // kita bisa memastikan kartu yang ditampilkan sudah sesuai dengan filter.
            // Ini akan memastikan tampilan selalu sinkron dengan database.
            // Jadi, kita hanya perlu memastikan `cardData` di `initializeCard` sudah benar.

            // Jika statusnya "all", tampilkan semua.
            if (status === 'all') {
                cardElement.style.display = 'flex';
            } else {
                // Periksa status dari data yang terakhir diupdate di elemen (jika ada) atau dari logika estimasi
                // Lebih baik: simpan cardData di atribut dataset kartu setelah initializeCard
                // Atau, kita bisa membandingkan dengan status yang baru saja dihitung oleh `updateCardDisplay()`
                const isComplete = cardElement.querySelector('.estimation').textContent.includes('Selesai!');
                const currentCalculatedStatus = isComplete ? 'complete' : 'inProgress';

                if (currentCalculatedStatus === status) {
                    cardElement.style.display = 'flex';
                } else {
                    cardElement.style.display = 'none';
                }
            }
        });
    }
});