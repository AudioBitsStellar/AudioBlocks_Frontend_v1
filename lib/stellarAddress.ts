import { StrKey } from '@stellar/stellar-sdk';

/**
 * Validates if a value is a valid Stellar address (account or contract)
 */
export function isValidStellarAddress(value: string): boolean {
  if (!value || typeof value !== 'string') {
    return false;
  }

  try {
    // Check if it's a valid Ed25519 public key (G...)
    if (value.startsWith('G')) {
      return StrKey.isValidEd25519PublicKey(value);
    }
    
    // Check if it's a valid contract address (C...)
    if (value.startsWith('C')) {
      return StrKey.isValidContract(value);
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * Shortens a Stellar address for display (first 4 and last 4 characters)
 * Example: GABC...WXYZ
 */
export function shortenAddress(address: string, prefixLength = 4, suffixLength = 4): string {
  if (!address || address.length <= prefixLength + suffixLength) {
    return address;
  }
  
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}

/**
 * Get the type of Stellar address
 */
export function getStellarAddressType(address: string): 'account' | 'contract' | 'invalid' {
  if (!address || typeof address !== 'string') {
    return 'invalid';
  }

  try {
    if (address.startsWith('G') && StrKey.isValidEd25519PublicKey(address)) {
      return 'account';
    }
    
    if (address.startsWith('C') && StrKey.isValidContract(address)) {
      return 'contract';
    }
    
    return 'invalid';
  } catch {
    return 'invalid';
  }
}
