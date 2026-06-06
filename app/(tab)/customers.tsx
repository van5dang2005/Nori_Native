import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserRole, CustomerLog, LogCategory, Attachment, LogPriority, LogStatus, LogType } from '@/src/types/types';
import CustomerView from '@/src/components/CustomerView';
import AddCustomerModal from '@/src/components/AddCustomerModal';
import EditCustomerModal from '@/src/components/EditCustomerModal';
import CustomersListView from '@/src/components/CustomersListView';

import { useAuth } from '@/src/hooks/useAuth';
import { useCustomers, useCustomerById } from '@/src/hooks/useCustomer';
import { useUsers } from '@/src/hooks/useUser';
import LoadingOverlay from '@/src/components/LoadingOverlay';

interface CustomerPageProps {
  activeView: string;
  selectedCustomerId?: string;
  setSelectedCustomerId?: React.Dispatch<React.SetStateAction<string | undefined>>;
  setActiveView: React.Dispatch<React.SetStateAction<string>>;
  handleAddLog: (
    logId: string,
    targetId: string,
    content: string,
    category: LogCategory,
    isPrivate?: boolean,
    attachments?: Attachment[],
    priority?: LogPriority,
    dueDate?: number,
    assigneeId?: string,
    customTimestamp?: number,
    status?: LogStatus,
    logType?: LogType
  ) => void;
  handleEditLog: (
    id: string,
    newContent: string,
    priority?: LogPriority,
    dueDate?: number,
    assigneeId?: string,
    status?: LogStatus,
    logType?: LogType
  ) => void;
  handleMentions: (
    text: string,
    targetCustomerId?: string,
    targetLogId?: string,
    isChat?: boolean,
    excludeText?: string,
    excludeUserId?: string,
    targetChatId?: string
  ) => void;
}

const CustomerPage: React.FC<CustomerPageProps> = ({ 
  handleAddLog, 
  handleEditLog, 
  handleMentions, 
  activeView, 
  setActiveView, 
  selectedCustomerId, 
  setSelectedCustomerId 
}) => {
  const { current_user_id, role, language } = useAuth();
  const hasShownError = useRef(false);

  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);

  const [currentCustomerPage, setCurrentCustomerPage] = useState(1);
  const { data: customersData, isLoading: isLoadingCustomers } = useCustomers(currentCustomerPage);

  const customerFromList = useMemo(
    () => customersData?.find(c => c.id === selectedCustomerId),
    [customersData, selectedCustomerId]
  );

  const shouldFetchById = !!selectedCustomerId && !customerFromList;
  const { data: customerById, isLoading: isLoadingById, error: customerByIdError } = useCustomerById(selectedCustomerId, shouldFetchById);

  useEffect(() => {
    if (customerByIdError && !hasShownError.current) {
      hasShownError.current = true;
      Alert.alert(
        "Access Denied",
        "Customer not permitted. Please contact your administrator.",
        [{ text: "OK", onPress: () => {
          setActiveView("personal-notes");
          setSelectedCustomerId?.(undefined);
        }}]
      );
    }
  }, [customerByIdError]);

  if (customerByIdError) return null;

  const customer = customerFromList ?? customerById;

  if (isLoadingCustomers || (shouldFetchById && isLoadingById)) {
    return <LoadingOverlay visible={true} />;
  }

  return (
    <View style={styles.container}>
      {isAddCustomerOpen && (
        <AddCustomerModal
          isOpen={isAddCustomerOpen}
          onClose={() => setIsAddCustomerOpen(false)}
          onSubmit={() => {}}
          currentUserId={current_user_id}
        />
      )}

      {activeView === 'customers' && (
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => setActiveView('all-customers')}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#0ea5e9" />
          </TouchableOpacity>
        </View>
      )}

      {activeView === 'customers' && customer && (
        <CustomerView
          customer={customer}
          currentUserId={current_user_id}
          scrolledLogId={null}
          onAddLog={handleAddLog}
          onEditLog={handleEditLog}
          onEditCustomer={() => setIsEditCustomerOpen(true)}
          onMentions={handleMentions}
          userRole={role}
          language={language}
        />
      )}

      {activeView === 'customers' && isEditCustomerOpen && customer && (
        <EditCustomerModal
          isOpen={isEditCustomerOpen}
          onClose={() => setIsEditCustomerOpen(false)}
          customer={customer}
          onUpdate={() => {}}
          onDelete={() => {}}
          onRestore={() => {}}
          currentUserId={current_user_id}
          userRole={role}
          language={language}
        />
      )}

      {activeView === 'all-customers' && (
        <CustomersListView
          onSelect={id => {
            setSelectedCustomerId?.(id);
            setActiveView('customers');
          }}
          language={language}
          onAddCustomer={() => setIsAddCustomerOpen(true)}
          canManage={role === UserRole.SUPERVISOR || role === UserRole.MANAGER}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default CustomerPage;