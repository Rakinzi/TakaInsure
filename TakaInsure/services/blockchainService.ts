import { ethers } from 'ethers';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Contract ABI (Application Binary Interface)
// This would be generated when you compile your Solidity contract
// This is a simplified version for demonstration purposes
const CONTRACT_ABI = [
  // Policy functions
  "function createPolicy(address payable _policyholder, string memory _policyHolderId, uint8 _packageType, uint256 _coverageAmount, uint256 _premium, uint256 _durationDays, string memory _metadataURI) public returns (uint256)",
  "function payPremium(uint256 _policyId) public payable",
  "function cancelPolicy(uint256 _policyId) public",
  "function getPolicyDetails(uint256 _policyId) public view returns (tuple(uint256 id, address policyholder, string policyHolderId, uint8 packageType, uint256 coverageAmount, uint256 premium, uint256 startDate, uint256 endDate, uint8 status, string metadataURI))",
  "function getPolicyholderPolicies(address _policyholder) public view returns (uint256[] memory)",
  
  // Claim functions
  "function fileClaim(uint256 _policyId, string memory _claimType, string memory _incidentDescription, uint256 _claimAmount, string memory _evidenceURI) public returns (uint256)",
  "function updateClaimWithAIAssessment(uint256 _claimId, uint8 _status, string memory _aiAssessmentResult) public",
  "function payClaim(uint256 _claimId) public payable",
  "function getClaimDetails(uint256 _claimId) public view returns (tuple(uint256 id, uint256 policyId, address claimant, string claimType, string incidentDescription, uint256 claimAmount, uint256 filingDate, uint8 status, string evidenceURI, string aiAssessmentResult))",
  "function getPolicyholderClaims(address _policyholder) public view returns (uint256[] memory)",
  
  // Events
  "event PolicyCreated(uint256 indexed policyId, address indexed policyholder, uint256 coverageAmount)",
  "event PolicyUpdated(uint256 indexed policyId, uint8 status)",
  "event PremiumPaid(uint256 indexed policyId, address indexed policyholder, uint256 amount)",
  "event ClaimFiled(uint256 indexed claimId, uint256 indexed policyId, address indexed claimant, uint256 amount)",
  "event ClaimStatusUpdated(uint256 indexed claimId, uint8 status)",
  "event ClaimPaid(uint256 indexed claimId, address indexed claimant, uint256 amount)"
];

// Package types mapping
const PackageType = {
  Basic: 0,
  Standard: 1,
  Premium: 2
};

// Claim status mapping
const ClaimStatus = {
  Pending: 0,
  UnderReview: 1,
  Approved: 2,
  Rejected: 3,
  Paid: 4
};

// Policy status mapping
const PolicyStatus = {
  Active: 0,
  Expired: 1,
  Cancelled: 2
};

// Define event types for better TypeScript support
interface BlockchainEvent {
  blockNumber: number;
  transactionIndex: number;
  transactionHash: string;
  event: string;
  args: Record<string, any>;
}

// Define type for the log structure from ethers
interface LogDescription {
  name: string;
  args: Record<string, any>;
}

// Define type for ethereum logs
interface Log {
  blockNumber: number;
  blockHash: string;
  transactionIndex: number;
  removed: boolean;
  address: string;
  data: string;
  topics: string[];
  transactionHash: string;
  logIndex: number;
}

class BlockchainService {
  private provider: ethers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;
  private contract: ethers.Contract | null = null;
  private contractAddress: string = '';
  private isInitialized: boolean = false;
  
  // Initialize the blockchain service
  async initialize(rpcUrl: string, contractAddress: string): Promise<boolean> {
    try {
      console.log('Initializing blockchain service...');
      
      // Setup provider (for reading blockchain data)
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.contractAddress = contractAddress;
      
      // Setup contract interface (for reading only at this point)
      this.contract = new ethers.Contract(
        contractAddress,
        CONTRACT_ABI,
        this.provider
      );
      
      // Check if contract is accessible
      await this.contract.policyCounter();
      
      this.isInitialized = true;
      console.log('Blockchain service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
      return false;
    }
  }
  
  // Setup wallet for signing transactions
  async setupWallet(privateKey: string): Promise<boolean> {
    try {
      if (!this.provider || !this.isInitialized) {
        throw new Error('Blockchain service not initialized');
      }
      
      // Create wallet with private key
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      
      // Connect contract to wallet for signing transactions
      this.contract = new ethers.Contract(
        this.contractAddress,
        CONTRACT_ABI,
        this.wallet
      );
      
      console.log('Wallet setup successful');
      return true;
    } catch (error) {
      console.error('Failed to setup wallet:', error);
      return false;
    }
  }
  
  // Create a new policy on the blockchain
  async createPolicy(
    policyholderAddress: string, 
    policyHolderId: string,
    packageType: 'Basic' | 'Standard' | 'Premium',
    coverageAmount: number,
    premium: number,
    durationDays: number,
    metadataURI: string
  ): Promise<{ success: boolean; policyId?: string; transactionHash?: string; error?: string }> {
    try {
      if (!this.contract || !this.wallet) {
        throw new Error('Blockchain service not fully initialized');
      }
      
      console.log(`Creating policy for policyholder: ${policyholderAddress}`);
      
      // Convert coverage and premium to wei (assuming they're provided in ETH)
      const coverageAmountWei = ethers.parseEther(coverageAmount.toString());
      const premiumWei = ethers.parseEther(premium.toString());
      
      // Call contract method
      const tx = await this.contract.createPolicy(
        policyholderAddress,
        policyHolderId,
        PackageType[packageType],
        coverageAmountWei,
        premiumWei,
        durationDays,
        metadataURI
      );
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt not available');
      }
      
      // Find the PolicyCreated event to get the policy ID
      const events = receipt.logs.map((log: Log) => {
        try {
          return this.contract?.interface.parseLog({
            topics: log.topics as string[],
            data: log.data
          });
        } catch (e: unknown) {
          return null;
        }
      }).filter(Boolean);
      
      const event = events.find((e:any) => e?.name === 'PolicyCreated');
      const policyId = event?.args[0].toString();
      
      console.log(`Policy created with ID: ${policyId}`);
      
      return {
        success: true,
        policyId,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Failed to create policy:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // File a claim on the blockchain
  async fileClaim(
    policyId: string,
    claimType: string,
    incidentDescription: string,
    claimAmount: number,
    evidenceURI: string
  ): Promise<{ success: boolean; claimId?: string; transactionHash?: string; error?: string }> {
    try {
      if (!this.contract || !this.wallet) {
        throw new Error('Blockchain service not fully initialized');
      }
      
      console.log(`Filing claim for policy ID: ${policyId}`);
      
      // Convert claim amount to wei (assuming it's provided in ETH)
      const claimAmountWei = ethers.parseEther(claimAmount.toString());
      
      // Call contract method
      const tx = await this.contract.fileClaim(
        policyId,
        claimType,
        incidentDescription,
        claimAmountWei,
        evidenceURI
      );
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt not available');
      }
      
      // Find the ClaimFiled event to get the claim ID
      const events = receipt.logs.map((log: Log) => {
        try {
          return this.contract?.interface.parseLog({
            topics: log.topics as string[],
            data: log.data
          });
        } catch (e: unknown) {
          return null;
        }
      }).filter(Boolean);
      
      const event = events.find((e:any) => e?.name === 'ClaimFiled');
      const claimId = event?.args[0].toString();
      
      console.log(`Claim filed with ID: ${claimId}`);
      
      return {
        success: true,
        claimId,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Failed to file claim:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // Update claim with AI assessment
  async updateClaimWithAIAssessment(
    claimId: string,
    status: 'Pending' | 'UnderReview' | 'Approved' | 'Rejected' | 'Paid',
    aiAssessmentResult: string
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      if (!this.contract || !this.wallet) {
        throw new Error('Blockchain service not fully initialized');
      }
      
      console.log(`Updating claim ${claimId} with AI assessment`);
      
      // Call contract method
      const tx = await this.contract.updateClaimWithAIAssessment(
        claimId,
        ClaimStatus[status],
        aiAssessmentResult
      );
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt not available');
      }
      
      console.log(`Claim ${claimId} updated with AI assessment`);
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Failed to update claim with AI assessment:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // Pay a claim
  async payClaim(
    claimId: string,
    amount: number
  ): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    try {
      if (!this.contract || !this.wallet) {
        throw new Error('Blockchain service not fully initialized');
      }
      
      console.log(`Paying claim ${claimId}`);
      
      // Convert amount to wei (assuming it's provided in ETH)
      const amountWei = ethers.parseEther(amount.toString());
      
      // Call contract method
      const tx = await this.contract.payClaim(claimId, {
        value: amountWei
      });
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt not available');
      }
      
      console.log(`Claim ${claimId} paid`);
      
      return {
        success: true,
        transactionHash: receipt.hash
      };
    } catch (error: any) {
      console.error('Failed to pay claim:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  // Get policy details
  async getPolicyDetails(policyId: string): Promise<any> {
    try {
      if (!this.contract) {
        throw new Error('Blockchain service not initialized');
      }
      
      const policy = await this.contract.getPolicyDetails(policyId);
      
      // Format the policy data
      const formattedPolicy = {
        id: policy[0].toString(),
        policyholder: policy[1],
        policyHolderId: policy[2],
        packageType: Object.keys(PackageType)[policy[3]],
        coverageAmount: ethers.formatEther(policy[4]),
        premium: ethers.formatEther(policy[5]),
        startDate: new Date(Number(policy[6]) * 1000).toISOString(),
        endDate: new Date(Number(policy[7]) * 1000).toISOString(),
        status: Object.keys(PolicyStatus)[policy[8]],
        metadataURI: policy[9]
      };
      
      return formattedPolicy;
    } catch (error) {
      console.error('Failed to get policy details:', error);
      throw error;
    }
  }
  
  // Get claim details
  async getClaimDetails(claimId: string): Promise<any> {
    try {
      if (!this.contract) {
        throw new Error('Blockchain service not initialized');
      }
      
      const claim = await this.contract.getClaimDetails(claimId);
      
      // Format the claim data
      const formattedClaim = {
        id: claim[0].toString(),
        policyId: claim[1].toString(),
        claimant: claim[2],
        claimType: claim[3],
        incidentDescription: claim[4],
        claimAmount: ethers.formatEther(claim[5]),
        filingDate: new Date(Number(claim[6]) * 1000).toISOString(),
        status: Object.keys(ClaimStatus)[claim[7]],
        evidenceURI: claim[8],
        aiAssessmentResult: claim[9]
      };
      
      return formattedClaim;
    } catch (error) {
      console.error('Failed to get claim details:', error);
      throw error;
    }
  }
  
  // Get all policies for a policyholder
  async getPolicyholderPolicies(policyholderAddress: string): Promise<string[]> {
    try {
      if (!this.contract) {
        throw new Error('Blockchain service not initialized');
      }
      
      const policyIds = await this.contract.getPolicyholderPolicies(policyholderAddress);
      return policyIds.map((id: bigint) => id.toString());
    } catch (error) {
      console.error('Failed to get policyholder policies:', error);
      throw error;
    }
  }
  
  // Get all claims for a policyholder
  async getPolicyholderClaims(policyholderAddress: string): Promise<string[]> {
    try {
      if (!this.contract) {
        throw new Error('Blockchain service not initialized');
      }
      
      const claimIds = await this.contract.getPolicyholderClaims(policyholderAddress);
      return claimIds.map((id: bigint) => id.toString());
    } catch (error) {
      console.error('Failed to get policyholder claims:', error);
      throw error;
    }
  }
  
  // Get blockchain transaction history for a policy or claim
  async getTransactionHistory(id: string, type: 'policy' | 'claim'): Promise<any[]> {
    try {
      if (!this.contract || !this.provider) {
        throw new Error('Blockchain service not initialized');
      }
      
      // For ethers v6, we need to use a different approach for event filtering
      const eventNames: string[] = [];
      if (type === 'policy') {
        eventNames.push('PolicyCreated', 'PolicyUpdated', 'PremiumPaid');
      } else {
        eventNames.push('ClaimFiled', 'ClaimStatusUpdated', 'ClaimPaid');
      }
      
      // Fetch blocks for the past month (adjust as needed)
      const currentBlock = await this.provider.getBlockNumber();
      const startBlock = Math.max(0, currentBlock - 1000000); // Roughly a month of blocks
      
      // Store all events
      const allEvents: any[] = [];
      
      // Create filter for the contract address
      const filter = {
        address: this.contractAddress,
        fromBlock: startBlock,
        toBlock: 'latest'
      };
      
      // Get all logs for the contract
      const logs = await this.provider.getLogs(filter);
      
      // Parse the logs into events if they match our event names
      for (const log of logs) {
        try {
          const parsedLog = this.contract?.interface.parseLog({
            topics: log.topics as string[],
            data: log.data
          });
          
          if (parsedLog && eventNames.includes(parsedLog.name)) {
            // Check if this event is related to our specific ID
            // The ID is typically the first indexed parameter (args[0])
            if (parsedLog.args[0].toString() === id) {
              allEvents.push({
                ...log,
                event: parsedLog.name,
                args: parsedLog.args
              });
            }
          }
        } catch (e: unknown) {
          console.error('Error parsing log:', e);
        }
      }
      
      // Sort events by block number and transaction index
      allEvents.sort((a, b) => {
        if (a.blockNumber !== b.blockNumber) {
          return a.blockNumber - b.blockNumber;
        }
        return a.transactionIndex - b.transactionIndex;
      });
      
      // Format the events
      const formattedEvents = await Promise.all(allEvents.map(async (event) => {
        const block = await this.provider!.getBlock(event.blockNumber);
        
        return {
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          timestamp: block?.timestamp ? new Date(Number(block.timestamp) * 1000).toISOString() : new Date().toISOString(),
          eventName: event.event,
          data: event.args
        };
      }));
      
      return formattedEvents;
    } catch (error) {
      console.error('Failed to get transaction history:', error);
      throw error;
    }
  }
  
  // Helper method to create a mock blockchain transaction for demo purposes
  async createMockTransaction(type: string): Promise<{
    success: boolean;
    transactionHash: string;
    blockNumber: number;
    timestamp: string;
  }> {
    // Simulate a delay to mimic blockchain confirmation time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate mock transaction hash
    const transactionHash = '0x' + Math.random().toString(16).substring(2, 42);
    
    return {
      success: true,
      transactionHash,
      blockNumber: Math.floor(Math.random() * 1000000) + 10000000,
      timestamp: new Date().toISOString(),
    };
  }
}

export const blockchainService = new BlockchainService();

// Export types and enums for use in the app
export { PackageType, ClaimStatus, PolicyStatus };

export default blockchainService;