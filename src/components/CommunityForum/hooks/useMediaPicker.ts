import { useState } from 'react';
import { Alert } from 'react-native';
import { UI_MESSAGES } from '../constants';

export const useMediaPicker = () => {
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async (): Promise<void> => {
    try {
      // Dynamically require to avoid type resolution error if not installed
      // @ts-ignore
      const ImagePicker = require('expo-image-picker');

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', UI_MESSAGES.PERMISSION_REQUIRED);
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length) {
        setMediaUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', UI_MESSAGES.IMAGE_PICKER_UNAVAILABLE);
    }
  };

  const clearMedia = () => {
    setMediaUri(null);
  };

  return {
    mediaUri,
    uploading,
    setUploading,
    pickImage,
    clearMedia,
  };
};
