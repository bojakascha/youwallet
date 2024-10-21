// bundle.js

// Expose bitcoinjs-lib as a global variable
window.bitcoin = require('bitcoinjs-lib');

// Expose bip39 as a global variable
window.bip39 = require('bip39');

window.bip32 = require('bip32');

window.ecpair = require('ecpair');

//window.ecc = require('tiny-secp256k1');
//window.ecc = require('@noble/secp256k1');
window.ecc = require('@bitcoinerlab/secp256k1');

window.Buffer = require('buffer').Buffer;
