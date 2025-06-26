import { useState, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import userData from '../data/userData.json';

export interface User {
  id: string;
  name: string;
  avatar: string;
  postalCode: string;
  totalSavings: number;
  memberSince: string;
}

export interface Store {
  id: string;
  name: string;
  logo: string;
  savings: number;
  deals: number;
}

export interface GroupMember {
  id: string;
  name: string;
  savings: number;
  rank: number;
  avatar: string;
}

export interface GroupActivity {
  member: string;
  item: string;
  savings: number;
  store: string;
  time: string;
}

export interface Group {
  id: string;
  name: string;
  memberCount: number;
  totalSavings: number;
  myContribution: number;
  weeklyGoal: number;
  currentWeekSavings: number;
  members: GroupMember[];
  recentActivity: GroupActivity[];
}

export interface RecentSearch {
  item: string;
  savings: number;
  count: number;
}

export interface SavedDeal {
  id: string;
  item: string;
  brand?: string;
  store: string;
  price: string;
  packageSize?: string;
  savings?: string;
  originalPrice?: string;
  savingsAmount: number;
  confidence: number;
  isBest?: boolean;
  savedAt: string;
  groupId?: string; // null for personal deals, groupId for group deals
  savedBy: string; // user name/id who saved the deal
}

export interface UserData {
  user: User;
  stores: Store[];
  groups: Group[];
  recentSearches: RecentSearch[];
  savedDeals: SavedDeal[];
}

export function useUserData() {
  const [data, setData] = useLocalStorage<UserData>('smartGroceryUserData', userData as UserData);
  const [loading, setLoading] = useState(false);

  const updateUser = (updates: Partial<User>) => {
    setData(prev => ({
      ...prev,
      user: { ...prev.user, ...updates }
    }));
  };

  const addGroup = (group: Omit<Group, 'id'>) => {
    const newGroup: Group = {
      ...group,
      id: group.name.toLowerCase().replace(/\s+/g, '-'),
    };
    setData(prev => ({
      ...prev,
      groups: [...prev.groups, newGroup]
    }));
  };

  const getGroup = (groupId: string): Group | undefined => {
    return data.groups.find(group => group.id === groupId);
  };

  const saveDeal = (deal: Omit<SavedDeal, 'id' | 'savedAt'>, groupId?: string) => {
    const savingsAmount = parseFloat(deal.savings?.replace(/[^0-9.]/g, '') || '0');
    
    const newDeal: SavedDeal = {
      ...deal,
      id: `deal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      savedAt: new Date().toISOString(),
      groupId,
      savingsAmount
    };

    setData(prev => {
      let updatedData = {
        ...prev,
        // Add the new saved deal
        savedDeals: [...(prev.savedDeals || []), newDeal],
        // Update user's total savings
        user: {
          ...prev.user,
          totalSavings: prev.user.totalSavings + savingsAmount
        },
        // Update store savings
        stores: prev.stores.map(store => 
          store.name.toLowerCase().includes(deal.store.toLowerCase()) ||
          deal.store.toLowerCase().includes(store.name.toLowerCase())
            ? { 
                ...store, 
                savings: store.savings + savingsAmount,
                deals: store.deals + 1
              }
            : store
        )
      };

      // If it's a group deal, update group data
      if (groupId) {
        const newActivity: GroupActivity = {
          member: deal.savedBy,
          item: deal.item,
          savings: savingsAmount,
          store: deal.store,
          time: 'just now'
        };

        updatedData.groups = prev.groups.map(group => {
          if (group.id === groupId) {
            const updatedMembers = group.members.map(member => 
              member.name === deal.savedBy 
                ? { ...member, savings: member.savings + savingsAmount }
                : member
            );

            // Recalculate rankings based on new savings
            const sortedMembers = updatedMembers.sort((a, b) => b.savings - a.savings);
            const membersWithNewRanks = sortedMembers.map((member, index) => ({
              ...member,
              rank: index + 1
            }));

            return {
              ...group,
              totalSavings: group.totalSavings + savingsAmount,
              myContribution: deal.savedBy === 'You' ? group.myContribution + savingsAmount : group.myContribution,
              currentWeekSavings: group.currentWeekSavings + savingsAmount,
              recentActivity: [newActivity, ...group.recentActivity.slice(0, 9)],
              members: membersWithNewRanks
            };
          }
          return group;
        });
      }

      return updatedData;
    });

    return newDeal;
  };

  return {
    data,
    loading,
    updateUser,
    addGroup,
    getGroup,
    saveDeal,
  };
}
