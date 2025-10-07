import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { Colors } from '../constants/Colors';

const PredictiveModelScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.backgroundSecondary} />
      <View style={styles.content}>
        <Text style={styles.title}>Predictive Model</Text>
        <Text style={styles.subtitle}>Coming soon…</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundSecondary },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 14, color: Colors.textSecondary },
});

export default PredictiveModelScreen;
