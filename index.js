import TonWeb from "tonweb";
import tonMnemonic from "tonweb-mnemonic";
import sqlite3 from "sqlite3";

const targetEnding = "_MIT"; // Замените на нужное окончание адреса

const createKeyPair = async () => {
    /** @type {string[]} */
    const words = await tonMnemonic.generateMnemonic();

    /** @type {Uint8Array} */
    const seed = await tonMnemonic.mnemonicToSeed(words);

    /** @type {nacl.SignKeyPair} */
    const keyPair = TonWeb.utils.nacl.sign.keyPair.fromSeed(seed);

    return { keyPair, words };
}

/**
 * @param keyPair {nacl.SignKeyPair}
 */
const createWallet = async (keyPair) => {
    const tonweb = new TonWeb();

    const WalletClass = tonweb.wallet.all.v3R2;

    const wallet = new WalletClass(tonweb.provider, {
        publicKey: keyPair.publicKey
    });

    /** @type {Address} */
    const address = await wallet.getAddress();

    return address;
}

const initDb = () => {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database("wallets.db", (err) => {
            if (err) {
                reject(err);
            } else {
                resolve(db);
            }
        });
    });
}

const createTable = (db) => {
    return new Promise((resolve, reject) => {
        db.run(`
            CREATE TABLE IF NOT EXISTS wallets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                public_key TEXT,
                private_key TEXT,
                address TEXT,
                mnemonic TEXT
            )
        `, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

const saveWalletToDb = (db, publicKey, privateKey, address, words) => {
    return new Promise((resolve, reject) => {
        db.run(`
            INSERT INTO wallets (public_key, private_key, address, mnemonic)
            VALUES (?, ?, ?, ?)
        `, [publicKey, privateKey, address, words.join(' ')], (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

const findWalletWithEnding = async (db, ending) => {
    let address;
    let keyPair;
    let words;
    let found = false;
    do {
        ({ keyPair, words } = await createKeyPair());
        address = await createWallet(keyPair);
        console.log("Trying address:", address.toString(true, true, true)); // Add log to track progress

        await saveWalletToDb(
            db,
            TonWeb.utils.bytesToHex(keyPair.publicKey),
            TonWeb.utils.bytesToHex(keyPair.secretKey),
            address.toString(true, true, true),
            words
        );

        found = address.toString(true, true, true).endsWith(ending);
    } while (!found);

    return { keyPair, words, address };
}

const main = async () => {
    const db = await initDb();
    await createTable(db);

    console.log("Searching for wallet with ending:", targetEnding); // Add log to track progress
    const { keyPair, words, address } = await findWalletWithEnding(db, targetEnding);

    console.log("Public Key: ", TonWeb.utils.bytesToHex(keyPair.publicKey));
    console.log("Private Key: ", TonWeb.utils.bytesToHex(keyPair.secretKey));
    console.log("Words: ", words);
    console.log("Wallet: ", address.toString(true, true, true));

    db.close();
}

main().catch((error) => {
    console.error("Error:", error);
});
