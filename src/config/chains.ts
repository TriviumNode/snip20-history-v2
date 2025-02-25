import Tokens from './tokens.json'

export interface Chain {
    name: string;
    chainId: string;
    lcd: string;
    tokens: Token[];
}

export interface Token {
    name: string;
    symbol: string;
    address: string;
}

const Chains: Chain[] = [
    {
        name: 'Secret Mainnet',
        chainId: 'secret-4',
        lcd: 'https://secret.api.trivium.network:1317',
        tokens: Tokens,
    },
    {
        name: 'Pulsar 3 Testnet',
        chainId: 'pulsar-3',
        lcd: 'https://pulsar.lcd.secretnodes.com',
        tokens: [],
    }
]

export default Chains;