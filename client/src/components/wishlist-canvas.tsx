import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShoppingCart, Heart, Star, MapPin, Zap } from 'lucide-react';

interface WishlistItem {
  id: string;
  name: string;
  brand?: string;
  store: string;
  price: string;
  packageSize?: string;
  savings?: string;
  points?: string;
  areaCode?: string;
  addedAt: Date;
}

export function WishlistCanvas() {
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [areaCode] = useState('M5V'); // This would come from user input

  const addToWishlist = (item: WishlistItem) => {
    setWishlist(prev => [...prev, { ...item, id: Date.now().toString(), addedAt: new Date() }]);
  };

  const removeFromWishlist = (id: string) => {
    setWishlist(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="h-full bg-black text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold">Wishlist</h2>
          </div>
          <Badge variant="secondary" className="bg-gray-800 text-gray-300">
            <MapPin className="w-3 h-3 mr-1" />
            {areaCode}
          </Badge>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-gray-900 rounded-lg p-2 text-center">
            <div className="text-blue-400 font-semibold">{wishlist.length}</div>
            <div className="text-gray-400 text-xs">Items</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-2 text-center">
            <div className="text-green-400 font-semibold">
              {wishlist.reduce((acc, item) => {
                const price = parseFloat(item.price.replace(/[^0-9.]/g, '')) || 0;
                return acc + price;
              }, 0).toFixed(2)}
            </div>
            <div className="text-gray-400 text-xs">Total</div>
          </div>
        </div>
      </div>

      {/* Wishlist Items */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {wishlist.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Your wishlist is empty</p>
              <p className="text-xs text-gray-600">Items will appear here when you save deals</p>
            </div>
          ) : (
            wishlist.map((item) => (
              <Card key={item.id} className="bg-gray-900 border-gray-800 hover:bg-gray-800 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-white text-sm">
                        {item.brand && `${item.brand} `}{item.name}
                      </h4>
                      {item.packageSize && (
                        <p className="text-xs text-gray-400">{item.packageSize}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeFromWishlist(item.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-green-400 font-semibold text-sm">{item.price}</span>
                      <Badge variant="outline" className="text-xs border-gray-700 text-gray-300">
                        {item.store}
                      </Badge>
                    </div>
                    
                    {item.savings && (
                      <div className="flex items-center gap-1 text-xs text-orange-400">
                        <Star className="w-3 h-3" />
                        {item.savings}
                      </div>
                    )}
                    
                    {item.points && (
                      <div className="flex items-center gap-1 text-xs text-blue-400">
                        <Zap className="w-3 h-3" />
                        {item.points}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-2">
                    Added {item.addedAt.toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Quick Actions */}
      <div className="p-4 border-t border-gray-800">
        <div className="grid grid-cols-2 gap-2">
          <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 px-3 rounded-md transition-colors">
            Compare All
          </button>
          <button className="bg-green-600 hover:bg-green-700 text-white text-xs py-2 px-3 rounded-md transition-colors">
            Share List
          </button>
        </div>
      </div>
    </div>
  );
}