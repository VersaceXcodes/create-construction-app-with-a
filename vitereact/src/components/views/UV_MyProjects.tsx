import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { FolderOpen, Plus, ShoppingCart, Edit, Trash2, Copy, Package, DollarSign, Calendar } from 'lucide-react';

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
  created_at: string;
  updated_at: string;
}

interface ProjectsSummary {
  total_projects: number;
  total_estimated_value: number;
  most_recent_project_date: string | null;
}

interface LoadToCartResponse {
  message: string;
  added_items: number;
  unavailable_items: string[];
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const fetchProjects = async (token: string): Promise<Project[]> => {
  const response = await axios.get(`${API_BASE_URL}/api/projects`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.data;
};

const loadProjectToCart = async (
  project_id: string,
  token: string
): Promise<LoadToCartResponse> => {
  const response = await axios.post(
    `${API_BASE_URL}/api/projects/${project_id}/load-to-cart`,
    {},
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
};

const deleteProject = async (project_id: string, token: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/api/projects/${project_id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};

const createProject = async (
  data: { project_name: string; description: string | null },
  token: string
): Promise<Project> => {
  const response = await axios.post(
    `${API_BASE_URL}/api/projects`,
    data,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data;
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(dateString));
};

const calculateSummary = (projects: Project[]): ProjectsSummary => {
  return {
    total_projects: projects.length,
    total_estimated_value: projects.reduce((sum, p) => sum + (p.total_value || 0), 0),
    most_recent_project_date: projects.length > 0 
      ? projects.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())[0].created_date
      : null
  };
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_MyProjects: React.FC = () => {
  // ============================================================================
  // STATE & HOOKS
  // ============================================================================
  
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // CRITICAL: Individual Zustand selectors (no object destructuring)
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const customerId = useAppStore(state => state.authentication_state.customer_profile?.customer_id);
  const fetchCart = useAppStore(state => state.fetch_cart);
  
  // Local UI state
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ============================================================================
  // REACT QUERY - FETCH PROJECTS
  // ============================================================================
  
  const {
    data: projects = [],
    isLoading,
    error,
    refetch
  } = useQuery<Project[], Error>({
    queryKey: ['projects', customerId],
    queryFn: () => fetchProjects(authToken!),
    enabled: Boolean(authToken),
    staleTime: 60000, // 1 minute
    retry: 1
  });

  // Calculate summary from projects list
  const projectsSummary = React.useMemo(() => calculateSummary(projects), [projects]);

  // ============================================================================
  // REACT QUERY - LOAD PROJECT TO CART MUTATION
  // ============================================================================
  
  const loadToCartMutation = useMutation({
    mutationFn: (project_id: string) => loadProjectToCart(project_id, authToken!),
    onSuccess: (data, project_id) => {
      // Invalidate cart query to refresh cart count
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      
      // Fetch updated cart state
      fetchCart();
      
      // Show success message
      if (data.unavailable_items?.length > 0) {
        setToastMessage({
          type: 'success',
          message: `${data.added_items} items added to cart. ${data.unavailable_items.length} items unavailable.`
        });
      } else {
        setToastMessage({
          type: 'success',
          message: `${data.added_items} items added to cart`
        });
      }
      
      // Navigate to cart after short delay
      setTimeout(() => {
        navigate('/cart');
      }, 1500);
    },
    onError: (error: any) => {
      setToastMessage({
        type: 'error',
        message: error.response?.data?.message || 'Failed to load project to cart'
      });
    }
  });

  // ============================================================================
  // REACT QUERY - DELETE PROJECT MUTATION
  // ============================================================================
  
  const deleteProjectMutation = useMutation({
    mutationFn: (project_id: string) => deleteProject(project_id, authToken!),
    onSuccess: () => {
      // Invalidate projects query to refresh list
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      
      // Close modal
      setShowDeleteModal(false);
      setSelectedProjectId(null);
      
      // Show success message
      setToastMessage({
        type: 'success',
        message: 'Project deleted successfully'
      });
    },
    onError: (error: any) => {
      setToastMessage({
        type: 'error',
        message: error.response?.data?.message || 'Failed to delete project'
      });
      setShowDeleteModal(false);
    }
  });

  // ============================================================================
  // REACT QUERY - DUPLICATE PROJECT MUTATION
  // ============================================================================
  
  const duplicateProjectMutation = useMutation({
    mutationFn: ({ project_name, description }: { project_name: string; description: string | null }) => 
      createProject({ project_name, description }, authToken!),
    onSuccess: () => {
      // Invalidate projects query to refresh list
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      
      // Show success message
      setToastMessage({
        type: 'success',
        message: 'Project duplicated successfully'
      });
    },
    onError: (error: any) => {
      setToastMessage({
        type: 'error',
        message: error.response?.data?.message || 'Failed to duplicate project'
      });
    }
  });

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  const handleLoadToCart = (project_id: string) => {
    loadToCartMutation.mutate(project_id);
  };

  const handleDeleteClick = (project_id: string) => {
    setSelectedProjectId(project_id);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedProjectId) {
      deleteProjectMutation.mutate(selectedProjectId);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setSelectedProjectId(null);
  };

  const handleDuplicate = (project: Project) => {
    duplicateProjectMutation.mutate({
      project_name: `${project.project_name} (Copy)`,
      description: project.description
    });
  };

  const handleCreateNew = () => {
    // Navigate to cart to save current cart as project
    navigate('/cart');
  };

  // Auto-dismiss toast after 5 seconds
  React.useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* ============================================================ */}
          {/* PAGE HEADER */}
          {/* ============================================================ */}
          
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                  My Projects
                </h1>
                <p className="mt-2 text-base text-gray-600 leading-relaxed">
                  Save your cart as a project template for quick reordering
                </p>
              </div>
              
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create New Project
              </button>
            </div>
            
            {/* Summary Stats */}
            {projects.length > 0 && (
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg border border-gray-100 shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Projects</p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">
                        {projectsSummary.total_projects}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <FolderOpen className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border border-gray-100 shadow-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Estimated Value</p>
                      <p className="mt-1 text-2xl font-bold text-gray-900">
                        {formatCurrency(projectsSummary.total_estimated_value)}
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>
                
                {projectsSummary.most_recent_project_date && (
                  <div className="bg-white rounded-lg border border-gray-100 shadow-lg p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Last Created</p>
                        <p className="mt-1 text-base font-semibold text-gray-900">
                          {formatDate(projectsSummary.most_recent_project_date)}
                        </p>
                      </div>
                      <div className="p-3 bg-indigo-100 rounded-lg">
                        <Calendar className="w-6 h-6 text-indigo-600" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* LOADING STATE */}
          {/* ============================================================ */}
          
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-lg p-6 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-4 bg-gray-200 rounded w-20"></div>
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-10 bg-gray-200 rounded flex-1"></div>
                    <div className="h-10 bg-gray-200 rounded w-10"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ============================================================ */}
          {/* ERROR STATE */}
          {/* ============================================================ */}
          
          {error && !isLoading && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-8 text-center">
              <div className="mb-4">
                <svg className="mx-auto h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Projects</h3>
              <p className="text-gray-600 mb-6">
                {error.message || 'An error occurred while loading your projects'}
              </p>
              <button
                onClick={() => refetch()}
                className="inline-flex items-center px-6 py-3 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Try Again
              </button>
            </div>
          )}

          {/* ============================================================ */}
          {/* EMPTY STATE */}
          {/* ============================================================ */}
          
          {!isLoading && !error && projects.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-lg p-12 text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-blue-100 rounded-full mb-4">
                  <FolderOpen className="w-12 h-12 text-blue-600" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                No Projects Yet
              </h3>
              <p className="text-base text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
                Save your cart as a project template for quick reordering. Perfect for recurring purchases and different project sizes.
              </p>
              <button
                onClick={handleCreateNew}
                className="inline-flex items-center px-8 py-4 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-100"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Your First Project
              </button>
            </div>
          )}

          {/* ============================================================ */}
          {/* PROJECTS GRID */}
          {/* ============================================================ */}
          
          {!isLoading && !error && projects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.project_id}
                  className="bg-white rounded-xl border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden"
                >
                  {/* Project Card Header */}
                  <div className="p-6 pb-4 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                      {project.project_name}
                    </h3>
                    {project.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                        {project.description}
                      </p>
                    )}
                  </div>

                  {/* Project Stats */}
                  <div className="px-6 py-4 bg-gray-50">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Package className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Items</p>
                          <p className="text-base font-semibold text-gray-900">
                            {project.item_count}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <DollarSign className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Value</p>
                          <p className="text-base font-semibold text-gray-900">
                            {formatCurrency(project.total_value || 0)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>Created {formatDate(project.created_date)}</span>
                        <span>Updated {formatDate(project.last_updated_date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="p-6 pt-4 space-y-3">
                    <button
                      onClick={() => handleLoadToCart(project.project_id)}
                      disabled={loadToCartMutation.isPending}
                      className="w-full inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-blue-100"
                    >
                      {loadToCartMutation.isPending ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Loading...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-5 h-5 mr-2" />
                          Load to Cart
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/projects/${project.project_id}`}
                        className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-100"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Link>

                      <button
                        onClick={() => handleDuplicate(project)}
                        disabled={duplicateProjectMutation.isPending}
                        className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-gray-100"
                        title="Duplicate Project"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </button>

                      <button
                        onClick={() => handleDeleteClick(project.project_id)}
                        disabled={deleteProjectMutation.isPending}
                        className="inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-red-100"
                        title="Delete Project"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ============================================================ */}
          {/* DELETE CONFIRMATION MODAL */}
          {/* ============================================================ */}
          
          {showDeleteModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <div className="mb-4">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
                    Delete Project?
                  </h3>
                  <p className="text-base text-gray-600 text-center leading-relaxed">
                    Are you sure you want to delete this project? This action cannot be undone.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDeleteCancel}
                    disabled={deleteProjectMutation.isPending}
                    className="flex-1 px-6 py-3 rounded-lg font-medium text-gray-900 bg-gray-100 hover:bg-gray-200 border border-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={deleteProjectMutation.isPending}
                    className="flex-1 px-6 py-3 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-4 focus:ring-red-100"
                  >
                    {deleteProjectMutation.isPending ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting...
                      </span>
                    ) : (
                      'Delete'
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* TOAST NOTIFICATION */}
          {/* ============================================================ */}
          
          {toastMessage && (
            <div className="fixed bottom-8 right-8 z-50 animate-in slide-in-from-bottom-4 duration-300">
              <div className={`rounded-xl shadow-2xl px-6 py-4 flex items-center space-x-3 max-w-md ${
                toastMessage.type === 'success' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-red-600 text-white'
              }`}>
                {toastMessage.type === 'success' ? (
                  <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span className="font-medium">{toastMessage.message}</span>
                <button
                  onClick={() => setToastMessage(null)}
                  className="ml-auto flex-shrink-0 hover:bg-white/20 rounded-lg p-1 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UV_MyProjects;