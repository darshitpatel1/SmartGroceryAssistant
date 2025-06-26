import { useState, useEffect } from "react";
import { useUserData } from "@/hooks/useUserData";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Settings, 
  MapPin, 
  ShoppingCart, 
  TrendingDown,
  Edit3,
  Target,
  DollarSign,
  Check,
  X,
  Heart,
  Store,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export function UserProfileSidebar() {
  const { data, updateUser } = useUserData();
  const { user, recentSearches, savedDeals } = data;
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPostal, setIsEditingPostal] = useState(false);
  const [tempName, setTempName] = useState(user.name);
  const [tempPostal, setTempPostal] = useState(user.postalCode);

  // Collapsible states
  const [isProfileExpanded, setIsProfileExpanded] = useState(true);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [isDealsExpanded, setIsDealsExpanded] = useState(false);

  // Calculate monthly savings from saved deals
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const thisMonthDeals = savedDeals?.filter(deal => {
    const dealDate = new Date(deal.savedAt);
    return dealDate.getMonth() === currentMonth && dealDate.getFullYear() === currentYear;
  }) || [];
  
  const totalSavingsThisMonth = thisMonthDeals.reduce((sum, deal) => sum + deal.savingsAmount, 0);
  const itemsFoundThisMonth = thisMonthDeals.length;
  const bestDealThisMonth = thisMonthDeals.reduce((max, deal) => 
    deal.savingsAmount > max ? deal.savingsAmount : max, 0
  );

  const handleSaveName = () => {
    updateUser({ name: tempName });
    setIsEditingName(false);
  };

  const handleCancelName = () => {
    setTempName(user.name);
    setIsEditingName(false);
  };

  const handleSavePostal = () => {
    updateUser({ postalCode: tempPostal });
    setIsEditingPostal(false);
  };

  const handleCancelPostal = () => {
    setTempPostal(user.postalCode);
    setIsEditingPostal(false);
  };

  // Update temp values when user data changes
  useEffect(() => {
    setTempName(user.name);
    setTempPostal(user.postalCode);
  }, [user.name, user.postalCode]);

  return (
    <div className="w-80 bg-gray-900 text-white p-4 flex flex-col border-r border-gray-700 h-full">
      {/* Scrollable content area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-auto space-y-4">
      {/* User Profile Header */}
      <Card className="bg-gray-800 border-gray-700 flex-shrink-0">
        <CardHeader className="text-center pb-2 px-4 pt-4">
          <Avatar className="w-16 h-16 mx-auto mb-2">
            <AvatarImage src="/placeholder-avatar.jpg" />
            <AvatarFallback className="bg-blue-600 text-white">
              {user.avatar}
            </AvatarFallback>
          </Avatar>
          
          {isEditingName ? (
            <div className="space-y-2">
              <Input
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white text-center text-sm"
                placeholder="Enter your name"
              />
              <div className="flex gap-2 justify-center">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleSaveName}
                  className="text-green-400 hover:text-green-300 h-6 px-2"
                >
                  <Check className="w-3 h-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleCancelName}
                  className="text-red-400 hover:text-red-300 h-6 px-2"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-lg font-semibold text-white">{user.name}</h2>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setTempName(user.name);
                  setIsEditingName(true);
                }}
                className="text-gray-400 hover:text-white p-1"
                title="Edit name"
              >
                <Edit3 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </CardHeader>
        {isProfileExpanded && (
          <CardContent className="pt-0 px-4 pb-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-3 h-3 text-blue-400" />
                <span className="text-xs text-gray-300">Location</span>
              </div>
              
              {isEditingPostal ? (
                <div className="space-y-2">
                  <Input
                    value={tempPostal}
                    onChange={(e) => setTempPostal(e.target.value.toUpperCase())}
                    className="bg-gray-700 border-gray-600 text-white text-xs"
                    placeholder="Enter postal code"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleSavePostal}
                      className="text-green-400 hover:text-green-300 h-6 px-2"
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleCancelPostal}
                      className="text-red-400 hover:text-red-300 h-6 px-2"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="bg-blue-600/20 text-blue-300 border-blue-600 text-xs">
                    {user.postalCode}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setTempPostal(user.postalCode);
                      setIsEditingPostal(true);
                    }}
                    className="text-xs text-gray-400 hover:text-white h-6 px-2"
                  >
                    Change
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Shopping Stats */}
      <Card className="bg-gray-800 border-gray-700 flex-shrink-0">
        <CardHeader className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-green-400" />
              Savings This Month
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsStatsExpanded(!isStatsExpanded)}
              className="text-gray-400 hover:text-white p-1"
            >
              {isStatsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        {isStatsExpanded && (
          <CardContent className="px-4 pb-3">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300 text-xs">Total Saved</span>
                <span className="text-green-400 font-semibold text-xs">${totalSavingsThisMonth.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300 text-xs">Items Found</span>
                <span className="text-blue-400 font-semibold text-xs">{itemsFoundThisMonth}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300 text-xs">Best Deal</span>
                <span className="text-purple-400 font-semibold text-xs">
                  {bestDealThisMonth > 0 ? `$${bestDealThisMonth.toFixed(2)} saved` : 'No deals yet'}
                </span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Saved Deals - Scrollable */}
      <Card className={`bg-gray-800 border-gray-700 ${isDealsExpanded ? 'flex-1 min-h-0' : 'flex-shrink-0'} flex flex-col`}>
        <CardHeader className="px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-400" />
              Saved Deals
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
              {savedDeals && savedDeals.length > 0 ? (
                savedDeals
                  .filter(deal => !deal.groupId) // Only show personal deals in user sidebar
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
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-300">{deal.store}</span>
                          <span className="text-xs font-bold text-white">{deal.price}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs bg-green-600/20 text-green-300 px-1.5 py-0.5">
                          +${deal.savingsAmount.toFixed(2)}
                        </Badge>
                      </div>
                    </div>
                  ))
              ) : (
                <div className="text-center py-4">
                  <Heart className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                  <p className="text-xs text-gray-400">No saved deals yet</p>
                  <p className="text-xs text-gray-500">Start shopping to save deals!</p>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
      </div>

      {/* Quick Actions - Always visible at bottom */}
      <div className="mt-3 space-y-1 flex-shrink-0">
        <Button 
          variant="ghost" 
          size="sm"
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800 h-8 text-xs"
        >
          <Target className="w-3 h-3 mr-2" />
          Shopping Goals
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm"
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800 h-8 text-xs"
        >
          <DollarSign className="w-3 h-3 mr-2" />
          Budget Tracker
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm"
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800 h-8 text-xs"
        >
          <Settings className="w-3 h-3 mr-2" />
          Settings
        </Button>
      </div>
    </div>
  );
}
