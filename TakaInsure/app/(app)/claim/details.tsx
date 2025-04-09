import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Image, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getClaimById } from '../../../services/claimService';
import { getApiUrl } from '../../../services/networkService';

export default function ClaimDetailsScreen() {
  const router = useRouter();
  const { claimId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [claim, setClaim] = useState<any>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    if (claimId) {
      loadClaimDetails(claimId as string);
    }
  }, [claimId]);

  const loadClaimDetails = async (id: string) => {
    try {
      setLoading(true);
      const claimData = await getClaimById(id);
      setClaim(claimData);
      
      if (claimData) {
        // Extract image URLs from evidence_urls
        parseEvidenceUrls(claimData.evidence_urls);
      }
    } catch (error) {
      console.error('Error loading claim details:', error);
      Alert.alert(
        'Error',
        'Could not load claim details. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };
  
  const parseEvidenceUrls = async (evidenceUrls: any) => {
    try {
      if (!evidenceUrls) return;
      
      let urls: string[] = [];
      
      // If evidence_urls is a string, try to parse it as JSON
      if (typeof evidenceUrls === 'string') {
        try {
          const parsedData = JSON.parse(evidenceUrls);
          if (parsedData.images && Array.isArray(parsedData.images)) {
            urls = parsedData.images;
          }
        } catch (e) {
          console.error('Error parsing evidence_urls JSON:', e);
        }
      } 
      // If it's already an object
      else if (evidenceUrls.images && Array.isArray(evidenceUrls.images)) {
        urls = evidenceUrls.images;
      }
      
      // Convert relative URLs to absolute URLs
      const apiUrl = await getApiUrl();
      const baseUrl = apiUrl.includes('/api') ? apiUrl.split('/api')[0] : apiUrl;
      
      const fullUrls = urls.map(url => {
        if (url.startsWith('http')) {
          return url;
        } else if (url.startsWith('/api')) {
          return `${baseUrl}${url}`;
        } else {
          return `${baseUrl}/${url}`;
        }
      });
      
      setImageUrls(fullUrls);
    } catch (error) {
      console.error('Error processing evidence URLs:', error);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'paid':
        return 'bg-purple-100 text-purple-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-light">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#8E1616" />
          <Text className="text-gray-600 mt-4">Loading claim details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!claim) {
    return (
      <SafeAreaView className="flex-1 bg-light">
        <View className="flex-1 justify-center items-center p-6">
          <Text className="text-primary text-xl font-bold mb-2">Claim Not Found</Text>
          <Text className="text-center text-gray-600 mb-6">
            The claim you're looking for could not be found or may have been removed.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/claim/list')}
            className="bg-secondary px-6 py-3 rounded-xl"
          >
            <Text className="text-white font-bold">Go Back to Claims</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Parse analysis data from evidence_urls if available
  let analysisData = null;
  if (claim.evidence_urls) {
    try {
      const evidenceData = typeof claim.evidence_urls === 'string' 
        ? JSON.parse(claim.evidence_urls) 
        : claim.evidence_urls;
        
      if (evidenceData.analysis) {
        analysisData = evidenceData.analysis;
      }
    } catch (e) {
      console.error('Error parsing analysis data:', e);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-light">
      <ScrollView className="flex-1 p-6">
        <Text className="text-primary text-2xl font-bold mb-2">Claim Details</Text>
        <Text className="text-gray-600 mb-6">
          Review information about your insurance claim
        </Text>

        {/* Claim Overview Card */}
        <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
          <View className="flex-row justify-between mb-2">
            <Text className="text-primary font-bold text-lg">Claim #{claim.claim_id.substring(0, 8)}</Text>
            <View className={`px-3 py-1 rounded-full ${getStatusColor(claim.claim_status)}`}>
              <Text className={`${getStatusColor(claim.claim_status)} font-medium`}>
                {claim.claim_status.charAt(0).toUpperCase() + claim.claim_status.slice(1).toLowerCase()}
              </Text>
            </View>
          </View>
          
          <Text className="text-gray-700 mb-4">{claim.incident_description}</Text>
          
          <View className="flex-row justify-between mb-3">
            <Text className="text-primary font-medium">Date of Incident</Text>
            <Text className="text-gray-700">{formatDate(claim.incident_date)}</Text>
          </View>
          
          <View className="flex-row justify-between mb-3">
            <Text className="text-primary font-medium">Location</Text>
            <Text className="text-gray-700">{claim.incident_location || 'Not specified'}</Text>
          </View>
          
          <View className="flex-row justify-between mb-3">
            <Text className="text-primary font-medium">Claim Amount</Text>
            <Text className="text-secondary font-bold">
              ${claim.claim_amount ? claim.claim_amount.toLocaleString() : 'Pending'}
            </Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-primary font-medium">Date Filed</Text>
            <Text className="text-gray-700">{formatDate(claim.created_at)}</Text>
          </View>
        </View>

        {/* Policy Information */}
        {claim.policy && (
          <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
            <Text className="text-primary font-bold text-lg mb-3">Policy Information</Text>
            
            <View className="flex-row justify-between mb-3">
              <Text className="text-primary font-medium">Policy ID</Text>
              <Text className="text-gray-700">{claim.policy.policy_id.substring(0, 8)}...</Text>
            </View>
            
            <View className="flex-row justify-between mb-3">
              <Text className="text-primary font-medium">Coverage Type</Text>
              <Text className="text-gray-700">{claim.policy.insurance_product?.product_name || 'Standard Coverage'}</Text>
            </View>
            
            <View className="flex-row justify-between">
              <Text className="text-primary font-medium">Coverage Amount</Text>
              <Text className="text-secondary font-bold">${claim.policy.coverage_amount?.toLocaleString() || 'N/A'}</Text>
            </View>
          </View>
        )}

        {/* Vehicle Information */}
        {claim.vehicle && (
          <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
            <Text className="text-primary font-bold text-lg mb-3">Vehicle Information</Text>
            
            <View className="flex-row justify-between mb-3">
              <Text className="text-primary font-medium">Make & Model</Text>
              <Text className="text-gray-700">{claim.vehicle.car_make} {claim.vehicle.car_model}</Text>
            </View>
            
            <View className="flex-row justify-between">
              <Text className="text-primary font-medium">License Plate</Text>
              <Text className="text-gray-700">{claim.vehicle.plate_number}</Text>
            </View>
          </View>
        )}

        {/* Evidence Images */}
        {imageUrls.length > 0 && (
          <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
            <Text className="text-primary font-bold text-lg mb-3">Evidence</Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
              {imageUrls.map((uri, index) => (
                <Image
                  key={index}
                  source={{ uri }}
                  className="w-40 h-40 rounded-lg mr-2"
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Analysis Results */}
        {analysisData && (
          <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
            <Text className="text-primary font-bold text-lg mb-3">Damage Analysis</Text>
            
            <View className={`p-3 rounded-lg mb-3 ${
              analysisData.severity === 'minor' ? 'bg-green-100' :
              analysisData.severity === 'moderate' ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              <Text className={`font-medium ${
                analysisData.severity === 'minor' ? 'text-green-800' :
                analysisData.severity === 'moderate' ? 'text-yellow-800' : 'text-red-800'
              }`}>
                {analysisData.severity.charAt(0).toUpperCase() + analysisData.severity.slice(1)} damage detected
              </Text>
            </View>
            
            <View className="flex-row justify-between mb-3">
              <Text className="text-primary font-medium">Estimated Repair Cost</Text>
              <Text className="text-secondary font-bold">${analysisData.estimatedCost?.toLocaleString() || 'N/A'}</Text>
            </View>
            
            {analysisData.affectedAreas && analysisData.affectedAreas.length > 0 && (
              <View>
                <Text className="text-primary font-medium mb-2">Affected Areas:</Text>
                {analysisData.affectedAreas.map((area: string, index: number) => (
                  <Text key={index} className="text-gray-700 ml-3 mb-1">• {area}</Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Claim Status Timeline */}
        <View className="bg-white rounded-xl p-5 shadow-sm mb-6">
          <Text className="text-primary font-bold text-lg mb-3">Claim Timeline</Text>
          
          <View className="flex-row mb-3">
            <View className="w-2 h-2 rounded-full bg-green-500 mt-2 mr-3" />
            <View className="flex-1">
              <Text className="text-primary font-medium">Claim Submitted</Text>
              <Text className="text-gray-500 text-sm">{formatDate(claim.created_at)}</Text>
            </View>
          </View>
          
          {claim.claim_status !== 'pending' && (
            <View className="flex-row mb-3">
              <View className="w-2 h-2 rounded-full bg-blue-500 mt-2 mr-3" />
              <View className="flex-1">
                <Text className="text-primary font-medium">Claim Processing</Text>
                <Text className="text-gray-500 text-sm">Your claim is being reviewed</Text>
              </View>
            </View>
          )}
          
          {(claim.claim_status === 'approved' || claim.claim_status === 'paid') && (
            <View className="flex-row mb-3">
              <View className="w-2 h-2 rounded-full bg-green-500 mt-2 mr-3" />
              <View className="flex-1">
                <Text className="text-primary font-medium">Claim Approved</Text>
                <Text className="text-gray-500 text-sm">Your claim has been approved</Text>
              </View>
            </View>
          )}
          
          {claim.claim_status === 'paid' && (
            <View className="flex-row">
              <View className="w-2 h-2 rounded-full bg-purple-500 mt-2 mr-3" />
              <View className="flex-1">
                <Text className="text-primary font-medium">Payment Completed</Text>
                <Text className="text-gray-500 text-sm">Claim payment has been processed</Text>
              </View>
            </View>
          )}
          
          {claim.claim_status === 'rejected' && (
            <View className="flex-row">
              <View className="w-2 h-2 rounded-full bg-red-500 mt-2 mr-3" />
              <View className="flex-1">
                <Text className="text-primary font-medium">Claim Rejected</Text>
                <Text className="text-gray-500 text-sm">Your claim has been rejected</Text>
              </View>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-primary p-4 rounded-xl items-center mb-6"
        >
          <Text className="text-white font-bold">Back to Claims</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}