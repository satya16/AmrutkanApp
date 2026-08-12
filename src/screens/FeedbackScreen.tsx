import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { API_BASE_URL } from '../config';

const MAX_MESSAGE_LEN = 3000;
const MAX_CONTACT_LEN = 200;

export function FeedbackScreen() {
  const { colors } = useTheme();
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      Alert.alert('कृपया अभिप्राय लिहा');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, contact: contact.trim(), website: '', source: 'app' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `feedback -> ${res.status}`);
      }
      Alert.alert('धन्यवाद!', 'तुमचा अभिप्राय पाठवला गेला आहे.');
      setMessage('');
      setContact('');
    } catch {
      Alert.alert('अभिप्राय पाठवता आला नाही', 'कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={[styles.label, { color: colors.text }]}>तुमचा अभिप्राय</Text>
      <TextInput
        style={[
          styles.textArea,
          { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
        ]}
        placeholder="इथे लिहा..."
        placeholderTextColor={colors.textSecondary}
        value={message}
        onChangeText={setMessage}
        maxLength={MAX_MESSAGE_LEN}
        multiline
        textAlignVertical="top"
      />

      <Text style={[styles.label, { color: colors.text }]}>संपर्क (ऐच्छिक)</Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
        ]}
        placeholder="ईमेल किंवा फोन नंबर"
        placeholderTextColor={colors.textSecondary}
        value={contact}
        onChangeText={setContact}
        maxLength={MAX_CONTACT_LEN}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <Pressable
        style={[styles.submitButton, { backgroundColor: colors.accent }, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}>
        {submitting ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.submitText}>पाठवा</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    minHeight: 120,
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 24,
  },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitText: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
});
