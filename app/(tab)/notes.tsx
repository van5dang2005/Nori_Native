import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { CustomerLog, Customer, Language } from '@/src/types/types';
import PersonalNotesView from '@/src/components/PersonalNotesView'; // Đảm bảo đường dẫn này đúng với file View mình vừa tạo
import { useNotes } from '@/src/hooks/useNote';
import { useDebounce } from '@/src/hooks/useDebounce';

interface NotesPageProps {
  customers: Customer[];
  currentUserId: string;
  onSelectLog: (customerId: string, logId: string) => void;
  language: Language;
}

const NotesPage: React.FC<NotesPageProps> = ({ 
  customers, 
  currentUserId, 
  onSelectLog, 
  language 
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [priority, setPriority] = useState('all');

  // Reset về trang 1 khi thay đổi điều kiện lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, priority]);

  // Gọi Hook lấy dữ liệu
  const { 
    data: notesData, 
    pagination: paginationNotesData, 
    isLoading: isLoadingNotes 
  } = useNotes({
    search: debouncedSearch, 
    page: currentPage, 
    priority: priority !== 'all' ? priority : undefined
  });

  const logs: CustomerLog[] = notesData || [];

  return (
    <View style={styles.pageContainer}>
      {/* Hiển thị Loading Overlay nếu đang tải dữ liệu lần đầu */}
      {isLoadingNotes && currentPage === 1 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      )}

      <PersonalNotesView
        logs={logs}
        pagination={paginationNotesData}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        currentUserId={currentUserId}
        onSelectLog={onSelectLog}
        language={language}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        isLoading={isLoadingNotes}
        priority={priority}
        setPriority={setPriority}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NotesPage;