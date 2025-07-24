import { ethers } from 'ethers';
import { RLNInstance, KeystoreEntity } from '@waku/rln';
import { ERC20_ABI, LINEA_SEPOLIA_CONFIG } from '../../utils/network';
import { RegistrationResult, OperationResult, MembershipInfoExtended } from './types';
import { ensureCorrectNetwork, getUserAddress } from './wallet';
import { validateRateLimit } from './rateLimits';

/**
 * Register a new RLN membership
 */
export const registerMembership = async (
  rln: RLNInstance | null,
  isStarted: boolean,
  signer: ethers.Signer | null,
  rateLimit: number,
  rateMinLimit: number,
  rateMaxLimit: number,
  saveCredentialsToKeystore: (credentials: KeystoreEntity, password: string) => Promise<string>,
  saveOptions?: { password: string }
): Promise<RegistrationResult> => {
  console.log("registerMembership called with rate limit:", rateLimit);
  
  if (!rln || !isStarted) {
    return { success: false, error: 'RLN not initialized or not started' };
  }
  
  if (!signer) {
    return { success: false, error: 'No signer available' };
  }
  
  try {
    // Validate rate limit
    const validation = validateRateLimit(rateLimit, rateMinLimit, rateMaxLimit);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }
    
    await rln.contract?.setRateLimit(rateLimit);
    
    // Ensure we're on the correct network
    const isOnLineaSepolia = await ensureCorrectNetwork(signer);
    if (!isOnLineaSepolia) {
      console.warn("Could not switch to Linea Sepolia network. Registration may fail.");
    }
    
    // Get user address and contract address
    const userAddress = await getUserAddress(signer);
    
    if (!rln.contract || !rln.contract.address) {
      return { success: false, error: "RLN contract address not available. Cannot proceed with registration." };
    }
    
    const contractAddress = rln.contract.address;
    const tokenAddress = LINEA_SEPOLIA_CONFIG.tokenAddress;
    
    // Create token contract instance
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      signer
    );
    
    // Check token balance
    const tokenBalance = await tokenContract.balanceOf(userAddress);
    if (tokenBalance.isZero()) {
      return { success: false, error: "You need tokens to register a membership. Your token balance is zero." };
    }
    
    // Check and approve token allowance if needed
    const currentAllowance = await tokenContract.allowance(userAddress, contractAddress);
    if (currentAllowance.eq(0)) {
      console.log("Requesting token approval...");
      
      // Approve a large amount (max uint256)
      const maxUint256 = ethers.constants.MaxUint256;
      
      try {
        const approveTx = await tokenContract.approve(contractAddress, maxUint256);
        console.log("Approval transaction submitted:", approveTx.hash);
        
        // Wait for the transaction to be mined
        await approveTx.wait(1);
        console.log("Token approval confirmed");
      } catch (approvalErr) {
        console.error("Error during token approval:", approvalErr);
        return { 
          success: false, 
          error: `Failed to approve token: ${approvalErr instanceof Error ? approvalErr.message : String(approvalErr)}` 
        };
      }
    } else {
      console.log("Token allowance already sufficient");
    }
    
    // Generate signature for identity
    const timestamp = Date.now();
    const message = `Sign this message to generate your RLN credentials ${timestamp}`;
    const signature = await signer.signMessage(message);
    
    // Register membership
    console.log("Registering membership...");
    console.log({signature})
    const credentials = await rln.registerMembership({
      signature: signature
    });
    console.log("Credentials:", credentials);
    
    // If we have save options, save to keystore
    let keystoreHash: string | undefined;
    if (saveOptions && saveOptions.password && credentials) {
      try {
        const credentialsEntity = credentials as KeystoreEntity;
        keystoreHash = await saveCredentialsToKeystore(credentialsEntity, saveOptions.password);
        console.log("Credentials saved to keystore with hash:", keystoreHash);
      } catch (saveErr) {
        console.error("Error saving credentials to keystore:", saveErr);
        // Continue without failing the overall registration
      }
    }
    
    return { 
      success: true, 
      credentials: credentials as KeystoreEntity, 
      keystoreHash 
    };
  } catch (err) {
    console.error("Error registering membership:", err);
    
    let errorMsg = "Failed to register membership";
    if (err instanceof Error) {
      errorMsg = err.message;
    }
    
    return { success: false, error: errorMsg };
  }
};

/**
 * Get membership information
 */
export const getMembershipInfo = async (
  rln: RLNInstance | null,
  hash: string,
  password: string,
  getDecryptedCredential: (hash: string, password: string) => Promise<KeystoreEntity | null>
): Promise<MembershipInfoExtended> => {
  if (!rln || !rln.contract) {
    throw new Error('RLN not initialized or contract not available');
  }

  const credential = await getDecryptedCredential(hash, password);
  if (!credential) {
    throw new Error('Could not decrypt credential');
  }

  try {
    const membershipInfo = await rln.contract.getMembershipInfo(credential.identity.IDCommitmentBigInt);
    if (!membershipInfo) {
      throw new Error('Could not fetch membership info');
    }
    return {
      ...membershipInfo,
      address: rln.contract.address,
      chainId: LINEA_SEPOLIA_CONFIG.chainId.toString(),
      treeIndex: Number(membershipInfo.index.toString()),
      rateLimit: Number(membershipInfo.rateLimit.toString())
    }
  } catch (error) {
    console.log("error", error);
    throw error;
  }
};

/**
 * Extend membership
 */
export const extendMembership = async (
  rln: RLNInstance | null,
  hash: string,
  password: string,
  getDecryptedCredential: (hash: string, password: string) => Promise<KeystoreEntity | null>
): Promise<OperationResult> => {
  try {
    if (!rln || !rln.contract) {
      throw new Error('RLN not initialized or contract not available');
    }

    const credential = await getDecryptedCredential(hash, password);
    if (!credential) {
      throw new Error('Could not decrypt credential');
    }

    await rln.contract.extendMembership(credential.identity.IDCommitmentBigInt);
    return { success: true };
  } catch (err) {
    console.error('Error extending membership:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to extend membership'
    };
  }
};

/**
 * Erase membership
 */
export const eraseMembership = async (
  rln: RLNInstance | null,
  hash: string,
  password: string,
  getDecryptedCredential: (hash: string, password: string) => Promise<KeystoreEntity | null>
): Promise<OperationResult> => {
  try {
    if (!rln || !rln.contract) {
      throw new Error('RLN not initialized or contract not available');
    }

    const credential = await getDecryptedCredential(hash, password);
    if (!credential) {
      throw new Error('Could not decrypt credential');
    }
    await rln.contract.eraseMembership(credential.identity.IDCommitmentBigInt);
    return { success: true };
  } catch (err) {
    console.error('Error erasing membership:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to erase membership'
    };
  }
};

/**
 * Withdraw deposit
 */
export const withdrawDeposit = async (
  rln: RLNInstance | null,
  signer: ethers.Signer | null,
  hash: string,
  password: string,
  getDecryptedCredential: (hash: string, password: string) => Promise<KeystoreEntity | null>
): Promise<OperationResult> => {
  try {
    if (!rln || !rln.contract) {
      throw new Error('RLN not initialized or contract not available');
    }

    const credential = await getDecryptedCredential(hash, password);
    if (!credential) {
      throw new Error('Could not decrypt credential');
    }

    // Get token address from config
    const tokenAddress = LINEA_SEPOLIA_CONFIG.tokenAddress;
    const userAddress = await signer?.getAddress();
    
    if (!userAddress) {
      throw new Error('No signer available');
    }
    
    // Call withdraw with token address and holder
    await rln.contract.withdraw(tokenAddress, userAddress);
    return { success: true };
  } catch (err) {
    console.error('Error withdrawing deposit:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to withdraw deposit'
    };
  }
}; 