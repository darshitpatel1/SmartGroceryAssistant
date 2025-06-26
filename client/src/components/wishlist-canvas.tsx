import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShoppingCart, Heart, Star, MapPin, Zap, Plus, Trash2, Edit3, CheckCircle, Crown } from 'lucide-react';

interface GroceryItem {
  id: string;
  name: string;
  selected: boolean;
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
  { id: '1', name: 'Milk', selected: false },
  { id: '2', name: 'Bread', selected: false },
  { id: '3', name: 'Eggs', selected: false },
  { id: '4', name: 'Butter', selected: false },
  { id: '5', name: 'Cheese', selected: false },
  { id: '6', name: 'Chicken', selected: false },
  { id: '7', name: 'Bananas', selected: false },
  { id: '8', name: 'Apples', selected: false },
];

export function WishlistCanvas() {
  const [postalCode, setPostalCode] = useState('M5V 3A1');
  const [groceryList, setGroceryList] = useState<GroceryItem[]>(defaultGroceryList);
  const [newItem, setNewItem] = useState('');
  const [currentDeals, setCurrentDeals] = useState<Deal[]>([]);
  const [isEditingPostal, setIsEditingPostal] = useState(false);

  // Mock deals for demonstration - these match the real Flipp.com results from your screenshot
  const mockDeals: Deal[] = [
    {
      id: '1',
      item: 'Milk',
      brand: 'Silk Almond',
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
      brand: 'Organic Meadow',
      store: 'Metro',
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
        selected: false
      };
      setGroceryList([...groceryList, newGroceryItem]);
      setNewItem('');
    }
  };

  const toggleItem = (id: string) => {
    setGroceryList(groceryList.map(item => 
      item.id === id ? { ...item, selected: !item.selected } : item
    ));
  };

  const removeItem = (id: string) => {
    setGroceryList(groceryList.filter(item => item.id !== id));
  };

  const getQuickList = () => {
    const selectedItems = groceryList.filter(item => item.selected).map(item => item.name).join(' ');
    return `${postalCode} ${selectedItems}`;
  };

  const selectedItems = groceryList.filter(item => item.selected);

  return (
    <div className="h-full bg-black text-white flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Smart Grocery Assistant</h2>
              <p className="text-sm text-gray-400">Find the best deals in your area</p>
            </div>
          </div>
        </div>

        {/* Postal Code Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-5 h-5 text-blue-400" />
            <span className="text-lg font-medium text-white">Your Location</span>
          </div>
          {isEditingPostal ? (
            <div className="flex gap-3">
              <Input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value.toUpperCase())}
                className="bg-gray-900 border-gray-700 text-white text-lg"
                placeholder="M5V 3A1"
              />
              <Button
                onClick={() => setIsEditingPostal(false)}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            <div 
              onClick={() => setIsEditingPostal(true)}
              className="flex items-center gap-3 bg-gray-900 px-4 py-3 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors"
            >
              <Badge variant="outline" className="border-blue-500 text-blue-400 text-lg px-3 py-1">
                {postalCode}
              </Badge>
              <Edit3 className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Click to edit</span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            onClick={() => navigator.clipboard.writeText(getQuickList())}
            className="bg-blue-600 hover:bg-blue-700 h-12 text-base"
            disabled={selectedItems.length === 0}
          >
            <MapPin className="w-5 h-5 mr-2" />
            Postal Code
          </Button>
          <Button
            onClick={() => setCurrentDeals(mockDeals)}
            className="bg-green-600 hover:bg-green-700 h-12 text-base"
            disabled={selectedItems.length === 0}
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            Quick List ({selectedItems.length})
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Left side - Grocery List */}
        <div className="w-80 border-r border-gray-800 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Grocery List</h3>
            <Badge variant="secondary" className="bg-gray-800 text-gray-300">
              {selectedItems.length}/{groceryList.length} selected
            </Badge>
          </div>

          {/* Add new item */}
          <div className="flex gap-2 mb-4">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addNewItem()}
              placeholder="Add grocery item..."
              className="bg-gray-900 border-gray-700 text-white"
            />
            <Button
              onClick={addNewItem}
              className="bg-green-600 hover:bg-green-700 px-4"
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
                    item.selected
                      ? 'bg-green-900/30 border-green-700/50 text-green-200'
                      : 'bg-gray-900 border-gray-700 hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => toggleItem(item.id)}
                      className="w-5 h-5 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500"
                    />
                    <span className={`${item.selected ? 'line-through opacity-75' : ''}`}>
                      {item.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    className="h-8 w-8 p-0 text-gray-500 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Right side - Deal Display */}
        <div className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-xl">Best Deals Found</h3>
            <Badge variant="outline" className="border-gray-600 text-gray-300 text-base px-3 py-1">
              {currentDeals.length} deals
            </Badge>
          </div>

          {currentDeals.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <ShoppingCart className="w-20 h-20 mx-auto mb-6 opacity-30" />
              <p className="text-xl mb-3">No deals to show yet</p>
              <p className="text-base">Select items from your grocery list and click "Quick List" to find the best prices</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-6">
                {/* Best Deal - Highlighted */}
                {currentDeals.find(deal => deal.isBest) && (
                  <Card className="bg-gradient-to-r from-green-900/60 to-emerald-900/60 border-2 border-green-500/50 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black px-4 py-2 font-bold flex items-center gap-2">
                      <Crown className="w-4 h-4" />
                      BEST DEAL
                    </div>
                    <CardContent className="p-8">
                      {(() => {
                        const bestDeal = currentDeals.find(deal => deal.isBest)!;
                        return (
                          <>
                            <div className="flex items-start justify-between mb-6">
                              <div>
                                <h4 className="text-2xl font-bold text-white mb-2">
                                  {bestDeal.brand && `${bestDeal.brand} `}{bestDeal.item}
                                </h4>
                                {bestDeal.packageSize && (
                                  <p className="text-lg text-gray-300">{bestDeal.packageSize}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-4xl font-bold text-green-300 mb-2">{bestDeal.price}</div>
                                <div className="text-lg text-white">{bestDeal.store}</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="border-green-400 text-green-300 text-lg px-3 py-1">
                                  <Star className="w-4 h-4 mr-2" />
                                  {bestDeal.confidence}% match
                                </Badge>
                              </div>
                              <Button className="bg-green-600 hover:bg-green-700 text-white text-lg px-6 py-3">
                                <Heart className="w-5 h-5 mr-2" />
                                Save This Deal
                              </Button>
                            </div>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}

                {/* Other Deals */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-400 uppercase tracking-wide">Other Options</h4>
                  {currentDeals.filter(deal => !deal.isBest).map((deal) => (
                    <Card key={deal.id} className="bg-gray-900 border-gray-700 hover:bg-gray-800 transition-colors">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-white text-lg mb-2">
                              {deal.brand && `${deal.brand} `}{deal.item}
                            </h5>
                            <div className="flex items-center gap-6 text-gray-400 mb-2">
                              <span className="text-lg">{deal.store}</span>
                              {deal.packageSize && <span>{deal.packageSize}</span>}
                              <Badge variant="outline" className="border-gray-600 text-gray-400">
                                {deal.confidence}%
                              </Badge>
                            </div>
                            {deal.savings && (
                              <div className="flex items-center gap-2 text-orange-400">
                                <Zap className="w-4 h-4" />
                                {deal.savings}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-white mb-2">{deal.price}</div>
                            <Button variant="outline" className="border-gray-600 hover:bg-gray-700">
                              <Plus className="w-4 h-4 mr-2" />
                              Add to Cart
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