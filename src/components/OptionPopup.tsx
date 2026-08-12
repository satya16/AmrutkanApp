import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

export type PopupOption<T extends string | number> = {
  value: T;
  label: string;
};

type Props<T extends string | number> = {
  visible: boolean;
  title: string;
  options: PopupOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
  onClose: () => void;
};

export function OptionPopup<T extends string | number>({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}: Props<T>) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 16) },
        ]}>
        <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
        {options.map(option => (
          <Pressable
            key={String(option.value)}
            style={[styles.row, { borderTopColor: colors.border }]}
            onPress={() => onSelect(option.value)}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>{option.label}</Text>
            {option.value === selected && (
              <Text style={[styles.check, { color: colors.accent }]}>✓</Text>
            )}
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 8,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  rowLabel: { fontSize: 15 },
  check: { fontSize: 16, fontWeight: '700' },
});
