import React, { useState } from 'react';
import { useAppStore } from '@/store/main';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { MapPin, Truck, Settings, BarChart3, Calendar, Plus, Edit2, Trash2, Check, X, Map } from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface DeliveryZone {
  zone_id: string;
  zone_name: string;
  postal_codes: string[];
  radius_miles: number;
  delivery_fee: number;
  estimated_days: number;
  is_active: boolean;
}

interface LogisticsSettings {
  standard_delivery: {
    enabled: boolean;
    base_fee: number;
    estimated_days: number;
  };
  express_delivery: {
    enabled: boolean;
    base_fee: number;
    estimated_days: number;
  };
  same_day_delivery: {
    enabled: boolean;
    base_fee: number;
    cutoff_time: string;
  };
  pickup_available: boolean;
  freight_delivery: {
    enabled: boolean;
    minimum_weight: number;
  };
}

interface CarrierIntegration {
  carrier_name: string;
  integration_status: 'active' | 'inactive' | 'error';
  api_key_status: 'valid' | 'invalid' | 'not_configured';
  last_sync: string | null;
  supported_services: string[];
}

interface ActiveDelivery {
  delivery_id: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  delivery_window_start: string;
  delivery_window_end: string;
  delivery_status: 'scheduled' | 'preparing' | 'out_for_delivery' | 'delivered';
  delivery_method: string;
  delivery_address: string;
  items_count: number;
  current_latitude?: number;
  current_longitude?: number;
  estimated_arrival_time?: string;
}

interface DeliveryCalendarDay {
  date: string;
  deliveries: ActiveDelivery[];
  capacity_used: number;
  capacity_total: number;
}

interface DeliveryConfigurationResponse {
  delivery_zones: DeliveryZone[];
  delivery_methods: LogisticsSettings;
  carrier_integrations: CarrierIntegration[];
}

interface ActiveDeliveriesResponse {
  deliveries: ActiveDelivery[];
  calendar_view?: DeliveryCalendarDay[];
}

// ============================================================================
// DATA FETCHING FUNCTIONS
// ============================================================================

const fetchDeliveryConfiguration = async (authToken: string): Promise<DeliveryConfigurationResponse> => {
  const { data } = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/me/delivery/settings`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return data;
};

const updateDeliveryZones = async (authToken: string, zones: DeliveryZone[]): Promise<void> => {
  await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/me/delivery/zones`,
    { delivery_zones: zones },
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
};

const fetchActiveDeliveries = async (authToken: string): Promise<ActiveDeliveriesResponse> => {
  const dateFrom = new Date().toISOString().split('T')[0];
  const dateTo = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const { data } = await axios.get(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/me/deliveries`,
    {
      params: {
        status: 'scheduled,preparing,out_for_delivery',
        date_from: dateFrom,
        date_to: dateTo,
      },
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return data;
};

const updateDeliveryStatus = async (
  authToken: string,
  deliveryId: string,
  updates: {
    delivery_status?: string;
    current_latitude?: number;
    current_longitude?: number;
    driver_name?: string;
    estimated_arrival_time?: string;
  }
): Promise<void> => {
  await axios.patch(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/deliveries/${deliveryId}`,
    updates,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
};

const configureCarrier = async (
  authToken: string,
  carrierName: string,
  config: {
    api_credentials: Record<string, string>;
    service_settings: Record<string, any>;
  }
): Promise<void> => {
  await axios.put(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/suppliers/me/delivery/carriers/${carrierName}`,
    config,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_DeliveryManagement_Supplier: React.FC = () => {
  const queryClient = useQueryClient();
  
  // CRITICAL: Individual selectors, no object destructuring
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const supplierId = useAppStore(state => state.authentication_state.supplier_profile?.supplier_id);
  
  // Local UI State
  const [activeTab, setActiveTab] = useState<'zones' | 'deliveries' | 'carriers' | 'performance'>('zones');
  const [showAddZoneModal, setShowAddZoneModal] = useState(false);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [showCarrierModal, setShowCarrierModal] = useState(false);
  const [selectedCarrier, setSelectedCarrier] = useState<string | null>(null);
  const [showDeliveryCompleteModal, setShowDeliveryCompleteModal] = useState(false);
  const [completingDelivery, setCompletingDelivery] = useState<ActiveDelivery | null>(null);
  
  // Zone Form State
  const [zoneForm, setZoneForm] = useState({
    zone_name: '',
    postal_codes: '',
    radius_miles: 25,
    delivery_fee: 50,
    estimated_days: 2,
    is_active: true,
  });
  
  // Carrier Form State
  const [carrierForm, setCarrierForm] = useState({
    api_key: '',
    api_secret: '',
    account_number: '',
    service_level: 'standard',
  });
  
  // Delivery Completion Form State
  const [deliveryCompleteForm, setDeliveryCompleteForm] = useState({
    driver_name: '',
    driver_phone: '',
    delivery_window_start: '',
    delivery_window_end: '',
    delivery_proof_photo_url: '',
    delivery_notes: '',
  });
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // ============================================================================
  // DATA FETCHING (React Query)
  // ============================================================================
  
  const { data: deliveryConfig, isLoading: configLoading, error: configError } = useQuery({
    queryKey: ['delivery-configuration', supplierId],
    queryFn: () => fetchDeliveryConfiguration(authToken!),
    enabled: !!authToken && !!supplierId,
    staleTime: 5 * 60 * 1000,
    select: (data) => ({
      delivery_zones: data.delivery_zones || [],
      logistics_settings: data.delivery_methods || {
        standard_delivery: { enabled: false, base_fee: 0, estimated_days: 0 },
        express_delivery: { enabled: false, base_fee: 0, estimated_days: 0 },
        same_day_delivery: { enabled: false, base_fee: 0, cutoff_time: '' },
        pickup_available: false,
        freight_delivery: { enabled: false, minimum_weight: 0 },
      },
      carrier_integrations: data.carrier_integrations || [],
    }),
  });
  
  const { data: activeDeliveriesData, isLoading: deliveriesLoading } = useQuery({
    queryKey: ['active-deliveries', supplierId],
    queryFn: () => fetchActiveDeliveries(authToken!),
    enabled: !!authToken && !!supplierId && activeTab === 'deliveries',
    refetchInterval: 30000, // Refresh every 30 seconds
    select: (data) => ({
      active_deliveries: data.deliveries || [],
      delivery_calendar: data.calendar_view || [],
    }),
  });
  
  // ============================================================================
  // MUTATIONS
  // ============================================================================
  
  const updateZonesMutation = useMutation({
    mutationFn: (zones: DeliveryZone[]) => updateDeliveryZones(authToken!, zones),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-configuration'] });
      setShowAddZoneModal(false);
      setEditingZone(null);
      resetZoneForm();
    },
  });
  
  const updateDeliveryStatusMutation = useMutation({
    mutationFn: ({ deliveryId, updates }: { deliveryId: string; updates: any }) => 
      updateDeliveryStatus(authToken!, deliveryId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-deliveries'] });
    },
  });
  
  const configureCarrierMutation = useMutation({
    mutationFn: ({ carrier, config }: { carrier: string; config: any }) => 
      configureCarrier(authToken!, carrier, config),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-configuration'] });
      setShowCarrierModal(false);
      setSelectedCarrier(null);
      resetCarrierForm();
    },
  });
  
  // ============================================================================
  // FORM HANDLERS
  // ============================================================================
  
  const resetZoneForm = () => {
    setZoneForm({
      zone_name: '',
      postal_codes: '',
      radius_miles: 25,
      delivery_fee: 50,
      estimated_days: 2,
      is_active: true,
    });
    setValidationErrors({});
  };
  
  const resetCarrierForm = () => {
    setCarrierForm({
      api_key: '',
      api_secret: '',
      account_number: '',
      service_level: 'standard',
    });
    setValidationErrors({});
  };
  
  const resetDeliveryCompleteForm = () => {
    setDeliveryCompleteForm({
      driver_name: '',
      driver_phone: '',
      delivery_window_start: '',
      delivery_window_end: '',
      delivery_proof_photo_url: '',
      delivery_notes: '',
    });
    setValidationErrors({});
  };
  
  const handleAddZone = () => {
    const errors: Record<string, string> = {};
    
    if (!zoneForm.zone_name.trim()) {
      errors.zone_name = 'Zone name is required';
    }
    if (!zoneForm.postal_codes.trim()) {
      errors.postal_codes = 'At least one postal code is required';
    }
    if (zoneForm.delivery_fee < 0) {
      errors.delivery_fee = 'Delivery fee must be positive';
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    const newZone: DeliveryZone = {
      zone_id: `zone_${Date.now()}`,
      zone_name: zoneForm.zone_name,
      postal_codes: zoneForm.postal_codes.split(',').map(code => code.trim()),
      radius_miles: zoneForm.radius_miles,
      delivery_fee: zoneForm.delivery_fee,
      estimated_days: zoneForm.estimated_days,
      is_active: zoneForm.is_active,
    };
    
    const updatedZones = [...(deliveryConfig?.delivery_zones || []), newZone];
    updateZonesMutation.mutate(updatedZones);
  };
  
  const handleEditZone = () => {
    if (!editingZone) return;
    
    const errors: Record<string, string> = {};
    
    if (!zoneForm.zone_name.trim()) {
      errors.zone_name = 'Zone name is required';
    }
    if (!zoneForm.postal_codes.trim()) {
      errors.postal_codes = 'At least one postal code is required';
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    const updatedZones = deliveryConfig?.delivery_zones.map(zone =>
      zone.zone_id === editingZone.zone_id
        ? {
            ...zone,
            zone_name: zoneForm.zone_name,
            postal_codes: zoneForm.postal_codes.split(',').map(code => code.trim()),
            radius_miles: zoneForm.radius_miles,
            delivery_fee: zoneForm.delivery_fee,
            estimated_days: zoneForm.estimated_days,
            is_active: zoneForm.is_active,
          }
        : zone
    ) || [];
    
    updateZonesMutation.mutate(updatedZones);
  };
  
  const handleDeleteZone = (zoneId: string) => {
    if (!confirm('Are you sure you want to delete this delivery zone?')) return;
    
    const updatedZones = deliveryConfig?.delivery_zones.filter(zone => zone.zone_id !== zoneId) || [];
    updateZonesMutation.mutate(updatedZones);
  };
  
  const handleToggleZone = (zoneId: string) => {
    const updatedZones = deliveryConfig?.delivery_zones.map(zone =>
      zone.zone_id === zoneId ? { ...zone, is_active: !zone.is_active } : zone
    ) || [];
    
    updateZonesMutation.mutate(updatedZones);
  };
  
  const openEditZone = (zone: DeliveryZone) => {
    setEditingZone(zone);
    setZoneForm({
      zone_name: zone.zone_name,
      postal_codes: zone.postal_codes.join(', '),
      radius_miles: zone.radius_miles,
      delivery_fee: zone.delivery_fee,
      estimated_days: zone.estimated_days,
      is_active: zone.is_active,
    });
    setShowAddZoneModal(true);
  };
  
  const handleUpdateDeliveryStatus = (deliveryId: string, newStatus: string) => {
    // If marking as delivered, show the completion form modal
    if (newStatus === 'delivered') {
      const delivery = activeDeliveriesData?.active_deliveries.find(d => d.delivery_id === deliveryId);
      if (delivery) {
        setCompletingDelivery(delivery);
        // Pre-fill the form with existing delivery window if available
        setDeliveryCompleteForm({
          driver_name: '',
          driver_phone: '',
          delivery_window_start: delivery.delivery_window_start,
          delivery_window_end: delivery.delivery_window_end,
          delivery_proof_photo_url: '',
          delivery_notes: '',
        });
        setShowDeliveryCompleteModal(true);
      }
      return;
    }
    
    // For other status updates, proceed normally
    updateDeliveryStatusMutation.mutate({
      deliveryId,
      updates: { delivery_status: newStatus },
    });
  };
  
  const handleCompleteDelivery = () => {
    if (!completingDelivery) return;
    
    const errors: Record<string, string> = {};
    
    if (!deliveryCompleteForm.driver_name.trim()) {
      errors.driver_name = 'Driver name is required';
    }
    if (!deliveryCompleteForm.driver_phone.trim()) {
      errors.driver_phone = 'Driver phone is required';
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    updateDeliveryStatusMutation.mutate(
      {
        deliveryId: completingDelivery.delivery_id,
        updates: {
          delivery_status: 'delivered',
          driver_name: deliveryCompleteForm.driver_name,
          driver_phone: deliveryCompleteForm.driver_phone,
          delivery_window_start: deliveryCompleteForm.delivery_window_start,
          delivery_window_end: deliveryCompleteForm.delivery_window_end,
          delivery_proof_photo_url: deliveryCompleteForm.delivery_proof_photo_url || null,
          delivery_notes: deliveryCompleteForm.delivery_notes || null,
        },
      },
      {
        onSuccess: () => {
          setShowDeliveryCompleteModal(false);
          setCompletingDelivery(null);
          resetDeliveryCompleteForm();
        },
      }
    );
  };
  
  const handleConfigureCarrier = () => {
    if (!selectedCarrier) return;
    
    const errors: Record<string, string> = {};
    
    if (!carrierForm.api_key.trim()) {
      errors.api_key = 'API Key is required';
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    configureCarrierMutation.mutate({
      carrier: selectedCarrier,
      config: {
        api_credentials: {
          api_key: carrierForm.api_key,
          api_secret: carrierForm.api_secret,
          account_number: carrierForm.account_number,
        },
        service_settings: {
          service_level: carrierForm.service_level,
        },
      },
    });
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };
  
  // ============================================================================
  // LOADING & ERROR STATES
  // ============================================================================
  
  if (configLoading) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
            <p className="text-gray-600 font-medium">Loading delivery management...</p>
          </div>
        </div>
      </>
    );
  }
  
  if (configError) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <X className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Failed to Load Delivery Settings</h2>
            <p className="text-gray-600 mb-6">We couldn't load your delivery configuration. Please try again.</p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['delivery-configuration'] })}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </>
    );
  }
  
  // ============================================================================
  // MAIN RENDER
  // ============================================================================
  
  return (
    <>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Delivery Management</h1>
                <p className="mt-1 text-sm text-gray-600">Configure delivery zones, manage logistics, and track deliveries</p>
              </div>
              <div className="flex items-center space-x-3">
                <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700 font-medium">
                    {deliveryConfig?.delivery_zones?.filter(z => z.is_active).length || 0} Active Zones
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('zones')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'zones'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span>Delivery Zones</span>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('deliveries')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'deliveries'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Truck className="w-5 h-5" />
                  <span>Active Deliveries</span>
                  {activeDeliveriesData && activeDeliveriesData.active_deliveries.length > 0 && (
                    <span className="ml-2 bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {activeDeliveriesData.active_deliveries.length}
                    </span>
                  )}
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('carriers')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'carriers'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Settings className="w-5 h-5" />
                  <span>Carrier Integration</span>
                </div>
              </button>
              
              <button
                onClick={() => setActiveTab('performance')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'performance'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5" />
                  <span>Performance</span>
                </div>
              </button>
            </nav>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* DELIVERY ZONES TAB */}
          {activeTab === 'zones' && (
            <div className="space-y-6">
              {/* Header with Add Button */}
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Delivery Coverage Zones</h2>
                <button
                  onClick={() => {
                    setEditingZone(null);
                    resetZoneForm();
                    setShowAddZoneModal(true);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add New Zone</span>
                </button>
              </div>
              
              {/* Zones List */}
              {deliveryConfig?.delivery_zones.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
                  <Map className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Delivery Zones Configured</h3>
                  <p className="text-gray-600 mb-6">Set up your delivery coverage areas to start accepting orders</p>
                  <button
                    onClick={() => {
                      resetZoneForm();
                      setShowAddZoneModal(true);
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Create First Zone
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {deliveryConfig?.delivery_zones.map((zone) => (
                    <div
                      key={zone.zone_id}
                      className={`bg-white rounded-xl shadow-md border p-6 transition-all ${
                        zone.is_active ? 'border-green-200' : 'border-gray-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="text-lg font-semibold text-gray-900">{zone.zone_name}</h3>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                zone.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {zone.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {zone.postal_codes.length} postal code{zone.postal_codes.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => openEditZone(zone)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit zone"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteZone(zone.zone_id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete zone"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-2 border-t border-gray-100">
                          <span className="text-sm text-gray-600">Delivery Fee:</span>
                          <span className="text-sm font-semibold text-gray-900">${zone.delivery_fee.toFixed(2)}</span>
                        </div>
                        
                        <div className="flex items-center justify-between py-2 border-t border-gray-100">
                          <span className="text-sm text-gray-600">Radius:</span>
                          <span className="text-sm font-semibold text-gray-900">{zone.radius_miles} miles</span>
                        </div>
                        
                        <div className="flex items-center justify-between py-2 border-t border-gray-100">
                          <span className="text-sm text-gray-600">Est. Delivery:</span>
                          <span className="text-sm font-semibold text-gray-900">{zone.estimated_days} day{zone.estimated_days !== 1 ? 's' : ''}</span>
                        </div>
                        
                        <div className="pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-500 mb-1">Postal Codes:</p>
                          <div className="flex flex-wrap gap-1">
                            {zone.postal_codes.slice(0, 5).map((code, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                                {code}
                              </span>
                            ))}
                            {zone.postal_codes.length > 5 && (
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                                +{zone.postal_codes.length - 5} more
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => handleToggleZone(zone.zone_id)}
                          className={`w-full px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                            zone.is_active
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          }`}
                        >
                          {zone.is_active ? 'Deactivate Zone' : 'Activate Zone'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* ACTIVE DELIVERIES TAB */}
          {activeTab === 'deliveries' && (
            <div className="space-y-6">
              {deliveriesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
                </div>
              ) : activeDeliveriesData?.active_deliveries.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
                  <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Deliveries</h3>
                  <p className="text-gray-600">You don't have any scheduled or in-progress deliveries</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeDeliveriesData?.active_deliveries.map((delivery) => (
                    <div
                      key={delivery.delivery_id}
                      className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              Order #{delivery.order_number}
                            </h3>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                delivery.delivery_status === 'delivered'
                                  ? 'bg-green-100 text-green-800'
                                  : delivery.delivery_status === 'out_for_delivery'
                                  ? 'bg-blue-100 text-blue-800'
                                  : delivery.delivery_status === 'preparing'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {delivery.delivery_status.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">Customer: <span className="font-medium">{delivery.customer_name}</span></p>
                          <p className="text-sm text-gray-600 mt-1">{delivery.items_count} item{delivery.items_count !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Delivery Window</p>
                          <p className="text-sm font-medium text-gray-900">
                            {formatDate(delivery.delivery_window_start)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatTime(delivery.delivery_window_start)} - {formatTime(delivery.delivery_window_end)}
                          </p>
                        </div>
                        
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Delivery Address</p>
                          <p className="text-sm text-gray-700">{delivery.delivery_address}</p>
                        </div>
                      </div>
                      
                      {delivery.delivery_status !== 'delivered' && (
                        <div className="flex items-center space-x-2 pt-4 border-t border-gray-100">
                          {delivery.delivery_status === 'scheduled' && (
                            <>
                              <button
                                onClick={() => handleUpdateDeliveryStatus(delivery.delivery_id, 'preparing')}
                                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 transition-colors text-sm"
                              >
                                Mark as Preparing
                              </button>
                              <button
                                onClick={() => handleUpdateDeliveryStatus(delivery.delivery_id, 'cancelled')}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
                              >
                                Cancel
                              </button>
                            </>
                          )}
                          
                          {delivery.delivery_status === 'preparing' && (
                            <button
                              onClick={() => handleUpdateDeliveryStatus(delivery.delivery_id, 'out_for_delivery')}
                              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                            >
                              Mark as Out for Delivery
                            </button>
                          )}
                          
                          {delivery.delivery_status === 'out_for_delivery' && (
                            <button
                              onClick={() => handleUpdateDeliveryStatus(delivery.delivery_id, 'delivered')}
                              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-sm"
                            >
                              Mark as Delivered
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* CARRIER INTEGRATION TAB */}
          {activeTab === 'carriers' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {deliveryConfig?.carrier_integrations.map((carrier) => (
                  <div
                    key={carrier.carrier_name}
                    className="bg-white rounded-xl shadow-md border border-gray-200 p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{carrier.carrier_name}</h3>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            carrier.integration_status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : carrier.integration_status === 'error'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {carrier.integration_status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">API Status:</span>
                        <span
                          className={`font-medium ${
                            carrier.api_key_status === 'valid'
                              ? 'text-green-600'
                              : carrier.api_key_status === 'invalid'
                              ? 'text-red-600'
                              : 'text-gray-600'
                          }`}
                        >
                          {carrier.api_key_status}
                        </span>
                      </div>
                      
                      {carrier.last_sync && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Last Sync:</span>
                          <span className="text-gray-900">{formatDate(carrier.last_sync)}</span>
                        </div>
                      )}
                      
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">Supported Services:</p>
                        <div className="flex flex-wrap gap-1">
                          {carrier.supported_services.map((service, idx) => (
                            <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
                              {service}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => {
                        setSelectedCarrier(carrier.carrier_name);
                        resetCarrierForm();
                        setShowCarrierModal(true);
                      }}
                      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors text-sm"
                    >
                      {carrier.integration_status === 'active' ? 'Reconfigure' : 'Set Up Integration'}
                    </button>
                  </div>
                ))}
                
                {/* Add New Carrier Placeholder */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-dashed border-blue-300 p-6 flex flex-col items-center justify-center text-center">
                  <Settings className="w-12 h-12 text-blue-600 mb-3" />
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Need Another Carrier?</h3>
                  <p className="text-xs text-gray-600 mb-4">Contact support to add custom carriers</p>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm">
                    Contact Support
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* PERFORMANCE TAB */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">On-Time Rate</p>
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">98.5%</p>
                  <p className="text-xs text-green-600 mt-1">↑ 2.3% from last month</p>
                </div>
                
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Avg. Delivery Time</p>
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Truck className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">2.1 days</p>
                  <p className="text-xs text-blue-600 mt-1">↓ 0.3 days faster</p>
                </div>
                
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Customer Satisfaction</p>
                    <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">4.8/5.0</p>
                  <p className="text-xs text-yellow-600 mt-1">Based on 156 reviews</p>
                </div>
                
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">Delivery Issues</p>
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <X className="w-6 h-6 text-red-600" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">3</p>
                  <p className="text-xs text-gray-600 mt-1">This month</p>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* ADD/EDIT ZONE MODAL */}
        {showAddZoneModal && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingZone ? 'Edit Delivery Zone' : 'Add New Delivery Zone'}
                </h2>
                <button
                  onClick={() => {
                    setShowAddZoneModal(false);
                    setEditingZone(null);
                    resetZoneForm();
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <label htmlFor="zone_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Zone Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="zone_name"
                    value={zoneForm.zone_name}
                    onChange={(e) => {
                      setZoneForm(prev => ({ ...prev, zone_name: e.target.value }));
                      setValidationErrors(prev => ({ ...prev, zone_name: '' }));
                    }}
                    placeholder="e.g., Austin Metro Area"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all ${
                      validationErrors.zone_name ? 'border-red-300' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                  {validationErrors.zone_name && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.zone_name}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="postal_codes" className="block text-sm font-medium text-gray-700 mb-2">
                    Postal Codes <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="postal_codes"
                    value={zoneForm.postal_codes}
                    onChange={(e) => {
                      setZoneForm(prev => ({ ...prev, postal_codes: e.target.value }));
                      setValidationErrors(prev => ({ ...prev, postal_codes: '' }));
                    }}
                    placeholder="Enter postal codes separated by commas (e.g., 78701, 78702, 78703)"
                    rows={3}
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all ${
                      validationErrors.postal_codes ? 'border-red-300' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                  {validationErrors.postal_codes && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.postal_codes}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">Separate multiple postal codes with commas</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="radius_miles" className="block text-sm font-medium text-gray-700 mb-2">
                      Radius (miles)
                    </label>
                    <input
                      type="number"
                      id="radius_miles"
                      value={zoneForm.radius_miles}
                      onChange={(e) => setZoneForm(prev => ({ ...prev, radius_miles: Number(e.target.value) }))}
                      min="0"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="delivery_fee" className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Fee ($)
                    </label>
                    <input
                      type="number"
                      id="delivery_fee"
                      value={zoneForm.delivery_fee}
                      onChange={(e) => {
                        setZoneForm(prev => ({ ...prev, delivery_fee: Number(e.target.value) }));
                        setValidationErrors(prev => ({ ...prev, delivery_fee: '' }));
                      }}
                      min="0"
                      step="0.01"
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all ${
                        validationErrors.delivery_fee ? 'border-red-300' : 'border-gray-200 focus:border-blue-500'
                      }`}
                    />
                    {validationErrors.delivery_fee && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.delivery_fee}</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label htmlFor="estimated_days" className="block text-sm font-medium text-gray-700 mb-2">
                    Estimated Delivery Days
                  </label>
                  <input
                    type="number"
                    id="estimated_days"
                    value={zoneForm.estimated_days}
                    onChange={(e) => setZoneForm(prev => ({ ...prev, estimated_days: Number(e.target.value) }))}
                    min="0"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
                
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={zoneForm.is_active}
                    onChange={(e) => setZoneForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                    Activate zone immediately
                  </label>
                </div>
              </div>
              
              <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowAddZoneModal(false);
                    setEditingZone(null);
                    resetZoneForm();
                  }}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingZone ? handleEditZone : handleAddZone}
                  disabled={updateZonesMutation.isPending}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateZonesMutation.isPending ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : editingZone ? 'Update Zone' : 'Add Zone'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* CARRIER SETUP MODAL */}
        {showCarrierModal && selectedCarrier && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
              <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
                <h2 className="text-xl font-bold text-gray-900">Configure {selectedCarrier}</h2>
                <button
                  onClick={() => {
                    setShowCarrierModal(false);
                    setSelectedCarrier(null);
                    resetCarrierForm();
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <label htmlFor="api_key" className="block text-sm font-medium text-gray-700 mb-2">
                    API Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="api_key"
                    value={carrierForm.api_key}
                    onChange={(e) => {
                      setCarrierForm(prev => ({ ...prev, api_key: e.target.value }));
                      setValidationErrors(prev => ({ ...prev, api_key: '' }));
                    }}
                    placeholder="Enter carrier API key"
                    className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all ${
                      validationErrors.api_key ? 'border-red-300' : 'border-gray-200 focus:border-blue-500'
                    }`}
                  />
                  {validationErrors.api_key && (
                    <p className="mt-1 text-sm text-red-600">{validationErrors.api_key}</p>
                  )}
                </div>
                
                <div>
                  <label htmlFor="api_secret" className="block text-sm font-medium text-gray-700 mb-2">
                    API Secret
                  </label>
                  <input
                    type="password"
                    id="api_secret"
                    value={carrierForm.api_secret}
                    onChange={(e) => setCarrierForm(prev => ({ ...prev, api_secret: e.target.value }))}
                    placeholder="Enter carrier API secret"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
                
                <div>
                  <label htmlFor="account_number" className="block text-sm font-medium text-gray-700 mb-2">
                    Account Number
                  </label>
                  <input
                    type="text"
                    id="account_number"
                    value={carrierForm.account_number}
                    onChange={(e) => setCarrierForm(prev => ({ ...prev, account_number: e.target.value }))}
                    placeholder="Enter carrier account number"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
                
                <div>
                  <label htmlFor="service_level" className="block text-sm font-medium text-gray-700 mb-2">
                    Default Service Level
                  </label>
                  <select
                    id="service_level"
                    value={carrierForm.service_level}
                    onChange={(e) => setCarrierForm(prev => ({ ...prev, service_level: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  >
                    <option value="standard">Standard Delivery</option>
                    <option value="express">Express Delivery</option>
                    <option value="same_day">Same Day Delivery</option>
                  </select>
                </div>
              </div>
              
              <div className="bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3 border-t border-gray-200 rounded-b-xl">
                <button
                  onClick={() => {
                    setShowCarrierModal(false);
                    setSelectedCarrier(null);
                    resetCarrierForm();
                  }}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfigureCarrier}
                  disabled={configureCarrierMutation.isPending}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {configureCarrierMutation.isPending ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : 'Save Configuration'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* DELIVERY COMPLETION MODAL */}
        {showDeliveryCompleteModal && completingDelivery && (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Complete Delivery - Order #{completingDelivery.order_number}
                </h2>
                <button
                  onClick={() => {
                    setShowDeliveryCompleteModal(false);
                    setCompletingDelivery(null);
                    resetDeliveryCompleteForm();
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Customer:</strong> {completingDelivery.customer_name}
                  </p>
                  <p className="text-sm text-blue-800 mt-1">
                    <strong>Address:</strong> {completingDelivery.delivery_address}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="driver_name" className="block text-sm font-medium text-gray-700 mb-2">
                      Driver Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="driver_name"
                      value={deliveryCompleteForm.driver_name}
                      onChange={(e) => {
                        setDeliveryCompleteForm(prev => ({ ...prev, driver_name: e.target.value }));
                        setValidationErrors(prev => ({ ...prev, driver_name: '' }));
                      }}
                      placeholder="Enter driver name"
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all ${
                        validationErrors.driver_name ? 'border-red-300' : 'border-gray-200 focus:border-blue-500'
                      }`}
                    />
                    {validationErrors.driver_name && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.driver_name}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="driver_phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Driver Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      id="driver_phone"
                      value={deliveryCompleteForm.driver_phone}
                      onChange={(e) => {
                        setDeliveryCompleteForm(prev => ({ ...prev, driver_phone: e.target.value }));
                        setValidationErrors(prev => ({ ...prev, driver_phone: '' }));
                      }}
                      placeholder="+1-555-0123"
                      className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all ${
                        validationErrors.driver_phone ? 'border-red-300' : 'border-gray-200 focus:border-blue-500'
                      }`}
                    />
                    {validationErrors.driver_phone && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.driver_phone}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="delivery_window_start" className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Window Start
                    </label>
                    <input
                      type="datetime-local"
                      id="delivery_window_start"
                      value={deliveryCompleteForm.delivery_window_start ? new Date(deliveryCompleteForm.delivery_window_start).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setDeliveryCompleteForm(prev => ({ ...prev, delivery_window_start: new Date(e.target.value).toISOString() }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="delivery_window_end" className="block text-sm font-medium text-gray-700 mb-2">
                      Delivery Window End
                    </label>
                    <input
                      type="datetime-local"
                      id="delivery_window_end"
                      value={deliveryCompleteForm.delivery_window_end ? new Date(deliveryCompleteForm.delivery_window_end).toISOString().slice(0, 16) : ''}
                      onChange={(e) => setDeliveryCompleteForm(prev => ({ ...prev, delivery_window_end: new Date(e.target.value).toISOString() }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="delivery_proof_photo_url" className="block text-sm font-medium text-gray-700 mb-2">
                    Proof of Delivery Photo URL
                  </label>
                  <input
                    type="url"
                    id="delivery_proof_photo_url"
                    value={deliveryCompleteForm.delivery_proof_photo_url}
                    onChange={(e) => setDeliveryCompleteForm(prev => ({ ...prev, delivery_proof_photo_url: e.target.value }))}
                    placeholder="https://example.com/proof.jpg"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                  <p className="mt-1 text-xs text-gray-500">Upload a photo showing proof of delivery</p>
                </div>
                
                <div>
                  <label htmlFor="delivery_notes" className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Notes
                  </label>
                  <textarea
                    id="delivery_notes"
                    value={deliveryCompleteForm.delivery_notes}
                    onChange={(e) => setDeliveryCompleteForm(prev => ({ ...prev, delivery_notes: e.target.value }))}
                    placeholder="Add any additional delivery notes..."
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>
              
              <div className="sticky bottom-0 bg-gray-50 px-6 py-4 flex items-center justify-end space-x-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowDeliveryCompleteModal(false);
                    setCompletingDelivery(null);
                    resetDeliveryCompleteForm();
                  }}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCompleteDelivery}
                  disabled={updateDeliveryStatusMutation.isPending}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateDeliveryStatusMutation.isPending ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Completing...
                    </span>
                  ) : 'Complete Delivery'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UV_DeliveryManagement_Supplier;