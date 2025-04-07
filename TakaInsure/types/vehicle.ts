export interface VehicleInfo {
    id?: string;
    plateNumber: string;
    carMake: string;
    carModel: string;
    carYear?: string;
    carImageUri?: string;
    plateImageUri?: string;
    timestamp?: string;
    blockchainReference?: string;
    policyHolderId?: string;
  }
  
  export interface VehicleDetectionResult {
    make: string;
    model: string;
    year?: string;
    confidence: number;
  }
  
  export interface PlateDetectionResult {
    plateNumber: string;
    confidence: number;
  }
  
  export interface ImageUploadResponse {
    success: boolean;
    imageUrl?: string;
    error?: string;
  }
  
  export interface VehicleRegistrationResponse {
    success: boolean;
    vehicleId?: string;
    blockchainReference?: string;
    error?: string;
  }