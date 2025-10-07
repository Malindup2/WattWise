import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { Colors } from '../constants/Colors';
import CommunityForum from '../components/CommunityForum';

const ForumScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.backgroundSecondary} />
      <View style={styles.content}>
        <CommunityForum />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.backgroundSecondary },
  content: { flex: 1 },
});

export default ForumScreen;
