import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { processDailyPremiumPayment } from '../../services/paymentService';

interface PremiumPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  amount: number;
}

const PremiumPaymentModal: React.FC<PremiumPaymentModalProps> = ({
  visible,
  onClose,
  onSuccess,
  amount,
}) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    try {
      setLoading(true);
      const result = await processDailyPremiumPayment();
      
      if (result.success) {
        Alert.alert(
          'Payment Successful',
          'Your daily premium payment has been processed successfully.',
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
      console.error('Error processing payment:', error);
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
            Daily Premium Payment
          </Text>
          
          <Text className="text-gray-700 mb-6 text-center">
            Your daily premium payment of {formatAmount(amount)} is due today. Would you like to process it now?
          </Text>
          
          <View className="bg-secondary/10 p-4 rounded-lg mb-6">
            <Text className="text-secondary font-medium text-center">
              Payment will be processed via EcoCash
            </Text>
          </View>
          
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

export default PremiumPaymentModal;