import React from 'react';
import { View, StyleSheet } from 'react-native';
import PipelineView from '@/src/components/PipelineView';
import { useAuth } from '@/src/hooks/useAuth';
import { useCustomers } from '@/src/hooks/useCustomer';
import { useDashboardUsers } from '@/src/hooks/useUser';
import LoadingOverlay from '@/src/components/LoadingOverlay';

export default function PipelinePage() {
  const { current_user_id, language } = useAuth();
  const { data: customersData, isLoading: isLoadingCustomers } = useCustomers(1);
  const { data: usersData, isLoading: isLoadingUsers } = useDashboardUsers();

  if (isLoadingCustomers || isLoadingUsers) {
    return <LoadingOverlay visible />;
  }

  return (
    <View style={styles.container}>
      <PipelineView
        teamMembers={usersData || []}
        customers={customersData || []}
        language={language}
        currentUserId={current_user_id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
});
