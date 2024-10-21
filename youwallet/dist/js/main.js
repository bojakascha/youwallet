

// ** Navigation logic
const pages = {
    '#no_wallet': 'no_wallet',
    '#wallet_home': 'wallet_home',
    '#create': 'create',
    '#restore': 'restore',
    '#send': 'send',
    '#receive': 'receive',
    '#send_confirmation': 'send_confirmation'
};

function displayMnemonicTable(mnemonic) {
    const container = document.getElementById('mnemonicContainer');
    container.innerHTML = ''; // Clear any existing content

    const words = mnemonic.split(' ');
    if (words.length !== 12) {
        console.error('Mnemonic does not have 12 words.');
        return;
    }

    const table = document.createElement('table');
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '20px';
    table.style.width = '100%';
    table.style.maxWidth = '400px'; // Adjust as needed

    for (let i = 0; i < 3; i++) { // 3 rows
        const row = document.createElement('tr');

        for (let j = 0; j < 4; j++) { // 4 columns
            const cell = document.createElement('td');
            cell.style.border = '1px solid #000';
            cell.style.padding = '8px';
            cell.style.textAlign = 'center';
            cell.style.fontSize = '16px';
            cell.textContent = words[i * 4 + j];
            row.appendChild(cell);
        }

        table.appendChild(row);
    }

    container.appendChild(table);

}


function navigateTo(hash) {
    window.location.hash = hash;
    renderPage();
}

function renderPage() {
    let hash = window.location.hash;

    if (!hash) {
        hash = '#wallet_home';
        window.location.hash = hash;
    }

    if (!hasWallet()) {
        const allowedHashes = ['#no_wallet', '#create', '#restore'];
        if (!allowedHashes.includes(hash)) {
            hash = '#no_wallet';
            window.location.hash = hash;
        }
    }

    // Hide all pages
    Object.values(pages).forEach(pageId => {
        document.getElementById(pageId).style.display = 'none';
    });

    // Show current page
    const pageToShow = pages[hash] || pages['#wallet_home'];
    document.getElementById(pageToShow).style.display = 'block';

    if (hash == '#wallet_home') {
        renderWalletHome();
    }

    if (hash == '#create') {
        renderCreate();
    }

    if (hash == '#receive') {
        renderReceive();
    }

    if (hash == '#send_confirmation') {
        renderSendConfirmation();
    }

}

async function renderWalletHome() {
    const wallet = getWallet();
    document.getElementById('wallet_balance').textContent = '...';

    try {
        const balance = await updateWalletBalance(wallet);
        document.getElementById('wallet_balance').textContent = balance;
    } catch (error) {
        document.getElementById('wallet_balance').textContent = 'Error: ' + error;
    }

}

function renderCreate() {
    console.log("render create");
    const mnemonic = generateMnemonic();
    document.getElementById('mnemonic').value = mnemonic;

    const container = document.getElementById('mnemonicTable');
    container.innerHTML = '';


    const words = mnemonic.split(' ');
    if (words.length !== 12) {
        console.error('Mnemonic does not have 12 words.');
        return;
    }

    const table = document.createElement('table');

    for (let i = 0; i < 4; i++) { // 3 rows
        const row = document.createElement('tr');

        for (let j = 0; j < 3; j++) { // 4 columns
            const cell = document.createElement('td');
            cell.textContent = (i * 3 + j + 1) + ". " + words[i * 3 + j];
            row.appendChild(cell);
        }

        table.appendChild(row);
    }
    table.appendChild(document.createElement('tr'));
    container.appendChild(table);

}

function renderSendConfirmation() {
    console.log("RenderSenderConfirm");
    //const target_address = document.getElementById('target_address').value;
    //const target_amount = document.getElementById('target_amount').value;
    //document.getElementById('confirm_target_address').value = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa';
    //document.getElementById('confirm_target_amount').value = '300';
    //send('4343', '4343');
}

function generateQRCode(wallet_address) {
    // Get the wallet address from the input field

    // Generate QR code and place it inside the 'qrcode' div
    const qrcodeDiv = document.getElementById('qrcode');
    qrcodeDiv.innerHTML = ""; // Clear any existing QR code
    new QRCode(qrcodeDiv, {
        text: wallet_address,      // The address to encode in the QR code
        width: 200,               // Width of the QR code
        height: 200,              // Height of the QR code
        correctLevel: QRCode.CorrectLevel.H  // High error correction level
    });
}

function renderReceive() {
    const wallet = getWallet();
    const wallet_address = getAddress(wallet.xpub, 0);
    document.getElementById('wallet_address').value = wallet_address;
    generateQRCode(wallet_address);
}


function copyAddress() {
    // Get the wallet address element
    const walletAddressElement = document.getElementById('wallet_address');

    // Get the text value (the wallet address)
    walletAddressElement.select();
    walletAddressElement.setSelectionRange(0, 99999); // For mobile devices

    // Use the Clipboard API to copy the address
    navigator.clipboard.writeText(walletAddressElement.value);
}



const html5QrCode = new Html5Qrcode("qr-reader");

// Start the QR code scanner when you want to
function startScan() {
    document.getElementById('start_scan_button').style.display = 'none';
    document.getElementById('stop_scan_button').style.display = 'block';
    html5QrCode.start(
        { facingMode: "environment" },  // Use back camera for mobile
        {
            fps: 10     // Frames per second for the camera
        },
        (decodedText, decodedResult) => {
            console.log(`QR Code scanned: ${decodedText}`);
            document.getElementById('target_address').value = decodedText;
            stopScan();  // Stop the scan after a successful result
        },
        (errorMessage) => {
            //console.error(`QR Code scanning failed: ${errorMessage}`);
        }
    ).catch(err => {
        console.error("Error starting the QR code scanner", err);
    });
}

// Stop the scanner
function stopScan() {
    document.getElementById('stop_scan_button').style.display = 'none';
    document.getElementById('start_scan_button').style.display = 'block';
    html5QrCode.stop().then(() => {
        console.log("QR Code scanning stopped.");
    }).catch((err) => {
        console.error("Unable to stop QR code scanning", err);
    });
}



// Event listener for hash changes
window.addEventListener('hashchange', renderPage);

// Initial render
renderPage();


