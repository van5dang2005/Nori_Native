import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Modal, StyleSheet, Image, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Platform, } from 'react-native';
import { Customer, UserRole, TeamMember, LogPriority, LogStatus, Language, LogType, LogCategory, Attachment } from '@/src/types/types';
import { Ionicons } from '@expo/vector-icons';
import ModalPicker from './ModalPicker';
import * as DocumentPicker from 'expo-document-picker';

import { TRANSLATIONS } from '@/src/constants/constants';
import { useCreateNote } from '@/src/hooks/useNote'
import { CreateNotePayload } from '@/src/services/noteService';
import { useCustomers } from '@/src/hooks/useCustomer';
import { useDebounce } from '@/src/hooks/useDebounce';
import Spinner from './Spinner';
import DateTimePicker from '@react-native-community/datetimepicker';

interface CreateNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    language: Language;
    canPostNote: boolean;
    availableAssignees: TeamMember[];
    customer: Customer;
    onAddLog: (id: string, customerId: string, content: string, category: LogCategory, isPrivate: boolean, attachments: Attachment[], priority: LogPriority, deadline?: number, assigneeId?: string, createdAt?: number, status?: LogStatus, logType?: LogType) => void;
}

const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
    isOpen,
    onClose,
    language,
    canPostNote,
    availableAssignees,
    customer,
    onAddLog
}) => {
    const [isPrivate, setIsPrivate] = useState(false);
    const [logType, setLogType] = useState<LogType>('General');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const mainTextAreaRef = useRef<TextInput>(null);
    const [newLogText, setNewLogText] = useState('');
    const [priority, setPriority] = useState<LogPriority>('low');
    const [status, setStatus] = useState<LogStatus>('open');
    const [assigneeId, setAssigneeId] = useState<string>('');
    const [dueDate, setDueDate] = useState<Date | null>(new Date());
    
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Modal visibility states
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    const [priorityModalVisible, setPriorityModalVisible] = useState(false);
    const [assigneeModalVisible, setAssigneeModalVisible] = useState(false);

    const { mutate: createNote, isPending: isPendingNote } = useCreateNote();

    const t = (key: string) => TRANSLATIONS[language][key] || key;

    const resetForm = () => {
        setNewLogText('');
        setIsPrivate(false);
        setAssigneeId('');
        setPriority('low');
        setDueDate(new Date());
        setStatus('open');
        setLogType('General');
        setAttachments([]);
    };
    const handleDateChange = (event: any, selectedDate?: Date) => {
        // Trên Android, khi chọn xong hoặc cancel, Picker sẽ tự đóng
        if (Platform.OS === 'android') {
        setShowDatePicker(showDatePicker);
        }
        
        if (selectedDate) {
        setDueDate(selectedDate);
        }
    };
    const handleLogSubmit = () => {
        if ((!newLogText.trim() && attachments.length === 0) || !canPostNote) return;

        const payload: CreateNotePayload = {
            content: newLogText,
            category: 'note',
            log_type: logType,
            priority: priority,
            status: 'open',
            is_private: isPrivate,
            deadline: dueDate ? new Date(dueDate).toISOString().split('T')[0] : undefined,
            assign_id: assigneeId ? assigneeId.replace('id-', '') : undefined,
            attachments: attachments.map(att => att.file as any),
        };

        createNote(
            { customerID: customer.id, payload },
            {
                onSuccess: (response) => {
                    onAddLog(
                        'l-' + response.id,
                        customer.id,
                        newLogText,
                        'note',
                        isPrivate,
                        attachments,
                        priority,
                        dueDate ? new Date(dueDate).getTime() : undefined,
                        assigneeId || undefined,
                        Date.now(),
                        status,
                        logType
                    );
                    resetForm();
                    onClose();
                },
            }
        );
    };

    const handleFileSelection = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ multiple: true });
            if (!result.canceled) {
                const newAttachments: Attachment[] = result.assets.map(file => {
                    let fileType: Attachment['type'] = 'file';
                    if (file.mimeType?.startsWith('image/')) fileType = 'image';
                    else if (file.mimeType?.startsWith('video/')) fileType = 'video';
                    else if (file.mimeType === 'application/pdf') fileType = 'pdf';

                    return {
                        id: `att-${Date.now()}-${Math.random()}`,
                        name: file.name,
                        url: file.uri,
                        type: fileType,
                        size: file.size || 0,
                        file: file as any,
                    };
                });
                setAttachments(prev => [...prev, ...newAttachments]);
            }
        } catch (error) {
            console.error("File selection error:", error);
        }
    };

    return (
        <Modal
            visible={isOpen}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.modalOverlay}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={styles.modalContent}>
                        {/* Header */}
                        <View style={styles.createFormHeader}>
                            <TouchableOpacity onPress={() => setIsPrivate(!isPrivate)} style={styles.privateToggleRow}>
                                <View style={[styles.privateToggleBg, isPrivate ? styles.bgPrimary : styles.bgSlate200]}>
                                    <View style={[styles.privateToggleDot, isPrivate ? styles.privateToggleDotOn : styles.privateToggleDotOff]} />
                                </View>
                                <Text style={[styles.privateToggleText, isPrivate ? styles.textPrimary : styles.textSlate500]}>
                                    {t('privateEntry')}
                                </Text>
                            </TouchableOpacity>
                            <View style={styles.createFormTopActions}>
                                <TouchableOpacity onPress={handleFileSelection} style={styles.actionIconButton}>
                                    <Ionicons name="attach" size={24} color="#64748b" />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={onClose} style={styles.actionIconButton}>
                                    <Ionicons name="close" size={24} color="#64748b" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            {/* Type Selector */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.createTypeScroll}>
                                {(['General', 'PO', 'Complaint', 'Document', 'Price'] as LogType[]).map(type => (
                                    <TouchableOpacity
                                        key={type}
                                        onPress={() => setLogType(type)}
                                        style={[styles.createTypeBtn, logType === type ? styles.createTypeBtnActive : styles.createTypeBtnInactive]}
                                    >
                                        <Text style={[styles.createTypeText, logType === type ? styles.textWhite : styles.textSlate500]}>{type}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            {/* Text Input */}
                            <TextInput
                                ref={mainTextAreaRef}
                                multiline
                                value={newLogText}
                                onChangeText={setNewLogText}
                                placeholder="Describe situational dynamics... @mention team to notify."
                                placeholderTextColor="#94a3b8"
                                style={styles.createInputArea}
                                textAlignVertical="top"
                            />

                            {/* Attachments Preview */}
                            {attachments.length > 0 && (
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.createAttScroll}>
                                    {attachments.map(att => (
                                        <View key={att.id} style={styles.createAttItem}>
                                            {att.type === 'image' ? (
                                                <Image source={{ uri: att.url }} style={styles.createAttImage} resizeMode="cover" />
                                            ) : (
                                                <View style={styles.createAttIconBox}>
                                                    <Ionicons name={att.type === 'video' ? 'videocam' : 'document'} size={24} color="#cbd5e1" />
                                                </View>
                                            )}
                                            <TouchableOpacity
                                                onPress={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}
                                                style={styles.createAttRemoveBtn}
                                            >
                                                <Ionicons name="close" size={12} color="#fff" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </ScrollView>
                            )}

                            {/* Meta Grid (Status, Urgency, Assignee) */}
                            <View style={styles.createMetaGrid}>
                                <View style={styles.createMetaRow}>
                                    <View style={styles.flex1}>
                                        <Text style={styles.createMetaLabel}>{t('caseStatus')}</Text>
                                        <TouchableOpacity onPress={() => setStatusModalVisible(true)} style={styles.createPickerBox}>
                                            <Text style={styles.pickerText}>{t(status) || t('open')}</Text>
                                            <Ionicons name="chevron-down" size={14} color="#94a3b8" />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.flex1}>
                                        <Text style={styles.createMetaLabel}>{t('urgency')}</Text>
                                        <TouchableOpacity onPress={() => setPriorityModalVisible(true)} style={styles.createPickerBox}>
                                            <Text style={styles.pickerText}>{t(priority) || t('low')}</Text>
                                            <Ionicons name="chevron-down" size={14} color="#94a3b8" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View>
                                    <Text style={styles.createMetaLabel}>Assign Task</Text>
                                    <TouchableOpacity onPress={() => setAssigneeModalVisible(true)} style={styles.createPickerBox}>
                                        <Text style={styles.pickerText}>
                                            {assigneeId ? availableAssignees.find(m => m.id === assigneeId)?.name || 'Unassigned' : 'Unassigned'}
                                        </Text>
                                        <Ionicons name="person-add-outline" size={14} color="#94a3b8" />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.labelSlate}>{t('deadline')}</Text>

                                    <TouchableOpacity
                                        activeOpacity={0.7}
                                        style={styles.datePickerTrigger}
                                        onPress={() => setShowDatePicker(!showDatePicker)}
                                    >
                                        <View style={styles.dateInfo}>
                                            <Ionicons name="calendar-sharp" size={14} color="#64748b" />
                                            <Text style={styles.dateText}>
                                                {dueDate ? dueDate.toLocaleDateString('vi-VN') : t('selectDate')}
                                            </Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
                                    </TouchableOpacity>

                                    {/* Trình chọn ngày hệ thống */}
                                    {showDatePicker && (
                                        <DateTimePicker
                                            value={dueDate || new Date()}
                                            mode="date"
                                            display={Platform.OS === 'ios' ? 'spinner' : 'default'} // iOS dùng spinner cho sang, Android dùng default
                                            onChange={handleDateChange}
                                            minimumDate={new Date()} // Không cho chọn ngày quá khứ
                                        />
                                    )}
                                </View>
                            </View>
                        </ScrollView>

                        {/* Submit Button */}
                        <TouchableOpacity
                            onPress={handleLogSubmit}
                            disabled={(!newLogText.trim() && attachments.length === 0) || isPendingNote}
                            style={[styles.submitLogBtn, ((!newLogText.trim() && attachments.length === 0) || isPendingNote) ? styles.submitLogBtnDisabled : styles.submitLogBtnActive]}
                        >
                            {isPendingNote ? <Spinner /> : <Text style={styles.submitLogBtnText}>{t('saveArchive')}</Text>}
                        </TouchableOpacity>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>

            {/* Sub-Modals for Pickers */}
            <ModalPicker
                visible={statusModalVisible}
                onClose={() => setStatusModalVisible(false)}
                selectedValue={status}
                onValueChange={(value) => { setStatus(value as any); setStatusModalVisible(false); }}
                options={[
                    { label: t('open'), value: 'open' },
                    { label: t('resolved'), value: 'resolved' },
                    { label: t('closed'), value: 'closed' },
                ]}
            />
            <ModalPicker
                visible={priorityModalVisible}
                onClose={() => setPriorityModalVisible(false)}
                selectedValue={priority}
                onValueChange={(value) => { setPriority(value as any); setPriorityModalVisible(false); }}
                options={[
                    { label: t('low'), value: 'low' },
                    { label: t('medium'), value: 'medium' },
                    { label: t('high'), value: 'high' },
                    { label: t('urgent'), value: 'urgent' },
                ]}
            />
            <ModalPicker
                visible={assigneeModalVisible}
                onClose={() => setAssigneeModalVisible(false)}
                selectedValue={assigneeId}
                onValueChange={(value) => { setAssigneeId(value); setAssigneeModalVisible(false); }}
                options={[
                    { label: 'Unassigned', value: '' },
                    ...availableAssignees.map(m => ({ label: m.name, value: m.id })),
                ]}
            />
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.5)', // Slate-900 with opacity
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 20,
    },
    createFormHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20
    },
    privateToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    privateToggleBg: { width: 36, height: 18, borderRadius: 9, justifyContent: 'center' },
    privateToggleDot: { width: 14, height: 14, backgroundColor: '#ffffff', borderRadius: 7, marginHorizontal: 2 },
    privateToggleDotOn: { alignSelf: 'flex-end' },
    privateToggleDotOff: { alignSelf: 'flex-start' },
    privateToggleText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    createFormTopActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    actionIconButton: { padding: 4 },
    createTypeScroll: { marginBottom: 16 },
    createTypeBtn: { paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, borderRadius: 20, borderWidth: 1 },
    createTypeBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
    createTypeBtnInactive: { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' },
    createTypeText: { fontSize: 8, fontWeight: '800', textTransform: 'uppercase' },
    createInputArea: {
        width: '100%',
        padding: 16,
        color: '#1e293b',
        minHeight: 120,
        fontSize: 15,
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        marginBottom: 16
    },
    createAttScroll: { marginBottom: 16 },
    createAttItem: { position: 'relative', width: 70, height: 70, marginRight: 12 },
    createAttImage: { width: '100%', height: '100%', borderRadius: 12 },
    createAttIconBox: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', borderRadius: 12 },
    createAttRemoveBtn: { position: 'absolute', top: -5, right: -5, width: 20, height: 20, backgroundColor: '#f43f5e', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    createMetaGrid: { gap: 12, marginBottom: 24 },
    createMetaRow: { flexDirection: 'row', gap: 12 },
    createMetaLabel: { fontSize: 10, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: 6, marginLeft: 4 },
    createPickerBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8fafc',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10
    },
    pickerText: { fontSize: 14, color: '#334155', fontWeight: '500' },
    submitLogBtn: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center'
    },
    submitLogBtnActive: { backgroundColor: '#0f172a' },
    submitLogBtnDisabled: { backgroundColor: '#cbd5e1' },
    submitLogBtnText: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', color: '#ffffff', letterSpacing: 1 },
    bgPrimary: { backgroundColor: '#10b981' },
    bgSlate200: { backgroundColor: '#e2e8f0' },
    textSlate500: { color: '#64748b' },
    textPrimary: { color: '#10b981' },
    textWhite: { color: '#ffffff' },
    flex1: { flex: 1 },

    inputGroup: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  labelSlate: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8', // slate-400
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 6,
    paddingLeft: 4,
  },
  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0', // slate-200
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    // Đổ bóng nhẹ cho nút
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1e293b',
    marginLeft: 8,
    textTransform: 'uppercase',
  },
});

export default CreateNoteModal;