import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/main';
import axios from 'axios';
import { 
  Search, 
  Book, 
  MessageCircle, 
  FileText, 
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  X,
  Menu
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface HelpCategory {
  category_id: string;
  category_name: string;
  category_slug: string;
  description: string | null;
  icon_url: string | null;
  article_count: number;
  subcategories: Array<{
    category_id: string;
    category_name: string;
    article_count: number;
  }>;
}

interface ArticlePreview {
  article_id: string;
  title: string;
  content_preview: string;
  category_name: string;
  author: string;
  last_updated: string;
  view_count: number;
  helpful_votes: number;
  reading_time_minutes: number;
}

interface FeaturedArticle {
  article_id: string;
  title: string;
  category_name: string;
  view_count: number;
  helpful_votes: number;
}

interface GettingStartedArticle {
  article_id: string;
  title: string;
  description: string;
}

interface FullArticle {
  article_id: string;
  title: string;
  content: string;
  category_name: string;
  author: string;
  last_updated: string;
  reading_time_minutes: number;
  helpful_votes: number;
  was_this_helpful_voted: boolean | null;
  related_articles: Array<{
    article_id: string;
    title: string;
    category_name: string;
  }>;
}

interface SearchSuggestion {
  article_id: string;
  title: string;
  category_name: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const fetchHelpCategories = async (authToken?: string | null): Promise<HelpCategory[]> => {
  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await axios.get(`${API_BASE_URL}/help/categories`, { headers });
  
  return response.data.categories.map((category: any) => ({
    category_id: category.category_id,
    category_name: category.category_name,
    category_slug: category.category_slug,
    description: category.description,
    icon_url: category.icon_url,
    article_count: category.article_count,
    subcategories: category.subcategories ? category.subcategories.map((sub: any) => ({
      category_id: sub.category_id,
      category_name: sub.category_name,
      article_count: sub.article_count
    })) : []
  }));
};

const searchHelpArticles = async (
  params: {
    q?: string;
    category_id?: string;
    user_type?: string;
    limit?: number;
    offset?: number;
  },
  authToken?: string | null
): Promise<{ articles: ArticlePreview[]; total_count: number; search_query: string | null }> => {
  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await axios.get(`${API_BASE_URL}/help/articles/search`, {
    params,
    headers
  });

  return {
    articles: response.data.articles.map((article: any) => ({
      article_id: article.article_id,
      title: article.title,
      content_preview: article.content.substring(0, 200) + '...',
      category_name: article.category_name,
      author: article.author_name,
      last_updated: article.updated_at,
      view_count: article.view_count,
      helpful_votes: article.helpful_votes,
      reading_time_minutes: Math.ceil(article.content.length / 200)
    })),
    total_count: response.data.total_count,
    search_query: response.data.query_used
  };
};

const fetchFeaturedArticles = async (
  userType: string,
  authToken?: string | null
): Promise<{ popular_articles: FeaturedArticle[]; getting_started_articles: GettingStartedArticle[] }> => {
  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await axios.get(`${API_BASE_URL}/help/articles/featured`, {
    params: { user_type: userType },
    headers
  });

  return {
    popular_articles: response.data.popular_articles.map((article: any) => ({
      article_id: article.article_id,
      title: article.title,
      category_name: article.category_name,
      view_count: article.view_count,
      helpful_votes: article.helpful_votes
    })),
    getting_started_articles: response.data.getting_started.map((article: any) => ({
      article_id: article.article_id,
      title: article.title,
      description: article.description
    }))
  };
};

const fetchArticleById = async (
  articleId: string,
  authToken?: string | null
): Promise<FullArticle> => {
  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await axios.get(`${API_BASE_URL}/help/articles/${articleId}`, { headers });

  return {
    article_id: response.data.article_id,
    title: response.data.title,
    content: response.data.content,
    category_name: response.data.category_name,
    author: response.data.author_name,
    last_updated: response.data.updated_at,
    reading_time_minutes: Math.ceil(response.data.content.length / 200),
    helpful_votes: response.data.helpful_votes,
    was_this_helpful_voted: response.data.user_vote,
    related_articles: response.data.related_articles.map((rel: any) => ({
      article_id: rel.article_id,
      title: rel.title,
      category_name: rel.category_name
    }))
  };
};

const getSearchSuggestions = async (
  query: string,
  authToken?: string | null
): Promise<SearchSuggestion[]> => {
  if (!query || query.length < 2) return [];

  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await axios.get(`${API_BASE_URL}/help/articles/suggestions`, {
    params: { q: query, limit: 5 },
    headers
  });

  return response.data.suggestions.map((suggestion: any) => ({
    article_id: suggestion.article_id,
    title: suggestion.title,
    category_name: suggestion.category_name
  }));
};

const submitHelpfulVote = async (
  articleId: string,
  wasHelpful: boolean,
  authToken: string
): Promise<{ helpful_votes: number; was_this_helpful_voted: boolean }> => {
  const response = await axios.post(
    `${API_BASE_URL}/help/articles/${articleId}/helpful`,
    { was_helpful: wasHelpful },
    { headers: { Authorization: `Bearer ${authToken}` } }
  );

  return {
    helpful_votes: response.data.new_helpful_vote_count,
    was_this_helpful_voted: response.data.user_vote
  };
};

const trackArticleView = async (
  articleId: string,
  authToken?: string | null
): Promise<void> => {
  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  await axios.post(`${API_BASE_URL}/help/articles/${articleId}/view`, {}, { headers });
};

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function UV_KnowledgeBase() {
  // ============================================================================
  // ZUSTAND STORE ACCESS (CRITICAL: Individual selectors)
  // ============================================================================
  const currentUser = useAppStore(state => state.authentication_state.current_user);
  const authToken = useAppStore(state => state.authentication_state.auth_token);
  const isAuthenticated = useAppStore(state => state.authentication_state.authentication_status.is_authenticated);

  // ============================================================================
  // URL PARAMETERS
  // ============================================================================
  const [searchParams, setSearchParams] = useSearchParams();
  // const navigate = useNavigate();

  // ============================================================================
  // LOCAL STATE
  // ============================================================================
  const [searchInput, setSearchInput] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  // const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Debounced search for suggestions
  const debouncedSearchInput = useDebounce(searchInput, 300);

  // ============================================================================
  // URL PARAM INITIALIZATION
  // ============================================================================
  useEffect(() => {
    const urlSearchQuery = searchParams.get('search_query');
    const urlCategory = searchParams.get('category');
    const urlArticleId = searchParams.get('article_id');

    if (urlSearchQuery) {
      setSearchInput(urlSearchQuery);
    }
    if (urlCategory) {
      setActiveCategory(urlCategory);
    }
    if (urlArticleId) {
      setSelectedArticleId(urlArticleId);
    }
  }, [searchParams]);

  // ============================================================================
  // REACT QUERY - FETCH CATEGORIES
  // ============================================================================
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError
  } = useQuery({
    queryKey: ['help-categories'],
    queryFn: () => fetchHelpCategories(authToken),
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    retry: 2
  });

  // ============================================================================
  // REACT QUERY - FETCH FEATURED ARTICLES
  // ============================================================================
  const {
    data: featuredArticles,
    isLoading: featuredLoading
  } = useQuery({
    queryKey: ['help-featured-articles', currentUser?.user_type || 'guest'],
    queryFn: () => fetchFeaturedArticles(currentUser?.user_type || 'guest', authToken),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: !selectedArticleId && !searchInput // Only fetch on homepage
  });

  // ============================================================================
  // REACT QUERY - SEARCH ARTICLES
  // ============================================================================
  const {
    data: searchResults,
    isLoading: searchLoading,
    error: searchError
  } = useQuery({
    queryKey: ['help-articles-search', { q: searchInput, category: activeCategory, user_type: currentUser?.user_type }],
    queryFn: () => searchHelpArticles({
      q: searchInput || undefined,
      category_id: activeCategory || undefined,
      user_type: currentUser?.user_type || 'guest',
      limit: 20,
      offset: 0
    }, authToken),
    enabled: !!searchInput || !!activeCategory, // Only search when query or category selected
    staleTime: 2 * 60 * 1000,
    retry: 1
  });

  // ============================================================================
  // REACT QUERY - FETCH ARTICLE BY ID
  // ============================================================================
  const {
    data: currentArticle,
    isLoading: articleLoading,
    error: articleError
  } = useQuery({
    queryKey: ['help-article', selectedArticleId],
    queryFn: () => fetchArticleById(selectedArticleId!, authToken),
    enabled: !!selectedArticleId,
    staleTime: 5 * 60 * 1000,
    retry: 2
  });

  // Track view when article loads
  useEffect(() => {
    if (selectedArticleId && currentArticle) {
      trackArticleView(selectedArticleId, authToken).catch(console.error);
    }
  }, [selectedArticleId, currentArticle, authToken]);

  // ============================================================================
  // REACT QUERY - SEARCH SUGGESTIONS
  // ============================================================================
  const {
    data: suggestions = [],
    isLoading: suggestionsLoading
  } = useQuery({
    queryKey: ['help-suggestions', debouncedSearchInput],
    queryFn: () => getSearchSuggestions(debouncedSearchInput, authToken),
    enabled: debouncedSearchInput.length >= 2 && searchFocused && !selectedArticleId,
    staleTime: 30 * 1000,
    retry: 1
  });

  // ============================================================================
  // REACT QUERY - VOTE MUTATION
  // ============================================================================
  const voteMutation = useMutation({
    mutationFn: ({ articleId, wasHelpful }: { articleId: string; wasHelpful: boolean }) => {
      if (!authToken) {
        throw new Error('Authentication required to vote');
      }
      return submitHelpfulVote(articleId, wasHelpful, authToken);
    },
    onSuccess: (data) => {
      // Optimistically update article
      if (currentArticle) {
        // Query will auto-refetch, but we can show immediate feedback
      }
    }
  });

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchInput.trim()) return;

    // Update URL with search query
    const params = new URLSearchParams();
    params.set('search_query', searchInput);
    if (activeCategory) {
      params.set('category', activeCategory);
    }
    setSearchParams(params);

    // Clear article view
    setSelectedArticleId(null);
    setSearchFocused(false);
    setMobileMenuOpen(false);
  };

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId);
    setSelectedArticleId(null);
    setSearchInput(''); // Clear search
    setMobileMenuOpen(false);

    // Update URL
    const params = new URLSearchParams();
    params.set('category', categoryId);
    setSearchParams(params);
  };

  const handleArticleClick = (articleId: string) => {
    setSelectedArticleId(articleId);
    setSearchInput(''); // Clear search
    setMobileMenuOpen(false);

    // Update URL
    const params = new URLSearchParams();
    params.set('article_id', articleId);
    setSearchParams(params);
  };

  const handleSuggestionClick = (articleId: string) => {
    handleArticleClick(articleId);
  };

  // const handleBackToSearch = () => {
    setSelectedArticleId(null);
    setSearchParams({});
  };

  const handleBackToHome = () => {
    setSearchInput('');
    setActiveCategory(null);
    setSelectedArticleId(null);
    setSearchParams({});
  };

  const handleVote = (wasHelpful: boolean) => {
    if (!isAuthenticated) {
      alert('Please sign in to vote on articles');
      return;
    }

    if (!selectedArticleId) return;

    voteMutation.mutate({ articleId: selectedArticleId, wasHelpful });
  };

  const clearSearch = () => {
    setSearchInput('');
    setSearchFocused(false);
    setSearchParams({});
  };

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const showHomepage = !selectedArticleId && !searchInput && !activeCategory;
  const showSearchResults = !selectedArticleId && (!!searchInput || !!activeCategory);
  const showArticle = !!selectedArticleId;

  const activeCategoryData = useMemo(() => {
    return categories.find(cat => cat.category_id === activeCategory);
  }, [categories, activeCategory]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* ============================================ */}
        {/* HEADER SECTION */}
        {/* ============================================ */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Help Center</h1>
              <p className="text-lg text-gray-600">Find answers and get support</p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                  placeholder="Search for help articles..."
                  className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              {/* Search Suggestions Dropdown */}
              {searchFocused && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 max-h-80 overflow-y-auto">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.article_id}
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion.article_id)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{suggestion.title}</div>
                      <div className="text-sm text-gray-500 mt-1">{suggestion.category_name}</div>
                    </button>
                  ))}
                </div>
              )}

              {suggestionsLoading && searchFocused && debouncedSearchInput.length >= 2 && (
                <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 p-4">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Searching...</span>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* ============================================ */}
        {/* MAIN CONTENT AREA */}
        {/* ============================================ */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* ============================================ */}
            {/* SIDEBAR - CATEGORIES */}
            {/* ============================================ */}
            <aside className={`lg:w-80 ${showArticle ? 'hidden lg:block' : ''}`}>
              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden w-full mb-4 px-4 py-3 bg-white rounded-lg shadow-md border border-gray-200 flex items-center justify-between"
              >
                <span className="font-semibold text-gray-900">Categories</span>
                <Menu className="h-5 w-5 text-gray-600" />
              </button>

              <div className={`bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden ${mobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900">Browse by Category</h2>
                </div>

                <nav className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
                  {categoriesLoading ? (
                    <>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse"></div>
                      ))}
                    </>
                  ) : categoriesError ? (
                    <div className="text-center py-8 text-red-600">
                      <p className="text-sm">Failed to load categories</p>
                    </div>
                  ) : (
                    <>
                      {/* All Articles Option */}
                      <button
                        onClick={handleBackToHome}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                          !activeCategory && !selectedArticleId && !searchInput
                            ? 'bg-blue-100 text-blue-900 font-semibold'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>All Articles</span>
                        </div>
                      </button>

                      {/* Categories List */}
                      {categories.map((category) => (
                        <div key={category.category_id}>
                          <button
                            onClick={() => handleCategoryClick(category.category_id)}
                            className={`w-full text-left px-4 py-3 rounded-lg transition-all ${
                              activeCategory === category.category_id
                                ? 'bg-blue-100 text-blue-900 font-semibold'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{category.category_name}</span>
                              <span className="text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                                {category.article_count}
                              </span>
                            </div>
                          </button>

                          {/* Subcategories */}
                          {category.subcategories && category.subcategories.length > 0 && activeCategory === category.category_id && (
                            <div className="ml-4 mt-2 space-y-1">
                              {category.subcategories.map((sub) => (
                                <button
                                  key={sub.category_id}
                                  onClick={() => handleCategoryClick(sub.category_id)}
                                  className="w-full text-left px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <span>{sub.category_name}</span>
                                    <span className="text-xs text-gray-400">{sub.article_count}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </nav>
              </div>

              {/* Contact Support CTA */}
              <div className="mt-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
                <MessageCircle className="h-8 w-8 mb-3" />
                <h3 className="font-bold text-lg mb-2">Still need help?</h3>
                <p className="text-blue-100 text-sm mb-4">Our support team is here to assist you</p>
                <button className="w-full bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 transition-colors">
                  Contact Support
                </button>
              </div>
            </aside>

            {/* ============================================ */}
            {/* MAIN CONTENT */}
            {/* ============================================ */}
            <main className="flex-1">
              {/* ========================================== */}
              {/* HOMEPAGE VIEW */}
              {/* ========================================== */}
              {showHomepage && (
                <div className="space-y-12">
                  {/* Featured Articles */}
                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Popular Articles</h2>
                    {featuredLoading ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse">
                            <div className="h-6 bg-gray-200 rounded mb-3"></div>
                            <div className="h-4 bg-gray-100 rounded mb-2"></div>
                            <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                          </div>
                        ))}
                      </div>
                    ) : featuredArticles?.popular_articles && featuredArticles.popular_articles.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {featuredArticles.popular_articles.map((article) => (
                          <button
                            key={article.article_id}
                            onClick={() => handleArticleClick(article.article_id)}
                            className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 text-left border border-gray-100 hover:border-blue-300"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <FileText className="h-6 w-6 text-blue-600 flex-shrink-0" />
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {article.category_name}
                              </span>
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-3 line-clamp-2">{article.title}</h3>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span className="flex items-center">
                                <ThumbsUp className="h-3 w-3 mr-1" />
                                {article.helpful_votes} helpful
                              </span>
                              <span>{article.view_count} views</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-white rounded-xl shadow-md">
                        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600">No featured articles available</p>
                      </div>
                    )}
                  </section>

                  {/* Getting Started */}
                  {featuredArticles?.getting_started_articles && featuredArticles.getting_started_articles.length > 0 && (
                    <section>
                      <h2 className="text-2xl font-bold text-gray-900 mb-6">Getting Started</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {featuredArticles.getting_started_articles.map((article) => (
                          <button
                            key={article.article_id}
                            onClick={() => handleArticleClick(article.article_id)}
                            className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-6 text-left border border-gray-100 hover:border-blue-300 flex items-start space-x-4"
                          >
                            <Book className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-2">{article.title}</h3>
                              <p className="text-sm text-gray-600 line-clamp-2">{article.description}</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Categories Grid */}
                  <section>
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse by Topic</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {categories.slice(0, 6).map((category) => (
                        <button
                          key={category.category_id}
                          onClick={() => handleCategoryClick(category.category_id)}
                          className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 text-left border border-gray-100 hover:border-blue-300"
                        >
                          <h3 className="font-bold text-gray-900 mb-2">{category.category_name}</h3>
                          {category.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{category.description}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-blue-600 font-medium">
                              {category.article_count} {category.article_count === 1 ? 'article' : 'articles'}
                            </span>
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {/* ========================================== */}
              {/* SEARCH RESULTS VIEW */}
              {/* ========================================== */}
              {showSearchResults && (
                <div>
                  {/* Breadcrumb */}
                  <nav className="mb-6 flex items-center space-x-2 text-sm">
                    <button onClick={handleBackToHome} className="text-blue-600 hover:text-blue-800 font-medium">
                      Help Center
                    </button>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-600">
                      {activeCategoryData ? activeCategoryData.category_name : 'Search Results'}
                    </span>
                  </nav>

                  {/* Results Header */}
                  <div className="mb-6">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                      {searchInput ? `Results for "${searchInput}"` : activeCategoryData?.category_name || 'Articles'}
                    </h2>
                    {searchResults && (
                      <p className="text-gray-600">
                        Found {searchResults.total_count} {searchResults.total_count === 1 ? 'article' : 'articles'}
                      </p>
                    )}
                  </div>

                  {/* Results List */}
                  {searchLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse">
                          <div className="h-6 bg-gray-200 rounded mb-3 w-3/4"></div>
                          <div className="h-4 bg-gray-100 rounded mb-2"></div>
                          <div className="h-4 bg-gray-100 rounded mb-2 w-5/6"></div>
                          <div className="h-4 bg-gray-100 rounded w-2/3"></div>
                        </div>
                      ))}
                    </div>
                  ) : searchError ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                      <p className="text-red-700 font-medium mb-2">Failed to load search results</p>
                      <p className="text-red-600 text-sm">Please try again</p>
                    </div>
                  ) : searchResults && searchResults.articles.length > 0 ? (
                    <div className="space-y-4">
                      {searchResults.articles.map((article) => (
                        <button
                          key={article.article_id}
                          onClick={() => handleArticleClick(article.article_id)}
                          className="w-full bg-white rounded-xl shadow-md hover:shadow-xl transition-all p-6 text-left border border-gray-100 hover:border-blue-300"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-bold text-gray-900 text-lg flex-1 pr-4">{article.title}</h3>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full flex-shrink-0">
                              {article.category_name}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm mb-4 line-clamp-3">{article.content_preview}</p>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center space-x-4">
                              <span className="flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                {article.author}
                              </span>
                              <span className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {article.reading_time_minutes} min read
                              </span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="flex items-center">
                                <ThumbsUp className="h-3 w-3 mr-1" />
                                {article.helpful_votes}
                              </span>
                              <span>{article.view_count} views</span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl shadow-md p-12 text-center">
                      <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No articles found</h3>
                      <p className="text-gray-600 mb-6">
                        We couldn't find any articles matching your search.
                      </p>
                      <div className="space-y-2 text-sm text-gray-500">
                        <p>Try:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Using different keywords</li>
                          <li>Checking your spelling</li>
                          <li>Browsing categories instead</li>
                        </ul>
                      </div>
                      <button
                        onClick={handleBackToHome}
                        className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Browse All Articles
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================== */}
              {/* ARTICLE VIEW */}
              {/* ========================================== */}
              {showArticle && (
                <div className="max-w-4xl">
                  {articleLoading ? (
                    <div className="bg-white rounded-xl shadow-lg p-8 md:p-12 animate-pulse">
                      <div className="h-10 bg-gray-200 rounded mb-6 w-3/4"></div>
                      <div className="h-4 bg-gray-100 rounded mb-3"></div>
                      <div className="h-4 bg-gray-100 rounded mb-3 w-5/6"></div>
                      <div className="h-4 bg-gray-100 rounded mb-3"></div>
                      <div className="h-4 bg-gray-100 rounded w-4/5"></div>
                    </div>
                  ) : articleError ? (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                      <p className="text-red-700 font-medium mb-2">Article not found</p>
                      <p className="text-red-600 text-sm mb-4">The article you're looking for doesn't exist or has been removed.</p>
                      <button
                        onClick={handleBackToHome}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Back to Help Center
                      </button>
                    </div>
                  ) : currentArticle ? (
                    <>
                      {/* Breadcrumb */}
                      <nav className="mb-6 flex items-center space-x-2 text-sm">
                        <button onClick={handleBackToHome} className="text-blue-600 hover:text-blue-800 font-medium">
                          Help Center
                        </button>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">{currentArticle.category_name}</span>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900 font-medium truncate">{currentArticle.title}</span>
                      </nav>

                      {/* Article Content */}
                      <article className="bg-white rounded-xl shadow-lg p-8 md:p-12 border border-gray-100">
                        {/* Article Header */}
                        <header className="mb-8 pb-6 border-b border-gray-200">
                          <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
                            {currentArticle.title}
                          </h1>
                          <div className="flex items-center justify-between flex-wrap gap-4">
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              <span className="flex items-center">
                                <User className="h-4 w-4 mr-1" />
                                {currentArticle.author}
                              </span>
                              <span className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                {currentArticle.reading_time_minutes} min read
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              Last updated: {new Date(currentArticle.last_updated).toLocaleDateString()}
                            </span>
                          </div>
                        </header>

                        {/* Article Body */}
                        <div className="prose prose-lg max-w-none mb-12">
                          <div 
                            className="text-gray-800 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: currentArticle.content }}
                          />
                        </div>

                        {/* Was This Helpful Section */}
                        <div className="bg-gray-50 rounded-xl p-6 mb-8">
                          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
                            Was this article helpful?
                          </h3>
                          <div className="flex items-center justify-center space-x-4">
                            <button
                              onClick={() => handleVote(true)}
                              disabled={voteMutation.isPending || currentArticle.was_this_helpful_voted === true}
                              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                                currentArticle.was_this_helpful_voted === true
                                  ? 'bg-green-100 text-green-700 border-2 border-green-500'
                                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-green-500 hover:bg-green-50'
                              } disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2`}
                            >
                              <ThumbsUp className="h-5 w-5" />
                              <span>Yes</span>
                            </button>
                            <button
                              onClick={() => handleVote(false)}
                              disabled={voteMutation.isPending || currentArticle.was_this_helpful_voted === false}
                              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                                currentArticle.was_this_helpful_voted === false
                                  ? 'bg-red-100 text-red-700 border-2 border-red-500'
                                  : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-red-500 hover:bg-red-50'
                              } disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2`}
                            >
                              <ThumbsDown className="h-5 w-5" />
                              <span>No</span>
                            </button>
                          </div>
                          {currentArticle.was_this_helpful_voted !== null && (
                            <p className="text-center text-sm text-gray-600 mt-3">
                              Thank you for your feedback!
                            </p>
                          )}
                          {!isAuthenticated && (
                            <p className="text-center text-xs text-gray-500 mt-3">
                              Sign in to vote on articles
                            </p>
                          )}
                        </div>

                        {/* Helpful Votes Count */}
                        <div className="text-center text-sm text-gray-600 mb-8">
                          <ThumbsUp className="h-4 w-4 inline mr-1" />
                          {currentArticle.helpful_votes} people found this helpful
                        </div>
                      </article>

                      {/* Related Articles */}
                      {currentArticle.related_articles && currentArticle.related_articles.length > 0 && (
                        <section className="mt-8">
                          <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Articles</h2>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {currentArticle.related_articles.map((article) => (
                              <button
                                key={article.article_id}
                                onClick={() => handleArticleClick(article.article_id)}
                                className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all p-4 text-left border border-gray-100 hover:border-blue-300"
                              >
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full inline-block mb-2">
                                  {article.category_name}
                                </span>
                                <h3 className="font-semibold text-gray-900 line-clamp-2">{article.title}</h3>
                              </button>
                            ))}
                          </div>
                        </section>
                      )}

                      {/* Contact Support CTA */}
                      <div className="mt-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg p-8 text-white text-center">
                        <MessageCircle className="h-12 w-12 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold mb-2">Still need help?</h3>
                        <p className="text-blue-100 mb-6">Our support team is ready to assist you</p>
                        <button className="px-8 py-3 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors shadow-lg">
                          Contact Support
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </>
  );
}

