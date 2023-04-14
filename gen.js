import TonWeb from "tonweb";
import tonMnemonic from "tonweb-mnemonic";
import fs from "fs/promises";

const targetEnding = "_TON"; // Замените на нужное окончание адреса

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

    const WalletClass = tonweb.wallet.all.v4R2;

    const wallet = new WalletClass(tonweb.provider, {
        publicKey: keyPair.publicKey
    });

    /** @type {Address} */
    const address = await wallet.getAddress();

    return address;
}

const saveWalletToFile = async (publicKey, privateKey, address, words) => {
    const walletData = `Public Key: ${publicKey}\nPrivate Key: ${privateKey}\nWords: ${words.join(' ')}\nWallet: ${address}\n`;

    await fs.writeFile("wallet.txt", walletData);
}

const findWalletWithEnding = async (ending) => {
    let address;
    let keyPair;
    let words;
    let found = false;
    do {
        ({ keyPair, words } = await createKeyPair());
        address = await createWallet(keyPair);
        console.log("Trying address:", address.toString(true, true, true)); // Add log to track progress

        found = address.toString(true, true, true).endsWith(ending);
    } while (!found);

    return { keyPair, words, address };
}

const main = async () => {
    console.log("Searching for wallet with ending:", targetEnding); // Add log to track progress
    const { keyPair, words, address } = await findWalletWithEnding(targetEnding);

    console.log("Public Key: ", TonWeb.utils.bytesToHex(keyPair.publicKey));
    console.log("Private Key: ", TonWeb.utils.bytesToHex(keyPair.secretKey));
    console.log("Words: ", words);
    console.log("Wallet: ", address.toString(true, true, true));

    await saveWalletToFile(
        TonWeb.utils.bytesToHex(keyPair.publicKey),
        TonWeb.utils.bytesToHex(keyPair.secretKey),
        address.toString(true, true, true),
        words
    );
}

main().catch((error) => {
    console.error("Error:", error);
});
