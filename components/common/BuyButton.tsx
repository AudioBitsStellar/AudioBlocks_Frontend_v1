'use client';

import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useStellarWallet } from '@/context/StellarWalletContext';

interface BuyButtonProps {
  tokenId: string;
  price: string;
  label: string;
}

const BuyButton = ({ tokenId, price, label }: BuyButtonProps) => {
  const { publicKey, signTransaction } = useStellarWallet();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleBuy = async () => {
    if (!publicKey) {
      toast.error('Please connect your Stellar wallet first');
      return;
    }

    try {
      setIsProcessing(true);
      // TODO: Integrate with backend to get unsigned XDR transaction
      // const response = await fetch('/api/transactions/buy', {
      //   method: 'POST',
      //   body: JSON.stringify({ tokenId, price }),
      // });
      // const { xdr } = await response.json();
      // const signedXdr = await signTransaction(xdr);
      // Submit signed transaction to backend
      
      toast.info('Stellar transaction integration pending - backend required');
    } catch (error: any) {
      toast.error(error?.message || 'Transaction failed');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <button 
      onClick={handleBuy}
      disabled={isProcessing || !publicKey}
      className="border-gray-600 border text-white px-4 py-2 rounded-2xl transition-colors text-sm mb-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {isProcessing ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing...
        </>
      ) : (
        label
      )}
    </button>
  );
};

export default BuyButton;
