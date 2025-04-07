import os
import json
import logging
import hashlib
import time
from web3 import Web3
from web3.middleware import geth_poa_middleware
from eth_account import Account
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Get blockchain configuration from environment
BLOCKCHAIN_PROVIDER_URL = os.getenv("BLOCKCHAIN_PROVIDER_URL", "http://localhost:8545")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")
PRIVATE_KEY = os.getenv("BLOCKCHAIN_PRIVATE_KEY")
CHAIN_ID = int(os.getenv("CHAIN_ID", "1"))

# Constants for IPFS storage
IPFS_NODE_URL = os.getenv("IPFS_NODE_URL", "https://ipfs.infura.io:5001")
IPFS_PROJECT_ID = os.getenv("IPFS_PROJECT_ID")
IPFS_PROJECT_SECRET = os.getenv("IPFS_PROJECT_SECRET")

# Contract ABI (partial, focusing on vehicle-related functions)
CONTRACT_ABI = [
    {
        "inputs": [
            {"name": "_policyholder", "type": "address"},
            {"name": "_policyHolderId", "type": "string"},
            {"name": "_packageType", "type": "uint8"},
            {"name": "_coverageAmount", "type": "uint256"},
            {"name": "_premium", "type": "uint256"},
            {"name": "_durationDays", "type": "uint256"},
            {"name": "_metadataURI", "type": "string"}
        ],
        "name": "createPolicy",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]

# Initialize web3 connection
try:
    web3 = Web3(Web3.HTTPProvider(BLOCKCHAIN_PROVIDER_URL))
    web3.middleware_onion.inject(geth_poa_middleware, layer=0)
    logger.info(f"Connected to blockchain: {web3.is_connected()}")
    
    # Get contract instance
    if CONTRACT_ADDRESS:
        contract = web3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)
    else:
        logger.warning("Contract address not set - blockchain operations will be simulated")
        contract = None
        
    # Setup account from private key
    if PRIVATE_KEY:
        account = Account.from_key(PRIVATE_KEY)
        wallet_address = account.address
        logger.info(f"Wallet address: {wallet_address}")
    else:
        logger.warning("Private key not set - blockchain operations will be simulated")
        wallet_address = "0x0000000000000000000000000000000000000000"
        
except Exception as e:
    logger.error(f"Failed to initialize blockchain connection: {str(e)}")
    web3 = None
    contract = None
    wallet_address = None

def generate_metadata_hash(data):
    """Generate a unique hash for the metadata"""
    metadata_str = json.dumps(data, sort_keys=True)
    return hashlib.sha256(metadata_str.encode()).hexdigest()

def store_metadata_on_ipfs(data):
    """
    Store metadata on IPFS
    Returns the IPFS hash (CID)
    """
    logger.info("Storing metadata on IPFS")
    
    # Check if IPFS credentials are available
    if not IPFS_PROJECT_ID or not IPFS_PROJECT_SECRET:
        logger.warning("IPFS credentials not available - simulating IPFS storage")
        # Generate a simulated IPFS hash
        metadata_hash = generate_metadata_hash(data)
        return f"ipfs://{metadata_hash}"
        
    try:
        import ipfshttpclient
        client = ipfshttpclient.connect(IPFS_NODE_URL)
        
        # Convert data to JSON string
        json_data = json.dumps(data)
        
        # Add to IPFS
        result = client.add_str(json_data)
        return f"ipfs://{result}"
        
    except Exception as e:
        logger.error(f"IPFS storage error: {str(e)}")
        # Fall back to hash-based reference
        metadata_hash = generate_metadata_hash(data)
        return f"ipfs://{metadata_hash}"

def register_vehicle_on_blockchain(vehicle_data):
    """
    Register vehicle data on the blockchain
    Returns the transaction hash or a reference ID
    """
    logger.info(f"Registering vehicle {vehicle_data.get('id')} on blockchain")
    
    # Store metadata on IPFS or generate a reference
    metadata_uri = store_metadata_on_ipfs(vehicle_data)
    logger.info(f"Metadata URI: {metadata_uri}")
    
    # If blockchain connection is not available, simulate the transaction
    if not web3 or not contract or not PRIVATE_KEY:
        logger.warning("Blockchain connection not available - simulating transaction")
        # Generate a simulated transaction hash
        tx_hash = generate_metadata_hash(vehicle_data) + str(int(time.time()))
        return f"0x{tx_hash[:64]}"
    
    try:
        # Get policy holder address from vehicle data or use a default
        # In a real implementation, this would be linked to the user's wallet
        policyholder_address = vehicle_data.get('walletAddress', wallet_address)
        policyholder_id = vehicle_data.get('policyHolderId', vehicle_data.get('id'))
        
        # Convert numbers to wei values
        coverage_amount = web3.to_wei(1000, 'ether')  # Default coverage
        premium = web3.to_wei(50, 'ether')  # Default premium
        duration = 365  # Default duration in days
        
        # Prepare transaction
        nonce = web3.eth.get_transaction_count(wallet_address)
        
        # Create policy transaction
        tx = contract.functions.createPolicy(
            policyholder_address,
            policyholder_id,
            0,  # PackageType.Basic
            coverage_amount,
            premium,
            duration,
            metadata_uri
        ).build_transaction({
            'chainId': CHAIN_ID,
            'gas': 2000000,
            'gasPrice': web3.to_wei('50', 'gwei'),
            'nonce': nonce,
        })
        
        # Sign transaction
        signed_tx = web3.eth.account.sign_transaction(tx, PRIVATE_KEY)
        
        # Send transaction
        tx_hash = web3.eth.send_raw_transaction(signed_tx.rawTransaction)
        
        # Wait for receipt
        receipt = web3.eth.wait_for_transaction_receipt(tx_hash)
        
        if receipt.status == 1:
            logger.info(f"Transaction successful: {tx_hash.hex()}")
            return tx_hash.hex()
        else:
            logger.error(f"Transaction failed: {tx_hash.hex()}")
            raise Exception("Transaction failed")
            
    except Exception as e:
        logger.exception(f"Blockchain error: {str(e)}")
        # Fall back to simulated transaction hash
        tx_hash = generate_metadata_hash(vehicle_data) + str(int(time.time()))
        return f"0x{tx_hash[:64]}"

def get_vehicle_from_blockchain(transaction_hash):
    """
    Get vehicle data from the blockchain using transaction hash
    Returns the vehicle data
    """
    logger.info(f"Getting vehicle data for transaction {transaction_hash}")
    
    # If blockchain connection is not available, return simulated data
    if not web3:
        logger.warning("Blockchain connection not available - cannot retrieve data")
        return None
    
    try:
        # Get transaction receipt
        receipt = web3.eth.get_transaction_receipt(transaction_hash)
        
        if not receipt:
            logger.error(f"Transaction receipt not found for {transaction_hash}")
            return None
            
        # Parse events from receipt
        if contract:
            events = contract.events.PolicyCreated().process_receipt(receipt)
            
            if events:
                policy_id = events[0]['args']['policyId']
                logger.info(f"Found policy ID: {policy_id}")
                
                # Get policy details
                policy = contract.functions.getPolicyDetails(policy_id).call()
                
                if policy:
                    # Extract metadata URI
                    metadata_uri = policy[9]  # metadataURI field
                    
                    # If this is an IPFS URI, get the data from IPFS
                    if metadata_uri.startswith('ipfs://'):
                        try:
                            import ipfshttpclient
                            ipfs_hash = metadata_uri.replace('ipfs://', '')
                            client = ipfshttpclient.connect(IPFS_NODE_URL)
                            vehicle_data = json.loads(client.cat(ipfs_hash))
                            return vehicle_data
                        except Exception as ipfs_error:
                            logger.error(f"IPFS error: {str(ipfs_error)}")
                            return None
                
        # If we get here, we couldn't retrieve the vehicle data
        logger.warning(f"Could not retrieve vehicle data for {transaction_hash}")
        return None
        
    except Exception as e:
        logger.exception(f"Blockchain error: {str(e)}")
        return None