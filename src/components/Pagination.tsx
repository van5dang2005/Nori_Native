import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  style?: any;
}

const PaginationComponent: React.FC<PaginationProps> = ({ 
  currentPage, 
  totalItems, 
  itemsPerPage, 
  onPageChange, 
  style 
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (totalPages <= 1) return null;

  const progressPercent = (currentPage / totalPages) * 100;

  const pages: (number | string)[] = [];
  const range = 1;

  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 || 
      i === totalPages || 
      (i >= currentPage - range && i <= currentPage + range)
    ) {
      pages.push(i);
    } else if (i === currentPage - range - 1 || i === currentPage + range + 1) {
      if (!pages.includes('...')) {
         pages.push('...');
      }
    }
  }

  // Lọc bỏ các dấu ba chấm trùng lặp nếu có logic phức tạp hơn
  const filteredPages = pages.filter((item, index) => {
    if (item === '...') return pages[index - 1] !== '...';
    return true;
  });

  return (
    <View style={[styles.mainWrapper, style]}>
      <View style={styles.consoleContainer}>
        {/* LEFT NAVIGATION */}
        <View style={styles.navGroup}>
          <TouchableOpacity 
            onPress={() => onPageChange(1)}
            disabled={currentPage === 1}
            style={styles.navButton}
          >
            <Ionicons name="play-back" size={16} color={currentPage === 1 ? "#cbd5e1" : "#475569"} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            style={styles.navButton}
          >
            <Ionicons name="chevron-back" size={18} color={currentPage === 1 ? "#cbd5e1" : "#475569"} />
          </TouchableOpacity>
        </View>

        {/* PAGE NODES */}
        <View style={styles.pagesContainer}>
          {filteredPages.map((page, idx) => {
            const isNumber = typeof page === 'number';
            const isActive = currentPage === page;

            if (!isNumber) {
              return (
                <Text key={`dots-${idx}`} style={styles.dots}>...</Text>
              );
            }

            return (
              <TouchableOpacity
                key={`page-${page}`}
                onPress={() => onPageChange(page as number)}
                style={[styles.pageNode, isActive && styles.activePageNode]}
              >
                <Text style={[styles.pageText, isActive && styles.activePageText]}>
                  {(page as number).toString().padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* RIGHT NAVIGATION */}
        <View style={styles.navGroupRight}>
          <TouchableOpacity 
            onPress={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            style={styles.navButton}
          >
            <Ionicons name="chevron-forward" size={18} color={currentPage === totalPages ? "#cbd5e1" : "#475569"} />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            style={styles.navButton}
          >
            <Ionicons name="play-forward" size={16} color={currentPage === totalPages ? "#cbd5e1" : "#475569"} />
          </TouchableOpacity>
        </View>

        {/* DYNAMIC PROGRESS LINE */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
        </View>
      </View>

      {/* REFINED METRICS */}
      <View style={styles.metricsContainer}>
        <View style={styles.dotIndicator} />
        <Text style={styles.metricsText}>
          TOTAL <Text style={{ color: '#10b981' }}>{totalItems}</Text> ITEMS
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  consoleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.6)',
    borderRadius: 24,
    paddingVertical: 6,
    paddingHorizontal: 4,
    position: 'relative',
    overflow: 'hidden',
    // Shadow cho iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    // Elevation cho Android
    elevation: 5,
  },
  navGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#f1f5f9',
  },
  navGroupRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#f1f5f9',
  },
  navButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 6,
  },
  pageNode: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePageNode: {
    backgroundColor: '#10b981', // Màu primary của bạn
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  pageText: {
    fontSize: 11,
    fontFamily: 'Platform', // Hoặc 'System' / 'monospace'
    fontWeight: '700',
    color: '#475569',
  },
  activePageText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  dots: {
    width: 20,
    textAlign: 'center',
    color: '#cbd5e1',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 2,
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#f1f5f9',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#10b981',
  },
  metricsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  metricsText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 1.5,
  },
});

export default PaginationComponent;