import { toast, ToastContainer } from 'react-toastify'
import './App.css'
import { useState } from 'react';
import Chains, { Chain, Token } from './config/chains';
import { SecretNetworkClient } from 'secretjs';
import { SmallSpinnerBlue } from './components/SmallSpinner/smallSpinner';
import { HistoryResponse, TokenInfoResponse } from './types';
import { ReactTabulator } from 'react-tabulator'

const columns = [
  { title: "ID", field: "id" },
  { title: "Amount", field: "amount" },
  { title: "From", field: "from"},
  { title: "Sender", field: "sender" },
  { title: "Receiver", field: "receiver" },
  { title: "Block Height", field: "block_height" },
  { title: "Block Time", field: "block_time" },
];

interface TableData {
  id: number;
  amount: string;
  from: string;
  sender: string;
  receiver: string;
  block_height: number | undefined;
  block_time: string | undefined;
}


type ConnectedWallet = {
  address: string;
  client: SecretNetworkClient;
}

function App() {
  const [selectedChain, setSelectedChain] = useState<Chain>(Chains[0]);
  const [selectedToken, setSelectedToken] = useState<Token | undefined>(selectedChain.tokens.length ? selectedChain.tokens[0] : undefined);
  const [otherTokenAddress, setOtherTokenAddress] = useState<string>('');

  const [connectedWallet, setConnectedWallet] = useState<ConnectedWallet | undefined>();
  const [loading, setLoading] = useState(false);
  const [txs, setTxs] = useState<TableData[] | undefined>()

  const handleChangeChain = (chainId: string) => {
    const newChain = Chains.find(c => c.chainId === chainId)!
    setSelectedChain(newChain);
    setSelectedToken(newChain.tokens.length ? newChain.tokens[0] : undefined);
    setConnectedWallet(undefined);
  }

  const connectWallet = async () => {
    try {
      if (!window.keplr) throw 'Keplr Wallet not found. Is it installed and unlocked?'
      setLoading(true);

      const CHAIN_ID = selectedChain.chainId;
      await window.keplr.enable(CHAIN_ID);
      const keplrOfflineSigner = window.keplr.getOfflineSigner(CHAIN_ID);
      const [{ address }] = await keplrOfflineSigner.getAccounts();
      const client = new SecretNetworkClient({
        url: selectedChain.lcd,
        chainId: CHAIN_ID,
        wallet: keplrOfflineSigner,
        walletAddress: address,
        encryptionUtils: window.keplr.getEnigmaUtils(CHAIN_ID),
      });

      setConnectedWallet({ address, client })
    } catch (err: any) {
      toast.error(err.toString()); 
      console.error(err, err.toString?.());
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async () => {
    try {
      if (!window.keplr) throw 'Keplr Wallet not found. Is it installed and unlocked?'
      if (!connectedWallet) throw 'Wallet not connected.'
      setLoading(true);
      setTxs(undefined);
      const tokenAddress = selectedToken?.address || otherTokenAddress;
      let viewKey = await window.keplr.getSecret20ViewingKey(selectedChain.chainId, tokenAddress);
      if (!viewKey) {
        await window.keplr.suggestToken(selectedChain.chainId, tokenAddress);
        viewKey = await window.keplr.getSecret20ViewingKey(selectedChain.chainId, tokenAddress);
      }
      if (!viewKey) throw 'Viewing key not found, please add the token to your wallet.'

      const query = {
        transfer_history: {
          address: connectedWallet.address,
          key: viewKey,
          // page: Option<u32>,
          page_size: 10000,
          should_filter_decoys: true,
        },
      };

      const result = await connectedWallet.client.query.compute.queryContract({
        contract_address: tokenAddress,
        query,
      }) as HistoryResponse;
      if (typeof result === 'string') throw result;
      console.log(result.transfer_history.txs);

      const tokenInfo = await connectedWallet.client.query.compute.queryContract({
        contract_address: tokenAddress,
        query: {
          token_info: {},
        },
      }) as TokenInfoResponse;
      if (typeof tokenInfo === 'string') throw result;
      console.log('Token Info:', tokenInfo.token_info)

      const divisor = Math.pow(10, tokenInfo.token_info.decimals);
      console.log('divisor', divisor);

      const data: TableData[] = result.transfer_history.txs.map(tx => {
        return {
          id: parseInt(tx.id),
          amount: `${(parseInt(tx.coins.amount) / divisor).toLocaleString(undefined, { maximumFractionDigits: tokenInfo.token_info.decimals })} ${tx.coins.denom}`,
          from: tx.from,
          sender: tx.sender,
          receiver: tx.receiver,
          block_height: tx.block_height,
          block_time: tx.block_time ? new Date(tx.block_time * 1000).toLocaleString() : 'Not Supported for this Token'
        }
      })

      setTxs(data);

    } catch (err: any) {
      toast.error(err.toString()); 
      console.error(err, err.toString?.());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <ToastContainer />
      <header className='header'>
        <img src='trivium.svg' style={{height: '32px'}} />
        <div className='title'>SNIP-20 History <span className='tag'>v2</span></div>
        <select value={selectedChain.chainId} onChange={e => handleChangeChain(e.target.value)} disabled={loading}>
          { Chains.map(c =>
            <option key={c.chainId} value={c.chainId}>{c.name}</option>
          )}
        </select>
      </header>
      <div className='appWrapper'>
        <div className='mainApp'>
          <div>
            <div style={{fontWeight: '600'}}>Connected Address:</div>
            <div>{connectedWallet?.address || 'Not Connected'}</div>
          </div>
          <div>
            <div>Select Token</div>
            <select value={selectedToken?.address || ''} onChange={e => setSelectedToken(selectedChain.tokens.find(c => c.address === e.target.value)!)} disabled={loading}>
              { selectedChain.tokens.map(t =>
                <option key={t.address} value={t.address}>{t.symbol} - {t.name}</option>
              )}
              <option value={''}>Other Token</option>
            </select>
          </div>
          { !selectedToken && 
            <label>
              <div>Token Address</div>
              <input value={otherTokenAddress} onChange={e => setOtherTokenAddress(e.target.value)} placeholder='secret123...' disabled={loading} className='wide' />
            </label>
          }
          <div>
            { !connectedWallet ?
              <button type='button' onClick={() => connectWallet()} disabled={loading}>
                Connect Wallet{loading && <>&nbsp;<SmallSpinnerBlue /></>}
              </button>
            :
              <button type='button' onClick={() => handleSubmit()} disabled={loading}>
                Submit{loading && <>&nbsp;<SmallSpinnerBlue /></>}
              </button>
            }
          </div>
        </div>
      </div>
      <div className='tableWrapper'>
        { !!txs?.length &&
          <ReactTabulator
            data={txs}
            columns={columns}
            layout={"fitData"}
            options={{
              height: '512px',
              pagination: true,
              paginationSize: 25,
              // initialSort:[
              //   {column:"id", dir:"desc", sorter:"number"},
              // ],
              headerSortClickElement: 'icon',
              headerSortElement: '',
            }}
          />
        }
      </div>
    </div>
  )
}

export default App
