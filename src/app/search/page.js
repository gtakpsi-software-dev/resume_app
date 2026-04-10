"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ResumeCard from "@/components/resume/ResumeCard";
import { debounce } from "@/lib/utils";
import { resumeAPI } from "@/lib/api"; // Import resume API
import { useAuth } from "@/lib/AuthContext"; // Add auth context
import ProtectedRoute from "@/components/ProtectedRoute";

export default function Search() {
  const [filters, setFilters] = useState({
    major: [],
    company: [],
    graduationYear: [],
    keyword: [],
  });
  const [filterSearch, setFilterSearch] = useState({
    major: "",
    company: "",
    graduationYear: "",
    keyword: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for fetched data
  const [availableFilters, setAvailableFilters] = useState({
    majors: [],
    companies: [],
    graduationYears: [],
    keywords: []
  });
  const [filteredResumes, setFilteredResumes] = useState([]);
  const { user } = useAuth(); // Get user from auth context

  // Add a state for name search
  const [nameSearch, setNameSearch] = useState("");

  // Add state for general search
  const [generalSearch, setGeneralSearch] = useState("");

  // Add state for search mode
  const [searchMode, setSearchMode] = useState("keyword"); // "keyword" or "semantic"

  // Fetch available filters on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        // Call the getFilters API endpoint
        const { data } = await resumeAPI.getFilters();
        if (data && data.data) {
          setAvailableFilters(data.data);
        } else {
          console.error("Invalid filter data format:", data);
          setAvailableFilters({
            majors: [],
            companies: [],
            graduationYears: [],
            keywords: []
          });
        }
      } catch (err) {
        console.error("Failed to fetch filters:", err);
        // Set empty filters on error
        setAvailableFilters({
          majors: [],
          companies: [],
          graduationYears: [],
          keywords: []
        });
      }
    };
    fetchFilters();
  }, []);

  // Debounced version of fetchResumes
  const debouncedFetchResumes = useCallback(() => {
    const handler = debounce(() => {
      setLoading(true);
      setError(null);
      try {
        if (searchMode === "semantic" && generalSearch) {
          // Perform semantic search
          resumeAPI.vectorSearch(generalSearch)
            .then(({ data }) => {
              setFilteredResumes(data.data || []);
            })
            .catch(err => {
              console.error("Failed to fetch resumes (semantic):", err);
              const errorMessage = err.response?.data?.message || "Failed to load resumes. Please try again later.";
              setError(errorMessage);
              setFilteredResumes([]);
            })
            .finally(() => {
              setLoading(false);
            });
        } else {
          // Build query parameters for traditional search
          const params = {
            query: generalSearch || undefined, // Add general search parameter
            name: nameSearch || undefined,
            major: filters.major.length > 0 ? filters.major.join(',') : undefined,
            company: filters.company.length > 0 ? filters.company.join(',') : undefined,
            graduationYear: filters.graduationYear.length > 0 ? filters.graduationYear.join(',') : undefined,
            keyword: filters.keyword.length > 0 ? filters.keyword.join(',') : undefined,
          };

          // Remove undefined params
          Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

          resumeAPI.getAll(params)
            .then(({ data }) => {
              setFilteredResumes(data.data || []);
            })
            .catch(err => {
              console.error("Failed to fetch resumes:", err);
              setError("Failed to load resumes. Please try again later.");
              setFilteredResumes([]);
            })
            .finally(() => {
              setLoading(false);
            });
        }
      } catch (err) {
        console.error("Failed to fetch resumes:", err);
        setError("Failed to load resumes. Please try again later.");
        setFilteredResumes([]);
        setLoading(false);
      }
    }, 300);

    handler();

    return handler;
  }, [filters, nameSearch, generalSearch, searchMode]);

  // Fetch resumes whenever filters change
  useEffect(() => {
    debouncedFetchResumes();
  }, [debouncedFetchResumes]); // Use the debounced function in the effect

  const handleFilterChange = (filterType, value) => {
    setFilters(prevFilters => {
      const currentValues = [...prevFilters[filterType]];

      if (currentValues.includes(value)) {
        // Remove the value if it's already selected
        return {
          ...prevFilters,
          [filterType]: currentValues.filter(v => v !== value)
        };
      } else {
        // Add the value if it's not already selected
        return {
          ...prevFilters,
          [filterType]: [...currentValues, value]
        };
      }
    });
  };

  const handleFilterSearchChange = (filterType, value) => {
    setFilterSearch({
      ...filterSearch,
      [filterType]: value
    });
  };

  // Helper function to filter the items based on search
  const getFilteredItems = (items, filterType) => {
    // First ensure items are unique
    const uniqueItems = [...new Set(items)];
    const searchValue = filterSearch[filterType].toLowerCase();
    if (!searchValue) return uniqueItems;
    return uniqueItems.filter(item =>
      item.toString().toLowerCase().includes(searchValue)
    );
  };

  // Ensure unique items in filter rendering
  const renderFilterItems = (items, filterType) => {
    // Create a Set to track seen items
    const seen = new Set();

    return getFilteredItems(items, filterType).map((item, index) => {
      // Skip duplicates
      if (seen.has(item)) return null;
      seen.add(item);

      return (
        <div key={`${filterType}-${item}-${index}`} className="flex items-center">
          <input
            id={`${filterType}-${item}-${index}`}
            name={`${filterType}-${item}`}
            type="checkbox"
            checked={filters[filterType].includes(item)}
            onChange={() => handleFilterChange(filterType, item)}
            className="h-4 w-4 text-[#0071e3] focus:ring-[#0071e3] rounded"
          />
          <label htmlFor={`${filterType}-${item}-${index}`} className="ml-2 text-sm text-[#1d1d1f]">
            {item}
          </label>
        </div>
      );
    }).filter(Boolean); // Remove null items (duplicates)
  };

  // Sort resumes alphabetically by name
  const sortedResumes = [...filteredResumes].sort((a, b) => {
    const nameA = a.name || '';
    const nameB = b.name || '';
    return nameA.localeCompare(nameB);
  });

  // Handle delete callback from ResumeCard
  const handleResumeDelete = (deletedId) => {
    // Update the displayed resumes by filtering out the deleted one
    setFilteredResumes(prevResumes =>
      prevResumes.filter(resume => resume.id !== deletedId)
    );

    // Show success message
    alert('Resume deleted successfully');
  };

  // Add handleNameSearchChange function
  const handleNameSearchChange = (e) => {
    setNameSearch(e.target.value);
  };

  // Add handler for general search
  const handleGeneralSearchChange = (e) => {
    setGeneralSearch(e.target.value);
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f5f5f7] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-10">
            {user?.role === 'admin' && (
              <div className="flex items-center space-x-4">
                <span className="text-xs text-[#86868b] px-2 py-1 rounded-full bg-[#f5f5f7] border border-[#d2d2d7]">
                  Admin Mode
                </span>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete ALL resumes? This action cannot be undone.')) {
                      setLoading(true);
                      resumeAPI.deleteAll()
                        .then(() => {
                          alert('All resumes have been deleted successfully.');
                          setFilteredResumes([]);
                        })
                        .catch(err => {
                          console.error('Error deleting all resumes:', err);
                          alert('Failed to delete all resumes. Please try again.');
                        })
                        .finally(() => {
                          setLoading(false);
                        });
                    }
                  }}
                  className="bg-[#ff3b30] hover:bg-red-600 text-white text-xs px-3 py-1 rounded-full transition-colors"
                >
                  Delete All Resumes
                </button>
              </div>
            )}
          </div>

          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-semibold text-[#1d1d1f] mb-4">
              Resume Search
            </h1>
            <p className="text-[#6e6e73] max-w-2xl mx-auto mb-6">
              Find members by skills, experience, or academic background
            </p>

            {/* Search mode toggle */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex p-1 bg-white rounded-full shadow-sm border border-[#d2d2d7]">
                <button
                  onClick={() => setSearchMode("keyword")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${searchMode === "keyword"
                    ? "bg-[#0071e3] text-white shadow-sm"
                    : "text-[#1d1d1f] hover:bg-[#f5f5f7]"
                    }`}
                >
                  Keyword Search
                </button>
                <button
                  onClick={() => setSearchMode("semantic")}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center ${searchMode === "semantic"
                    ? "bg-[#0071e3] text-white shadow-sm"
                    : "text-[#1d1d1f] hover:bg-[#f5f5f7]"
                    }`}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                  </svg>
                  AI Semantic Search
                </button>
              </div>
            </div>

            {/* Add general search box */}
            <div className="max-w-xl mx-auto">
              <div className="relative">
                <input
                  type="text"
                  value={generalSearch}
                  onChange={handleGeneralSearchChange}
                  placeholder={searchMode === "semantic" ? "Describe the ideal candidate (e.g. 'CS major with AWS experience')..." : "Search by name, major, skills, company experience..."}
                  className="w-full px-4 py-3 pl-10 text-[#1d1d1f] border border-[#d2d2d7] rounded-full focus:ring-2 focus:ring-[#0071e3] focus:border-[#0071e3] placeholder-[#86868b]"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-[#86868b]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Filters Panel */}
            <div className="lg:col-span-1">
              <div className={`bg-white rounded-2xl shadow-sm p-6 ${searchMode === 'semantic' ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-medium text-lg text-[#1d1d1f]">Filters</h2>
                  {searchMode === 'semantic' && (
                    <span className="text-[10px] bg-[#f5f5f7] text-[#86868b] px-2 py-1 rounded-full border border-[#d2d2d7]">
                      Inactive in AI Mode
                    </span>
                  )}
                </div>

                {/* Name Search - Add this section */}
                <div className="mb-6">
                  <h3 className="font-medium text-sm text-[#6e6e73] uppercase tracking-wider mb-3">Name Search</h3>
                  <div className="mb-2">
                    <input
                      type="text"
                      value={nameSearch}
                      onChange={handleNameSearchChange}
                      placeholder="Search by name..."
                      className="w-full px-3 py-2 text-sm text-[#1d1d1f] border border-[#d2d2d7] rounded-lg focus:ring-1 focus:ring-[#0071e3] focus:border-[#0071e3]"
                    />
                  </div>
                </div>

                {/* Filter Sections */}
                <div className="space-y-8">
                  {/* Major Filter */}
                  <div>
                    <h3 className="font-medium text-sm text-[#6e6e73] uppercase tracking-wider mb-3">Major</h3>
                    <div className="mb-2">
                      <input
                        type="text"
                        value={filterSearch.major}
                        onChange={(e) => handleFilterSearchChange('major', e.target.value)}
                        placeholder="Search majors..."
                        className="w-full px-3 py-2 text-sm text-[#1d1d1f] border border-[#d2d2d7] rounded-lg focus:ring-1 focus:ring-[#0071e3] focus:border-[#0071e3]"
                      />
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 mt-2">
                      {renderFilterItems(availableFilters.majors, 'major')}
                    </div>
                  </div>

                  {/* Company Filter */}
                  <div>
                    <h3 className="font-medium text-sm text-[#6e6e73] uppercase tracking-wider mb-3">Company</h3>
                    <div className="mb-2">
                      <input
                        type="text"
                        value={filterSearch.company}
                        onChange={(e) => handleFilterSearchChange('company', e.target.value)}
                        placeholder="Search companies..."
                        className="w-full px-3 py-2 text-sm text-[#1d1d1f] border border-[#d2d2d7] rounded-lg focus:ring-1 focus:ring-[#0071e3] focus:border-[#0071e3]"
                      />
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 mt-2">
                      {renderFilterItems(availableFilters.companies, 'company')}
                    </div>
                  </div>

                  {/* Graduation Year Filter */}
                  <div>
                    <h3 className="font-medium text-sm text-[#6e6e73] uppercase tracking-wider mb-3">Graduation Year</h3>
                    <div className="mb-2">
                      <input
                        type="text"
                        value={filterSearch.graduationYear}
                        onChange={(e) => handleFilterSearchChange('graduationYear', e.target.value)}
                        placeholder="Search years..."
                        className="w-full px-3 py-2 text-sm text-[#1d1d1f] border border-[#d2d2d7] rounded-lg focus:ring-1 focus:ring-[#0071e3] focus:border-[#0071e3]"
                      />
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 mt-2">
                      {renderFilterItems(availableFilters.graduationYears, 'graduationYear')}
                    </div>
                  </div>

                  {/* Keyword Filter */}
                  <div>
                    <h3 className="font-medium text-sm text-[#6e6e73] uppercase tracking-wider mb-3">Skills</h3>
                    <div className="mb-2">
                      <input
                        type="text"
                        value={filterSearch.keyword}
                        onChange={(e) => handleFilterSearchChange('keyword', e.target.value)}
                        placeholder="Search skills..."
                        className="w-full px-3 py-2 text-sm text-[#1d1d1f] border border-[#d2d2d7] rounded-lg focus:ring-1 focus:ring-[#0071e3] focus:border-[#0071e3]"
                      />
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 mt-2">
                      {renderFilterItems(availableFilters.keywords, 'keyword')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Resume Cards */}
            <div className="lg:col-span-4">
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0071e3]"></div>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-100 text-red-500 rounded-xl p-4 text-center">
                  {error}
                </div>
              ) : filteredResumes.length === 0 ? (
                <div className="text-center py-12 px-4 bg-white rounded-2xl shadow-sm">
                  <svg className="mx-auto h-12 w-12 text-[#86868b]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-[#1d1d1f]">No resumes found</h3>
                  <p className="mt-1 text-[#6e6e73]">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {sortedResumes.map((resume) => (
                    <ResumeCard
                      key={resume.id}
                      resume={resume}
                      isAdmin={user?.role === 'admin'}
                      onDelete={handleResumeDelete}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}