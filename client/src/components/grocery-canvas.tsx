import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShoppingCart, Heart, Star, MapPin, Zap, Plus, Trash2, Edit3, CheckCircle } from 'lucide-react';

interface GroceryItem {
  id: string;
  name: string;
  added: boolean;
}

interface Deal {
  id: string;
  item: string;
  brand?: string;
  store: string;
  price: string;
  packageSize?: string;
  savings?: string;
  points?: string;
  confidence: number;
  isBest?: boolean;
}

const defaultGroceryList: GroceryItem[] = [
  { id: '1', name: 'Milk', added: false },
  { id: '2', name: 'Bread', added: false },
  { id: '3', name: 'Eggs', added: false },
  { id: '4', name: 'Butter', added: false },
  { id: '5', name: 'Cheese', added: false },
  { id: '6', name: 'Chicken', added: false },
  { id: '7', name: 'Bananas', added: false },
  { id: '8', name: 'Apples', added: false },
];

export function GroceryCanvas() {
  const [postalCode, setPostalCode] = useState('M5V 3A1');
  const [groceryList, setGroceryList] = useState<GroceryItem[]>(defaultGroceryList);
  const [newItem, setNewItem] = useState('');
  const [currentDeals, setCurrentDeals] = useState<Deal[]>([]);
  const [isEditingPostal, setIsEditingPostal] = useState(false);

  // Mock deals for demonstration - in real app this would come from chatbot
  const mockDeals: Deal[] = [
    {
      id: '1',
      item: 'Milk',
      brand: 'Silk Silk Almond',
      store: 'Shoppers Drug Mart',
      price: '$5.79',
      packageSize: '1L',
      confidence: 95,
      isBest: true
    },
    {
      id: '2',
      item: 'Milk',
      brand: 'Lactantia Ultra PurFiltre',
      store: 'Rexall',
      price: '$4.99',
      packageSize: '1L',
      savings: 'Save $1.00',
      confidence: 88
    },
    {
      id: '3',
      item: 'Milk',
      brand: 'Organic Meadow Similkameen',
      store: 'Unspecified',
      price: '$6.99',
      packageSize: '1L',
      confidence: 82
    }
  ];

  const addNewItem = () => {
    if (newItem.trim()) {
      const newGroceryItem: GroceryItem = {
        id: Date.now().toString(),
        name: newItem.trim(),
        added: false
      };
      setGroceryList([...groceryList, newGroceryItem]);
      setNewItem('');
    }
  };

  const toggleItem = (id: string) => {
    setGroceryList(groceryList.map(item => 
      item.id === id ? { ...item, added: !item.added } : item
    ));
  };

  const removeItem = (id: string) => {
    setGroceryList(groceryList.filter(item => item.id !== id));
  };

  const getQuickList = () => {
    const selectedItems = groceryList.filter(item => item.added).map(item => item.name).join(' ');
    return `${postalCode} ${selectedItems}`;
  };

  const addedItems = groceryList.filter(item => item.added);

  return (
    <div className="h-full bg-black text-white flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Smart Grocery Assistant</h2>
              <p className="text-sm text-gray-400">Your personalized shopping companion</p>
            </div>
          </div>
        </div>

        {/* Postal Code Section */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-gray-300">Your Location</span>
          </div>
          {isEditingPostal ? (
            <div className="flex gap-2">
              <Input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                className="bg-gray-900 border-gray-700 text-white"
                placeholder="M5V 3A1"
              />
              <Button
                onClick={() => setIsEditingPostal(false)}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div 
              onClick={() => setIsEditingPostal(true)}
              className="flex items-center gap-2 bg-gray-900 px-3 py-2 rounded-md cursor-pointer hover:bg-gray-800 transition-colors"
            >
              <Badge variant="outline" className="border-blue-500 text-blue-400">
                {postalCode}
              </Badge>
              <Edit3 className="w-3 h-3 text-gray-400" />
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button
            onClick={() => navigator.clipboard.writeText(getQuickList())}
            className="bg-blue-600 hover:bg-blue-700 text-sm"
            disabled={addedItems.length === 0}
          >
            Quick List ({addedItems.length})
          </Button>
          <Button
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 text-sm"
            onClick={() => setCurrentDeals(mockDeals)}
          >
            Show Demo Deals
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Left side - Grocery List */}
        <div className="w-80 border-r border-gray-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Grocery List</h3>
            <Badge variant="secondary" className="bg-gray-800 text-gray-300">
              {addedItems.length}/{groceryList.length}
            </Badge>
          </div>

          {/* Add new item */}
          <div className="flex gap-2 mb-4">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addNewItem()}
              placeholder="Add grocery item..."
              className="bg-gray-900 border-gray-700 text-white text-sm"
            />
            <Button
              onClick={addNewItem}
              size="sm"
              className="bg-green-600 hover:bg-green-700 px-3"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Grocery items */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {groceryList.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    item.added
                      ? 'bg-green-900/30 border-green-700/50 text-green-200'
                      : 'bg-gray-900 border-gray-700 hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.added}
                      onChange={() => toggleItem(item.id)}
                      className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500"
                    />
                    <span className={`text-sm ${item.added ? 'line-through' : ''}`}>
                      {item.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    className="h-6 w-6 p-0 text-gray-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right side - Deal Display */}
        <div className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-lg">Best Deals Found</h3>
            <Badge variant="outline" className="border-gray-600 text-gray-300">
              {currentDeals.length} deals
            </Badge>
          </div>

          {currentDeals.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">No deals to show yet</p>
              <p className="text-sm">Select items from your grocery list and search for prices</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {/* Best Deal - Highlighted */}
                {currentDeals.find(deal => deal.isBest) && (
                  <Card className="bg-gradient-to-r from-green-900/60 to-emerald-900/60 border-2 border-green-500/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-green-500 text-white px-3 py-1 text-xs font-bold">
                      BEST DEAL
                    </div>
                    <CardContent className="p-6">
                      {(() => {
                        const bestDeal = currentDeals.find(deal => deal.isBest)!;
                        return (
                          <>
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h4 className="text-xl font-bold text-white mb-1">
                                  {bestDeal.brand && `${bestDeal.brand} `}{bestDeal.item}
                                </h4>
                                {bestDeal.packageSize && (
                                  <p className="text-sm text-gray-300">{bestDeal.packageSize}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-3xl font-bold text-green-300">{bestDeal.price}</div>
                                <div className="text-sm text-white">{bestDeal.store}</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="border-green-400 text-green-300">
                                  <Star className="w-3 h-3 mr-1" />
                                  {bestDeal.confidence}% match
                                </Badge>
                              </div>
                              <Button className="bg-green-600 hover:bg-green-700 text-white">
                                <Heart className="w-4 h-4 mr-2" />
                                Save Deal
                              </Button>
                            </div>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}

                {/* Other Deals */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Other Options</h4>
                  {currentDeals.filter(deal => !deal.isBest).map((deal) => (
                    <Card key={deal.id} className="bg-gray-900 border-gray-700 hover:bg-gray-800 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-white mb-1">
                              {deal.brand && `${deal.brand} `}{deal.item}
                            </h5>
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <span>{deal.store}</span>
                              {deal.packageSize && <span>{deal.packageSize}</span>}
                              <Badge variant="outline" className="border-gray-600 text-gray-400 text-xs">
                                {deal.confidence}%
                              </Badge>
                            </div>
                            {deal.savings && (
                              <div className="flex items-center gap-1 mt-1 text-orange-400 text-sm">
                                <Zap className="w-3 h-3" />
                                {deal.savings}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-white">{deal.price}</div>
                            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}