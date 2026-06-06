import React from 'react';
import { View, Modal, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';

interface ModalPickerProps {
  visible: boolean;
  onClose: () => void;
  selectedValue: string;
  onValueChange: (value: string) => void;
  options: { label: string; value: string }[];
}

const ModalPicker: React.FC<ModalPickerProps> = ({
  visible,
  onClose,
  selectedValue,
  onValueChange,
  options,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Picker
            selectedValue={selectedValue}
            onValueChange={(itemValue) => {
              onValueChange(itemValue);
              onClose();
            }}
            style={styles.modalPicker}
          >
            {options.map((option) => (
              <Picker.Item key={option.value} label={option.label} value={option.value} />
            ))}
          </Picker>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
    padding: 10,
  },
  modalPicker: {
    width: '100%',
  },
});

export default ModalPicker;