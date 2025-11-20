import React, { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { Package, TrendingUp, TrendingDown, AlertTriangle, ShoppingCart, Edit2, X, Save, Trash2, Plus, Scale } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Project {
  project_id: string;
  customer_id: string;
  project_name: string;
  description: string | null;
  total_value: number;
  item_count: number;
  created_date: string;
  last_updated_date: string;
}

interface ProjectItem {
  project_item_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity: number;
  saved_price: number;
  current_price: number;
  price_change: number;
  stock_quantity: number;
  availability_status: 'available' | 'insufficient_stock';
  primary_image_url: string | null;
  supplier_name: string;
  supplier_id: string;
  line_total_saved: number;
  line_total_current: number;
}

interface ProjectDetailResponse {
  project: Project;
  items: Array<{
    project_item_id: string;
    product_id: string;
    product_name: string;
    price_per_unit: number;
    quantity: number;
    stock_quantity: number;
    primary_image_url: string | null;
  }>;
}

interface LoadToCartResponse {
  message: string;
  added_items: number;
  unavailable_items: string[];
}

interface UpdateProjectPayload {
  project_name?: string;
  description?: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const fetchProjectDetail = async (project_id: string, token: string): Promise<ProjectDetailResponse> => {
  const response = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/projects/${project_id}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response.data;
};

const updateProjectInfo = async (
  project_id: string,
  payload: UpdateProjectPayload,
  token: string
): Promise<Project> => {
  const response = await axios.patch(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/projects/${project_id}`,
    payload,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response.data;
};

const loadProjectToCart = async (project_id: string, token: string): Promise<LoadToCartResponse> => {
  const response = await axios.post(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/projects/${project_id}/load-to-cart`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response.data;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_ProjectDetail: React.FC = () => {
  const { project_id } = useParams<{ project_id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // CRITICAL: Individual selectors to avoid infinite loops
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const fetchCart = useAppStore(state => state.fetch_cart);
  
  // Local UI State
  const [editMode, setEditMode] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [scaleMultiplier, setScaleMultiplier] = useState<number>(1);
  const [showScalePreview, setShowScalePreview] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  
  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['project', project_id],
    queryFn: () => fetchProjectDetail(project_id!, authToken!),
    enabled: !!project_id && !!authToken,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
    select: (response) => {
      // Transform backend response to frontend state shape
      const transformedItems: ProjectItem[] = (response.items || []).map(item => {
        const saved_price = Number(item.price_per_unit || 0);
        const current_price = saved_price; // Backend returns same price for now
        const quantity = Number(item.quantity || 0);
        const stock_quantity = Number(item.stock_quantity || 0);
        
        return {
          project_item_id: item.project_item_id,
          product_id: item.product_id,
          product_name: item.product_name,
          sku: 'N/A', // Not in backend response
          quantity,
          saved_price,
          current_price,
          price_change: current_price - saved_price,
          stock_quantity,
          availability_status: stock_quantity >= quantity ? 'available' : 'insufficient_stock',
          primary_image_url: item.primary_image_url,
          supplier_name: 'Unknown Supplier', // Not in backend response
          supplier_id: '', // Not in backend response
          line_total_saved: quantity * saved_price,
          line_total_current: quantity * current_price
        };
      });
      
      return {
        project: response.project,
        items: transformedItems
      };
    }
  });
  
  // React Query v5: Replace onSuccess with useEffect
  useEffect(() => {
    if (data?.project) {
      setProjectName(data.project.project_name || '');
      setProjectDescription(data.project.description || '');
    }
  }, [data]);
  
  // React Query v5: Replace onError with useEffect
  useEffect(() => {
    if (error) {
      const axiosError = error as any;
      if (axiosError.response?.status === 404 || axiosError.response?.status === 403) {
        setTimeout(() => navigate('/projects'), 3000);
      }
    }
  }, [error, navigate]);
  
  // ============================================================================
  // MUTATIONS
  // ============================================================================
  
  const updateProjectMutation = useMutation({
    mutationFn: (payload: UpdateProjectPayload) => 
      updateProjectInfo(project_id!, payload, authToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', project_id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setEditMode(false);
      setUnsavedChanges(false);
    },
    onError: (error: any) => {
      alert(`Failed to update project: ${error.response?.data?.message || error.message}`);
    }
  });
  
  const loadToCartMutation = useMutation({
    mutationFn: () => loadProjectToCart(project_id!, authToken!),
    onSuccess: async (response) => {
      // Refresh cart state
      await fetchCart();
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      
      // Show success message
      if (response.unavailable_items && response.unavailable_items.length > 0) {
        alert(`Added ${response.added_items} items to cart. ${response.unavailable_items.length} items were unavailable.`);
      } else {
        alert(`Successfully added ${response.added_items} items to cart!`);
      }
      
      // Navigate to cart
      navigate('/cart');
    },
    onError: (error: any) => {
      alert(`Failed to load project to cart: ${error.response?.data?.message || error.message}`);
    }
  });
  
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const projectTotals = useMemo(() => {
    if (!data?.items) {
      return {
        saved_total: 0,
        current_total: 0,
        price_difference: 0,
        price_change_percentage: 0
      };
    }
    
    const saved_total = data.items.reduce((sum, item) => sum + item.line_total_saved, 0);
    const current_total = data.items.reduce((sum, item) => sum + item.line_total_current, 0);
    const price_difference = current_total - saved_total;
    const price_change_percentage = saved_total > 0 
      ? ((price_difference / saved_total) * 100)
      : 0;
    
    return {
      saved_total,
      current_total,
      price_difference,
      price_change_percentage
    };
  }, [data?.items]);
  
  const scaledQuantities = useMemo(() => {
    if (!data?.items || scaleMultiplier === 1) return {};
    
    return data.items.reduce((acc, item) => {
      acc[item.project_item_id] = Math.ceil(item.quantity * scaleMultiplier);
      return acc;
    }, {} as Record<string, number>);
  }, [data?.items, scaleMultiplier]);
  
  const itemsWithStockWarnings = useMemo(() => {
    if (!data?.items) return [];
    return data.items.filter(item => item.availability_status === 'insufficient_stock');
  }, [data?.items]);
  
  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleSaveProject = () => {
    if (!unsavedChanges) {
      setEditMode(false);
      return;
    }
    
    updateProjectMutation.mutate({
      project_name: projectName,
      description: projectDescription || null
    });
  };
  
  const handleCancelEdit = () => {
    setProjectName(data?.project.project_name || '');
    setProjectDescription(data?.project.description || '');
    setEditMode(false);
    setUnsavedChanges(false);
  };
  
  const handleLoadToCart = () => {
    if (itemsWithStockWarnings.length > 0) {
      const confirmed = window.confirm(
        `${itemsWithStockWarnings.length} items have insufficient stock. Do you want to continue loading available items to cart?`
      );
      if (!confirmed) return;
    }
    
    loadToCartMutation.mutate();
  };
  
  const handleScaleApply = () => {
    if (scaleMultiplier === 1) return;
    
    // For MVP, scaling is preview-only (no backend endpoint)
    setShowScalePreview(false);
    alert(`Scaling preview shown. Backend endpoint for applying scale not yet implemented.`);
  };
  
  // ============================================================================
  // LOADING STATE
  // ============================================================================
  
  if (isLoading) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header Skeleton */}
            <div className="mb-8 animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            
            {/* Stats Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                </div>
              ))}
            </div>
            
            {/* Items Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
                  <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
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
    const axiosError = error as any;
    const is404 = axiosError.response?.status === 404;
    const is403 = axiosError.response?.status === 403;
    
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {is404 ? 'Project Not Found' : is403 ? 'Access Denied' : 'Error Loading Project'}
              </h2>
              
              <p className="text-gray-600 mb-6">
                {is404 
                  ? 'The project you\'re looking for doesn\'t exist or has been deleted.'
                  : is403
                  ? 'You don\'t have permission to view this project.'
                  : 'Something went wrong while loading the project. Please try again.'
                }
              </p>
              
              <div className="space-y-3">
                {!is404 && !is403 && (
                  <button
                    onClick={() => refetch()}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Try Again
                  </button>
                )}
                
                <Link
                  to="/projects"
                  className="block w-full bg-gray-100 text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Back to Projects
                </Link>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
  
  // ============================================================================
  // EMPTY STATE
  // ============================================================================
  
  if (!data || !data.items || data.items.length === 0) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
              <Link 
                to="/projects"
                className="text-blue-600 hover:text-blue-700 font-medium mb-4 inline-flex items-center transition-colors"
              >
                ← Back to Projects
              </Link>
              
              <h1 className="text-3xl font-bold text-gray-900 mt-4">
                {data?.project.project_name || 'Project'}
              </h1>
              
              {data?.project.description && (
                <p className="text-gray-600 mt-2 leading-relaxed">
                  {data.project.description}
                </p>
              )}
            </div>
            
            {/* Empty State */}
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
                <Package className="h-8 w-8 text-gray-400" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                This project is empty
              </h3>
              
              <p className="text-gray-600 mb-6">
                Add products to this project to create a reusable template for future orders.
              </p>
              
              <Link
                to="/products"
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Browse Products
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }
  
  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  const project = data.project;
  const items = data.items;
  
  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* ============================================ */}
          {/* HEADER SECTION */}
          {/* ============================================ */}
          
          <div className="mb-8">
            <Link 
              to="/projects"
              className="text-blue-600 hover:text-blue-700 font-medium mb-4 inline-flex items-center transition-colors"
            >
              ← Back to Projects
            </Link>
            
            <div className="mt-4">
              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="project_name" className="block text-sm font-medium text-gray-700 mb-2">
                      Project Name
                    </label>
                    <input
                      id="project_name"
                      type="text"
                      value={projectName}
                      onChange={(e) => {
                        setProjectName(e.target.value);
                        setUnsavedChanges(true);
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      placeholder="Enter project name"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="project_description" className="block text-sm font-medium text-gray-700 mb-2">
                      Description (Optional)
                    </label>
                    <textarea
                      id="project_description"
                      value={projectDescription}
                      onChange={(e) => {
                        setProjectDescription(e.target.value);
                        setUnsavedChanges(true);
                      }}
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                      placeholder="Add a description for this project"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleSaveProject}
                      disabled={updateProjectMutation.isPending || !unsavedChanges}
                      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {updateProjectMutation.isPending ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-5 w-5 mr-2" />
                          Save Changes
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={handleCancelEdit}
                      disabled={updateProjectMutation.isPending}
                      className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      <X className="h-5 w-5 mr-2" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-gray-900">
                        {project.project_name}
                      </h1>
                      
                      {project.description && (
                        <p className="text-gray-600 mt-2 leading-relaxed">
                          {project.description}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 mt-4 text-sm text-gray-500">
                        <span>Created: {new Date(project.created_date).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>Last updated: {new Date(project.last_updated_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setEditMode(true)}
                      className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Info
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* ============================================ */}
          {/* STATS CARDS */}
          {/* ============================================ */}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Total Items */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900">{items.length}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>
            
            {/* Saved Total */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Original Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${projectTotals.saved_total.toFixed(2)}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-gray-600" />
                </div>
              </div>
            </div>
            
            {/* Current Total with Price Change */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Current Total</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${projectTotals.current_total.toFixed(2)}
                  </p>
                  
                  {projectTotals.price_difference !== 0 && (
                    <div className={`inline-flex items-center mt-2 text-sm font-medium ${
                      projectTotals.price_difference > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {projectTotals.price_difference > 0 ? (
                        <TrendingUp className="h-4 w-4 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 mr-1" />
                      )}
                      {projectTotals.price_difference > 0 ? '+' : ''}
                      ${Math.abs(projectTotals.price_difference).toFixed(2)} 
                      ({projectTotals.price_change_percentage > 0 ? '+' : ''}
                       {projectTotals.price_change_percentage.toFixed(1)}%)
                    </div>
                  )}
                </div>
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                  projectTotals.price_difference > 0 
                    ? 'bg-red-100' 
                    : projectTotals.price_difference < 0 
                    ? 'bg-green-100' 
                    : 'bg-gray-100'
                }`}>
                  <TrendingUp className={`h-6 w-6 ${
                    projectTotals.price_difference > 0 
                      ? 'text-red-600' 
                      : projectTotals.price_difference < 0 
                      ? 'text-green-600' 
                      : 'text-gray-600'
                  }`} />
                </div>
              </div>
            </div>
          </div>
          
          {/* ============================================ */}
          {/* SCALING CONTROLS */}
          {/* ============================================ */}
          
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Scale className="h-5 w-5 text-gray-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Scale Project Quantities</h2>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label htmlFor="scale_multiplier" className="block text-sm font-medium text-gray-700 mb-2">
                  Scale Multiplier
                </label>
                <input
                  id="scale_multiplier"
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={scaleMultiplier}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value);
                    if (!isNaN(value) && value > 0) {
                      setScaleMultiplier(value);
                    }
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  placeholder="1.0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Example: 2.0 doubles all quantities, 0.5 halves them
                </p>
              </div>
              
              <div>
                <button
                  onClick={() => setShowScalePreview(!showScalePreview)}
                  disabled={scaleMultiplier === 1}
                  className="w-full px-6 py-3 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {showScalePreview ? 'Hide Preview' : 'Preview Scaled Quantities'}
                </button>
              </div>
              
              <div>
                <button
                  onClick={handleScaleApply}
                  disabled={scaleMultiplier === 1}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply Scaling
                </button>
              </div>
            </div>
            
            {/* Scale Preview Table */}
            {showScalePreview && scaleMultiplier !== 1 && (
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Qty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Scaled Qty
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Change
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {items.map(item => {
                      const scaledQty = scaledQuantities[item.project_item_id] || item.quantity;
                      const qtyChange = scaledQty - item.quantity;
                      
                      return (
                        <tr key={item.project_item_id}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {item.product_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                            {scaledQty}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right font-medium ${
                            qtyChange > 0 ? 'text-green-600' : qtyChange < 0 ? 'text-red-600' : 'text-gray-500'
                          }`}>
                            {qtyChange > 0 ? '+' : ''}{qtyChange}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* ============================================ */}
          {/* STOCK WARNINGS */}
          {/* ============================================ */}
          
          {itemsWithStockWarnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-900 mb-2">
                    Stock Availability Issues
                  </h3>
                  <p className="text-sm text-amber-800 mb-3">
                    {itemsWithStockWarnings.length} {itemsWithStockWarnings.length === 1 ? 'item has' : 'items have'} insufficient stock:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-amber-700">
                    {itemsWithStockWarnings.map(item => (
                      <li key={item.project_item_id}>
                        <span className="font-medium">{item.product_name}</span>
                        {' - '}Needed: {item.quantity}, Available: {item.stock_quantity}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          {/* ============================================ */}
          {/* PROJECT ITEMS GRID */}
          {/* ============================================ */}
          
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Project Items ({items.length})
              </h2>
              
              <button
                onClick={handleLoadToCart}
                disabled={loadToCartMutation.isPending || items.length === 0}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadToCartMutation.isPending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding to Cart...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    Load All to Cart
                  </>
                )}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map(item => (
                <div 
                  key={item.project_item_id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Product Image */}
                  <div className="aspect-square bg-gray-100 relative">
                    {item.primary_image_url ? (
                      <img
                        src={item.primary_image_url}
                        alt={item.product_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-16 w-16 text-gray-300" />
                      </div>
                    )}
                    
                    {/* Stock Status Badge */}
                    <div className="absolute top-3 right-3">
                      {item.availability_status === 'available' ? (
                        <span className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-full">
                          In Stock
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded-full">
                          Low Stock
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Product Info */}
                  <div className="p-6">
                    <Link
                      to={`/product/${item.product_id}`}
                      className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors line-clamp-2 mb-2"
                    >
                      {item.product_name}
                    </Link>
                    
                    <div className="space-y-3 mt-4">
                      {/* Quantity */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Quantity:</span>
                        <span className="font-semibold text-gray-900">
                          {showScalePreview && scaleMultiplier !== 1 ? (
                            <>
                              <span className="line-through text-gray-400 mr-2">{item.quantity}</span>
                              <span className="text-blue-600">{scaledQuantities[item.project_item_id]}</span>
                            </>
                          ) : (
                            item.quantity
                          )}
                        </span>
                      </div>
                      
                      {/* Saved Price */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Original Price:</span>
                        <span className="font-medium text-gray-900">
                          ${item.saved_price.toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Current Price */}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Current Price:</span>
                        <span className="font-medium text-gray-900">
                          ${item.current_price.toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Price Change Badge */}
                      {item.price_change !== 0 && (
                        <div className="pt-2">
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            item.price_change > 0 
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {item.price_change > 0 ? (
                              <>
                                <TrendingUp className="h-3 w-3 mr-1" />
                                +${Math.abs(item.price_change).toFixed(2)} per unit
                              </>
                            ) : (
                              <>
                                <TrendingDown className="h-3 w-3 mr-1" />
                                -${Math.abs(item.price_change).toFixed(2)} per unit
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Line Totals */}
                      <div className="pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Subtotal (Original):</span>
                          <span className="font-semibold text-gray-900">
                            ${item.line_total_saved.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Subtotal (Current):</span>
                          <span className="font-semibold text-gray-900">
                            ${item.line_total_current.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Stock Warning */}
                      {item.availability_status === 'insufficient_stock' && (
                        <div className="pt-3">
                          <div className="flex items-center px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-amber-600 mr-2 flex-shrink-0" />
                            <span className="text-xs text-amber-800">
                              Only {item.stock_quantity} available
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* View Product Link */}
                    <Link
                      to={`/product/${item.product_id}`}
                      className="mt-4 w-full inline-flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-900 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
                    >
                      View Product Details
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* ============================================ */}
          {/* ACTION BUTTONS */}
          {/* ============================================ */}
          
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-900 mb-1">Ready to order?</p>
                <p>Load all items to your cart and proceed to checkout.</p>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleLoadToCart}
                  disabled={loadToCartMutation.isPending || items.length === 0}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center px-8 py-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadToCartMutation.isPending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding to Cart...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Load to Cart ({items.length} items)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_ProjectDetail;