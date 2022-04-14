import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import './App.css';
import abi from "./utils/WavePortal.json";

export default function App() {

  const [currentAccount, setCurrentAccount] = useState("");
  const [message, setMessage] = useState("");
  const [allWaves, setAllWaves] = useState([]);
  const [loading, setLoading] = useState(false)
  const contractAddress ="0x8bE8DEbF36A198d6F10841CeFF135eAAF01c14af"
  const contractABI = abi.abi;
  
  const checkIfWalletIsConnected = async () => {
    try{
      const { ethereum } = window;
  
      if (!ethereum) {
        console.log("Make sure you have metamask!")
      } else{
        console.log("We have the ethereum object", ethereum);
      }
      /*
      * Check if app is authorized to access user wallet
      */
      const accounts = await ethereum.request({method: "eth_accounts"});
  
      if (accounts.length !== 0){
        const account = accounts[0]
        console.log("Account found", account);
        setCurrentAccount(account)
        getAllWaves();
      } else {
        console.log("No authorized account found")
      }
    } catch (error){
      console.log(error);
    }
  }


  const connectWallet = async () => {
    try{
      const {ethereum} = window;

      if(!ethereum){
        alert("You need MetaMask to use this functionality.");
        return
      }

      const accounts = await ethereum.request({method: "eth_requestAccounts"});

      console.log("Connected", accounts[0]);
      setCurrentAccount(accounts[0]);
      
    } catch (error){
      console.log(error)
    }
  }

  useEffect(() => {
    checkIfWalletIsConnected();
  }, [])
  
  const wave = async (msg) => {
    try{
      const {ethereum} = window;

      if (ethereum){
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);

        let count = await wavePortalContract.getTotalWaves();
        console.log("Retrieved total wave count...", count.toNumber());

        /*
        * Write count to blockchain
        */
        const waveTxn = await wavePortalContract.wave(msg , { gasLimit: 300000 });
        setLoading(true);
        console.log("Mining --", waveTxn.hash);

        await waveTxn.wait();
        setLoading(false);
        console.log("Mined --", waveTxn.hash);
        

        count = await wavePortalContract.getTotalWaves();
        console.log("Retrieved total wave count...", count.toNumber());
        
      } else {
        console.log("Ethereum object doesn't exist")
      } 
    } catch(error){
      console.log(error);
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message) {
      alert("Please enter a message");
      return false;
    }
    wave(message)
    setMessage('');
  }
  

  const getAllWaves = async () => {
    const { ethereum } = window;
    
    try{  
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);

        const waves = await wavePortalContract.getAllWaves();

        let wavesCleaned = [];
        waves.forEach(wave => {
          wavesCleaned.push({
            address: wave.waver,
            timestamp: new Date(wave.timestamp * 1000),
            message: wave.message
          });
        });

        setAllWaves(wavesCleaned);
      } else{
        console.log("Ethereum object doesn't exist.")
      }
      
    } catch(error){
      console.log(error);
    }
  };

  /*
  * Listen for emitter events
  */
  useEffect(() => {
    let wavePortalContract;
    const onNewWave = (from, timestamp, message) => {
      console.log("NewWave", from, timestamp, message);
      setAllWaves(prevState => [
        ...prevState,
        {
          address: from,
          timestamp: new Date(timestamp * 1000),
          message: message,
        },
      ]);
    };

    if (window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
        
      wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);
      wavePortalContract.on("NewWave", onNewWave);
    }

    return () => {
      if (wavePortalContract) {
        wavePortalContract.off("NewWave", onNewWave);
      }
    };
    
  }, []);


  return (
    <div className="mainContainer">

      <div className="dataContainer">
        <div className="header">
          Send me a link on the blockchain!
        </div>

        <div className="bio">
          <p>I'm <a href="http://mattambrogi.com/">Matt</a>. This is a site for my friends who are into Ethereum and reading.  </p>
          <p>Start by connecting your MetaMask wallet. Then you can send me a link to something you think I should read!</p>
          <p>Every link will be stored as a transcation on the Ethereum blockchain. On top of that, the smart contract that powers this app may randomly reward you by sending a little bit of ETH to your wallet!</p>
          <p><strong>Two important notes:</strong></p>
          <ul>
            <li>This contract is deployed on the <strong>Rinkeby testnet</strong>. To interact with it, you will need to select Rinkeby from the network dropdown in MetaMask. If your Rinkeby account is not already funded, you need to add some test ETH, which you can do for free using <a href="https://rinkebyfaucet.com/">this faucet.</a></li>
            <li>You can not send more than <strong>one link per hour</strong></li>
          </ul>
        </div>

        <form className="messageForm" onSubmit={handleSubmit}>
          <label htmlFor="message">Send me something to read below!</label>
          <textarea type='text' name="message" id="message" value={message}
            placeholder="copy a link to something I should read"
            onChange={(e) => setMessage(e.target.value)}></textarea>
          <button type="submit" className="waveButton">Send Link</button>
        </form>
        
        {!currentAccount && (
          <button className="waveButton" onClick={connectWallet}>
            Connect Wallet
          </button>
        )}

        {loading && (
          <div className="bio">
            Mining transaction...
          </div>
        )}

        <div className="allWavesHeader">
          Previous Links
        </div>
        {allWaves.map((wave, index) => {
          return(
            <div key={index} style={{ backgroundColor:"OldLace", marginTop: "16px", padding: "8px" }}>
              <div>
                { wave.message.startsWith("http")
                  ? <strong><a href={wave.message}> {wave.message} </a></strong>
                  : <strong><a href={'https://' + wave.message }> {wave.message} </a></strong>
                }
              </div>
              <div className="transactionDetail">Sent: {wave.timestamp.toLocaleDateString("en-US")}</div>
              <div className="transactionDetail">From: {wave.address}</div>
            </div>
          )
        })}
      </div>
    </div>
  );
}


