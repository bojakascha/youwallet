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

/*const networks = [
    'blockcypher testnet'
]

const providers = [
    'blockcypher',
    'bitstream'
]*/


const token = 'd0ffad34bf824bc58fc144771993ebc5';

//const network = window.bitcoin.networks.testnet;
const network = blockcypherTestnet;
const network_key = 1;

const bip32 = window.bip32.BIP32Factory(window.ecc);
const ecpair = window.ecpair.ECPairFactory(window.ecc);

const fee = 5;

var balanceUpdated_timems = 0;

/*var user_data = {
    wallet: {
        mnemonic: null,
        xpub: null,
        balance: 0
    },
    secondaryCurrency: 'usd',
    hashedPassword: null
}*/

var _user_data =  null;

function getUserData() {
    if(!_user_data) {
        _user_data = JSON.parse(localStorage.getItem('user_data'));
        //_user_data = storedData ? JSON.parse(storedData) : null;
    }
    return _user_data;
}

function isInitialized() {
    return getUserData() != null;
}

function updateAndStoreUserData(user_data) {
    _user_data = user_data;
    localStorage.setItem('user_data', JSON.stringify(_user_data));
    console.log("updateAndStoreUserData: " + JSON.stringify(_user_data));
}

function updateAndStoreBalance(balanceSats, balanceSec) {
    let user_data = getUserData();
    let secondaryCurrency = user_data.balance.secondaryCurrency;
    user_data.balance = {
        balanceSats: balanceSats,
        secondaryCurrency: secondaryCurrency,
        balanceSec: balanceSec
    }
    updateAndStoreUserData(user_data);
}

function updateAndStoreCurrency(secondaryCurrency) {
    let user_data = getUserData();
    user_data.balance = {
        balanceSats: user_data.balanceSats,
        secondaryCurrency: secondaryCurrency,
        balanceSec: user_data.balanceSec
    }
    updateAndStoreUserData(user_data);
}

function createUserData(walletData) {
    const user_data = {
        wallet: walletData,
        balance: {
            balanceSats: 0,
            secondaryCurrency: 'sek',
            balanceSec: 0
        }
    }
    console.log("createUserData: " + JSON.stringify(user_data));
    return user_data;
}

async function getBalance() {
    console.log("Date.now(): " + Date.now());
    console.log("balanceUpdated_timems: " + balanceUpdated_timems);
    if(Date.now() > balanceUpdated_timems + 300000) {
       balanceSats = await updateWalletBalance(getUserData().wallet); 
       const curToBTC = await getExchangeRateToBTC(getUserData().balance.secondaryCurrency); 
       
       const balanceSec = (balanceSats > 0) ? Number((balanceSats / 100000000 * curToBTC).toFixed(1)).toFixed(2) : 0;
       updateAndStoreBalance(balanceSats, balanceSec);
       balanceUpdated_timems = Date.now();
    } 
    return getUserData().balance;
}

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
    //localStorage.setItem('wallet', JSON.stringify(walletData));
    console.log("createWallet: " + JSON.stringify(walletData));
    updateAndStoreUserData(createUserData(walletData));
    navigateTo('#wallet_home');
}

function handleCurrencyChange(currency)  {
    console.log("Currency selected: " + currency);
}

function deleteWallet() {
    localStorage.removeItem('user_data');
    navigateTo('#no_wallet');
    console.log("Wallet deleted");
}

function getAddress(xpub, index) {
    const node = bip32.fromBase58(xpub, network);
    const child = node.derive(0).derive(index);
    //const { address } = bitcoin.payments.p2pkh({ pubkey: child.publicKey, network: network });
    const { address } = bitcoin.payments.p2wpkh({ pubkey: child.publicKey, network: network });
    return address;
}

async function getExchangeRateToBTC(currency) {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${currency}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        // Check if the response contains the exchange rate
        if (data.bitcoin && data.bitcoin[currency]) {
            console.log(`1 BTC = ${data.bitcoin[currency]} ${currency.toUpperCase()}`);
            return data.bitcoin[currency];
        } else {
            console.error("Exchange rate not found");
        }
    } catch (error) {
        console.error("Error fetching exchange rate:", error);
    }
}

/*function hasWallet() {
    console.log("HasWallet: " +_user_data != null);
    return _user_data != null;
}*/

function generateMnemonic() {
    const mnemonic = window.bip39.generateMnemonic();
    console.log(`New mnemonic: ${mnemonic}`);
    return mnemonic;
}

function getWallet() {
    console.log("getWallet: " + JSON.stringify(getUserData().wallet));
    return getUserData().wallet;
}

function getNextAddress(wallet) {

}

function deriveSeed(mnemonic) {
    console.log("deriveSeed..");
    return window.bip39.mnemonicToSeedSync(mnemonic);
}

// // Function to create HD wallet root node
async function fetBalanceBlockStream(address) {
    const url = `https://blockstream.info/testnet/api/address/${address}`;
    
    try {
        const response = await fetch(url);
        
        // Check if the request was successful
        if (!response.ok) {
            throw new Error(`Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Blockstream returns balance in satoshis
        console.log(`Balance for address ${address}: ${data.chain_stats.funded_txo_sum} satoshis`);
    } catch (error) {
        console.error('Error fetching balance:', error.message);
    }   
    return data.chain_stats.funded_txo_sum;
}

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

    console.log("updateWalletBalance..");
    xpub = wallet.xpub;

    //const seed = deriveSeed(wallet.mnemonic);
    const usedAddresses = await scanAddresses(wallet.xpub);

    // Calculate total balance in satoshis
    const totalBalanceSatoshis = usedAddresses.reduce((acc, addr) => acc + addr.balance, 0);
    //const totalBalanceBTC = totalBalanceSatoshis / 1e8;

    console.log('Used Addresses:', usedAddresses);
    //console.log(`Total Balance: ${totalBalanceSatoshis} satoshis (${totalBalanceBTC} BTC)`);

    //wallet.balance = totalBalanceBTC;
    return totalBalanceSatoshis;
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
    const { address } = bitcoin.payments.p2wpkh({ pubkey: pubKey, network: network });
    console.log(`Testnet Address: ${address}`);
    const apiUrl = `https://api.blockcypher.com/v1/bcy/test/addrs/${address}?token=${token}`;
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
        console.log("UTXO being used:", utxo);
        psbt.addInput({
            hash: utxo.txid,
            index: utxo.vout,
            witnessUtxo: {
                script: Buffer.from(bitcoin.address.toOutputScript(
                    bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network }).address, network
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
    const change = totalInputValue - amount - fee;
    if (change > 0) {
         const changeAddress = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey, network }).address;
         psbt.addOutput({
             address: changeAddress,
             value: BigInt(change),
         });
     }

    // Sign the transaction inputs
    utxos.forEach((utxo, index) => {
        console.log("UTXO being signed:", utxo);
        psbt.signInput(index, keyPair);
    });

    psbt.finalizeAllInputs();

    const rawTransaction = psbt.extractTransaction().toHex();
    console.log('Raw transaction hex:', rawTransaction);

    const apiUrl = `https://api.blockcypher.com/v1/bcy/test/txs/push?token=${token}`;
    console.log("Posting: " + apiUrl);
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tx: rawTransaction
            })
        });

        // Check if the request was successful (status code 2xx)
        if (!response.ok) {
            const errorDetails = await response.json();
            console.error('Error Details:', errorDetails);
            throw new Error(`Error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Transacion broadcasted: " + data);
    } catch (error) {
        console.error(error.message);
    }

    //navigateTo('#wallet_home');
}

// new comment

const currencies = [
    "btc",
    "eth",
    "ltc",
    "bch",
    "bnb",
    "eos",
    "xrp",
    "xlm",
    "link",
    "dot",
    "yfi",
    "usd",
    "aed",
    "ars",
    "aud",
    "bdt",
    "bhd",
    "bmd",
    "brl",
    "cad",
    "chf",
    "clp",
    "cny",
    "czk",
    "dkk",
    "eur",
    "gbp",
    "gel",
    "hkd",
    "huf",
    "idr",
    "ils",
    "inr",
    "jpy",
    "krw",
    "kwd",
    "lkr",
    "mmk",
    "mxn",
    "myr",
    "ngn",
    "nok",
    "nzd",
    "php",
    "pkr",
    "pln",
    "rub",
    "sar",
    "sek",
    "sgd",
    "thb",
    "try",
    "twd",
    "uah",
    "vef",
    "vnd",
    "zar",
    "xdr",
    "xag",
    "xau",
    "bits",
    "sats"
  ];

