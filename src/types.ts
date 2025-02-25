export interface Coin {
    amount: string;
    denom: string;
}

export interface HistoryObject {
    id: string;
    coins: Coin;
    from: string;
    sender: string;
    receiver: string;
    block_height?: number;
    block_time?: number;
}

export interface HistoryResponse {
    transfer_history: {
        txs: HistoryObject[];
    }
}

export interface TokenInfoResponse {
    token_info: {
        decimals: number;
        name: string;
        symbol: string;
        total_supply: null | string;
    }
}