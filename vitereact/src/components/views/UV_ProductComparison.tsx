import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  X, 
  ShoppingCart, 
  Share2, 
  Printer, 
  ChevronLeft, 
  ChevronRight,
  Check,
  AlertCircle,
  Plus,
  RefreshCw
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Product {
  product_id: string;
  supplier_id: string;
  category_id: string;
  sku: string;
  product_name: string;
  description: string | null;
  price_per_unit: number;
  unit_of_measure: string;
  stock_quantity: number;
  status: string;
  primary_image_url: string | null;
  brand: string | null;
  specifications: Record<string, any> | null;
  dimensions: Record<string, any> | null;
  weight: number | null;
  business_name?: string;
  rating_average?: number;
  handling_time_days?: number;
}

interface ComparisonAttribute {
  attribute_key: string;
  attribute_label: string;
  values: (string | number | null)[];
  has_differences: boolean;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchComparisonProducts = async (productIds: string[], token: string | null): Promise<Product[]> => {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await axios.get(`${API_BASE}/products/compare`, {
    params: { product_ids: productIds.join(',') },
    headers
  });
  
  return response.data.filter((p: Product | null) => p !== null);
};

const addProductToCart = async (productId: string, token: string): Promise<any> => {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
  
  const response = await axios.post(
    `${API_BASE}/cart/items`,
    { product_id: productId, quantity: 1 },
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_ProductComparison: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // CRITICAL: Individual Zustand selectors (no object destructuring)
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);
  const fetchCart = useAppStore(state => state.fetch_cart);
  
  // Parse product IDs from URL
  const urlProductIds = searchParams.get('product_ids')?.split(',').filter(id => id.trim()) || [];
  
  // Local state
  const [showDifferencesOnly, setShowDifferencesOnly] = useState(false);
  // const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [shareSuccess, setShareSuccess] = useState(false);
  
  const maxProducts = 5;
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect_url=/compare');
    }
  }, [isAuthenticated, navigate]);
  
  // Fetch comparison products
  const { 
    data: comparisonProducts = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['comparison-products', urlProductIds.join(',')],
    queryFn: () => fetchComparisonProducts(urlProductIds, authToken),
    enabled: urlProductIds.length >= 2 && urlProductIds.length <= maxProducts,
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data) => data.map(p => ({
      ...p,
      price_per_unit: Number(p.price_per_unit || 0),
      stock_quantity: Number(p.stock_quantity || 0),
      rating_average: Number(p.rating_average || 0)
    }))
  });
  
  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: (productId: string) => addProductToCart(productId, authToken!),
    onSuccess: () => {
      fetchCart(); // Update global cart state
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    }
  });
  
  // Calculate not found products
  const notFoundProducts = useMemo(() => {
    if (!comparisonProducts) return [];
    const foundIds = comparisonProducts.map(p => p.product_id);
    return urlProductIds.filter(id => !foundIds.includes(id));
  }, [urlProductIds, comparisonProducts]);
  
  // Extract all unique attributes
  const comparisonAttributes = useMemo((): ComparisonAttribute[] => {
    if (comparisonProducts.length === 0) return [];
    
    const attributes: ComparisonAttribute[] = [
      {
        attribute_key: 'product_name',
        attribute_label: 'Product Name',
        values: comparisonProducts.map(p => p.product_name),
        has_differences: new Set(comparisonProducts.map(p => p.product_name)).size > 1
      },
      {
        attribute_key: 'price_per_unit',
        attribute_label: 'Price',
        values: comparisonProducts.map(p => p.price_per_unit),
        has_differences: new Set(comparisonProducts.map(p => p.price_per_unit)).size > 1
      },
      {
        attribute_key: 'supplier',
        attribute_label: 'Supplier',
        values: comparisonProducts.map(p => p.business_name || 'Unknown'),
        has_differences: new Set(comparisonProducts.map(p => p.business_name)).size > 1
      },
      {
        attribute_key: 'rating',
        attribute_label: 'Rating',
        values: comparisonProducts.map(p => p.rating_average || 0),
        has_differences: new Set(comparisonProducts.map(p => p.rating_average)).size > 1
      },
      {
        attribute_key: 'stock_quantity',
        attribute_label: 'In Stock',
        values: comparisonProducts.map(p => p.stock_quantity > 0 ? 'Yes' : 'No'),
        has_differences: new Set(comparisonProducts.map(p => p.stock_quantity > 0)).size > 1
      },
      {
        attribute_key: 'brand',
        attribute_label: 'Brand',
        values: comparisonProducts.map(p => p.brand || 'N/A'),
        has_differences: new Set(comparisonProducts.map(p => p.brand)).size > 1
      },
      {
        attribute_key: 'sku',
        attribute_label: 'SKU',
        values: comparisonProducts.map(p => p.sku),
        has_differences: new Set(comparisonProducts.map(p => p.sku)).size > 1
      },
      {
        attribute_key: 'delivery_time',
        attribute_label: 'Delivery Time',
        values: comparisonProducts.map(p => p.handling_time_days ? `${p.handling_time_days} days` : 'N/A'),
        has_differences: new Set(comparisonProducts.map(p => p.handling_time_days)).size > 1
      }
    ];
    
    // Add specification attributes
    const allSpecKeys = new Set<string>();
    comparisonProducts.forEach(p => {
      if (p.specifications) {
        Object.keys(p.specifications).forEach(key => allSpecKeys.add(key));
      }
    });
    
    allSpecKeys.forEach(key => {
      const values = comparisonProducts.map(p => 
        p.specifications?.[key]?.toString() || 'N/A'
      );
      
      attributes.push({
        attribute_key: `spec_${key}`,
        attribute_label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        values,
        has_differences: new Set(values).size > 1
      });
    });
    
    return attributes;
  }, [comparisonProducts]);
  
  // Filter attributes based on show_differences_only
  const displayedAttributes = useMemo(() => {
    if (!showDifferencesOnly) return comparisonAttributes;
    return comparisonAttributes.filter(attr => attr.has_differences);
  }, [comparisonAttributes, showDifferencesOnly]);
  
  // Find best value indicators
  const bestValueIndicators = useMemo(() => {
    if (comparisonProducts.length === 0) return {};
    
    const prices = comparisonProducts.map(p => p.price_per_unit);
    const minPrice = Math.min(...prices);
    const bestPriceIndex = prices.indexOf(minPrice);
    
    const deliveryTimes = comparisonProducts.map(p => p.handling_time_days || 999);
    const minDelivery = Math.min(...deliveryTimes);
    const fastestDeliveryIndex = deliveryTimes.indexOf(minDelivery);
    
    const ratings = comparisonProducts.map(p => p.rating_average || 0);
    const maxRating = Math.max(...ratings);
    const highestRatedIndex = ratings.indexOf(maxRating);
    
    return {
      bestPrice: bestPriceIndex,
      fastestDelivery: fastestDeliveryIndex,
      highestRated: highestRatedIndex
    };
  }, [comparisonProducts]);
  
  // ============================================================================
  // ACTIONS
  // ============================================================================
  
  const handleRemoveProduct = (productId: string) => {
    const updatedIds = urlProductIds.filter(id => id !== productId);
    
    if (updatedIds.length < 2) {
      navigate('/products');
      return;
    }
    
    setSearchParams({ product_ids: updatedIds.join(',') });
  };
  
  const handleAddToCart = async (product: Product) => {
    try {
      await addToCartMutation.mutateAsync(product.product_id);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    }
  };
  
  const handleAddAllToCart = async () => {
    try {
      for (const product of comparisonProducts) {
        await addToCartMutation.mutateAsync(product.product_id);
      }
    } catch (error) {
      console.error('Failed to add all to cart:', error);
    }
  };
  
  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 3000);
    });
  };
  
  const handleExport = () => {
    window.print();
  };
  
  const handleToggleDifferences = () => {
    setShowDifferencesOnly(!showDifferencesOnly);
  };
  
  // Mobile card navigation
  const handleNextCard = () => {
    setCurrentCardIndex((prev) => 
      prev < comparisonProducts.length - 1 ? prev + 1 : prev
    );
  };
  
  const handlePrevCard = () => {
    setCurrentCardIndex((prev) => prev > 0 ? prev - 1 : prev);
  };
  
  // ============================================================================
  // VALIDATION & ERROR STATES
  // ============================================================================
  
  if (urlProductIds.length === 0) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-12 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Products Selected</h2>
            <p className="text-gray-600 mb-6">Select products from the catalog to compare them side-by-side.</p>
            <Link 
              to="/products"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </>
    );
  }
  
  if (urlProductIds.length === 1) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-12 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Add More Products to Compare</h2>
            <p className="text-gray-600 mb-6">You need at least 2 products to make a comparison.</p>
            <Link 
              to="/products"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add More Products
            </Link>
          </div>
        </div>
      </>
    );
  }
  
  if (urlProductIds.length > maxProducts) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-12 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Too Many Products</h2>
            <p className="text-gray-600 mb-6">You can compare up to {maxProducts} products at once.</p>
            <Link 
              to="/products"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Back to Products
            </Link>
          </div>
        </div>
      </>
    );
  }
  
  // ============================================================================
  // LOADING STATE
  // ============================================================================
  
  if (isLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                <p className="text-gray-600 font-medium">Loading comparison...</p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
  
  // ============================================================================
  // ERROR STATE
  // ============================================================================
  
  if (error) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-12 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to Load Products</h2>
            <p className="text-gray-600 mb-6">There was an error loading the comparison data.</p>
            <button 
              onClick={() => refetch()}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
          </div>
        </div>
      </>
    );
  }
  
  // ============================================================================
  // NOT FOUND PRODUCTS WARNING
  // ============================================================================
  
  const NotFoundWarning = () => {
    if (notFoundProducts.length === 0) return null;
    
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-semibold text-amber-900 mb-1">
              Some Products Not Found
            </h3>
            <p className="text-sm text-amber-700">
              {notFoundProducts.length} product{notFoundProducts.length > 1 ? 's' : ''} could not be loaded. 
              Showing comparison with available products only.
            </p>
          </div>
        </div>
      </div>
    );
  };
  
  // ============================================================================
  // DESKTOP TABLE VIEW
  // ============================================================================
  
  const DesktopTableView = () => (
    <div className="overflow-x-auto bg-white rounded-xl shadow-lg border border-gray-200">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="sticky left-0 z-10 bg-gray-50 px-6 py-4 text-left text-sm font-semibold text-gray-900 min-w-[200px]">
              Attributes
            </th>
            {comparisonProducts.map((product, index) => (
              <th key={product.product_id} className="px-6 py-4 min-w-[280px]">
                <div className="relative">
                  <button
                    onClick={() => handleRemoveProduct(product.product_id)}
                    className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    aria-label="Remove product from comparison"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  
                  <div className="space-y-2">
                    {/* Best value indicators */}
                    <div className="flex flex-wrap gap-1 justify-center min-h-[24px]">
                      {bestValueIndicators.bestPrice === index && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          <Check className="w-3 h-3 mr-1" />
                          Best Price
                        </span>
                      )}
                      {bestValueIndicators.fastestDelivery === index && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          <Check className="w-3 h-3 mr-1" />
                          Fastest
                        </span>
                      )}
                      {bestValueIndicators.highestRated === index && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Check className="w-3 h-3 mr-1" />
                          Top Rated
                        </span>
                      )}
                    </div>
                    
                    {/* Product image */}
                    <div className="w-full aspect-square bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={product.primary_image_url || 'https://via.placeholder.com/280'}
                        alt={product.product_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        
        <tbody className="divide-y divide-gray-200">
          {displayedAttributes.map((attr, attrIndex) => (
            <tr 
              key={attr.attribute_key}
              className={attrIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
            >
              <td className="sticky left-0 z-10 px-6 py-4 text-sm font-medium text-gray-900 bg-inherit">
                {attr.attribute_label}
              </td>
              {attr.values.map((value, prodIndex) => (
                <td 
                  key={prodIndex} 
                  className={`px-6 py-4 text-sm text-gray-700 ${
                    attr.attribute_key === 'price_per_unit' && bestValueIndicators.bestPrice === prodIndex
                      ? 'bg-green-50 font-semibold'
                      : attr.attribute_key === 'delivery_time' && bestValueIndicators.fastestDelivery === prodIndex
                      ? 'bg-blue-50 font-semibold'
                      : attr.attribute_key === 'rating' && bestValueIndicators.highestRated === prodIndex
                      ? 'bg-yellow-50 font-semibold'
                      : ''
                  }`}
                >
                  {attr.attribute_key === 'price_per_unit' 
                    ? `$${Number(value).toFixed(2)}` 
                    : attr.attribute_key === 'rating'
                    ? `${Number(value).toFixed(1)} ★`
                    : value}
                </td>
              ))}
            </tr>
          ))}
          
          {/* Action buttons row */}
          <tr className="bg-white">
            <td className="sticky left-0 z-10 px-6 py-4 text-sm font-medium text-gray-900 bg-white">
              Actions
            </td>
            {comparisonProducts.map(product => (
              <td key={product.product_id} className="px-6 py-4">
                <div className="space-y-2">
                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={addToCartMutation.isPending || product.stock_quantity === 0}
                    className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addToCartMutation.isPending ? (
                      'Adding...'
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Add to Cart
                      </>
                    )}
                  </button>
                  
                  <Link
                    to={`/product/${product.product_id}`}
                    className="block w-full text-center px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
  
  // ============================================================================
  // MOBILE CARD VIEW
  // ============================================================================
  
  const MobileCardView = () => {
    const currentProduct = comparisonProducts[currentCardIndex];
    
    if (!currentProduct) return null;
    
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Card header with navigation */}
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={handlePrevCard}
            disabled={currentCardIndex === 0}
            className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center space-x-2">
            {comparisonProducts.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentCardIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentCardIndex ? 'bg-blue-600' : 'bg-gray-300'
                }`}
                aria-label={`View product ${index + 1}`}
              />
            ))}
          </div>
          
          <button
            onClick={handleNextCard}
            disabled={currentCardIndex === comparisonProducts.length - 1}
            className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        
        {/* Product card content */}
        <div className="p-6">
          {/* Best value badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {bestValueIndicators.bestPrice === currentCardIndex && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <Check className="w-3 h-3 mr-1" />
                Best Price
              </span>
            )}
            {bestValueIndicators.fastestDelivery === currentCardIndex && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                <Check className="w-3 h-3 mr-1" />
                Fastest Delivery
              </span>
            )}
            {bestValueIndicators.highestRated === currentCardIndex && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <Check className="w-3 h-3 mr-1" />
                Top Rated
              </span>
            )}
          </div>
          
          {/* Product image */}
          <div className="w-full aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
            <img
              src={currentProduct.primary_image_url || 'https://via.placeholder.com/400'}
              alt={currentProduct.product_name}
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Product info */}
          <h3 className="text-lg font-bold text-gray-900 mb-2">{currentProduct.product_name}</h3>
          <p className="text-2xl font-bold text-blue-600 mb-4">
            ${currentProduct.price_per_unit.toFixed(2)}
          </p>
          
          {/* Attributes list */}
          <div className="space-y-3 mb-6">
            {displayedAttributes.map(attr => (
              <div key={attr.attribute_key} className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-sm font-medium text-gray-700">{attr.attribute_label}</span>
                <span className="text-sm text-gray-900">
                  {attr.attribute_key === 'price_per_unit' 
                    ? `$${Number(attr.values[currentCardIndex]).toFixed(2)}` 
                    : attr.attribute_key === 'rating'
                    ? `${Number(attr.values[currentCardIndex]).toFixed(1)} ★`
                    : attr.values[currentCardIndex]}
                </span>
              </div>
            ))}
          </div>
          
          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => handleAddToCart(currentProduct)}
              disabled={addToCartMutation.isPending || currentProduct.stock_quantity === 0}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {addToCartMutation.isPending ? (
                'Adding...'
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Add to Cart
                </>
              )}
            </button>
            
            <Link
              to={`/product/${currentProduct.product_id}`}
              className="block w-full text-center px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              View Full Details
            </Link>
            
            <button
              onClick={() => handleRemoveProduct(currentProduct.product_id)}
              className="w-full flex items-center justify-center px-4 py-3 border border-red-200 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors"
            >
              <X className="w-5 h-5 mr-2" />
              Remove from Comparison
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Compare Products</h1>
                <p className="text-gray-600">
                  Comparing {comparisonProducts.length} product{comparisonProducts.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              <Link
                to="/products"
                className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add More Products
              </Link>
            </div>
            
            {/* Action bar */}
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={handleToggleDifferences}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showDifferencesOnly
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {showDifferencesOnly ? 'Show All Attributes' : 'Highlight Differences Only'}
              </button>
              
              <button
                onClick={handleAddAllToCart}
                disabled={addToCartMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-4 h-4 inline mr-2" />
                Add All to Cart
              </button>
              
              <button
                onClick={handleShare}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                <Share2 className="w-4 h-4 inline mr-2" />
                {shareSuccess ? 'Link Copied!' : 'Share'}
              </button>
              
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium hidden md:block"
              >
                <Printer className="w-4 h-4 inline mr-2" />
                Print
              </button>
            </div>
          </div>
          
          {/* Not found warning */}
          <NotFoundWarning />
          
          {/* Comparison view */}
          {comparisonProducts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-12 text-center">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Products to Compare</h3>
              <p className="text-gray-600 mb-6">The selected products could not be loaded.</p>
              <Link
                to="/products"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Browse Products
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop view */}
              <div className="hidden md:block">
                <DesktopTableView />
              </div>
              
              {/* Mobile view */}
              <div className="block md:hidden">
                <MobileCardView />
              </div>
            </>
          )}
          
          {/* Help text */}
          {comparisonProducts.length > 0 && (
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Comparison Tips</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Green highlights indicate the best price among compared products</li>
                <li>• Blue highlights show the fastest delivery time</li>
                <li>• Gold highlights indicate the highest-rated product</li>
                <li>• Use "Highlight Differences Only" to focus on key distinctions</li>
                <li>• Add products to your cart directly from the comparison</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_ProductComparison;