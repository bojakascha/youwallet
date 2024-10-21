const blockcypherTestnet = {
    messagePrefix: '\x18Bitcoin Signed Message:\n',
    bech32: 'bcy',
    bip32: {
        public: 0x043587cf,  // BIP32 public key prefix for testnet
        private: 0x04358394  // BIP32 private key prefix for testnet
    },
    pubKeyHash: 0x1b,  // Address starts with C (BlockCypher's Testnet address)
    scriptHash: 0x1f,  // Address starts with 2 for P2SH
    wif: 0xef  // Testnet WIF
};

//const network = window.bitcoin.networks.testnet;
const network = blockcypherTestnet;
const network_key = 1;

const bip32 = window.bip32.BIP32Factory(window.ecc);
const ecpair = window.ecpair.ECPairFactory(window.ecc);

const fee = 5;



function createWallet(mnemonic) {
    const seed = window.bip39.mnemonicToSeedSync(mnemonic);
    const root = bip32.fromSeed(seed, network);
    const account = root.derivePath(`m/44'/${network_key}'/0'`);
    const xpub = account.neutered().toBase58();
    console.log(`Extended Public Key (xpub): ${xpub}`);
    const walletData = {
        mnemonic: mnemonic,
        xpub: xpub
    };
    localStorage.setItem('wallet', JSON.stringify(walletData));
    navigateTo('#wallet_home');
}

function getAddress(xpub, index) {
    const node = bip32.fromBase58(xpub, network);
    const child = node.derive(0).derive(index);
    //const { address } = bitcoin.payments.p2pkh({ pubkey: child.publicKey, network: network });
    const { address } = bitcoin.payments.p2wpkh({ pubkey: child.publicKey, network: network });
    return address;
}

function hasWallet() {
    return localStorage.getItem('wallet') !== null;
}

function generateMnemonic() {
    const mnemonic = window.bip39.generateMnemonic();
    console.log(`New mnemonic: ${mnemonic}`);
    return mnemonic;
}

function getWallet() {
    let walletData = JSON.parse(localStorage.getItem('wallet'));
    const wallet = new Object();
    wallet.mnemonic = walletData.mnemonic;
    wallet.xpub = walletData.xpub;
    wallet.balance = 0.0012345;
    return wallet;
}

function getNextAddress(wallet) {

}

function deriveSeed(mnemonic) {
    console.log("deriveSeed..");
    return window.bip39.mnemonicToSeedSync(mnemonic);
}

// // Function to create HD wallet root node
// function createRootNode(seed) {
//     const root = bip32.fromSeed(seed, network);
//     return root;
// }

// function deriveAddress(root, index) {
//     const path = `m/44'/${network_key}'/0'/0/${index}`; 
//     const child = root.derivePath(path);
//     const { address: address } = bitcoin.payments.p2wpkh({
//         pubkey: child.publicKey,
//         network: network
//     });
//     console.log("Address is: " + address);
//     return address;
// }

async function fetchBalance(address) {
    //const apiUrl = `https://api.blockcypher.com/v1/btc/test3/addrs/${address}/balance`;
    const apiUrl = `https://api.blockcypher.com/v1/bcy/test/addrs/${address}/balance`;
    console.log("Quering: " + apiUrl);
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        return {
            balance: data.final_balance, // in satoshis
            transactions: data.n_tx,
        };
    } catch (error) {
        console.error(`Error fetching balance for ${address}:`, error);
        return null;
    }
}

async function scanAddresses(xpub, gapLimit = 2, maxAddresses = 1000) {
    let usedAddresses = [];
    let consecutiveUnused = 0;

    for (let i = 0; i < maxAddresses; i++) {
        const address = getAddress(xpub, i);
        const balanceInfo = await fetchBalance(address);

        if (balanceInfo && (balanceInfo.balance > 0 || balanceInfo.transactions > 0)) {
            usedAddresses.push({ index: i, address, balance: balanceInfo.balance });
            consecutiveUnused = 0; // Reset gap counter
        } else {
            consecutiveUnused += 1;
            if (consecutiveUnused >= gapLimit) {
                console.log(`Gap limit reached at index ${i}. Stopping scan.`);
                break;
            }
        }

    }

    return usedAddresses;
}

async function updateWalletBalance(wallet) {

    if (false) return 0.1337;
    console.log("updateWalletBalance..");
    xpub = wallet.xpub;

    //const seed = deriveSeed(wallet.mnemonic);
    const usedAddresses = await scanAddresses(wallet.xpub);

    // Calculate total balance in satoshis
    const totalBalanceSatoshis = usedAddresses.reduce((acc, addr) => acc + addr.balance, 0);
    const totalBalanceBTC = totalBalanceSatoshis / 1e8;

    console.log('Used Addresses:', usedAddresses);
    console.log(`Total Balance: ${totalBalanceSatoshis} satoshis (${totalBalanceBTC} BTC)`);

    //wallet.balance = totalBalanceBTC;
    return totalBalanceBTC;
}


function getKeyPair(child_index) {
    const wallet = getWallet();
    const seed = window.bip39.mnemonicToSeedSync(wallet.mnemonic);
    const root = bip32.fromSeed(seed, network);
    const path = `m/44'/${network_key}'/0'/0/${child_index}`;
    const child = root.derivePath(path);
    console.log(`child: ${child}`);
    const keyPair = ecpair.fromPrivateKey(child.privateKey, { network });
    console.log(`keyPair.priv: ${keyPair.privateKey}`);
    console.log(`keyPair.pub: ${keyPair.publicKey}`);
    return keyPair;
}

async function getUTXOs(pubKey) {
    console.log(`getUTXOs pubKey: ${pubKey}`);
    const { address } = bitcoin.payments.p2pkh({ pubkey: pubKey, network: network });
    console.log(`Testnet Address: ${address}`);

    const apiUrl = `https://api.blockcypher.com/v1/bcy/test/addrs/${address}?unspentOnly=true`;
    console.log("Quering: " + apiUrl);
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();
        return [{
            txid: data.txrefs[0].tx_hash,
            value: data.txrefs[0].value,
            vout: data.txrefs[0].tx_output_n
        }];
    } catch (error) {
        console.error(`Error: ${address}:`, error);
        return null;
    }
}

async function send(target_address, amount) {
    const keyPair = getKeyPair(0);
    const utxos = await getUTXOs(keyPair.publicKey);

    console.log("UTXOs: ", utxos);
    console.log("target_address: ", target_address);
    console.log("amount: ", amount);

    const psbt = new bitcoin.Psbt({ network });

    utxos.forEach(utxo => {
        psbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            witnessUtxo: {
                script: Buffer.from(bitcoin.address.toOutputScript(
                    bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network }).address, network
                )),
                value: BigInt(utxo.value),  // Ensure the value is a BigInt
            },
        });
    });

    // Ensure the target address is valid
    try {
        bitcoin.address.toOutputScript(target_address, network);
    } catch (error) {
        console.error('Invalid address:', target_address);
        return;
    }

    // Check if you have enough UTXO value to cover the amount + fee
    const totalInputValue = utxos.reduce((sum, utxo) => sum + utxo.value, 0);
    if (totalInputValue < amount + fee) {
        console.error('Insufficient UTXO value for the transaction.');
        return;
    }

    // Add the output for the recipient
    try {
        psbt.addOutput({
            address: target_address,
            value: BigInt(amount)
        });
    } catch (error) {
        console.error('error adding output: ', error);
    }

    // Add the change output if needed
    // const change = totalInputValue - amount - fee;
    // if (change > 0) {
    //     const changeAddress = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network }).address;
    //     psbt.addOutput({
    //         address: changeAddress,
    //         value: Number(change),
    //     });
    // }

    // Sign the transaction inputs
    utxos.forEach((utxo, index) => {
        psbt.signInput(index, keyPair);
    });

    const rawTransaction = psbt.extraxtTransaction().toHex();
    console.log('Raw transaction hex:', rawTransaction);

    navigateTo('#wallet_home');
}

