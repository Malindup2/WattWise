import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/Colors';

type Props = {
  energy: number;
  money: number;
};

const EnergyEstimate = ({ energy, money }: Props) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Estimated Savings</Text>
      <Text style={styles.text}>💡 Energy: {energy} kWh</Text>
      <Text style={styles.text}>💰 Money: ${money}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 14,
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  title: {
    fontWeight: '700',
    fontSize: 16,
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  text: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});

export default EnergyEstimate;
