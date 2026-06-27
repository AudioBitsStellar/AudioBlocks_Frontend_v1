import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import apiClient from '@/lib/apiClient';
import Cookies from 'js-cookie';
import { toast } from 'sonner';


export const Auth = () => {
  const { user } = useDynamicContext();
  const { primaryWallet, handleLogOut } = useDynamicContext();
  const { address } = useAccount();
  const [shouldTriggerSignature, setShouldTriggerSignature] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const runSignatureFlow = async () => {
      if (!user?.userId || !primaryWallet || !address || !shouldTriggerSignature) return;

      const message = `Welcome to AudioBlocks! Sign this message to authenticate: ${new Date().toISOString()}`;

      try {
        setLoading(true); 
        const signature: any = await primaryWallet.signMessage(message);

        await authenticateUser('listener', user.email!, address, signature, message);
      } catch (err: any) {
        console.log(err);
      } finally {
        setLoading(false); 
        setShouldTriggerSignature(false); // Prevent future auto-triggers
      }
    };

    runSignatureFlow();
  }, [user?.userId, primaryWallet, address, shouldTriggerSignature]);



  const authenticateUser = async (
    role: string,
    email: string,
    walletAddress: any,
    signature: string,
    message: string
  ) => {
    try {
      const response = await apiClient.post('/api/auth/login', {
        role,
        email,
        walletAddress,
        signature,
        message,
      });

      const token = response.data.user.token;
      Cookies.set('audioblocks_jwt', token);
      toast.success(response.data?.message);
      return response.data;

    } catch (error: any) {
      const errorMsg = error?.response?.data?.message;

      if (errorMsg?.toLowerCase().includes('user not found')) {
          try {
            const registerResponse = await apiClient.post('/api/auth/register', {
            role,
            email,
            walletAddress,
            signature,
            message,
          });

          const registerToken = registerResponse.data?.user?.token;
          Cookies.set('audioblocks_jwt', registerToken);
          toast.success(registerResponse.data?.message);
          return registerResponse.data;
        } catch (registerError: any) {
          toast.error(registerError?.response?.data?.message || 'Registration failed');
          handleLogOut();
        }
      } else {
        handleLogOut();
        toast.error(error.response?.data?.message);
      }
    }
  };

  return { setShouldTriggerSignature, handleLogOut, loading };
};
