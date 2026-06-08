import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PipelineCard, TAG_COLORS, PRIORITY_COLORS } from '../types/pipeline.types';
import { Ionicons } from '@expo/vector-icons';

interface PipelineCardItemProps {
  card: PipelineCard;
  onLongPress: () => void;
  onPress: () => void;
  isDragging?: boolean;
}

const PipelineCardItem: React.FC<PipelineCardItemProps> = ({
  card,
  onLongPress,
  onPress,
  isDragging = false,
}) => {
  const tagColor = TAG_COLORS[card.tag] || TAG_COLORS.task;
  const priorityColor = PRIORITY_COLORS[card.priority] || PRIORITY_COLORS.medium;

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <TouchableOpacity
      onLongPress={onLongPress}
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, isDragging && styles.cardDragging]}
      delayLongPress={200}
    >
      <View style={styles.priorityBar}>
        <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
        <Text style={styles.priorityText}>{card.priority.toUpperCase()}</Text>
      </View>

      <Text style={styles.cardTitle} numberOfLines={2}>{card.title}</Text>

      <View style={styles.cardFooter}>
        <View style={[styles.tag, { backgroundColor: tagColor.bg, borderColor: tagColor.border }]}>
          <Text style={[styles.tagText, { color: tagColor.text }]}>{card.tagLabel}</Text>
        </View>

        <View style={styles.rightMeta}>
          {card.due && (
            <View style={styles.dueRow}>
              <Ionicons name="calendar-outline" size={10} color="#94a3b8" />
              <Text style={styles.dueText}>{card.due}</Text>
            </View>
          )}
          {card.assignee && (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(card.assignee)}</Text>
            </View>
          )}
        </View>
      </View>

      {card.customerName && (
        <Text style={styles.customerText} numberOfLines={1}>
          <Ionicons name="person-outline" size={10} color="#94a3b8" /> {card.customerName}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardDragging: {
    opacity: 0.6,
    shadowOpacity: 0.2,
    elevation: 8,
    transform: [{ scale: 1.03 }],
  },
  priorityBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 18,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tag: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  rightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dueText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#475569',
  },
  customerText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 6,
    fontWeight: '600',
  },
});

export default PipelineCardItem;
