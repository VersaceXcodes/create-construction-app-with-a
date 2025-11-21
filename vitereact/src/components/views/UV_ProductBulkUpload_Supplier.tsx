import React, { useState, useCallback } from 'react';
import { Link} from 'react-router-dom';
import { useAppStore } from '@/store/main';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { Upload, Download, AlertCircle, CheckCircle, XCircle, FileText, ArrowRight, ArrowLeft } from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface CSVFile {
  file: File | null;
  file_name: string | null;
  file_size: number | null;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

interface ValidationResults {
  is_valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  total_rows: number;
  valid_rows: number;
}

interface PreviewProduct {
  product_id?: string | null;
  sku: string;
  product_name: string;
  price_per_unit: number;
  stock_quantity: number;
  category_id: string;
  status: string;
  description?: string;
  unit_of_measure?: string;
  brand?: string;
}

interface UploadProgress {
  uploading: boolean;
  processing: boolean;
  importing: boolean;
  progress_percent: number;
}

interface ImportResults {
  success_count: number;
  error_count: number;
  created_product_ids: string[];
  error_details: Array<{
    row: number;
    sku: string;
    error: string;
  }>;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const UV_ProductBulkUpload_Supplier: React.FC = () => {
  // const navigate = useNavigate();
  
  // CRITICAL: Individual Zustand selectors
  const supplierId = useAppStore(state => state.authentication_state.supplier_profile?.supplier_id);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  
  // Local state
  const [currentStep, setCurrentStep] = useState<'upload' | 'validate' | 'preview' | 'import' | 'results'>('upload');
  const [csvFile, setCsvFile] = useState<CSVFile>({ file: null, file_name: null, file_size: null });
  const [validationResults, setValidationResults] = useState<ValidationResults>({
    is_valid: true,
    errors: [],
    warnings: [],
    total_rows: 0,
    valid_rows: 0
  });
  const [previewProducts, setPreviewProducts] = useState<PreviewProduct[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    uploading: false,
    processing: false,
    importing: false,
    progress_percent: 0
  });
  const [importResults, setImportResults] = useState<ImportResults>({
    success_count: 0,
    error_count: 0,
    created_product_ids: [],
    error_details: []
  });
  const [dragActive, setDragActive] = useState(false);

  // ============================================================================
  // API MUTATIONS
  // ============================================================================

  // Download CSV Template
  const downloadTemplate = useCallback(() => {
    const apiUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api`;
    const templateUrl = `${apiUrl}/supplier/products/bulk-template?template_type=basic`;
    
    // Create downloadable link
    const link = document.createElement('a');
    link.href = templateUrl;
    link.download = 'product_bulk_upload_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Validate CSV Upload
  const validateUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api`;
      const formData = new FormData();
      formData.append('csv_file', file);
      
      const response = await axios.post(
        `${apiUrl}/supplier/products/bulk-upload-validate`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      return response.data;
    },
    onSuccess: (data) => {
      setValidationResults({
        is_valid: data.is_valid,
        errors: data.validation_errors || [],
        warnings: data.validation_warnings || [],
        total_rows: data.total_rows,
        valid_rows: data.valid_rows
      });
      
      setPreviewProducts(data.preview_data.map((item: any) => ({
        product_id: item.product_id || null,
        sku: item.sku,
        product_name: item.product_name,
        price_per_unit: Number(item.price_per_unit || 0),
        stock_quantity: Number(item.stock_quantity || 0),
        category_id: item.category_id,
        status: item.status || 'active',
        description: item.description,
        unit_of_measure: item.unit_of_measure,
        brand: item.brand
      })));
      
      setUploadProgress(prev => ({ ...prev, uploading: false, processing: false }));
      setCurrentStep('preview');
    },
    onError: (error: any) => {
      setUploadProgress(prev => ({ ...prev, uploading: false, processing: false }));
      alert(error.response?.data?.message || 'Failed to validate CSV file');
    }
  });

  // Import Products
  const importProductsMutation = useMutation({
    mutationFn: async () => {
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api`;
      
      const response = await axios.post(
        `${apiUrl}/supplier/products/bulk-import`,
        {
          supplier_id: supplierId,
          validated_products: previewProducts,
          import_settings: {
            update_existing: true,
            create_missing_categories: false
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
    },
    onSuccess: (data) => {
      setImportResults({
        success_count: data.created_count || 0,
        error_count: data.failed_count || 0,
        created_product_ids: data.created_products?.map((p: any) => p.product_id) || [],
        error_details: data.errors || []
      });
      
      setUploadProgress(prev => ({ ...prev, importing: false }));
      setCurrentStep('results');
    },
    onError: (error: any) => {
      setUploadProgress(prev => ({ ...prev, importing: false }));
      alert(error.response?.data?.message || 'Failed to import products');
    }
  });

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = (file: File) => {
    // Validate file type
    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }
    
    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File size must be less than 5MB');
      return;
    }
    
    // Set file state
    setCsvFile({
      file,
      file_name: file.name,
      file_size: file.size
    });
    
    // Start validation
    setUploadProgress({ uploading: true, processing: true, importing: false, progress_percent: 50 });
    validateUploadMutation.mutate(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleImportConfirm = () => {
    setUploadProgress(prev => ({ ...prev, importing: true, progress_percent: 75 }));
    importProductsMutation.mutate();
  };

  const handleRestart = () => {
    setCsvFile({ file: null, file_name: null, file_size: null });
    setValidationResults({ is_valid: true, errors: [], warnings: [], total_rows: 0, valid_rows: 0 });
    setPreviewProducts([]);
    setUploadProgress({ uploading: false, processing: false, importing: false, progress_percent: 0 });
    setImportResults({ success_count: 0, error_count: 0, created_product_ids: [], error_details: [] });
    setCurrentStep('upload');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Bulk Product Upload</h1>
                <p className="mt-2 text-gray-600">Upload multiple products at once using our CSV template</p>
              </div>
              <Link
                to="/supplier/products"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Products
              </Link>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              <div className={`flex items-center ${currentStep !== 'upload' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${currentStep === 'upload' ? 'bg-blue-100' : 'bg-green-100'}`}>
                  {currentStep !== 'upload' ? <CheckCircle className="w-5 h-5" /> : '1'}
                </div>
                <span className="ml-2 font-medium">Upload CSV</span>
              </div>
              
              <div className={`h-1 w-24 ${currentStep !== 'upload' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
              
              <div className={`flex items-center ${currentStep === 'preview' ? 'text-blue-600' : currentStep === 'results' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${currentStep === 'preview' ? 'bg-blue-100' : currentStep === 'results' ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {currentStep === 'results' ? <CheckCircle className="w-5 h-5" /> : '2'}
                </div>
                <span className="ml-2 font-medium">Preview & Validate</span>
              </div>
              
              <div className={`h-1 w-24 ${currentStep === 'results' ? 'bg-green-600' : 'bg-gray-300'}`}></div>
              
              <div className={`flex items-center ${currentStep === 'results' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${currentStep === 'results' ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {currentStep === 'results' ? <CheckCircle className="w-5 h-5" /> : '3'}
                </div>
                <span className="ml-2 font-medium">Import Complete</span>
              </div>
            </div>
          </div>

          {/* Main Content */}
          {currentStep === 'upload' && (
            <div className="space-y-6">
              {/* Template Download Section */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Download className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Step 1: Download CSV Template</h2>
                    <p className="text-gray-600 mb-4">
                      Download our template to ensure your CSV file has the correct format and required columns.
                    </p>
                    
                    <button
                      onClick={downloadTemplate}
                      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                    >
                      <Download className="w-5 h-5 mr-2" />
                      Download Template
                    </button>
                    
                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-semibold text-blue-900 mb-2">Template Columns:</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-blue-800">
                        <div>• SKU (required)</div>
                        <div>• Product Name (required)</div>
                        <div>• Category ID (required)</div>
                        <div>• Price Per Unit (required)</div>
                        <div>• Stock Quantity (required)</div>
                        <div>• Unit of Measure (required)</div>
                        <div>• Description</div>
                        <div>• Brand</div>
                        <div>• Status</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* File Upload Section */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                <div className="flex items-start space-x-4 mb-6">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Upload className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Step 2: Upload Your CSV File</h2>
                    <p className="text-gray-600">
                      Upload your completed CSV file. We'll validate the data and show you a preview before importing.
                    </p>
                  </div>
                </div>

                {/* Drag & Drop Zone */}
                <div
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                  }`}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  {csvFile.file ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center">
                        <FileText className="w-16 h-16 text-green-600" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-900">{csvFile.file_name}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          {csvFile.file_size ? formatFileSize(csvFile.file_size) : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => setCsvFile({ file: null, file_name: null, file_size: null })}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center">
                        <Upload className="w-16 h-16 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-900">
                          Drag and drop your CSV file here
                        </p>
                        <p className="text-gray-600 mt-1">or</p>
                      </div>
                      <div>
                        <label htmlFor="file-upload" className="cursor-pointer inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">
                          <Upload className="w-5 h-5 mr-2" />
                          Browse Files
                        </label>
                        <input
                          id="file-upload"
                          type="file"
                          accept=".csv"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </div>
                      <p className="text-sm text-gray-500">
                        CSV files only, maximum 5MB
                      </p>
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                {csvFile.file && !uploadProgress.uploading && (
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={() => {
                        if (csvFile.file) {
                          setUploadProgress({ uploading: true, processing: true, importing: false, progress_percent: 25 });
                          validateUploadMutation.mutate(csvFile.file);
                        }
                      }}
                      className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl"
                    >
                      Validate & Preview
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </button>
                  </div>
                )}

                {/* Upload Progress */}
                {uploadProgress.uploading && (
                  <div className="mt-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-blue-900">
                          {uploadProgress.processing ? 'Validating CSV...' : 'Uploading file...'}
                        </span>
                        <span className="text-sm font-medium text-blue-900">{uploadProgress.progress_percent}%</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress.progress_percent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 'preview' && (
            <div className="space-y-6">
              {/* Validation Results Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Rows</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">{validationResults.total_rows}</p>
                    </div>
                    <FileText className="w-12 h-12 text-blue-600" />
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Valid Rows</p>
                      <p className="text-3xl font-bold text-green-600 mt-2">{validationResults.valid_rows}</p>
                    </div>
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Errors</p>
                      <p className="text-3xl font-bold text-red-600 mt-2">{validationResults.errors.length}</p>
                    </div>
                    <XCircle className="w-12 h-12 text-red-600" />
                  </div>
                </div>
              </div>

              {/* Errors & Warnings */}
              {(validationResults.errors.length > 0 || validationResults.warnings.length > 0) && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Validation Issues</h2>
                  
                  {validationResults.errors.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center mb-3">
                        <XCircle className="w-5 h-5 text-red-600 mr-2" />
                        <h3 className="font-semibold text-red-900">Errors ({validationResults.errors.length})</h3>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {validationResults.errors.map((error, idx) => (
                          <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-sm text-red-900">
                              <span className="font-semibold">Row {error.row}:</span> {error.message}
                              {error.field && <span className="text-red-700"> (Field: {error.field})</span>}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {validationResults.warnings.length > 0 && (
                    <div>
                      <div className="flex items-center mb-3">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
                        <h3 className="font-semibold text-yellow-900">Warnings ({validationResults.warnings.length})</h3>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {validationResults.warnings.map((warning, idx) => (
                          <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-sm text-yellow-900">
                              <span className="font-semibold">Row {warning.row}:</span> {warning.message}
                              {warning.field && <span className="text-yellow-700"> (Field: {warning.field})</span>}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Preview Table */}
              {previewProducts.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Product Preview</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Review the products before importing. {validationResults.valid_rows} products will be imported.
                    </p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {previewProducts.slice(0, 10).map((product, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.sku}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">
                              <div className="max-w-xs truncate">{product.product_name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${Number(product.price_per_unit || 0).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.stock_quantity}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                product.status === 'active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                              }`}>
                                {product.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {previewProducts.length > 10 && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                      <p className="text-sm text-gray-600 text-center">
                        Showing first 10 of {previewProducts.length} products
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              {previewProducts.length > 0 && (
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleRestart}
                    className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors font-medium"
                  >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Upload Different File
                  </button>
                  
                  <button
                    onClick={handleImportConfirm}
                    disabled={!validationResults.is_valid || uploadProgress.importing}
                    className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadProgress.importing ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Importing...
                      </>
                    ) : (
                      <>
                        Import {validationResults.valid_rows} Products
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {currentStep === 'results' && (
            <div className="space-y-6">
              {/* Success Banner */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-8 text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                </div>
                <h2 className="text-3xl font-bold text-green-900 mb-2">Import Complete!</h2>
                <p className="text-green-700 text-lg">
                  Successfully imported {importResults.success_count} products to your catalog
                </p>
              </div>

              {/* Results Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Successfully Imported</p>
                      <p className="text-4xl font-bold text-green-600 mt-2">{importResults.success_count}</p>
                    </div>
                    <CheckCircle className="w-16 h-16 text-green-600" />
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Failed to Import</p>
                      <p className="text-4xl font-bold text-red-600 mt-2">{importResults.error_count}</p>
                    </div>
                    <XCircle className="w-16 h-16 text-red-600" />
                  </div>
                </div>
              </div>

              {/* Error Details */}
              {importResults.error_count > 0 && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Import Errors</h2>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {importResults.error_details.map((error, idx) => (
                      <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-sm text-red-900">
                          <span className="font-semibold">Row {error.row} (SKU: {error.sku}):</span> {error.error}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={handleRestart}
                  className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors font-medium"
                >
                  Upload Another File
                </button>
                
                <Link
                  to="/supplier/products"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                >
                  View Product Catalog
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </div>
            </div>
          )}

          {/* Help Section */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Make sure your CSV file uses the exact column headers from the template</li>
                  <li>• SKU must be unique across your product catalog</li>
                  <li>• Category IDs must match existing categories in the system</li>
                  <li>• Prices must be positive numbers, stock must be non-negative integers</li>
                  <li>• Maximum file size is 5MB</li>
                </ul>
                <div className="mt-4">
                  <Link
                    to="/help"
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    View detailed documentation →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_ProductBulkUpload_Supplier;