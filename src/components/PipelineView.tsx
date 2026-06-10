import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Animated, PanResponder, Dimensions, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  PipelineCard, PipelineStage, PIPELINE_COLUMNS, PRIORITY_COLORS, TAG_COLORS,
  PipelineTag, PipelinePriority,
} from '../types/pipeline.types';
import PipelineCardItem from './PipelineCardItem';
import AddPipelineCardModal from './AddPipelineCardModal';
import { TeamMember, Customer, Language, CustomerLog, LogStatus, LogType } from '@/src/types/types';
import { TRANSLATIONS } from '@/src/constants/constants';
import { useNotes } from '@/src/hooks/useNote';

const { width: SCREEN_W } = Dimensions.get('window');
const BASE_COL_WIDTH = 210;
const COL_MARGIN = 10;

// ─── Mappers ────────────────────────────────────────────────────────────────

const mapStatusToStage = (status: LogStatus): PipelineStage => {
  switch (status) {
    case 'open':     return 'todo';
    case 'resolved': return 'review';
    case 'closed':   return 'done';
    default:         return 'backlog';
  }
};

const mapLogTypeToTag = (logType: LogType): { tag: PipelineTag; tagLabel: string } => {
  switch (logType) {
    case 'Complaint': return { tag: 'bug',     tagLabel: 'Complaint' };
    case 'PO':        return { tag: 'task',    tagLabel: 'PO' };
    case 'Price':     return { tag: 'feature', tagLabel: 'Price' };
    case 'Document':  return { tag: 'design',  tagLabel: 'Document' };
    case 'General':
    default:          return { tag: 'task',    tagLabel: 'General' };
  }
};

const formatDue = (ts?: number | null): string | undefined => {
  if (!ts) return undefined;
  const d = new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const mapNoteToCard = (log: CustomerLog, teamMembers: TeamMember[]): PipelineCard => {
  const { tag, tagLabel } = mapLogTypeToTag(log.logType);
  const assignee = log.assigneeId
    ? teamMembers.find(m => m.id === log.assigneeId)?.name
    : undefined;
  return {
    id:           `note-${log.id}`,
    noteId:       log.id,
    title:        log.content?.length > 80
                    ? log.content.substring(0, 80) + '…'
                    : log.content || '(no content)',
    col:          mapStatusToStage(log.status),
    tag,
    tagLabel,
    priority:     (log.priority as PipelinePriority) || 'low',
    due:          formatDue(log.dueDate),
    assignee,
    assigneeId:   log.assigneeId || undefined,
    customerId:   log.customerId,
    customerName: log.customer?.company,
    createdAt:    log.timestamp,
  };
};

// ─── Constants ───────────────────────────────────────────────────────────────

const ZOOM_LEVELS = [0.65, 0.8, 1.0, 1.2, 1.4];

const FILTERS = [
  { id: 'all',     label: 'All' },
  { id: 'urgent',  label: 'Urgent' },
  { id: 'feature', label: 'Feature' },
  { id: 'bug',     label: 'Bug / Complaint' },
  { id: 'design',  label: 'Document' },
  { id: 'task',    label: 'Task' },
];

// ─── Props ───────────────────────────────────────────────────────────────────

interface PipelineViewProps {
  teamMembers:   TeamMember[];
  customers:     Customer[];
  language:      Language;
  currentUserId: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

const PipelineView: React.FC<PipelineViewProps> = ({
  teamMembers, customers, language, currentUserId,
}) => {
  const t = (key: string) => TRANSLATIONS[language]?.[key] || key;

  // ── Fetch notes ──────────────────────────────────────────────────────────
  const [notePage, setNotePage] = useState(1);
  const { data: notesData, isLoading: isLoadingNotes, pagination } = useNotes({
    page: notePage,
    perPage: 50,
  });

  // ── Local card state ──────────────────────────────────────────────────────
  const [cards, setCards]         = useState<PipelineCard[]>([]);
  const [apiSynced, setApiSynced] = useState(false);

  useEffect(() => {
    if (!notesData) return;
    const mapped = notesData.map(log => mapNoteToCard(log, teamMembers));

    setCards(prev => {
      if (!apiSynced) {
        setApiSynced(true);
        return mapped;
      }
      // Merge: preserve locally-dragged column positions
      const existingById = new Map(prev.map(c => [c.id, c]));
      const merged = mapped.map(c => {
        const existing = existingById.get(c.id);
        return existing ? { ...c, col: existing.col } : c;
      });
      // Keep manually-added local cards (no noteId)
      const localOnly = prev.filter(c => !c.noteId);
      return [...merged, ...localOnly];
    });
  }, [notesData, teamMembers]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [hoverCol, setHoverCol]         = useState<PipelineStage | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTargetCol, setAddTargetCol] = useState<PipelineStage>('backlog');
  const [filter, setFilter]             = useState<string>('all');
  const [selectedCard, setSelectedCard] = useState<PipelineCard | null>(null);
  const [zoomIndex, setZoomIndex]       = useState(2);
  const zoom      = ZOOM_LEVELS[zoomIndex];
  const COL_WIDTH = BASE_COL_WIDTH * zoom;

  // ── Drag via refs ─────────────────────────────────────────────────────────
  const draggingCardRef             = useRef<PipelineCard | null>(null);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const dragX = useRef(new Animated.Value(0)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const boardOffsetX = useRef(0);
  const boardScrollRef = useRef<ScrollView>(null);

  const startDrag = useCallback((card: PipelineCard, touchX: number, touchY: number) => {
    draggingCardRef.current = card;
    setDraggingCardId(card.id);
    dragX.setValue(touchX - BASE_COL_WIDTH / 2);
    dragY.setValue(touchY - 40);
  }, [dragX, dragY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => draggingCardRef.current !== null,
      onMoveShouldSetPanResponder:  () => draggingCardRef.current !== null,
      onPanResponderMove: (_, gs) => {
        if (!draggingCardRef.current) return;
        dragX.setValue(gs.moveX - BASE_COL_WIDTH / 2);
        dragY.setValue(gs.moveY - 40);
        const adjustedX = gs.moveX + boardOffsetX.current;
        const colW = BASE_COL_WIDTH * ZOOM_LEVELS[2];
        const idx  = Math.floor(adjustedX / (colW + COL_MARGIN * 2));
        setHoverCol(
          idx >= 0 && idx < PIPELINE_COLUMNS.length
            ? PIPELINE_COLUMNS[idx].id as PipelineStage
            : null
        );
      },
      onPanResponderRelease: (_, gs) => {
        const card = draggingCardRef.current;
        if (!card) return;
        const adjustedX = gs.moveX + boardOffsetX.current;
        const colW = BASE_COL_WIDTH * ZOOM_LEVELS[2];
        const idx  = Math.floor(adjustedX / (colW + COL_MARGIN * 2));
        const col  = idx >= 0 && idx < PIPELINE_COLUMNS.length
          ? PIPELINE_COLUMNS[idx].id as PipelineStage
          : null;
        if (col && col !== card.col) {
          setCards(prev => prev.map(c => c.id === card.id ? { ...c, col } : c));
        }
        draggingCardRef.current = null;
        setDraggingCardId(null);
        setHoverCol(null);
      },
      onPanResponderTerminate: () => {
        draggingCardRef.current = null;
        setDraggingCardId(null);
        setHoverCol(null);
      },
    })
  ).current;

  // ── Filtered cards ────────────────────────────────────────────────────────
  const filteredCards = useCallback((colId: PipelineStage): PipelineCard[] => {
    return cards.filter(c => {
      if (c.col !== colId) return false;
      if (filter === 'all')    return true;
      if (filter === 'urgent') return c.priority === 'urgent';
      return c.tag === filter;
    });
  }, [cards, filter]);

  // ── Move / delete ─────────────────────────────────────────────────────────
  const handleMoveCard = (card: PipelineCard, direction: 'forward' | 'back') => {
    const colIdx = PIPELINE_COLUMNS.findIndex(c => c.id === card.col);
    const newIdx = direction === 'forward' ? colIdx + 1 : colIdx - 1;
    if (newIdx < 0 || newIdx >= PIPELINE_COLUMNS.length) return;
    setCards(prev => prev.map(c =>
      c.id === card.id ? { ...c, col: PIPELINE_COLUMNS[newIdx].id } : c
    ));
    setSelectedCard(null);
  };

  const handleDeleteCard = (cardId: string) => {
    Alert.alert('Remove Card', 'Remove this card from the pipeline?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        setCards(prev => prev.filter(c => c.id !== cardId));
        setSelectedCard(null);
      }},
    ]);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalCards  = cards.length;
  const doneCards   = cards.filter(c => c.col === 'done').length;
  const progressPct = totalCards > 0 ? Math.round((doneCards / totalCards) * 100) : 0;
  const hasMore     = pagination && pagination.current_page < pagination.last_page;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Pipeline</Text>
          <Text style={styles.headerSub}>
            {isLoadingNotes && !apiSynced
              ? 'LOADING NOTES…'
              : `${totalCards} CARDS • SCHEDULE & TRACK`}
          </Text>
        </View>
        <View style={styles.progressBox}>
          <Text style={styles.progressLabel}>{progressPct}% done</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${progressPct}%` as any }]} />
          </View>
          <Text style={styles.progressCount}>{doneCards}/{totalCards}</Text>
        </View>
      </View>

      {/* Filter bar */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={styles.filterBar} contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.id}
            onPress={() => setFilter(f.id)}
            style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
          >
            <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Initial loading overlay */}
      {isLoadingNotes && !apiSynced && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>Syncing notes to pipeline…</Text>
        </View>
      )}

      {/* Board */}
      <View style={styles.boardWrapper} {...panResponder.panHandlers}>
        <ScrollView
          ref={boardScrollRef}
          horizontal showsHorizontalScrollIndicator={false}
          onScroll={e => { boardOffsetX.current = e.nativeEvent.contentOffset.x; }}
          scrollEventThrottle={16}
          style={styles.board}
          contentContainerStyle={styles.boardContent}
          scrollEnabled={!draggingCardId}
        >
          {PIPELINE_COLUMNS.map(col => {
            const colCards = filteredCards(col.id);
            const isHover  = hoverCol === col.id;
            return (
              <View
                key={col.id}
                style={[
                  styles.column,
                  isHover && styles.columnHover,
                  { width: COL_WIDTH, marginHorizontal: COL_MARGIN },
                ]}
              >
                <View style={styles.colHeader}>
                  <View style={[styles.colAccent, { backgroundColor: col.accent }]} />
                  <Text style={[styles.colTitle, { fontSize: Math.max(10, 12 * zoom) }]} numberOfLines={1}>
                    {col.title}
                  </Text>
                  <View style={styles.colCount}>
                    <Text style={styles.colCountText}>{colCards.length}</Text>
                  </View>
                </View>

                <ScrollView
                  style={styles.colBody}
                  showsVerticalScrollIndicator={false}
                  nestedScrollEnabled
                  scrollEnabled={!draggingCardId}
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
                      isDragging={draggingCardId === card.id}
                      onLongPress={() => startDrag(card, SCREEN_W / 2, 200)}
                      onPress={() => { if (!draggingCardId) setSelectedCard(card); }}
                    />
                  ))}
                </ScrollView>

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

          {/* Load-more column */}
          {hasMore && (
            <View style={styles.loadMoreCol}>
              <TouchableOpacity
                style={styles.loadMoreBtn}
                onPress={() => setNotePage(p => p + 1)}
                disabled={isLoadingNotes}
              >
                {isLoadingNotes
                  ? <ActivityIndicator size="small" color="#10b981" />
                  : <>
                      <Ionicons name="cloud-download-outline" size={20} color="#10b981" />
                      <Text style={styles.loadMoreText}>Load more</Text>
                      <Text style={styles.loadMoreSub}>
                        {pagination.current_page}/{pagination.last_page}
                      </Text>
                    </>
                }
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Drag ghost */}
      {draggingCardId && draggingCardRef.current && (
        <Animated.View
          style={[
            styles.ghost,
            { width: COL_WIDTH - 20, transform: [{ translateX: dragX }, { translateY: dragY }] },
          ]}
          pointerEvents="none"
        >
          <View style={styles.ghostCard}>
            <Text style={styles.ghostTitle} numberOfLines={2}>{draggingCardRef.current.title}</Text>
            <View style={[styles.ghostTag, { backgroundColor: TAG_COLORS[draggingCardRef.current.tag]?.bg }]}>
              <Text style={[styles.ghostTagText, { color: TAG_COLORS[draggingCardRef.current.tag]?.text }]}>
                {draggingCardRef.current.tagLabel}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Card detail sheet */}
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

            {selectedCard.noteId && (
              <View style={styles.sourceBadge}>
                <Ionicons name="link-outline" size={11} color="#6366f1" />
                <Text style={styles.sourceBadgeText}>Linked from Note #{selectedCard.noteId}</Text>
              </View>
            )}

            <View style={styles.detailMeta}>
              <View style={[styles.detailTag, {
                backgroundColor: TAG_COLORS[selectedCard.tag]?.bg,
                borderColor:     TAG_COLORS[selectedCard.tag]?.border,
              }]}>
                <Text style={[styles.detailTagText, { color: TAG_COLORS[selectedCard.tag]?.text }]}>
                  {selectedCard.tagLabel}
                </Text>
              </View>
              {selectedCard.customerName && (
                <View style={styles.detailMetaItem}>
                  <Ionicons name="business-outline" size={13} color="#94a3b8" />
                  <Text style={styles.detailMetaText}>{selectedCard.customerName}</Text>
                </View>
              )}
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
              <View style={[styles.detailColBadge, {
                borderColor: PIPELINE_COLUMNS.find(c => c.id === selectedCard.col)?.accent,
              }]}>
                <Text style={[styles.detailColText, {
                  color: PIPELINE_COLUMNS.find(c => c.id === selectedCard.col)?.accent,
                }]}>
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
                <Ionicons name="arrow-back" size={14}
                  color={selectedCard.col === 'backlog' ? '#cbd5e1' : '#475569'} />
                <Text style={[styles.moveBtnText, selectedCard.col === 'backlog' && { color: '#cbd5e1' }]}>
                  Move Back
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.moveBtn, styles.moveBtnForward, selectedCard.col === 'done' && styles.moveBtnDisabled]}
                onPress={() => handleMoveCard(selectedCard, 'forward')}
                disabled={selectedCard.col === 'done'}
              >
                <Text style={[styles.moveBtnTextForward, selectedCard.col === 'done' && { color: '#cbd5e1' }]}>
                  Move Forward
                </Text>
                <Ionicons name="arrow-forward" size={14}
                  color={selectedCard.col === 'done' ? '#cbd5e1' : '#fff'} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteCard(selectedCard.id)}>
              <Ionicons name="trash-outline" size={14} color="#f43f5e" />
              <Text style={styles.deleteBtnText}>Remove from pipeline</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Zoom bar */}
      <View style={styles.zoomBar}>
        <TouchableOpacity
          style={[styles.zoomBtn, zoomIndex === 0 && styles.zoomBtnDisabled]}
          onPress={() => setZoomIndex(i => Math.max(0, i - 1))}
          disabled={zoomIndex === 0}
        >
          <Ionicons name="remove" size={16} color={zoomIndex === 0 ? '#cbd5e1' : '#475569'} />
        </TouchableOpacity>

        <View style={styles.zoomLevels}>
          {ZOOM_LEVELS.map((_, idx) => (
            <TouchableOpacity key={idx} onPress={() => setZoomIndex(idx)}>
              <View style={[styles.zoomDot, idx === zoomIndex && styles.zoomDotActive]} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.zoomLabel}>{Math.round(zoom * 100)}%</Text>

        <TouchableOpacity
          style={[styles.zoomBtn, zoomIndex === ZOOM_LEVELS.length - 1 && styles.zoomBtnDisabled]}
          onPress={() => setZoomIndex(i => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
          disabled={zoomIndex === ZOOM_LEVELS.length - 1}
        >
          <Ionicons name="add" size={16} color={zoomIndex === ZOOM_LEVELS.length - 1 ? '#cbd5e1' : '#475569'} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.zoomResetBtn} onPress={() => setZoomIndex(2)}>
          <Text style={styles.zoomResetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* Add card modal */}
      <AddPipelineCardModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={(newCard) => {
          setCards(prev => [...prev, {
            ...newCard,
            id: `local-${Date.now()}`,
            createdAt: Date.now(),
          }]);
        }}
        defaultCol={addTargetCol}
        teamMembers={teamMembers}
        customers={customers}
        language={language}
      />
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#1e293b' },
  headerSub:   { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, marginTop: 2 },
  progressBox:  { alignItems: 'flex-end', gap: 4 },
  progressLabel:{ fontSize: 11, fontWeight: '700', color: '#10b981' },
  progressTrack:{ width: 80, height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, overflow: 'hidden' },
  progressBar:  { height: 4, backgroundColor: '#10b981', borderRadius: 2 },
  progressCount:{ fontSize: 10, color: '#94a3b8', fontWeight: '600' },

  filterBar:    { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', maxHeight: 44 },
  filterContent:{ paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row' },
  filterChip:   { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', marginRight: 6 },
  filterChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  filterText:       { fontSize: 11, fontWeight: '700', color: '#64748b' },
  filterTextActive: { color: '#fff' },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248,250,252,0.92)',
    alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 20,
  },
  loadingText: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },

  boardWrapper: { flex: 1 },
  board:        { flex: 1 },
  boardContent: { padding: 12, flexDirection: 'row', paddingBottom: 70 },

  column: {
    backgroundColor: '#fff', borderRadius: 20,
    borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden', maxHeight: 600,
  },
  columnHover: { borderColor: '#10b981', borderWidth: 1.5, backgroundColor: '#f0fdf4' },

  colHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  colAccent:    { width: 4, height: 16, borderRadius: 2 },
  colTitle:     { flex: 1, fontWeight: '900', color: '#1e293b' },
  colCount:     { backgroundColor: '#f1f5f9', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 },
  colCountText: { fontSize: 10, fontWeight: '700', color: '#64748b' },
  colBody:      { flex: 1, padding: 10 },

  emptyCol: {
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#e2e8f0',
    borderRadius: 12, height: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emptyColHover: { borderColor: '#10b981', backgroundColor: '#f0fdf4' },
  emptyColText:  { fontSize: 11, color: '#cbd5e1', fontWeight: '600' },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    margin: 8, marginTop: 0, padding: 8, borderRadius: 10,
    borderWidth: 1, borderStyle: 'dashed', borderColor: '#e2e8f0', justifyContent: 'center',
  },
  addBtnText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },

  loadMoreCol: { width: 140, marginHorizontal: COL_MARGIN, justifyContent: 'center', alignItems: 'center' },
  loadMoreBtn: {
    backgroundColor: '#fff', borderRadius: 20, borderWidth: 1.5,
    borderColor: '#10b981', borderStyle: 'dashed', padding: 20,
    alignItems: 'center', gap: 8, width: '100%',
  },
  loadMoreText: { fontSize: 12, fontWeight: '700', color: '#10b981' },
  loadMoreSub:  { fontSize: 9, color: '#94a3b8', fontWeight: '600' },

  ghost:    { position: 'absolute', zIndex: 999 },
  ghostCard:{
    backgroundColor: '#fff', borderRadius: 14, padding: 12,
    borderWidth: 1.5, borderColor: '#10b981',
    shadowColor: '#10b981', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 10, gap: 8,
  },
  ghostTitle:   { fontSize: 13, fontWeight: '700', color: '#1e293b' },
  ghostTag:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
  ghostTagText: { fontSize: 10, fontWeight: '700' },

  priorityDot: { width: 8, height: 8, borderRadius: 4 },

  detailBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.4)',
    justifyContent: 'flex-end', zIndex: 50,
  },
  detailSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, gap: 14,
  },
  detailHeader:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  detailTitle:   { flex: 1, fontSize: 15, fontWeight: '900', color: '#1e293b', lineHeight: 22 },

  sourceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#eef2ff', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, alignSelf: 'flex-start',
  },
  sourceBadgeText: { fontSize: 10, fontWeight: '700', color: '#6366f1' },

  detailMeta:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  detailTag:      { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  detailTagText:  { fontSize: 11, fontWeight: '700' },
  detailMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailMetaText: { fontSize: 12, color: '#64748b', fontWeight: '600' },

  detailCol:      { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailColLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', letterSpacing: 1 },
  detailColBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1.5, backgroundColor: 'transparent' },
  detailColText:  { fontSize: 11, fontWeight: '900' },

  detailActions: { flexDirection: 'row', gap: 10 },
  moveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 12, borderRadius: 12, borderWidth: 1,
    borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
  },
  moveBtnDisabled:    { opacity: 0.4 },
  moveBtnForward:     { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  moveBtnText:        { fontSize: 11, fontWeight: '700', color: '#475569' },
  moveBtnTextForward: { fontSize: 11, fontWeight: '700', color: '#fff' },

  deleteBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 10 },
  deleteBtnText:{ fontSize: 12, color: '#f43f5e', fontWeight: '700' },

  zoomBar: {
    position: 'absolute', bottom: 16, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 8, gap: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, elevation: 6,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  zoomBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
  },
  zoomBtnDisabled: { opacity: 0.4 },
  zoomLevels:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  zoomDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: '#e2e8f0' },
  zoomDotActive:{ backgroundColor: '#10b981', width: 8, height: 8, borderRadius: 4 },
  zoomLabel:   { fontSize: 11, fontWeight: '700', color: '#64748b', minWidth: 36, textAlign: 'center' },
  zoomResetBtn:{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#f1f5f9', borderRadius: 8 },
  zoomResetText:{ fontSize: 10, fontWeight: '700', color: '#64748b' },
});

export default PipelineView;