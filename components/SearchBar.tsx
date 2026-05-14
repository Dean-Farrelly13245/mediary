import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppPressable from './AppPressable';
import { colors, radius, spacing } from '@/lib/theme';

interface Props {
  placeholder: string;
  onPress?: () => void;
  value: string;
  onChangeText: (text: string) => void;
}

const SearchBar = ({ placeholder, onPress, value, onChangeText }: Props) => {
  return (
    <View style={styles.container}>
      <Ionicons
        name="search-outline"
        size={22}
        color={colors.textMuted}
        style={{ marginRight: spacing.sm }}
      />
      <TextInput
        onPress={onPress}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        returnKeyType="search"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <AppPressable
          onPress={() => onChangeText('')}
          hitSlop={8}
          pressedScale={1}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          style={styles.clearBtn}
        >
          <Ionicons name="close-circle" size={18} color={colors.textDim} />
        </AppPressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    marginHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    marginLeft: spacing.xs,
  },
  clearBtn: {
    marginLeft: spacing.sm,
  },
});

export default SearchBar;
