import React from 'react';
import { ActivityIndicator, ActivityIndicatorProps, StyleSheet, View, ViewStyle } from 'react-native';

interface SpinnerProps extends ActivityIndicatorProps {
  containerStyle?: ViewStyle;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'small', color = '#10b981', containerStyle, ...props }) => {
  return (
    <View style={[styles.container, containerStyle]}>
      <ActivityIndicator size={size} color={color} {...props} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Spinner;
