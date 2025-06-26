import { useState } from "react";
import { useLocation } from "wouter";
import { useUserData } from "@/hooks/useUserData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NavigationHeader } from "@/components/navigation-header";
import { 
  TrendingDown, 
  Users, 
  Plus, 
  Store,
  DollarSign,
  Award,
  UserPlus,
  Search
} from "lucide-react";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { data, addGroup } = useUserData();
  const { user, stores, groups: userGroups, savedDeals } = data;

  const [newGroupName, setNewGroupName] = useState("");
  const [joinGroupCode, setJoinGroupCode] = useState("");

  const handleCreateGroup = () => {
    if (newGroupName.trim()) {
      addGroup({
        name: newGroupName,
        memberCount: 1,
        totalSavings: 0,
        myContribution: 0,
        weeklyGoal: 50.00,
        currentWeekSavings: 0,
        members: [
          { id: user.id, name: "You", savings: 0, rank: 1, avatar: user.avatar }
        ],
        recentActivity: []
      });
      setNewGroupName("");
    }
  };

  // Calculate real-time statistics from saved deals
  const personalDeals = savedDeals?.filter(deal => !deal.groupId) || [];
  const allDeals = savedDeals || [];
  const totalLifetimeSavings = allDeals.reduce((sum, deal) => sum + deal.savingsAmount, 0);
  const totalPersonalSavingsFromDeals = personalDeals.reduce((sum, deal) => sum + deal.savingsAmount, 0);
  
  // Calculate savings by store from actual saved deals (including both personal and group deals)
  const allStoresFromDeals = new Map<string, { name: string; savings: number; deals: number; logo: string; }>();
  
  // First, collect all unique stores from saved deals
  savedDeals?.forEach(deal => {
    const dealStore = deal.store;
    if (allStoresFromDeals.has(dealStore)) {
      const existing = allStoresFromDeals.get(dealStore)!;
      existing.savings += deal.savingsAmount;
      existing.deals += 1;
    } else {
      allStoresFromDeals.set(dealStore, {
        name: dealStore,
        savings: deal.savingsAmount,
        deals: 1,
        logo: "🏪" // Default logo
      });
    }
  });
  
  // Now match with predefined stores to get proper logos and names
  const storeStatsFromDeals = Array.from(allStoresFromDeals.entries()).map(([dealStoreName, dealStoreData]) => {
    // Try to find matching predefined store
    const matchingStore = stores.find(store => {
      const dealStore = dealStoreName.toLowerCase().trim();
      const storeName = store.name.toLowerCase().trim();
      
      // Try exact match first
      if (dealStore === storeName) return true;
      
      // Try partial matching (store name contains deal store or vice versa)
      if (dealStore.includes(storeName) || storeName.includes(dealStore)) return true;
      
      // Handle special cases and common variations
      if (storeName.includes('shoppers') && dealStore.includes('shoppers')) return true;
      if (storeName.includes('metro') && dealStore.includes('metro')) return true;
      if (storeName.includes('loblaws') && dealStore.includes('loblaws')) return true;
      if (storeName.includes('no frills') && dealStore.includes('no frills')) return true;
      if (storeName.includes('food basics') && dealStore.includes('food basics')) return true;
      if (storeName.includes('sobeys') && dealStore.includes('sobeys')) return true;
      if (storeName.includes('freshco') && dealStore.includes('freshco')) return true;
      if (storeName.includes('farm boy') && dealStore.includes('farm boy')) return true;
      if (storeName.includes('valu-mart') && dealStore.includes('valu')) return true;
      if (storeName.includes('independent') && dealStore.includes('independent')) return true;
      if (storeName.includes('zehrs') && dealStore.includes('zehrs')) return true;
      if (storeName.includes('fortinos') && dealStore.includes('fortinos')) return true;
      if (storeName.includes('superstore') && (dealStore.includes('superstore') || dealStore.includes('rcss'))) return true;
      if (storeName.includes('walmart') && dealStore.includes('walmart')) return true;
      if (storeName.includes('costco') && dealStore.includes('costco')) return true;
      if (storeName.includes('canadian tire') && (dealStore.includes('canadian tire') || dealStore.includes('ct'))) return true;
      if (storeName.includes('dollarama') && dealStore.includes('dollarama')) return true;
      if (storeName.includes('bulk barn') && dealStore.includes('bulk')) return true;
      if (storeName.includes('t&t') && (dealStore.includes('t&t') || dealStore.includes('t and t'))) return true;
      
      return false;
    });
    
    // Use predefined store info if found, otherwise use the deal store data
    return {
      id: matchingStore?.id || dealStoreName.toLowerCase().replace(/\s+/g, '-'),
      name: matchingStore?.name || dealStoreData.name,
      logo: matchingStore?.logo || dealStoreData.logo,
      savings: dealStoreData.savings,
      deals: dealStoreData.deals
    };
  }).filter(store => store.deals > 0); // Only show stores where you've saved deals

  // Get user's rank in each group from actual group data
  const getMyRankInGroup = (group: any) => {
    // Sort members by savings in descending order and calculate ranks
    const sortedMembers = [...group.members].sort((a, b) => b.savings - a.savings);
    
    // Assign ranks based on sorted order
    const rankedMembers = sortedMembers.map((member, index) => ({
      ...member,
      rank: index + 1
    }));
    
    // Find the current user's rank
    const myMember = rankedMembers.find((member: any) => member.name === 'You');
    return myMember ? myMember.rank : group.memberCount;
  };

  // Calculate additional real-time stats
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const thisMonthDeals = savedDeals?.filter(deal => {
    const dealDate = new Date(deal.savedAt);
    return dealDate.getMonth() === currentMonth && dealDate.getFullYear() === currentYear;
  }) || [];
  
  const thisMonthSavings = thisMonthDeals.reduce((sum, deal) => sum + deal.savingsAmount, 0);
  const storesShoppedCount = storeStatsFromDeals.length; // Already filtered to only stores with deals

  return (
    <div className="flex flex-col h-full">
      <NavigationHeader />
      <div className="flex-1 overflow-auto">
        <div className="p-6 bg-gray-900 min-h-full">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                <p className="text-gray-300 mt-1">Track your savings and manage your shopping groups</p>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2 bg-green-600/20 text-green-300 border-green-600">
                Total Saved: ${totalLifetimeSavings.toFixed(2)}
              </Badge>
            </div>

        {/* Personal Savings by Store */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Store className="w-5 h-5 text-blue-400" />
              My Savings by Store
            </CardTitle>
          </CardHeader>
          <CardContent>
            {storeStatsFromDeals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {storeStatsFromDeals.map((store, index) => (
                  <div key={index} className="bg-gray-700 border border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{store.logo}</span>
                        <h3 className="font-semibold text-white">{store.name}</h3>
                      </div>
                      <Badge variant="secondary" className="text-xs bg-gray-600 text-gray-200">
                        {store.deals} deals
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-300">Total Saved</span>
                        <span className="font-semibold text-green-400">${store.savings.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Store className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                <p className="text-lg font-medium">No deals saved yet</p>
                <p className="text-sm text-gray-500 mt-1">Start saving deals to see your store savings here!</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4 border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                  onClick={() => setLocation('/browser')}
                >
                  <Search className="w-4 h-4 mr-2" />
                  Start Shopping
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shopping Groups */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="w-5 h-5 text-purple-400" />
                My Shopping Groups
              </CardTitle>
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="border-green-500/50 bg-green-600/10 text-green-300 hover:bg-green-600/20 hover:text-green-200 hover:border-green-400 transition-colors">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Join Group
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-800 border-gray-700">
                    <DialogHeader>
                      <DialogTitle className="text-white">Join a Shopping Group</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Enter group invite code"
                        value={joinGroupCode}
                        onChange={(e) => setJoinGroupCode(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                      />
                      <Button className="w-full bg-blue-600 hover:bg-blue-700">Join Group</Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white border border-blue-500/50 shadow-lg transition-all hover:shadow-blue-500/25">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Group
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-gray-800 border-gray-700">
                    <DialogHeader>
                      <DialogTitle className="text-white">Create New Shopping Group</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Enter group name"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                      />
                      <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleCreateGroup}>
                        Create Group
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userGroups.map((group) => (
                <div key={group.id} className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-600/30 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-white">{group.name}</h3>
                      <p className="text-sm text-gray-300">{group.memberCount} members</p>
                    </div>
                    <Badge variant="outline" className="bg-purple-600/20 text-purple-300 border-purple-600">
                      Active
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-300">Group Total</span>
                      <span className="font-semibold text-purple-400">${group.totalSavings.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-300">My Contribution</span>
                      <span className="font-semibold text-green-400">${group.myContribution.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-xs text-gray-400">
                        Rank: #{getMyRankInGroup(group)} of {group.memberCount}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-purple-400 hover:text-purple-300"
                        onClick={() => setLocation(`/${group.id}/browser`)}
                      >
                        Shop Together
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {userGroups.length === 0 && (
                <div className="col-span-2 text-center py-8 text-gray-400">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-500" />
                  <p>No groups yet. Create or join a group to start saving together!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-600/20 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-300">This Month</p>
                  <p className="text-2xl font-bold text-green-400">${thisMonthSavings.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/20 rounded-lg">
                  <Store className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-300">Stores Shopped</p>
                  <p className="text-2xl font-bold text-blue-400">{storesShoppedCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600/20 rounded-lg">
                  <Award className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-300">Groups Joined</p>
                  <p className="text-2xl font-bold text-purple-400">{userGroups.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}
