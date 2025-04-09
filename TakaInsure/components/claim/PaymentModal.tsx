import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { processClaimPayment } from '../../services/paymentService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ClaimPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  claimId: string;
  policyId: string;
  amount: number;
  claimType: string;
}

const ClaimPaymentModal: React.FC<ClaimPaymentModalProps> = ({
  visible,
  onClose,
  onSuccess,
  claimId,
  policyId,
  amount,
  claimType,
}) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    try {
      setLoading(true);
      const result = await processClaimPayment(claimId, policyId, amount.toString());
      
      if (result.success) {
        // Update the last payment date to prevent additional prompts today
        const today = new Date().toISOString().split('T')[0];
        await AsyncStorage.setItem('lastPremiumPaymentDate', today);
        
        Alert.alert(
          'Payment Successful',
          'Your claim payment has been processed successfully.',
          [
            {
              text: 'OK',
              onPress: () => {
                onSuccess();
                onClose();
              },
            },
          ]
        );
      } else {
        Alert.alert(
          'Payment Failed',
          result.error || 'Failed to process your payment. Please try again.',
          [
            {
              text: 'OK',
              onPress: onClose,
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error processing claim payment:', error);
      Alert.alert(
        'Payment Error',
        'An unexpected error occurred. Please try again.',
        [
          {
            text: 'OK',
            onPress: onClose,
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const getPaymentMessage = () => {
    switch (claimType) {
      case 'car_accident':
        return 'To process your vehicle damage claim, a processing fee is required. This fee covers damage assessment and claim verification.';
      case 'property_damage':
        return 'To process your property damage claim, a processing fee is required. This fee covers property assessment and claim verification.';
      case 'personal_injury':
        return 'To process your personal injury claim, a processing fee is required. This fee covers medical assessment and claim verification.';
      default:
        return 'To process your claim, a processing fee is required. This fee covers claim assessment and verification.';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center p-6 bg-black bg-opacity-50">
        <View className="bg-white rounded-xl p-6 w-full max-w-sm">
          <Text className="text-primary text-xl font-bold mb-4 text-center">
            Claim Processing Fee
          </Text>
          
          <Text className="text-gray-700 mb-4 text-center">
            {getPaymentMessage()}
          </Text>
          
          <View className="bg-secondary/10 p-4 rounded-lg mb-4">
            <Text className="text-secondary font-medium text-center">
              Processing Fee: {formatAmount(amount)}
            </Text>
          </View>
          
          <Text className="text-gray-600 mb-6 text-center text-sm">
            Payment will be processed via EcoCash and the amount will be charged to your registered phone number.
          </Text>
          
          <View className="flex-row space-x-4">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 bg-gray-200 p-3 rounded-lg items-center"
              disabled={loading}
            >
              <Text className="text-gray-700 font-medium">Later</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handlePayment}
              className="flex-1 bg-secondary p-3 rounded-lg items-center"
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-white font-medium">Pay Now</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ClaimPaymentModal;