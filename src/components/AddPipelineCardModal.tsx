import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Modal,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PipelineCard, PipelineStage, PipelineTag, PipelinePriority, TAG_COLORS, PIPELINE_COLUMNS } from '../types/pipeline.types';
import { TeamMember, Customer, Language } from '@/src/types/types';
import { TRANSLATIONS } from '@/src/constants/constants';

interface AddPipelineCardModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (card: Omit<PipelineCard, 'id' | 'createdAt'>) => void;
  defaultCol: PipelineStage;
  teamMembers: TeamMember[];
  customers: Customer[];
  language: Language;
}

const TAGS: { value: PipelineTag; label: string }[] = [
  { value: 'feature', label: 'Feature' },
  { value: 'bug', label: 'Bug' },
  { value: 'design', label: 'Design' },
  { value: 'task', label: 'Task' },
  { value: 'urgent', label: 'Urgent' },
];

const PRIORITIES: { value: PipelinePriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#10b981' },
  { value: 'medium', label: 'Medium', color: '#378ADD' },
  { value: 'high', label: 'High', color: '#EF9F27' },
  { value: 'urgent', label: 'Urgent', color: '#E24B4A' },
];

const AddPipelineCardModal: React.FC<AddPipelineCardModalProps> = ({
  visible, onClose, onAdd, defaultCol, teamMembers, customers, language,
}) => {
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState<PipelineTag>('task');
  const [priority, setPriority] = useState<PipelinePriority>('medium');
  const [col, setCol] = useState<PipelineStage>(defaultCol);
  const [assigneeId, setAssigneeId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [due, setDue] = useState('');

  const t = (key: string) => TRANSLATIONS[language]?.[key] || key;

  const reset = () => {
    setTitle(''); setTag('task'); setPriority('medium');
    setCol(defaultCol); setAssigneeId(''); setCustomerId(''); setDue('');
  };

  const handleAdd = () => {
    if (!title.trim()) return;
    const member = teamMembers.find(m => m.id === assigneeId);
    const customer = customers.find(c => c.id === customerId);
    onAdd({
      title: title.trim(),
      col,
      tag,
      tagLabel: TAGS.find(t => t.value === tag)?.label || 'Task',
      priority,
      due: due || undefined,
      assignee: member?.name,
      assigneeId: assigneeId || undefined,
      customerId: customerId || undefined,
      customerName: customer?.company,
    });
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>New Pipeline Card</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>TITLE</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Describe this task..."
              placeholderTextColor="#cbd5e1"
              autoFocus
            />

            <Text style={styles.label}>TAG</Text>
            <View style={styles.chipRow}>
              {TAGS.map(t => {
                const tc = TAG_COLORS[t.value];
                const active = tag === t.value;
                return (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => setTag(t.value)}
                    style={[styles.chip, active && { backgroundColor: tc.bg, borderColor: tc.border }]}
                  >
                    <Text style={[styles.chipText, active && { color: tc.text }]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>PRIORITY</Text>
            <View style={styles.chipRow}>
              {PRIORITIES.map(p => (
                <TouchableOpacity
                  key={p.value}
                  onPress={() => setPriority(p.value)}
                  style={[styles.chip, priority === p.value && { backgroundColor: p.color + '22', borderColor: p.color }]}
                >
                  <View style={[styles.dot, { backgroundColor: p.color }]} />
                  <Text style={[styles.chipText, priority === p.value && { color: p.color }]}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>COLUMN</Text>
            <View style={styles.chipRow}>
              {PIPELINE_COLUMNS.map(c => (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setCol(c.id)}
                  style={[styles.chip, col === c.id && { backgroundColor: c.accent + '22', borderColor: c.accent }]}
                >
                  <Text style={[styles.chipText, col === c.id && { color: c.accent }]}>{c.title}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {customers.length > 0 && (
              <>
                <Text style={styles.label}>CUSTOMER (optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
                  <TouchableOpacity
                    onPress={() => setCustomerId('')}
                    style={[styles.chip, customerId === '' && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, customerId === '' && styles.chipTextActive]}>None</Text>
                  </TouchableOpacity>
                  {customers.slice(0, 10).map(c => (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => setCustomerId(c.id)}
                      style={[styles.chip, customerId === c.id && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, customerId === c.id && styles.chipTextActive]} numberOfLines={1}>
                        {c.company}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {teamMembers.length > 0 && (
              <>
                <Text style={styles.label}>ASSIGN TO (optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
                  <TouchableOpacity
                    onPress={() => setAssigneeId('')}
                    style={[styles.chip, assigneeId === '' && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, assigneeId === '' && styles.chipTextActive]}>Unassigned</Text>
                  </TouchableOpacity>
                  {teamMembers.filter(m => !m.isArchived).map(m => (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => setAssigneeId(m.id)}
                      style={[styles.chip, assigneeId === m.id && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, assigneeId === m.id && styles.chipTextActive]} numberOfLines={1}>
                        {m.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={styles.label}>DUE DATE (optional)</Text>
            <TextInput
              style={styles.input}
              value={due}
              onChangeText={setDue}
              placeholder="e.g. Jun 20"
              placeholderTextColor="#cbd5e1"
            />

            <View style={{ height: 20 }} />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, !title.trim() && styles.addBtnDisabled]}
              onPress={handleAdd}
              disabled={!title.trim()}
            >
              <Text style={styles.addText}>ADD CARD</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.5)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
  closeBtn: { padding: 4 },
  body: { padding: 20 },
  label: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  hScroll: { marginBottom: 16 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    marginRight: 6,
  },
  chipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  chipText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  chipTextActive: { color: '#fff' },
  dot: { width: 6, height: 6, borderRadius: 3 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelBtn: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelText: { fontSize: 11, fontWeight: '900', color: '#94a3b8' },
  addBtn: {
    flex: 2,
    backgroundColor: '#0f172a',
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  addBtnDisabled: { backgroundColor: '#cbd5e1' },
  addText: { fontSize: 11, fontWeight: '900', color: '#fff' },
});

export default AddPipelineCardModal;
