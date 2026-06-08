import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, PanResponder, Dimensions, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  PipelineCard, PipelineStage, PIPELINE_COLUMNS, PRIORITY_COLORS, TAG_COLORS,
} from '../types/pipeline.types';
import PipelineCardItem from './PipelineCardItem';
import AddPipelineCardModal from './AddPipelineCardModal';
import { TeamMember, Customer, Language } from '@/src/types/types';
import { TRANSLATIONS } from '@/src/constants/constants';

const { width: SCREEN_W } = Dimensions.get('window');
const COL_WIDTH = 210;
const COL_MARGIN = 10;

interface PipelineViewProps {
  teamMembers: TeamMember[];
  customers: Customer[];
  language: Language;
  currentUserId: string;
}

const INITIAL_CARDS: PipelineCard[] = [
  { id: 'c1', title: 'Design new onboarding flow', col: 'backlog', tag: 'design', tagLabel: 'Design', priority: 'medium', due: 'Jun 25', assignee: 'Trang Le', createdAt: Date.now() - 86400000 * 5 },
  { id: 'c2', title: 'Fix login redirect bug on iOS', col: 'todo', tag: 'bug', tagLabel: 'Bug', priority: 'urgent', due: 'Jun 10', assignee: 'Duy Pham', createdAt: Date.now() - 86400000 * 3 },
  { id: 'c3', title: 'Customer search API endpoint', col: 'todo', tag: 'feature', tagLabel: 'Feature', priority: 'high', due: 'Jun 15', assignee: 'Bao Hoang', createdAt: Date.now() - 86400000 * 2 },
  { id: 'c4', title: 'Notification panel mobile', col: 'progress', tag: 'feature', tagLabel: 'Feature', priority: 'medium', due: 'Jun 12', assignee: 'Mai Nguyen', createdAt: Date.now() - 86400000 },
  { id: 'c5', title: 'Export reports to CSV', col: 'progress', tag: 'task', tagLabel: 'Task', priority: 'low', due: 'Jun 22', assignee: 'Duy Pham', createdAt: Date.now() },
  { id: 'c6', title: 'Mobile layout responsive fixes', col: 'review', tag: 'bug', tagLabel: 'Bug', priority: 'high', due: 'Jun 9', assignee: 'Trang Le', createdAt: Date.now() - 3600000 },
  { id: 'c7', title: 'Dark mode color tokens', col: 'done', tag: 'design', tagLabel: 'Design', priority: 'medium', due: 'Jun 5', assignee: 'Bao Hoang', createdAt: Date.now() - 86400000 * 7 },
  { id: 'c8', title: 'Role permission matrix', col: 'done', tag: 'feature', tagLabel: 'Feature', priority: 'high', due: 'Jun 6', assignee: 'Mai Nguyen', createdAt: Date.now() - 86400000 * 6 },
];

const PipelineView: React.FC<PipelineViewProps> = ({
  teamMembers, customers, language, currentUserId,
}) => {
  const [cards, setCards] = useState<PipelineCard[]>(INITIAL_CARDS);
  const [draggingCard, setDraggingCard] = useState<PipelineCard | null>(null);
  const [dragX] = useState(new Animated.Value(0));
  const [dragY] = useState(new Animated.Value(0));
  const [hoverCol, setHoverCol] = useState<PipelineStage | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTargetCol, setAddTargetCol] = useState<PipelineStage>('backlog');
  const [filter, setFilter] = useState<string>('all');
  const [selectedCard, setSelectedCard] = useState<PipelineCard | null>(null);

  const boardScrollRef = useRef<ScrollView>(null);
  const boardOffsetX = useRef(0);

  const t = (key: string) => TRANSLATIONS[language]?.[key] || key;

  const getColX = (colId: PipelineStage) => {
    const idx = PIPELINE_COLUMNS.findIndex(c => c.id === colId);
    return idx * (COL_WIDTH + COL_MARGIN * 2) + COL_MARGIN;
  };

  const getColAtX = (x: number): PipelineStage | null => {
    const adjustedX = x + boardOffsetX.current;
    const idx = Math.floor(adjustedX / (COL_WIDTH + COL_MARGIN * 2));
    if (idx < 0 || idx >= PIPELINE_COLUMNS.length) return null;
    return PIPELINE_COLUMNS[idx].id;
  };

  const startDrag = useCallback((card: PipelineCard, touchX: number, touchY: number) => {
    setDraggingCard(card);
    dragX.setValue(touchX - COL_WIDTH / 2);
    dragY.setValue(touchY - 40);
  }, [dragX, dragY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !!draggingCard,
      onMoveShouldSetPanResponder: () => !!draggingCard,
      onPanResponderMove: (e, gs) => {
        if (!draggingCard) return;
        dragX.setValue(gs.moveX - COL_WIDTH / 2);
        dragY.setValue(gs.moveY - 40);
        const col = getColAtX(gs.moveX);
        setHoverCol(col);
      },
      onPanResponderRelease: (e, gs) => {
        if (!draggingCard) return;
        const col = getColAtX(gs.moveX);
        if (col && col !== draggingCard.col) {
          setCards(prev =>
            prev.map(c => c.id === draggingCard.id ? { ...c, col } : c)
          );
        }
        setDraggingCard(null);
        setHoverCol(null);
      },
    })
  ).current;

  const filteredCards = (colId: PipelineStage) => {
    return cards.filter(c => {
      if (c.col !== colId) return false;
      if (filter === 'all') return true;
      if (filter === 'mine') return c.assigneeId === currentUserId || c.assignee?.toLowerCase().includes('you');
      return c.tag === filter || (filter === 'urgent' && c.priority === 'urgent');
    });
  };

  const handleMoveCard = (card: PipelineCard, direction: 'forward' | 'back') => {
    const colIdx = PIPELINE_COLUMNS.findIndex(c => c.id === card.col);
    const newIdx = direction === 'forward' ? colIdx + 1 : colIdx - 1;
    if (newIdx < 0 || newIdx >= PIPELINE_COLUMNS.length) return;
    const newCol = PIPELINE_COLUMNS[newIdx].id;
    setCards(prev => prev.map(c => c.id === card.id ? { ...c, col: newCol } : c));
    setSelectedCard(null);
  };

  const handleDeleteCard = (cardId: string) => {
    Alert.alert('Delete Card', 'Remove this card from the pipeline?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setCards(prev => prev.filter(c => c.id !== cardId));
        setSelectedCard(null);
      }},
    ]);
  };

  const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'urgent', label: 'Urgent' },
    { id: 'feature', label: 'Feature' },
    { id: 'bug', label: 'Bug' },
    { id: 'design', label: 'Design' },
  ];

  const totalCards = cards.length;
  const doneCards = cards.filter(c => c.col === 'done').length;
  const progressPct = totalCards > 0 ? Math.round((doneCards / totalCards) * 100) : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Pipeline</Text>
          <Text style={styles.headerSub}>SCHEDULE & TRACK WORK</Text>
        </View>
        <View style={styles.progressBox}>
          <Text style={styles.progressLabel}>{progressPct}% done</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${progressPct}%` as any }]} />
          </View>
          <Text style={styles.progressCount}>{doneCards}/{totalCards}</Text>
        </View>
      </View>

      {/* Filter Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.id}
            onPress={() => setFilter(f.id)}
            style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Board */}
      <ScrollView
        ref={boardScrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={e => { boardOffsetX.current = e.nativeEvent.contentOffset.x; }}
        scrollEventThrottle={16}
        style={styles.board}
        contentContainerStyle={styles.boardContent}
        scrollEnabled={!draggingCard}
      >
        {PIPELINE_COLUMNS.map(col => {
          const colCards = filteredCards(col.id);
          const isHover = hoverCol === col.id;

          return (
            <View key={col.id} style={[styles.column, isHover && styles.columnHover]}>
              {/* Col Header */}
              <View style={styles.colHeader}>
                <View style={[styles.colAccent, { backgroundColor: col.accent }]} />
                <Text style={styles.colTitle}>{col.title}</Text>
                <View style={styles.colCount}>
                  <Text style={styles.colCountText}>{colCards.length}</Text>
                </View>
              </View>

              {/* Cards */}
              <ScrollView
                style={styles.colBody}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                scrollEnabled={!draggingCard}
              >
                {colCards.length === 0 && (
                  <View style={[styles.emptyCol, isHover && styles.emptyColHover]}>
                    <Text style={styles.emptyColText}>Drop here</Text>
                  </View>
                )}
                {colCards.map(card => (
                  <PipelineCardItem
                    key={card.id}
                    card={card}
                    isDragging={draggingCard?.id === card.id}
                    onLongPress={() => startDrag(card, 0, 0)}
                    onPress={() => setSelectedCard(card)}
                  />
                ))}
              </ScrollView>

              {/* Add Button */}
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => { setAddTargetCol(col.id); setShowAddModal(true); }}
              >
                <Ionicons name="add" size={16} color="#94a3b8" />
                <Text style={styles.addBtnText}>Add card</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {/* Dragging ghost */}
      {draggingCard && (
        <Animated.View
          style={[
            styles.ghost,
            { transform: [{ translateX: dragX }, { translateY: dragY }] }
          ]}
          {...panResponder.panHandlers}
          pointerEvents="box-only"
        >
          <View style={styles.ghostCard}>
            <Text style={styles.ghostTitle} numberOfLines={2}>{draggingCard.title}</Text>
            <View style={[styles.ghostTag, { backgroundColor: TAG_COLORS[draggingCard.tag]?.bg }]}>
              <Text style={[styles.ghostTagText, { color: TAG_COLORS[draggingCard.tag]?.text }]}>
                {draggingCard.tagLabel}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Card Detail Bottom Sheet */}
      {selectedCard && (
        <View style={styles.detailBackdrop}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setSelectedCard(null)} />
          <View style={styles.detailSheet}>
            <View style={styles.detailHeader}>
              <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[selectedCard.priority] }]} />
              <Text style={styles.detailTitle}>{selectedCard.title}</Text>
              <TouchableOpacity onPress={() => setSelectedCard(null)}>
                <Ionicons name="close" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.detailMeta}>
              <View style={[styles.detailTag, { backgroundColor: TAG_COLORS[selectedCard.tag]?.bg, borderColor: TAG_COLORS[selectedCard.tag]?.border }]}>
                <Text style={[styles.detailTagText, { color: TAG_COLORS[selectedCard.tag]?.text }]}>{selectedCard.tagLabel}</Text>
              </View>
              {selectedCard.due && (
                <View style={styles.detailMetaItem}>
                  <Ionicons name="calendar-outline" size={13} color="#94a3b8" />
                  <Text style={styles.detailMetaText}>{selectedCard.due}</Text>
                </View>
              )}
              {selectedCard.assignee && (
                <View style={styles.detailMetaItem}>
                  <Ionicons name="person-outline" size={13} color="#94a3b8" />
                  <Text style={styles.detailMetaText}>{selectedCard.assignee}</Text>
                </View>
              )}
            </View>

            <View style={styles.detailCol}>
              <Text style={styles.detailColLabel}>CURRENT STAGE</Text>
              <View style={[styles.detailColBadge, { borderColor: PIPELINE_COLUMNS.find(c => c.id === selectedCard.col)?.accent }]}>
                <Text style={[styles.detailColText, { color: PIPELINE_COLUMNS.find(c => c.id === selectedCard.col)?.accent }]}>
                  {PIPELINE_COLUMNS.find(c => c.id === selectedCard.col)?.title}
                </Text>
              </View>
            </View>

            <View style={styles.detailActions}>
              <TouchableOpacity
                style={[styles.moveBtn, selectedCard.col === 'backlog' && styles.moveBtnDisabled]}
                onPress={() => handleMoveCard(selectedCard, 'back')}
                disabled={selectedCard.col === 'backlog'}
              >
                <Ionicons name="arrow-back" size={14} color={selectedCard.col === 'backlog' ? '#cbd5e1' : '#475569'} />
                <Text style={[styles.moveBtnText, selectedCard.col === 'backlog' && { color: '#cbd5e1' }]}>Move Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.moveBtn, styles.moveBtnForward, selectedCard.col === 'done' && styles.moveBtnDisabled]}
                onPress={() => handleMoveCard(selectedCard, 'forward')}
                disabled={selectedCard.col === 'done'}
              >
                <Text style={[styles.moveBtnTextForward, selectedCard.col === 'done' && { color: '#cbd5e1' }]}>Move Forward</Text>
                <Ionicons name="arrow-forward" size={14} color={selectedCard.col === 'done' ? '#cbd5e1' : '#fff'} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteCard(selectedCard.id)}>
              <Ionicons name="trash-outline" size={14} color="#f43f5e" />
              <Text style={styles.deleteBtnText}>Delete card</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Add Card Modal */}
      <AddPipelineCardModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(newCard) => {
          setCards(prev => [...prev, { ...newCard, id: `c${Date.now()}`, createdAt: Date.now() }]);
        }}
        defaultCol={addTargetCol}
        teamMembers={teamMembers}
        customers={customers}
        language={language}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#1e293b' },
  headerSub: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, marginTop: 2 },
  progressBox: { alignItems: 'flex-end', gap: 4 },
  progressLabel: { fontSize: 11, fontWeight: '700', color: '#10b981' },
  progressTrack: { width: 80, height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, overflow: 'hidden' },
  progressBar: { height: 4, backgroundColor: '#10b981', borderRadius: 2 },
  progressCount: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },

  filterBar: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', maxHeight: 44 },
  filterContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 6, flexDirection: 'row' },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    marginRight: 6,
  },
  filterChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  filterText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  filterTextActive: { color: '#fff' },

  board: { flex: 1 },
  boardContent: { padding: 12, gap: 0, flexDirection: 'row' },

  column: {
    width: COL_WIDTH,
    marginHorizontal: COL_MARGIN,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    overflow: 'hidden',
    maxHeight: 600,
  },
  columnHover: {
    borderColor: '#10b981',
    borderWidth: 1.5,
    backgroundColor: '#f0fdf4',
  },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  colAccent: { width: 4, height: 16, borderRadius: 2 },
  colTitle: { flex: 1, fontSize: 12, fontWeight: '900', color: '#1e293b' },
  colCount: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 99,
  },
  colCountText: { fontSize: 10, fontWeight: '700', color: '#64748b' },

  colBody: { flex: 1, padding: 10 },

  emptyCol: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
    borderRadius: 12,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyColHover: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  emptyColText: { fontSize: 11, color: '#cbd5e1', fontWeight: '600' },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    margin: 8,
    marginTop: 0,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#e2e8f0',
    justifyContent: 'center',
  },
  addBtnText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },

  ghost: {
    position: 'absolute',
    width: COL_WIDTH - 20,
    zIndex: 999,
  },
  ghostCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#10b981',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
    gap: 8,
  },
  ghostTitle: { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  ghostTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  ghostTagText: { fontSize: 10, fontWeight: '700' },

  priorityDot: { width: 8, height: 8, borderRadius: 4 },

  detailBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.4)',
    justifyContent: 'flex-end',
    zIndex: 50,
  },
  detailSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    gap: 14,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  detailTitle: { flex: 1, fontSize: 15, fontWeight: '900', color: '#1e293b', lineHeight: 22 },
  detailMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  detailTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  detailTagText: { fontSize: 11, fontWeight: '700' },
  detailMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailMetaText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  detailCol: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailColLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1 },
  detailColBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  detailColText: { fontSize: 11, fontWeight: '900' },
  detailActions: { flexDirection: 'row', gap: 10 },
  moveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  moveBtnDisabled: { opacity: 0.4 },
  moveBtnForward: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  moveBtnText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  moveBtnTextForward: { fontSize: 11, fontWeight: '700', color: '#fff' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 10,
  },
  deleteBtnText: { fontSize: 12, color: '#f43f5e', fontWeight: '700' },
});

export default PipelineView;
