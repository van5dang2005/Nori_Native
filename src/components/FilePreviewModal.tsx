import React from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  Modal, 
  Platform, 
  Dimensions, 
  Linking 
} from 'react-native';
import { Attachment, Language } from '../types/types';
import { TRANSLATIONS } from '../constants/constants';

const { width, height } = Dimensions.get('window');

interface FilePreviewModalProps {
  file: Attachment | null;
  onClose: () => void;
  language: Language;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ file, onClose, language }) => {
  const t = (key: string) => TRANSLATIONS[language][key] || key;

  if (!file) return null;

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDownload = () => {
    if (file.url) {
      Linking.openURL(file.url);
    }
  };

  const renderPreview = () => {
    switch (file.type) {
      case 'image':
        return (
          <Image 
            source={{ uri: file.url }} 
            style={styles.previewImage}
            resizeMode="contain"
          />
        );
      case 'video':
      case 'pdf':
      default:
        return (
          <View style={styles.fallbackContainer}>
            <View style={styles.fallbackIconBox}>
              <Text style={styles.fallbackIcon}>📄</Text>
            </View>
            <Text style={styles.fallbackTitle}>Deep Inspection Required</Text>
            <Text style={styles.fallbackSubtitle}>
              This file type ({file.type}) requires a native application for full analysis.
            </Text>
            <TouchableOpacity 
              onPress={handleDownload} 
              style={styles.downloadBtn}
            >
              <Text style={styles.downloadBtnText}>Open / Download Asset</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <Modal
      visible={!!file}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <View style={[styles.typeIcon, 
              file.type === 'video' ? styles.videoIcon : 
              file.type === 'pdf' ? styles.pdfIcon : styles.imageIcon
            ]}>
              <Text style={styles.typeIconText}>
                {file.type === 'video' ? '▶' : file.type === 'pdf' ? 'PDF' : 'IMG'}
              </Text>
            </View>
            <View style={styles.titleBox}>
              <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
              <Text style={styles.fileMeta}>
                Strategic Intelligence Asset • {formatSize(file.size)}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.previewArea}>
          {renderPreview()}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Nori Group Secure Preview Engine</Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.98)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoIcon: { backgroundColor: '#f43f5e' },
  pdfIcon: { backgroundColor: '#f59e0b' },
  imageIcon: { backgroundColor: '#6366f1' },
  typeIconText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '900',
  },
  titleBox: {
    flex: 1,
  },
  fileName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
  },
  fileMeta: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  closeBtn: {
    width: 40,
    height: 40,
    backgroundColor: 'white',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  previewArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  previewImage: {
    width: width - 40,
    height: height * 0.6,
  },
  fallbackContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  fallbackIconBox: {
    width: 80,
    height: 80,
    backgroundColor: '#1e293b',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  fallbackIcon: {
    fontSize: 40,
  },
  fallbackTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 10,
  },
  fallbackSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 30,
  },
  downloadBtn: {
    backgroundColor: 'white',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 15,
  },
  downloadBtnText: {
    color: '#0f172a',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  footer: {
    padding: 30,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 8,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 4,
  }
});

export default FilePreviewModal;
