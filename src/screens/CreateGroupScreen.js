import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { createGlobalStyles } from '../styles/globalStyles';

// Mock data for group members
const mockMembers = [
  { id: '1', name: 'Benjamin Alexander', isAdmin: true },
  { id: '2', name: 'Sarah Johnson', isSelected: true },
  { id: '3', name: 'Michael Chen', isSelected: true },
  { id: '4', name: 'Emily Davis', isSelected: false },
  { id: '5', name: 'David Wilson', isSelected: true },
  { id: '6', name: 'Lisa Brown', isSelected: false },
  { id: '7', name: 'James Miller', isSelected: true },
  { id: '8', name: 'Add more', isAdd: true },
];

const CreateGroupScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const styles = createGlobalStyles(colors);
  
  const [groupType, setGroupType] = useState('work');
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState(mockMembers);

  const handleMemberToggle = (memberId) => {
    setMembers(prev => 
      prev.map(member => 
        member.id === memberId 
          ? { ...member, isSelected: !member.isSelected }
          : member
      )
    );
  };

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    const selectedMembers = members.filter(member => member.isSelected && !member.isAdd);
    if (selectedMembers.length === 0) {
      Alert.alert('Error', 'Please select at least one member');
      return;
    }

    Alert.alert(
      'Success',
      `Group "${groupName}" created successfully with ${selectedMembers.length} members!`,
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const renderMemberItem = ({ item }) => (
    <TouchableOpacity
      style={customStyles.memberItem}
      onPress={() => !item.isAdd && handleMemberToggle(item.id)}
      disabled={item.isAdd}
    >
      <View style={customStyles.memberAvatar}>
        {item.isAdd ? (
          <Ionicons name="add" size={24} color={colors.primary} />
        ) : (
          <Text style={customStyles.memberAvatarText}>
            {item.name.charAt(0)}
          </Text>
        )}
        {item.isSelected && !item.isAdd && (
          <View style={customStyles.selectedIndicator}>
            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
          </View>
        )}
      </View>
      <Text style={customStyles.memberName}>{item.name}</Text>
      {item.isAdmin && <Text style={customStyles.adminText}>Group Admin</Text>}
    </TouchableOpacity>
  );

  const customStyles = {
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.surface,
      paddingTop: 50,
      paddingBottom: 20,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      marginRight: 15,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginTop: 30,
      marginBottom: 30,
    },
    groupTypeContainer: {
      flexDirection: 'row',
      marginBottom: 30,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 4,
    },
    groupTypeButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
    },
    groupTypeButtonActive: {
      backgroundColor: colors.primary,
    },
    groupTypeButtonInactive: {
      backgroundColor: 'transparent',
    },
    groupTypeText: {
      fontSize: 16,
      fontWeight: '600',
    },
    groupTypeTextActive: {
      color: '#FFFFFF',
    },
    groupTypeTextInactive: {
      color: colors.text,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 15,
    },
    adminSection: {
      marginBottom: 30,
    },
    adminItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    adminAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 15,
    },
    adminAvatarText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    adminInfo: {
      flex: 1,
    },
    adminName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    adminRole: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    membersSection: {
      marginBottom: 30,
    },
    membersGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    memberItem: {
      width: '30%',
      alignItems: 'center',
      marginBottom: 20,
    },
    memberAvatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
      position: 'relative',
    },
    memberAvatarText: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#FFFFFF',
    },
    selectedIndicator: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      backgroundColor: colors.success,
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.background,
    },
    memberName: {
      fontSize: 12,
      color: colors.text,
      textAlign: 'center',
      fontWeight: '500',
    },
    adminText: {
      fontSize: 10,
      color: colors.primary,
      textAlign: 'center',
      marginTop: 2,
    },
    groupNameInput: {
      backgroundColor: colors.inputBackground,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.inputText,
      marginBottom: 30,
    },
    createButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      alignItems: 'center',
      marginBottom: 20,
      shadowColor: colors.primary,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    createButtonText: {
      color: '#FFFFFF',
      fontSize: 18,
      fontWeight: '600',
    },
  };

  return (
    <SafeAreaView style={customStyles.container}>
      <StatusBar
        barStyle={colors.isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={colors.surface}
      />
      
      <View style={customStyles.header}>
        <TouchableOpacity
          style={customStyles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={customStyles.headerTitle}>Create Group</Text>
      </View>

      <ScrollView style={customStyles.content} showsVerticalScrollIndicator={false}>
        <Text style={customStyles.title}>Create Groups for Team Work</Text>

        <View style={customStyles.groupTypeContainer}>
          <TouchableOpacity
            style={[
              customStyles.groupTypeButton,
              groupType === 'work' ? customStyles.groupTypeButtonActive : customStyles.groupTypeButtonInactive
            ]}
            onPress={() => setGroupType('work')}
          >
            <Text style={[
              customStyles.groupTypeText,
              groupType === 'work' ? customStyles.groupTypeTextActive : customStyles.groupTypeTextInactive
            ]}>
              Group work
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              customStyles.groupTypeButton,
              groupType === 'relationship' ? customStyles.groupTypeButtonActive : customStyles.groupTypeButtonInactive
            ]}
            onPress={() => setGroupType('relationship')}
          >
            <Text style={[
              customStyles.groupTypeText,
              groupType === 'relationship' ? customStyles.groupTypeTextActive : customStyles.groupTypeTextInactive
            ]}>
              Team relationship
            </Text>
          </TouchableOpacity>
        </View>

        <View style={customStyles.adminSection}>
          <Text style={customStyles.sectionTitle}>Group Admin</Text>
          <View style={customStyles.adminItem}>
            <View style={customStyles.adminAvatar}>
              <Text style={customStyles.adminAvatarText}>B</Text>
            </View>
            <View style={customStyles.adminInfo}>
              <Text style={customStyles.adminName}>Benjamin Alexander</Text>
              <Text style={customStyles.adminRole}>Group Admin</Text>
            </View>
          </View>
        </View>

        <View style={customStyles.membersSection}>
          <Text style={customStyles.sectionTitle}>Invited Members</Text>
          <View style={customStyles.membersGrid}>
            {members.map(member => renderMemberItem({ item: member }))}
          </View>
        </View>

        <TextInput
          style={customStyles.groupNameInput}
          placeholder="Enter group name..."
          placeholderTextColor={colors.placeholder}
          value={groupName}
          onChangeText={setGroupName}
        />

        <TouchableOpacity style={customStyles.createButton} onPress={handleCreateGroup}>
          <Text style={customStyles.createButtonText}>Create</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CreateGroupScreen;
