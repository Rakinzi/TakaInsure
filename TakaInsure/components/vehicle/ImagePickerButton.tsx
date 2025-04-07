import React from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

interface ImagePickerButtonProps {
    title: string;
    subtitle?: string;
    imageUri: string | null;
    onImageSelected: (uri: string) => void;
    loading?: boolean;
    loadingText?: string;
    height?: number;
}

const ImagePickerButton: React.FC<ImagePickerButtonProps> = ({
    title,
    subtitle,
    imageUri,
    onImageSelected,
    loading = false,
    loadingText = 'Processing...',
    height = 200,
}) => {
    const takePhoto = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                alert('We need camera permission to take photos');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                onImageSelected(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error taking photo:', error);
            alert('Failed to take photo. Please try again.');
        }
    };

    const selectImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                alert('We need media library permission to select photos');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                onImageSelected(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error selecting image:', error);
            alert('Failed to select image. Please try again.');
        }
    };

    return (
        <View className="mb-4">
            <Text className="text-primary font-bold text-lg mb-2">{title}</Text>
            {subtitle && <Text className="text-gray-600 mb-3">{subtitle}</Text>}

            {imageUri ? (
                <View className="mb-3 relative">
                    <Image
                        source={{ uri: imageUri }}
                        className="w-full rounded-lg"
                        style={{ height }}
                        resizeMode="cover"
                    />
                    {loading && (
                        <View className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                            <ActivityIndicator size="large" color="#FFFFFF" />
                            <Text className="text-white mt-2">{loadingText}</Text>
                        </View>
                    )}
                </View>
            ) : (
                <View
                    className="bg-gray-200 w-full rounded-lg mb-3 items-center justify-center"
                    style={{ height }}
                >
                    <Text className="text-gray-500">No image selected</Text>
                </View>
            )}

            <View className="flex-row justify-between space-x-4">
                <TouchableOpacity
                    onPress={takePhoto}
                    className="bg-primary w-[75%] p-3 rounded-lg items-center"
                    disabled={loading}
                >
                    <Text className="text-white font-medium">Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={selectImage}
                    className="bg-secondary w-[75%] p-3 rounded-lg items-center"
                    disabled={loading}
                >
                    <Text className="text-white font-medium">From Gallery</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default ImagePickerButton;