import { useState, useEffect } from "react";
import { useUserData } from "@/hooks/useUserData";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
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
  ChevronUp
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
              {data.savedDeals && data.savedDeals.length > 0 ? (
                data.savedDeals
                  .filter(deal => deal.groupId === selectedGroup.id)
                  .map((deal) => (
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
