import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';

type Props = {
  progress: number; // 0-100
};

const ProgressBar = ({ progress }: Props) => {
  return (
    <View style={styles.container}>
      <View style={[styles.progress, { width: `${progress}%` }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 12,
    width: '100%',
    backgroundColor: Colors.borderLight,
    borderRadius: 6,
    marginBottom: 8,
  },
  progress: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: 6,
  },
});

export default ProgressBar;
