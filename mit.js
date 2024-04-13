import TonWeb from "tonweb";
import tonMnemonic from "tonweb-mnemonic";
import { exec } from "child_process";

const targetEndings = ["_TON", "_MIT", "_mit", "-MIT", "-mit", "MIT"]; // Замените на нужные окончания адреса

const setConsoleTitle = (title) => {
    if (process.platform === 'win32') {
        exec('title ' + title, (error) => {
            if (error) {
                console.error('Error setting console title:', error);
            }
        });
    } else {
        console.log('Setting console title is not supported on this platform');
    }
};

const createKeyPair = async () => {
    const words = await tonMnemonic.generateMnemonic();
    const seed = await tonMnemonic.mnemonicToSeed(words);
    const keyPair = TonWeb.utils.nacl.sign.keyPair.fromSeed(seed);

    return { keyPair, words };
};

const createWallet = async (keyPair) => {
    const tonweb = new TonWeb();
    const WalletClass = tonweb.wallet.all.v4R2;
    const wallet = new WalletClass(tonweb.provider, {
        publicKey: keyPair.publicKey,
    });
    const address = await wallet.getAddress();

    return address;
};

const findWalletsWithEndings = async (endings) => {
    let wallets = [];
	let attempts = 0; // Добавьте переменную для отслеживания количества попыток
    for (const ending of endings) {
        let address;
        let keyPair;
        let words;
        let found = false;
        
        do {
            ({ keyPair, words } = await createKeyPair());
            address = await createWallet(keyPair);
			
            attempts++; // Увеличиваем счетчик попыток
            process.stdout.write(`Attempt: ${attempts} - Current address: ${address.toString(true, true, true)}\r`); 

            //console.log("Trying address:", address.toString(true, true, true));

            found = address.toString(true, true, true).endsWith(ending);
        } while (!found);

        wallets.push({ keyPair, words, address });
    }

    return wallets;
};


const main = async () => {
    const title = "Searching for wallets with endings: " + targetEndings.join(', ');
    setConsoleTitle(title);

    console.log(title);
    const wallets = await findWalletsWithEndings(targetEndings);

    wallets.forEach(({ keyPair, words, address }, index) => {
        console.log(`Wallet ${index + 1}:`);
        console.log("Public Key: ", TonWeb.utils.bytesToHex(keyPair.publicKey));
        console.log("Private Key: ", TonWeb.utils.bytesToHex(keyPair.secretKey));
        console.log("Words: ", words);
        console.log("Wallet: ", address.toString(true, true, true));
        console.log("----------------");
    });
};

main().catch((error) => {
    console.error("Error:", error);
});
