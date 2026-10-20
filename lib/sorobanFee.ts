/**
 * Soroban fee parsing utilities
 * Issue #548: Show Soroban fees from backend prepare response
 */

// Stroops to XLM conversion factor
const STROOPS_PER_XLM = 10_000_000;

/**
 * Parse fee from a prepared Soroban transaction XDR
 * @param _xdr - Transaction XDR string (unused - for future implementation)
 * @param _networkPassphrase - Network passphrase for parsing (unused - for future implementation)
 * @returns Fee information in stroops and XLM
 */
export function parseSorobanFee(
  _xdr: string,
  _networkPassphrase: string
): { stroops: number; xlm: string } {
  try {
    // In a real implementation, this would use stellar-sdk to parse the XDR
    // For now, we'll provide a placeholder that expects the fee to be passed explicitly
    // TODO: Integrate stellar-sdk when available
    // const transaction = TransactionBuilder.fromXDR(xdr, networkPassphrase);
    // const fee = transaction.fee;

    // Placeholder implementation
    throw new Error(
      'XDR parsing not yet implemented. Use explicit fee from backend response instead.'
    );
  } catch (error) {
    console.error('Failed to parse XDR fee:', error);
    throw error;
  }
}

/**
 * Convert stroops to XLM
 * @param stroops - Fee in stroops
 * @returns Fee in XLM as formatted string
 */
export function stroopsToXLM(stroops: number): string {
  const xlm = stroops / STROOPS_PER_XLM;
  return xlm.toFixed(7).replace(/\.?0+$/, ''); // Remove trailing zeros
}

/**
 * Convert XLM to stroops
 * @param xlm - Amount in XLM
 * @returns Amount in stroops
 */
export function xlmToStroops(xlm: number): number {
  return Math.round(xlm * STROOPS_PER_XLM);
}

/**
 * Extract fee from backend prepare response
 * Prefers explicit fee field over parsing XDR
 * @param prepareResponse - Response from backend prepare endpoint
 * @returns Fee information in stroops and XLM
 */
export function extractFeeFromPrepareResponse(prepareResponse: {
  xdr: string;
  networkPassphrase: string;
  fee?: string | number;
}): { stroops: number; xlm: string } {
  // Prefer explicit fee field if available
  if (prepareResponse.fee != null) {
    const feeStroops =
      typeof prepareResponse.fee === 'string'
        ? parseInt(prepareResponse.fee, 10)
        : prepareResponse.fee;

    if (isNaN(feeStroops)) {
      throw new Error('Invalid fee value in prepare response');
    }

    return {
      stroops: feeStroops,
      xlm: stroopsToXLM(feeStroops),
    };
  }

  // Fallback to parsing XDR (not yet implemented)
  return parseSorobanFee(prepareResponse.xdr, prepareResponse.networkPassphrase);
}
