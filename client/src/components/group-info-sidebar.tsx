import { useState, useEffect } from "react";
import { useUserData } from "@/hooks/useUserData";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Users, 
  Trophy, 
  TrendingUp,
  Target,
  Crown,
  Medal,
  Award,
  Heart,
  ChevronDown,
  ChevronUp,
  Receipt
} from "lucide-react";

interface GroupInfoSidebarProps {
  groupId?: string;
}

export function GroupInfoSidebar({ groupId }: GroupInfoSidebarProps) {
  const { getGroup, data } = useUserData();
  const [selectedGroup, setSelectedGroup] = useState(getGroup("family-shoppers"));

  // Collapsible states
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);
  const [isGoalExpanded, setIsGoalExpanded] = useState(false);
  const [isLeaderboardExpanded, setIsLeaderboardExpanded] = useState(false);
  const [isDealsExpanded, setIsDealsExpanded] = useState(false);

  // Split bill states
  const [selectedDeals, setSelectedDeals] = useState<string[]>([]);
  const [memberShares, setMemberShares] = useState<Record<string, number>>({});
  const [splitMethod, setSplitMethod] = useState<'equal' | 'custom' | 'assign'>('equal');
  const [itemAssignments, setItemAssignments] = useState<Record<string, string[]>>({});

  // Load group data based on groupId and update when data changes
  useEffect(() => {
    if (groupId) {
      const group = getGroup(groupId);
      if (group) {
        setSelectedGroup(group);
      }
    } else {
      // Default to family-shoppers if no groupId
      const defaultGroup = getGroup("family-shoppers");
      if (defaultGroup) {
        setSelectedGroup(defaultGroup);
      }
    }
  }, [groupId, getGroup, data]); // Add data as dependency to re-run when data changes

  if (!selectedGroup) {
    return (
      <div className="w-80 bg-gray-900 text-white p-4 flex flex-col border-r border-gray-700 h-full overflow-hidden">
        <div className="text-center py-8">
          <Users className="w-12 h-12 mx-auto mb-3 text-gray-500" />
          <p className="text-gray-400">Group not found</p>
        </div>
      </div>
    );
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-4 h-4 text-yellow-500" />;
      case 2: return <Medal className="w-4 h-4 text-gray-400" />;
      case 3: return <Award className="w-4 h-4 text-orange-500" />;
      default: return <span className="w-4 h-4 flex items-center justify-center text-xs font-bold text-gray-500">#{rank}</span>;
    }
  };

  const weeklyProgress = (selectedGroup.currentWeekSavings / selectedGroup.weeklyGoal) * 100;

  // Get group deals from localStorage
  const groupDeals = data.savedDeals?.filter(deal => deal.groupId === selectedGroup.id) || [];
  
  // Initialize member shares when group changes
  useEffect(() => {
    if (selectedGroup) {
      const initialShares: Record<string, number> = {};
      const initialAssignments: Record<string, string[]> = {};
      selectedGroup.members.forEach(member => {
        initialShares[member.id] = 0;
      });
      groupDeals.forEach(deal => {
        initialAssignments[deal.id] = [];
      });
      setMemberShares(initialShares);
      setItemAssignments(initialAssignments);
    }
  }, [selectedGroup, groupDeals]);

  // Calculate split amounts
  const calculateSplit = () => {
    const selectedDealObjects = groupDeals.filter(deal => selectedDeals.includes(deal.id));
    const totalAmount = selectedDealObjects.reduce((sum, deal) => sum + parseFloat(deal.price.replace('$', '')), 0);
    
    if (splitMethod === 'equal') {
      const equalShare = totalAmount / selectedGroup.members.length;
      const result: Record<string, number> = {};
      selectedGroup.members.forEach(member => {
        result[member.id] = equalShare;
      });
      return result;
    } else if (splitMethod === 'assign') {
      // Calculate based on item assignments
      const result: Record<string, number> = {};
      selectedGroup.members.forEach(member => {
        result[member.id] = 0;
      });
      
      selectedDealObjects.forEach(deal => {
        const assignedMembers = itemAssignments[deal.id] || [];
        if (assignedMembers.length > 0) {
          const itemPrice = parseFloat(deal.price.replace('$', ''));
          const pricePerPerson = itemPrice / assignedMembers.length;
          assignedMembers.forEach(memberId => {
            result[memberId] = (result[memberId] || 0) + pricePerPerson;
          });
        }
      });
      
      return result;
    } else {
      return memberShares;
    }
  };

  const handleSplitConfirm = () => {
    const splits = calculateSplit();
    const selectedDealObjects = groupDeals.filter(deal => selectedDeals.includes(deal.id));
    
    // Here you could save the split information to localStorage or send to a backend
    console.log('Split confirmed:', {
      deals: selectedDealObjects,
      splits: splits,
      method: splitMethod,
      itemAssignments: splitMethod === 'assign' ? itemAssignments : undefined
    });
    
    // Reset states
    setSelectedDeals([]);
    setMemberShares({});
    setSplitMethod('equal');
    setItemAssignments({});
    
    // Show confirmation (you could add a toast notification here)
    alert('Bill split successfully! Each member has been notified of their share.');
  };

  const toggleDealSelection = (dealId: string) => {
    setSelectedDeals(prev => 
      prev.includes(dealId) 
        ? prev.filter(id => id !== dealId)
        : [...prev, dealId]
    );
  };

  const updateMemberShare = (memberId: string, amount: number) => {
    setMemberShares(prev => ({
      ...prev,
      [memberId]: amount
    }));
  };

  const toggleItemAssignment = (dealId: string, memberId: string) => {
    setItemAssignments(prev => {
      const currentAssignments = prev[dealId] || [];
      const isAssigned = currentAssignments.includes(memberId);
      
      return {
        ...prev,
        [dealId]: isAssigned 
          ? currentAssignments.filter(id => id !== memberId)
          : [...currentAssignments, memberId]
      };
    });
  };

  return (
    <div className="w-80 bg-gray-900 text-white border-r border-gray-700 h-full flex flex-col">
      {/* Scrollable content area */}
      <div className="p-4 flex-1 flex flex-col min-h-0 overflow-auto space-y-4">
        {/* Group Header */}
        <Card className="bg-gray-800 border-gray-700 flex-shrink-0">
        <CardHeader className="text-center pb-2 px-4 pt-4">
          <div className="w-16 h-16 mx-auto mb-2 bg-purple-600 rounded-full flex items-center justify-center">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-lg font-semibold text-white">{selectedGroup.name}</h2>
          <p className="text-xs text-gray-400">{selectedGroup.memberCount} members</p>
        </CardHeader>
        {isHeaderExpanded && (
          <CardContent className="pt-0 px-4 pb-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-gray-300">Group Total</span>
                <span className="text-sm font-semibold text-purple-400">${selectedGroup.totalSavings.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-300">My Contribution</span>
                <span className="text-sm font-semibold text-green-400">${selectedGroup.myContribution.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Weekly Goal */}
      <Card className="bg-gray-800 border-gray-700 flex-shrink-0">
        <CardHeader className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-400" />
              Weekly Goal
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsGoalExpanded(!isGoalExpanded)}
              className="text-gray-400 hover:text-white p-1"
            >
              {isGoalExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        {isGoalExpanded && (
          <CardContent className="px-4 pb-3">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-gray-300">Progress</span>
                <span className="text-xs text-blue-400">${selectedGroup.currentWeekSavings.toFixed(2)} / ${selectedGroup.weeklyGoal.toFixed(2)}</span>
              </div>
              <Progress value={weeklyProgress} className="h-2" />
              <p className="text-xs text-gray-400">
                {weeklyProgress >= 100 ? "🎉 Goal achieved!" : `$${(selectedGroup.weeklyGoal - selectedGroup.currentWeekSavings).toFixed(2)} to go`}
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Leaderboard */}
      <Card className={`bg-gray-800 border-gray-700 flex-shrink-0 ${isLeaderboardExpanded ? 'max-h-48' : ''} flex flex-col`}>
        <CardHeader className="px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              Leaderboard
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsLeaderboardExpanded(!isLeaderboardExpanded)}
              className="text-gray-400 hover:text-white p-1"
            >
              {isLeaderboardExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        {isLeaderboardExpanded && (
          <CardContent className="px-4 pb-3 flex-1 min-h-0 overflow-hidden">
            <div className="h-full overflow-y-auto scrollbar-hide space-y-2">
              {selectedGroup.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {getRankIcon(member.rank)}
                    </div>
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="bg-gray-600 text-white text-xs">
                        {member.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <span className={`text-xs font-medium ${member.name === 'You' ? 'text-blue-300' : 'text-gray-200'}`}>
                      {member.name}
                    </span>
                  </div>
                  <span className="text-xs text-green-400">${member.savings.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Group Saved Deals - Scrollable */}
      <Card className={`bg-gray-800 border-gray-700 ${isDealsExpanded ? 'flex-1 min-h-0' : 'flex-shrink-0'} flex flex-col`}>
        <CardHeader className="px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-400" />
              Group Saved Deals
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDealsExpanded(!isDealsExpanded)}
              className="text-gray-400 hover:text-white p-1"
            >
              {isDealsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        {isDealsExpanded && (
          <CardContent className="px-4 pb-3 flex-1 min-h-0 overflow-hidden">
            <div className="h-full overflow-y-auto scrollbar-hide space-y-2">
              {groupDeals.length > 0 ? (
                groupDeals.map((deal) => (
                    <div key={deal.id} className="p-2 rounded bg-gray-700/30 border border-gray-600/30">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-medium text-gray-200">
                          {deal.brand ? `${deal.brand} ` : ''}{deal.item}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(deal.savedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-300">{deal.store}</span>
                          <span className="text-xs font-bold text-white">{deal.price}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs bg-green-600/20 text-green-300 px-1.5 py-0.5">
                          +${deal.savingsAmount.toFixed(2)}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-400">Saved by {deal.savedBy}</div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-4">
                  <Heart className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                  <p className="text-xs text-gray-400">No group deals saved yet</p>
                  <p className="text-xs text-gray-500">Start shopping together!</p>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
      </div>

      {/* Quick Actions - Always visible at bottom */}
      <div className="p-4 pt-0 space-y-1 flex-shrink-0">
        <Dialog>
          <DialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="w-full justify-start text-green-400 hover:text-green-300 hover:bg-green-900/20 h-8 text-xs font-medium"
              disabled={groupDeals.length === 0}
            >
              <Receipt className="w-3 h-3 mr-2" />
              Split Bill/Items
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Split Bill/Items - {selectedGroup.name}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Select Deals */}
              <div>
                <h3 className="text-sm font-medium text-white mb-3">Select deals to split:</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {groupDeals.map((deal) => (
                    <div key={deal.id} className="flex items-center space-x-3 p-2 rounded bg-gray-700/30 border border-gray-600/30">
                      <Checkbox
                        checked={selectedDeals.includes(deal.id)}
                        onCheckedChange={() => toggleDealSelection(deal.id)}
                      />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-medium text-gray-200">
                            {deal.brand ? `${deal.brand} ` : ''}{deal.item}
                          </span>
                          <span className="text-sm font-bold text-white">{deal.price}</span>
                        </div>
                        <div className="text-xs text-gray-400">{deal.store} • Saved by {deal.savedBy}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Split Method */}
              {selectedDeals.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-white mb-3">Split method:</h3>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="equal"
                        name="splitMethod"
                        checked={splitMethod === 'equal'}
                        onChange={() => setSplitMethod('equal')}
                        className="text-green-500"
                      />
                      <label htmlFor="equal" className="text-sm text-gray-300">Split equally among all members</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="custom"
                        name="splitMethod"
                        checked={splitMethod === 'custom'}
                        onChange={() => setSplitMethod('custom')}
                        className="text-green-500"
                      />
                      <label htmlFor="custom" className="text-sm text-gray-300">Custom amounts per member</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="assign"
                        name="splitMethod"
                        checked={splitMethod === 'assign'}
                        onChange={() => setSplitMethod('assign')}
                        className="text-green-500"
                      />
                      <label htmlFor="assign" className="text-sm text-gray-300">Assign items to specific members</label>
                    </div>
                  </div>
                </div>
              )}

              {/* Item Assignments */}
              {selectedDeals.length > 0 && splitMethod === 'assign' && (
                <div>
                  <h3 className="text-sm font-medium text-white mb-3">Assign items to members:</h3>
                  <div className="space-y-3">
                    {groupDeals.filter(deal => selectedDeals.includes(deal.id)).map((deal) => (
                      <div key={deal.id} className="p-3 rounded bg-gray-700/30 border border-gray-600/30">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="text-sm font-medium text-gray-200">
                              {deal.brand ? `${deal.brand} ` : ''}{deal.item}
                            </span>
                            <div className="text-xs text-gray-400">{deal.store}</div>
                          </div>
                          <span className="text-sm font-bold text-white">{deal.price}</span>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="text-xs text-gray-400 mb-2">Assign to:</div>
                          <div className="grid grid-cols-2 gap-2">
                            {selectedGroup.members.map((member) => {
                              const isAssigned = itemAssignments[deal.id]?.includes(member.id) || false;
                              return (
                                <div
                                  key={member.id}
                                  onClick={() => toggleItemAssignment(deal.id, member.id)}
                                  className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                                    isAssigned 
                                      ? 'bg-green-600/20 border border-green-500/50' 
                                      : 'bg-gray-600/30 border border-gray-500/30 hover:bg-gray-600/50'
                                  }`}
                                >
                                  <Avatar className="w-5 h-5">
                                    <AvatarFallback className="bg-gray-600 text-white text-xs">
                                      {member.avatar}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className={`text-xs ${isAssigned ? 'text-green-300 font-medium' : 'text-gray-300'}`}>
                                    {member.name}
                                  </span>
                                  {isAssigned && (
                                    <span className="text-xs text-green-400 ml-auto">
                                      ${(parseFloat(deal.price.replace('$', '')) / (itemAssignments[deal.id]?.length || 1)).toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Member Shares */}
              {selectedDeals.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-white mb-3">
                    {splitMethod === 'equal' ? 'Equal shares:' : splitMethod === 'assign' ? 'Member totals:' : 'Custom amounts:'}
                  </h3>
                  <div className="space-y-2">
                    {selectedGroup.members.map((member) => {
                      const splits = calculateSplit();
                      const memberAmount = splits[member.id] || 0;
                      
                      return (
                        <div key={member.id} className="flex items-center justify-between p-2 rounded bg-gray-700/30">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="bg-gray-600 text-white text-xs">
                                {member.avatar}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-gray-200">{member.name}</span>
                          </div>
                          
                          {splitMethod === 'equal' || splitMethod === 'assign' ? (
                            <span className="text-sm font-medium text-green-400">
                              ${memberAmount.toFixed(2)}
                            </span>
                          ) : (
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              value={memberShares[member.id] || ''}
                              onChange={(e) => updateMemberShare(member.id, parseFloat(e.target.value) || 0)}
                              className="w-20 h-8 bg-gray-600 border-gray-500 text-white text-sm text-right"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Total */}
                  <div className="mt-4 p-3 rounded bg-gray-700 border border-gray-600">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-white">Total Amount:</span>
                      <span className="text-lg font-bold text-green-400">
                        ${groupDeals.filter(deal => selectedDeals.includes(deal.id))
                          .reduce((sum, deal) => sum + parseFloat(deal.price.replace('$', '')), 0)
                          .toFixed(2)}
                      </span>
                    </div>
                    {splitMethod === 'custom' && (
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-gray-400">Assigned:</span>
                        <span className="text-xs text-gray-400">
                          ${Object.values(memberShares).reduce((sum, amount) => sum + amount, 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              {selectedDeals.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleSplitConfirm}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    disabled={
                      (splitMethod === 'custom' && Object.values(memberShares).reduce((sum, amount) => sum + amount, 0) === 0) ||
                      (splitMethod === 'assign' && !Object.values(itemAssignments).some(assignments => assignments.length > 0))
                    }
                  >
                    Confirm Split
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedDeals([]);
                      setMemberShares({});
                      setSplitMethod('equal');
                      setItemAssignments({});
                    }}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Reset
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
        
        <Button 
          variant="ghost" 
          size="sm"
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800 h-8 text-xs"
        >
          <Target className="w-3 h-3 mr-2" />
          Set Group Goal
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm"
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800 h-8 text-xs"
        >
          <Users className="w-3 h-3 mr-2" />
          Invite Members
        </Button>
      </div>
    </div>
  );
}
