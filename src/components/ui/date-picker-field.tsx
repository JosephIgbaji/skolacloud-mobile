import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Modal } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Calendar, ChevronRight } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';

interface DatePickerFieldProps {
  label?: string;
  value: string; // YYYY-MM-DD format
  onChange: (dateStr: string) => void;
  placeholder?: string;
}

export function DatePickerField({ label, value, onChange, placeholder = 'Select Date' }: DatePickerFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  const parseDate = (str: string) => {
    if (!str) return new Date();
    const parts = str.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    const parsed = new Date(str);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };

  const currentDate = parseDate(value);

  const handleNativeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowPicker(false);
      return;
    }
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    if (selectedDate) {
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dd = String(selectedDate.getDate()).padStart(2, '0');
      onChange(`${yyyy}-${mm}-${dd}`);
    }
  };

  const formatDateDisplay = (str: string) => {
    if (!str) return placeholder;
    const parts = str.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      }
    }
    return str;
  };

  // Web Platform specific Date Picker rendering to eliminate Community DatePicker web warnings
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        {label && <ThemedText style={styles.label}>{label}</ThemedText>}
        <View style={styles.webInputWrapper}>
          <Calendar size={18} color="#38bdf8" style={{ marginRight: 8 }} />
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: value ? '#f8fafc' : '#64748b',
              fontSize: '14px',
              fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          />
        </View>
      </View>
    );
  }

  // Native iOS and Android DatePicker rendering
  return (
    <View style={styles.container}>
      {label && <ThemedText style={styles.label}>{label}</ThemedText>}
      <TouchableOpacity style={styles.triggerBtn} onPress={() => setShowPicker(true)}>
        <Calendar size={18} color="#38bdf8" style={{ marginRight: 8 }} />
        <ThemedText style={value ? styles.valueText : styles.placeholderText}>
          {formatDateDisplay(value)}
        </ThemedText>
        <ChevronRight size={16} color="#64748b" style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      {showPicker && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="fade" visible={showPicker} onRequestClose={() => setShowPicker(false)}>
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPicker(false)}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <ThemedText style={styles.modalTitle}>{label || 'Select Date'}</ThemedText>
                  <TouchableOpacity onPress={() => setShowPicker(false)}>
                    <ThemedText style={styles.doneText}>Done</ThemedText>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={currentDate}
                  mode="date"
                  display="spinner"
                  textColor="#f8fafc"
                  onChange={handleNativeChange}
                />
              </View>
            </TouchableOpacity>
          </Modal>
        ) : (
          <DateTimePicker
            value={currentDate}
            mode="date"
            display="default"
            onChange={handleNativeChange}
          />
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 6,
  },
  triggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    height: 44,
  },
  webInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    height: 44,
  },
  valueText: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: 'bold',
  },
  placeholderText: {
    color: '#64748b',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  doneText: {
    color: '#38bdf8',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
