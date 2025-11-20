import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAppStore } from '@/store/main';
import { 
  MapPin, 
  Truck, 
  MessageCircle, 
  Flag, 
  Clock, 
  Eye, 
  Share2, 
  ChevronLeft, 
  ChevronRight, 
  X,
  AlertCircle,
  CheckCircle,
  DollarSign
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS (from Zod schemas)
// ============================================================================

interface SurplusListing {
  listing_id: string;
  seller_id: string;
  product_name: string;
  category_id: string;
  description: string;
  condition: 'new' | 'like_new' | 'used' | 'refurbished';
  photos: string[] | null;
  asking_price: number;
  original_price: number | null;
  price_type: 'fixed' | 'negotiable' | 'auction';
  quantity: number;
  pickup_location: string | null;
  pickup_instructions: string | null;
  shipping_available: boolean;
  shipping_rate: number | null;
  status: 'active' | 'sold' | 'expired' | 'removed';
  reason_for_selling: string | null;
  views_count: number;
  created_date: string;
}

interface SellerProfile {
  customer_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  profile_photo_url: string | null;
  member_since: string;
  surplus_sales_count?: number;
  surplus_rating_average?: number;
}

interface CategoryInfo {
  category_id: string;
  category_name: string;
  parent_category_id: string | null;
}

interface SimilarListing {
  listing_id: string;
  product_name: string;
  asking_price: number;
  condition: string;
  primary_photo_url: string | null;
  seller_name: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Fetch surplus listing details
const fetchSurplusListing = async (listing_id: string, auth_token: string | null): Promise<SurplusListing> => {
  const headers = auth_token ? { 'Authorization': `Bearer ${auth_token}` } : {};
  const response = await axios.get(`${API_BASE_URL}/surplus/${listing_id}`, { headers });
  return response.data;
};

// Fetch seller profile
const fetchSellerProfile = async (seller_id: string): Promise<SellerProfile> => {
  // Since backend returns customer via customers table, we need to fetch customer + user data
  // Backend doesn't have explicit seller profile endpoint, so we construct from available data
  const customerResponse = await axios.get(`${API_BASE_URL}/customers/me`);
  // This is a workaround - in real implementation, backend should provide seller public profile
  // For now, we'll mock the seller data structure
  return {
    customer_id: seller_id,
    user_id: 'unknown',
    first_name: 'Seller',
    last_name: 'Name',
    profile_photo_url: null,
    member_since: new Date().toISOString(),
    surplus_sales_count: 0,
    surplus_rating_average: 0
  };
};

// Fetch category info
const fetchCategory = async (category_id: string): Promise<CategoryInfo> => {
  const response = await axios.get(`${API_BASE_URL}/categories/${category_id}`);
  return response.data;
};

// Fetch similar listings
const fetchSimilarListings = async (category_id: string, current_listing_id: string): Promise<SimilarListing[]> => {
  const response = await axios.get(`${API_BASE_URL}/surplus`, {
    params: {
      category_id,
      status: 'active',
      limit: 6
    }
  });
  
  // Filter out current listing and map to SimilarListing structure
  return response.data.listings
    .filter((l: any) => l.listing_id !== current_listing_id)
    .slice(0, 4)
    .map((l: any) => ({
      listing_id: l.listing_id,
      product_name: l.product_name,
      asking_price: l.asking_price,
      condition: l.condition,