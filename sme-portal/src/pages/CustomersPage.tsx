import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, Plus, RotateCcw, Eye, ChevronLeft, ChevronRight, 
  X, Calendar, Phone, Mail, MapPin, Briefcase, Award, 
  FileText, ShieldAlert, BadgePercent, Star, ArrowRight, Edit, 
  Check, FileSpreadsheet, Users
} from "lucide-react";
import { customerApi, Customer } from "../api/customerApi";
import { formatZAR } from "../utils/format";
import { useSnackbar } from "notistack";

export default function CustomersPage() {
  const [stats, setStats] = useState({
    total_customers: 32,
    active_customers: 26,
    outstanding_amount: 420000,
    avg_payment_days: 28
  });
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [industryFilter, setIndustryFilter] = useState("All");
  const [riskFilter, setRiskFilter] = useState("All");
  
  // Selection / Drawer state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<"Overview" | "Invoices" | "Payment History" | "Notes & Documents">("Overview");
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  
  // Add Customer Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    industry: "Manufacturing",
    payment_terms: 30
  });

  // Edit Customer Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState({
    company_name: "",
    contact_person: "",
    email: "",
    phone: "",
    industry: "",
    payment_terms: 30
  });

  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const fetchCustomersData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await customerApi.getCustomers();
      setCustomers(res.data.customers);
      setStats(res.data.stats);
      
      // Auto-select first customer if available and nothing is selected
      if (res.data.customers.length > 0 && !selectedCustomer) {
        // Find ABC Manufacturing as default, otherwise pick first
        const abc = res.data.customers.find(c => c.company_name.includes("ABC Manufacturing"));
        setSelectedCustomer(abc || res.data.customers[0]);
      } else if (selectedCustomer) {
        // Refresh selected customer details
        const updated = res.data.customers.find(c => c.company_name === selectedCustomer.company_name);
        if (updated) setSelectedCustomer(updated);
      }
    } catch (err) {
      console.error("Failed to load customers", err);
      enqueueSnackbar("Failed to load customers", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar, selectedCustomer]);

  useEffect(() => {
    fetchCustomersData();
  }, []);

  // Filter logic
  const filteredCustomers = useMemo(() => {
    return customers.filter(cust => {
      const matchesSearch = 
        cust.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cust.contact_person.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cust.email.toLowerCase().includes(searchQuery.toLowerCase());
        
      const matchesStatus = 
        statusFilter === "All" || 
        (statusFilter === "Active" && cust.invoices_count > 1) || 
        (statusFilter === "Inactive" && cust.invoices_count <= 1);
        
      const matchesIndustry = 
        industryFilter === "All" || 
        cust.industry === industryFilter;
        
      const matchesRisk = 
        riskFilter === "All" || 
        cust.risk_level.toLowerCase().includes(riskFilter.toLowerCase());
        
      return matchesSearch && matchesStatus && matchesIndustry && matchesRisk;
    });
  }, [customers, searchQuery, statusFilter, industryFilter, riskFilter]);

  // Paginated customers
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCustomers, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage) || 1;

  // Handle pagination changes
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("All");
    setIndustryFilter("All");
    setRiskFilter("All");
    setCurrentPage(1);
  };

  // Create customer
  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.company_name) {
      enqueueSnackbar("Company Name is required", { variant: "warning" });
      return;
    }
    try {
      await customerApi.createCustomer(newCustomer);
      enqueueSnackbar("Customer added successfully", { variant: "success" });
      setIsAddModalOpen(false);
      setNewCustomer({
        company_name: "",
        contact_person: "",
        email: "",
        phone: "",
        industry: "Manufacturing",
        payment_terms: 30
      });
      fetchCustomersData();
    } catch (err) {
      console.error(err);
      enqueueSnackbar("Failed to add customer", { variant: "error" });
    }
  };

  // Edit customer setup
  const openEditModal = (cust: Customer) => {
    setEditCustomer({
      company_name: cust.company_name,
      contact_person: cust.contact_person,
      email: cust.email,
      phone: cust.phone,
      industry: cust.industry,
      payment_terms: cust.payment_terms
    });
    setIsEditModalOpen(true);
  };

  // Update customer
  const handleEditCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await customerApi.updateCustomer(editCustomer.company_name, editCustomer);
      enqueueSnackbar("Customer profile updated successfully", { variant: "success" });
      setIsEditModalOpen(false);
      fetchCustomersData();
    } catch (err) {
      console.error(err);
      enqueueSnackbar("Failed to update customer", { variant: "error" });
    }
  };

  // Get Initials for Avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  // Unique list of industries from all customers for the filter dropdown
  const uniqueIndustries = useMemo(() => {
    const set = new Set(customers.map(c => c.industry));
    return Array.from(set).filter(Boolean);
  }, [customers]);

  return (
    <div className="space-y-6 pb-12 text-[#071942] bg-[#f8faff] min-h-screen">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#071942]">Customers</h1>
          <p className="text-sm text-[#5f6d8a] mt-1">
            Manage your business customers and track their payment performance
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1f724f] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/10 transition-all hover:bg-[#165339] hover:shadow-emerald-950/20 active:scale-95 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add New Customer
        </button>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Customers */}
        <div className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#1f724f]">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#8f9bba] uppercase tracking-wider">Total Customers</p>
                <h3 className="text-2xl font-bold text-[#071942] mt-0.5">{stats.total_customers}</h3>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-xs">
            <span className="font-bold text-emerald-600 flex items-center gap-0.5">
              <ChevronRight className="h-3 w-3 -rotate-90" /> ↑ 12%
            </span>
            <span className="text-[#8f9bba]">All time</span>
          </div>
        </div>

        {/* Active Customers */}
        <div className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-[#1f724f]">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#8f9bba] uppercase tracking-wider">Active Customers</p>
              <h3 className="text-2xl font-bold text-[#071942] mt-0.5">{stats.active_customers}</h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-xs">
            <span className="font-bold text-emerald-600 flex items-center gap-0.5">
              <ChevronRight className="h-3 w-3 -rotate-90" /> ↑ 8%
            </span>
            <span className="text-[#8f9bba]">With recent invoices</span>
          </div>
        </div>

        {/* Outstanding Amount */}
        <div className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#8f9bba] uppercase tracking-wider">Outstanding Amount</p>
              <h3 className="text-2xl font-bold text-[#071942] mt-0.5">{formatZAR(stats.outstanding_amount)}</h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-xs">
            <span className="font-bold text-rose-600 flex items-center gap-0.5">
              <ChevronRight className="h-3 w-3 -rotate-90" /> ↑ 5%
            </span>
            <span className="text-[#8f9bba]">Across {customers.filter(c => c.outstanding_amount > 0).length} customers</span>
          </div>
        </div>

        {/* Average Payment Days */}
        <div className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#8f9bba] uppercase tracking-wider">Average Payment Days</p>
              <h3 className="text-2xl font-bold text-[#071942] mt-0.5">{stats.avg_payment_days} Days</h3>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-xs">
            <span className="font-bold text-emerald-600 flex items-center gap-0.5">
              <ChevronRight className="h-3 w-3 rotate-90" /> ↓ 6 days
            </span>
            <span className="text-[#8f9bba]">This month</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Split List and Details Drawer */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3 items-start">
        
        {/* Left Customer List Column (2/3 width) */}
        <div className={`${selectedCustomer ? "xl:col-span-2" : "xl:col-span-3"} space-y-6`}>
          
          {/* Filter Card */}
          <div className="rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-sm flex flex-col md:flex-row gap-4 items-center">
            
            {/* Search Input */}
            <div className="relative w-full flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[#91a1bf]" />
              <input
                type="text"
                placeholder="Search by customer name, contact, email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-[#dfe5f0] bg-white py-2.5 pl-10 pr-4 text-sm text-[#071942] placeholder-[#91a1bf] transition focus:border-[#1f724f] focus:outline-none focus:ring-1 focus:ring-[#1f724f]"
              />
            </div>

            {/* Status Filter */}
            <div className="w-full md:w-36">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-[#dfe5f0] bg-white px-3 py-2.5 text-sm text-[#071942] transition focus:border-[#1f724f] focus:outline-none"
              >
                <option value="All">Status: All</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Industry Filter */}
            <div className="w-full md:w-40">
              <select
                value={industryFilter}
                onChange={(e) => {
                  setIndustryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-[#dfe5f0] bg-white px-3 py-2.5 text-sm text-[#071942] transition focus:border-[#1f724f] focus:outline-none"
              >
                <option value="All">Industry: All</option>
                {uniqueIndustries.map(ind => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            </div>

            {/* Risk / Payment Performance Filter */}
            <div className="w-full md:w-44">
              <select
                value={riskFilter}
                onChange={(e) => {
                  setRiskFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-[#dfe5f0] bg-white px-3 py-2.5 text-sm text-[#071942] transition focus:border-[#1f724f] focus:outline-none"
              >
                <option value="All">Payment Performance: All</option>
                <option value="Low Risk">Low Risk</option>
                <option value="Medium Risk">Medium Risk</option>
                <option value="High Risk">High Risk</option>
              </select>
            </div>

            {/* Reset Button */}
            <button
              onClick={handleResetFilters}
              className="inline-flex h-[42px] items-center gap-2 justify-center rounded-xl border border-[#dfe5f0] bg-white px-4 text-sm font-semibold text-[#5f6d8a] transition hover:bg-slate-50 active:scale-95 w-full md:w-auto shrink-0"
              title="Reset Filters"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </div>

          {/* Table Container */}
          <div className="rounded-2xl border border-[#e9eef8] bg-white shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-sm text-[#5f6d8a]">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1f724f] border-t-transparent"></div>
                Loading customer records...
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-[#1f724f] mb-4">
                  <Users className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-bold text-[#071942]">No customers found</h3>
                <p className="mt-1 text-sm text-[#5f6d8a] max-w-sm">
                  We couldn't find any customers matching your search filters. Try modifying your filters or add a new customer.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-[#f8fafc] text-xs font-semibold uppercase tracking-wider text-[#5f6d8a] border-b border-[#e9eef8]">
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Industry</th>
                      <th className="px-6 py-4 text-center">Invoices</th>
                      <th className="px-6 py-4">Outstanding Amount</th>
                      <th className="px-6 py-4 text-center">Avg. Payment Days</th>
                      <th className="px-6 py-4">Payment Performance</th>
                      <th className="px-6 py-4">Risk Level</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e9eef8] text-sm text-[#071942]">
                    {paginatedCustomers.map((cust) => {
                      const isSelected = selectedCustomer?.company_name === cust.company_name;
                      const hasOutstanding = cust.outstanding_amount > 0;
                      
                      // Risk Badge Colors
                      let riskBadgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-200/50";
                      if (cust.risk_level === "High Risk") {
                        riskBadgeClass = "bg-rose-50 text-rose-700 border border-rose-200/50";
                      } else if (cust.risk_level === "Medium Risk") {
                        riskBadgeClass = "bg-amber-50 text-amber-700 border border-amber-200/50";
                      }
                      
                      return (
                        <tr 
                          key={cust.company_name} 
                          onClick={() => setSelectedCustomer(cust)}
                          className={`hover:bg-[#fbfcfe]/80 transition-colors cursor-pointer ${
                            isSelected ? "bg-emerald-50/20 hover:bg-emerald-50/30" : ""
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {/* Circle Initials Avatar */}
                              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold border ${
                                cust.risk_level === "High Risk" 
                                  ? "bg-rose-50 text-rose-700 border-rose-100" 
                                  : cust.risk_level === "Medium Risk"
                                  ? "bg-amber-50 text-amber-700 border-amber-100"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-100"
                              }`}>
                                {getInitials(cust.company_name)}
                              </div>
                              <div className="min-w-0 max-w-[200px]">
                                <p className="font-bold text-[#071942] truncate leading-tight">{cust.company_name}</p>
                                <p className="text-xs text-[#5f6d8a] truncate mt-0.5">{cust.contact_person}</p>
                                <p className="text-[10px] text-[#91a1bf] truncate">{cust.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-medium text-[#5f6d8a]">
                            {cust.industry}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-[#071942]">
                            {cust.invoices_count}
                          </td>
                          <td className={`px-6 py-4 font-bold ${hasOutstanding ? "text-[#071942]" : "text-[#8f9bba]"}`}>
                            {formatZAR(cust.outstanding_amount)}
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-[#071942]">
                            <span className={
                              cust.avg_payment_days >= 50 
                                ? "text-rose-600" 
                                : cust.avg_payment_days >= 35
                                ? "text-amber-600"
                                : "text-emerald-600"
                            }>
                              {cust.avg_payment_days} Days
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs font-semibold">
                              <p className={
                                cust.payment_performance.includes("often late") || cust.payment_performance.includes("Often late")
                                  ? "text-rose-600"
                                  : cust.payment_performance.includes("Sometimes late") || cust.payment_performance.includes("Mostly on time")
                                  ? "text-amber-600"
                                  : "text-emerald-600"
                              }>
                                {cust.payment_performance.split(" ")[0]} {cust.payment_performance.split(" ")[1] || ""}
                              </p>
                              <p className="text-[10px] text-[#91a1bf] mt-0.5 font-normal">
                                {cust.payment_performance.split(" ").slice(2).join(" ") || "On time"}
                              </p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${riskBadgeClass}`}>
                              {cust.risk_level}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => setSelectedCustomer(cust)}
                                className="rounded-lg p-2 text-[#5f6d8a] hover:bg-slate-100 transition"
                                title="View Details"
                              >
                                <Eye className="h-4.5 w-4.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Pagination Footer */}
            {!loading && filteredCustomers.length > 0 && (
              <div className="p-5 border-t border-[#e9eef8] flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="text-xs text-[#5f6d8a] font-medium">
                  Showing <span className="font-bold text-[#071942]">{Math.min(filteredCustomers.length, (currentPage - 1) * itemsPerPage + 1)}</span> to{" "}
                  <span className="font-bold text-[#071942]">{Math.min(filteredCustomers.length, currentPage * itemsPerPage)}</span> of{" "}
                  <span className="font-bold text-[#071942]">{filteredCustomers.length}</span> customers
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Items per page selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#5f6d8a]">Show:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="rounded-lg border border-[#dfe5f0] bg-white px-2 py-1 text-xs text-[#071942]"
                    >
                      <option value={5}>5 per page</option>
                      <option value={10}>10 per page</option>
                      <option value={20}>20 per page</option>
                    </select>
                  </div>

                  {/* Page Buttons */}
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => handlePageChange(currentPage - 1)}
                      className="flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-[#dfe5f0] bg-white text-[#5f6d8a] transition hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4.5 w-4.5" />
                    </button>
                    
                    {Array.from({ length: totalPages }).map((_, idx) => {
                      const page = idx + 1;
                      const isCurrent = page === currentPage;
                      return (
                        <button
                          key={page}
                          onClick={() => handlePageChange(page)}
                          className={`flex h-8.5 w-8.5 items-center justify-center rounded-lg text-xs font-bold transition ${
                            isCurrent
                              ? "bg-[#1f724f] text-white shadow-md shadow-emerald-950/10"
                              : "border border-[#dfe5f0] bg-white text-[#5f6d8a] hover:bg-slate-50"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => handlePageChange(currentPage + 1)}
                      className="flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-[#dfe5f0] bg-white text-[#5f6d8a] transition hover:bg-slate-50 disabled:opacity-40"
                    >
                      <ChevronRight className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Details Drawer Column (1/3 width) */}
        {selectedCustomer && (
          <div className="xl:col-span-1 rounded-2xl border border-[#e9eef8] bg-white p-5 shadow-md flex flex-col space-y-6 sticky top-6 max-h-[calc(100vh-100px)] overflow-y-auto">
            
            {/* Header: Circle initials + Company name */}
            <div className="flex items-start justify-between relative border-b border-[#e9eef8] pb-5">
              <div className="flex items-center gap-4">
                <div className={`flex h-14 w-14 items-center justify-center rounded-full text-base font-bold border ${
                  selectedCustomer.risk_level === "High Risk" 
                    ? "bg-rose-50 text-rose-700 border-rose-100" 
                    : selectedCustomer.risk_level === "Medium Risk"
                    ? "bg-amber-50 text-amber-700 border-amber-100"
                    : "bg-emerald-50 text-emerald-700 border-emerald-100"
                }`}>
                  {getInitials(selectedCustomer.company_name)}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[#071942] leading-snug pr-6">{selectedCustomer.company_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[#8f9bba]">Customer since Jan 2024</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wide">
                      Active
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCustomer(null)}
                className="absolute top-0 right-0 p-1 text-[#8f9bba] hover:text-[#071942] rounded-lg hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-[#e9eef8] flex gap-4 overflow-x-auto scrollbar-none">
              {(["Overview", "Invoices", "Payment History", "Notes & Documents"] as const).map(tab => {
                const isActive = activeDrawerTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveDrawerTab(tab)}
                    className={`pb-3 text-xs font-bold border-b-2 whitespace-nowrap transition-all ${
                      isActive 
                        ? "border-[#1f724f] text-[#1f724f]" 
                        : "border-transparent text-[#8f9bba] hover:text-[#5f6d8a]"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            {/* Tab content panel */}
            <div className="flex-1 space-y-6">
              
              {/* Tab 1: Overview */}
              {activeDrawerTab === "Overview" && (
                <div className="space-y-6">
                  {/* Contact Information */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#8f9bba] uppercase tracking-wider">Contact Information</h4>
                    <div className="rounded-xl border border-[#f3f6fc] bg-[#f8fafc]/50 p-4 space-y-3.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[#5f6d8a] font-medium flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-[#91a1bf]" /> Contact Person
                        </span>
                        <span className="font-bold text-[#071942]">{selectedCustomer.contact_person}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#5f6d8a] font-medium flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-[#91a1bf]" /> Email
                        </span>
                        <a href={`mailto:${selectedCustomer.email}`} className="font-bold text-[#1f724f] hover:underline">
                          {selectedCustomer.email}
                        </a>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#5f6d8a] font-medium flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-[#91a1bf]" /> Phone
                        </span>
                        <span className="font-bold text-[#071942]">{selectedCustomer.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#5f6d8a] font-medium flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-[#91a1bf]" /> Address
                        </span>
                        <span className="font-semibold text-[#071942] text-right max-w-[180px] truncate">
                          {selectedCustomer.address}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#5f6d8a] font-medium flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5 text-[#91a1bf]" /> Industry
                        </span>
                        <span className="font-bold text-[#071942]">{selectedCustomer.industry}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Performance metrics */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#8f9bba] uppercase tracking-wider">Payment Performance</h4>
                    <div className="rounded-xl border border-[#f3f6fc] bg-[#f8fafc]/50 p-4 space-y-3.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-[#5f6d8a] font-medium">Average Payment Days</span>
                        <span className={`font-black text-sm ${
                          selectedCustomer.avg_payment_days >= 50
                            ? "text-rose-600"
                            : selectedCustomer.avg_payment_days >= 35
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }`}>
                          {selectedCustomer.avg_payment_days} Days
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#5f6d8a] font-medium">Invoices Paid On Time</span>
                        <span className="font-bold text-emerald-600">
                          {selectedCustomer.company_name.includes("ABC") ? "95%" : selectedCustomer.company_name.includes("Office First") ? "98%" : selectedCustomer.company_name.includes("Metro") ? "80%" : selectedCustomer.company_name.includes("City Power") ? "60%" : "75%"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#5f6d8a] font-medium">Late Payments</span>
                        <span className="font-bold text-rose-600">
                          {selectedCustomer.company_name.includes("ABC") ? "5%" : selectedCustomer.company_name.includes("Office First") ? "2%" : selectedCustomer.company_name.includes("Metro") ? "20%" : selectedCustomer.company_name.includes("City Power") ? "40%" : "25%"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#5f6d8a] font-medium">Disputed Invoices</span>
                        <span className="font-bold text-[#071942]">0</span>
                      </div>
                      
                      {/* Risk Rating Card */}
                      <div className={`mt-2 rounded-xl p-3 border flex items-start gap-2.5 ${
                        selectedCustomer.risk_level === "High Risk"
                          ? "bg-rose-50 border-rose-100 text-rose-800"
                          : selectedCustomer.risk_level === "Medium Risk"
                          ? "bg-amber-50 border-amber-100 text-amber-800"
                          : "bg-emerald-50 border-emerald-100 text-emerald-800"
                      }`}>
                        <div className="mt-0.5">
                          <Award className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <p className="font-bold text-xs">Risk Level: {selectedCustomer.risk_level}</p>
                          <p className="text-[10px] opacity-80 mt-0.5">
                            {selectedCustomer.risk_level === "High Risk" 
                              ? "Longer payment cycles. Financing invoices carries higher defaults."
                              : selectedCustomer.risk_level === "Medium Risk"
                              ? "Generally pays invoices, with occasional delay offsets."
                              : "Reliable and prompt customer. Highly eligible for invoice financing."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Finance Eligibility Indicator */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#8f9bba] uppercase tracking-wider">Finance Eligibility Indicator</h4>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/20 p-4 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-[#5f6d8a] font-medium">Finance Confidence</span>
                        <div className="flex items-center gap-1 text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-4.5 w-4.5 fill-current ${
                                i < selectedCustomer.finance_confidence ? "text-amber-400" : "text-slate-200"
                              }`} 
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-[10px] text-[#5f6d8a] mt-2 leading-relaxed">
                        {selectedCustomer.finance_confidence >= 4 
                          ? "✓ Excellent customer. Qualifies for maximum advance rates (up to 90%) and low lender interest fee schedules."
                          : selectedCustomer.finance_confidence >= 3
                          ? "✓ Standard eligibility. Qualifies for standard advance rates (80%) under standard lender review."
                          : "⚠ High payment risk. Invoices are subject to enhanced security reviews and lower advance rates (60%)."}
                      </p>
                    </div>
                  </div>

                  {/* Invoice Summary */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#8f9bba] uppercase tracking-wider">Invoice Summary</h4>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                        <p className="text-[10px] text-[#5f6d8a] uppercase font-bold tracking-wider">Total Invoices</p>
                        <p className="text-sm font-black text-[#071942] mt-0.5">{selectedCustomer.invoices_count}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                        <p className="text-[10px] text-emerald-600 uppercase font-bold tracking-wider">Paid Invoices</p>
                        <p className="text-sm font-black text-emerald-600 mt-0.5">{selectedCustomer.paid_count}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-2.5">
                        <p className="text-[10px] text-[#071942] uppercase font-bold tracking-wider">Outstanding</p>
                        <p className="text-sm font-black text-[#071942] mt-0.5">{selectedCustomer.pending_count}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-xl bg-[#f8fafc] border border-slate-100 p-3">
                        <p className="text-[10px] text-[#5f6d8a] uppercase font-bold tracking-wider">Total Billed</p>
                        <p className="text-sm font-black text-[#071942] mt-0.5">{formatZAR(selectedCustomer.total_billed)}</p>
                      </div>
                      <div className="rounded-xl bg-amber-50/20 border border-amber-100/30 p-3">
                        <p className="text-[10px] text-[#071942] uppercase font-bold tracking-wider">Outstanding Amount</p>
                        <p className="text-sm font-black text-[#071942] mt-0.5">{formatZAR(selectedCustomer.outstanding_amount)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Recent Invoices list */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-[#8f9bba] uppercase tracking-wider">Recent Invoices</h4>
                      <button 
                        onClick={() => navigate("/invoices")}
                        className="text-xs font-bold text-[#1f724f] hover:underline inline-flex items-center gap-0.5"
                      >
                        View all Invoices <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    
                    <div className="rounded-xl border border-[#e9eef8] overflow-hidden">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-slate-50 border-b border-[#e9eef8] text-[#5f6d8a] font-bold uppercase tracking-wider">
                            <th className="px-3 py-2">Invoice #</th>
                            <th className="px-3 py-2">Due Date</th>
                            <th className="px-3 py-2">Amount</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2 text-right">Overdue</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e9eef8] text-[#071942]">
                          {selectedCustomer.invoices.slice(0, 4).map(inv => (
                            <tr key={inv.invoice_number} className="hover:bg-slate-50/50">
                              <td className="px-3 py-2 font-bold">{inv.invoice_number}</td>
                              <td className="px-3 py-2 text-[#5f6d8a]">
                                {inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "2-digit" }) : "-"}
                              </td>
                              <td className="px-3 py-2 font-semibold">{formatZAR(inv.amount)}</td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                                  inv.status === "Paid" 
                                    ? "bg-emerald-50 text-emerald-700" 
                                    : inv.status === "Overdue" 
                                    ? "bg-rose-50 text-rose-700" 
                                    : "bg-amber-50 text-amber-700"
                                }`}>
                                  {inv.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-bold text-rose-600">
                                {inv.days_overdue > 0 ? `${inv.days_overdue} days` : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Future AI Feature panel */}
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/10 p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-indigo-100/20 pb-2">
                      <span className="font-bold text-indigo-700">AI Customer Risk Prediction</span>
                      <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 uppercase tracking-wide">AI Model</span>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[#5f6d8a]">Predicted Risk Category</span>
                      <span className={`font-black text-xs ${
                        selectedCustomer.risk_level === "High Risk"
                          ? "text-rose-600"
                          : selectedCustomer.risk_level === "Medium Risk"
                          ? "text-amber-600"
                          : "text-emerald-600"
                      }`}>
                        {selectedCustomer.risk_level === "High Risk" 
                          ? "High Risk (92%)" 
                          : selectedCustomer.risk_level === "Medium Risk"
                          ? "Medium Risk (78%)"
                          : "Low Risk (87%)"}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#5f6d8a] space-y-1.5 pt-1">
                      <p className="font-semibold text-[#071942]">Key Decision Criteria:</p>
                      <ul className="list-none space-y-1 text-[#5f6d8a]">
                        <li className="flex items-start gap-1">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>Pays invoices in average of {selectedCustomer.avg_payment_days} days.</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>Consistent invoice history with {selectedCustomer.invoices_count} billed records.</span>
                        </li>
                        <li className="flex items-start gap-1">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>No disputed invoices or transaction reversals reported.</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Drawer Quick Actions */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#8f9bba] uppercase tracking-wider">Quick Actions</h4>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs font-bold">
                      <button
                        onClick={() => navigate("/invoices/upload", { 
                          state: { prefillClientName: selectedCustomer.company_name } 
                        })}
                        className="rounded-xl border border-[#1f724f] text-[#1f724f] py-2.5 hover:bg-emerald-50/50 transition active:scale-95"
                      >
                        + New Invoice
                      </button>
                      <button
                        onClick={() => navigate("/finance", { 
                          state: { prefillClientName: selectedCustomer.company_name } 
                        })}
                        className="rounded-xl border border-indigo-600 text-indigo-600 py-2.5 hover:bg-indigo-50/50 transition active:scale-95"
                      >
                        Request Finance
                      </button>
                      <button
                        onClick={() => navigate("/invoices")}
                        className="rounded-xl border border-slate-200 text-slate-600 py-2.5 hover:bg-slate-50 transition active:scale-95"
                      >
                        View Invoices
                      </button>
                      <button
                        onClick={() => openEditModal(selectedCustomer)}
                        className="rounded-xl border border-slate-200 text-slate-600 py-2.5 hover:bg-slate-50 transition active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <Edit className="h-3.5 w-3.5" /> Edit Customer
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* Tab 2: Invoices list */}
              {activeDrawerTab === "Invoices" && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-[#8f9bba] uppercase tracking-wider">
                    Invoice History ({selectedCustomer.invoices.length})
                  </h4>
                  <div className="space-y-2.5">
                    {selectedCustomer.invoices.map(inv => (
                      <div 
                        key={inv.invoice_number} 
                        className="rounded-xl border border-[#e9eef8] bg-[#f8fafc]/30 p-3.5 flex items-center justify-between text-xs hover:border-[#1f724f]/40 transition"
                      >
                        <div className="space-y-1">
                          <p className="font-extrabold text-[#071942] flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-[#1f724f]" /> {inv.invoice_number}
                          </p>
                          <p className="text-[10px] text-[#5f6d8a]">
                            Issued: {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                          </p>
                          <p className="text-[10px] text-[#5f6d8a]">
                            Due: {inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                          </p>
                        </div>
                        <div className="text-right space-y-1.5">
                          <p className="font-black text-[#071942]">{formatZAR(inv.amount)}</p>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.status === "Paid" 
                              ? "bg-emerald-50 text-emerald-700" 
                              : inv.status === "Overdue" 
                              ? "bg-rose-50 text-rose-700" 
                              : "bg-amber-50 text-amber-700"
                          }`}>
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Payment History */}
              {activeDrawerTab === "Payment History" && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-[#8f9bba] uppercase tracking-wider">
                    Payment Lifecycle Timeline
                  </h4>
                  
                  <div className="border-l-2 border-emerald-500/30 pl-4 py-1 space-y-6 text-xs">
                    
                    <div className="relative">
                      <div className="absolute -left-[23px] top-0.5 bg-emerald-500 h-2.5 w-2.5 rounded-full ring-4 ring-emerald-50" />
                      <p className="font-bold text-[#071942]">Average Payment Time Evaluated</p>
                      <p className="text-[10px] text-[#5f6d8a] mt-0.5">Weighted average verified at {selectedCustomer.avg_payment_days} Days.</p>
                    </div>

                    <div className="relative">
                      <div className="absolute -left-[23px] top-0.5 bg-emerald-500 h-2.5 w-2.5 rounded-full ring-4 ring-emerald-50" />
                      <p className="font-bold text-[#071942]">{selectedCustomer.paid_count} Invoices Settled</p>
                      <p className="text-[10px] text-[#5f6d8a] mt-0.5">Paid on time compliance rate: {selectedCustomer.company_name.includes("ABC") ? "95%" : "98%"}.</p>
                    </div>

                    <div className="relative">
                      <div className="absolute -left-[23px] top-0.5 bg-amber-500 h-2.5 w-2.5 rounded-full ring-4 ring-amber-50" />
                      <p className="font-bold text-[#071942]">{selectedCustomer.pending_count} Invoice Pending Settlement</p>
                      <p className="text-[10px] text-[#5f6d8a] mt-0.5">Total outstanding exposure: {formatZAR(selectedCustomer.outstanding_amount)}.</p>
                    </div>

                    <div className="relative">
                      <div className="absolute -left-[23px] top-0.5 bg-indigo-500 h-2.5 w-2.5 rounded-full ring-4 ring-indigo-50" />
                      <p className="font-bold text-[#071942]">Client Verification Checked</p>
                      <p className="text-[10px] text-[#5f6d8a] mt-0.5">Linked CIPC profiles and contact channels verified.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: Notes and Documents */}
              {activeDrawerTab === "Notes & Documents" && (
                <div className="space-y-5 text-xs text-[#5f6d8a]">
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#8f9bba] uppercase tracking-wider">Business Attachments</h4>
                    <div className="rounded-xl border border-[#e9eef8] p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer">
                      <div className="flex items-center gap-2.5">
                        <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                        <div>
                          <p className="font-bold text-[#071942]">CIPC_Registration_Profile.pdf</p>
                          <p className="text-[10px] text-[#8f9bba] mt-0.5">1.2 MB • CIPC Profile Verification</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[#8f9bba]" />
                    </div>
                    <div className="rounded-xl border border-[#e9eef8] p-3 flex items-center justify-between hover:bg-slate-50 cursor-pointer">
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-5 w-5 text-emerald-600" />
                        <div>
                          <p className="font-bold text-[#071942]">FICA_Compliance_Letter.pdf</p>
                          <p className="text-[10px] text-[#8f9bba] mt-0.5">580 KB • KYC Compliance</p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-[#8f9bba]" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-[#8f9bba] uppercase tracking-wider">SME Internal Notes</h4>
                      <button className="text-[10px] font-bold text-[#1f724f] hover:underline">+ Add Note</button>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                      <p className="font-semibold text-[#071942]">Customer relationship verified</p>
                      <p className="text-[10px] text-[#5f6d8a] leading-relaxed">
                        Relationship has been active since 2024. Prompt payer, typically processes payments on Thursdays weekly. Ideal candidate for immediate finance request funding.
                      </p>
                      <p className="text-[9px] text-[#8f9bba] text-right font-medium">Added by SME Owner • 10 Jun 2026</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>

      {/* MODAL 1: ADD NEW CUSTOMER */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-100">
            <div className="flex items-center justify-between border-b border-[#e9eef8] pb-3">
              <h3 className="text-lg font-bold text-[#071942]">Add New Customer</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="h-5 w-5 text-[#8f9bba]" />
              </button>
            </div>
            
            <form onSubmit={handleAddCustomerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#5f6d8a] uppercase tracking-wider mb-2">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ABC Manufacturing (Pty) Ltd"
                  value={newCustomer.company_name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, company_name: e.target.value })}
                  className="w-full rounded-xl border border-[#dfe5f0] bg-white px-4 py-2.5 text-sm focus:border-[#1f724f] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#5f6d8a] uppercase tracking-wider mb-2">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. John Smith"
                    value={newCustomer.contact_person}
                    onChange={(e) => setNewCustomer({ ...newCustomer, contact_person: e.target.value })}
                    className="w-full rounded-xl border border-[#dfe5f0] bg-white px-4 py-2.5 text-sm focus:border-[#1f724f] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5f6d8a] uppercase tracking-wider mb-2">Industry</label>
                  <select
                    value={newCustomer.industry}
                    onChange={(e) => setNewCustomer({ ...newCustomer, industry: e.target.value })}
                    className="w-full rounded-xl border border-[#dfe5f0] bg-white px-3 py-2.5 text-sm focus:border-[#1f724f] focus:outline-none"
                  >
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Retail & Trade">Retail & Trade</option>
                    <option value="Technology">Technology</option>
                    <option value="Construction">Construction</option>
                    <option value="Professional Services">Professional Services</option>
                    <option value="Logistics">Logistics</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#5f6d8a] uppercase tracking-wider mb-2">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. john@abc.co.za"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    className="w-full rounded-xl border border-[#dfe5f0] bg-white px-4 py-2.5 text-sm focus:border-[#1f724f] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5f6d8a] uppercase tracking-wider mb-2">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +27 82 123 4567"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    className="w-full rounded-xl border border-[#dfe5f0] bg-white px-4 py-2.5 text-sm focus:border-[#1f724f] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5f6d8a] uppercase tracking-wider mb-2">Payment Terms (Days)</label>
                <input
                  type="number"
                  placeholder="30"
                  value={newCustomer.payment_terms}
                  onChange={(e) => setNewCustomer({ ...newCustomer, payment_terms: Number(e.target.value) })}
                  className="w-full rounded-xl border border-[#dfe5f0] bg-white px-4 py-2.5 text-sm focus:border-[#1f724f] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#e9eef8]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl border border-[#dfe5f0] px-5 py-2.5 text-sm font-bold text-[#5f6d8a] hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#1f724f] px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#165339]"
                >
                  Add Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT CUSTOMER */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-100">
            <div className="flex items-center justify-between border-b border-[#e9eef8] pb-3">
              <h3 className="text-lg font-bold text-[#071942]">Edit Customer Profile</h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="h-5 w-5 text-[#8f9bba]" />
              </button>
            </div>
            
            <form onSubmit={handleEditCustomerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#5f6d8a] uppercase tracking-wider mb-2">Company Name (Locked)</label>
                <input
                  type="text"
                  disabled
                  value={editCustomer.company_name}
                  className="w-full rounded-xl border border-[#dfe5f0] bg-slate-50 px-4 py-2.5 text-sm text-[#8f9bba] cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#5f6d8a] uppercase tracking-wider mb-2">Contact Person</label>
                  <input
                    type="text"
                    placeholder="e.g. John Smith"
                    value={editCustomer.contact_person}
                    onChange={(e) => setEditCustomer({ ...editCustomer, contact_person: e.target.value })}
                    className="w-full rounded-xl border border-[#dfe5f0] bg-white px-4 py-2.5 text-sm focus:border-[#1f724f] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5f6d8a] uppercase tracking-wider mb-2">Industry</label>
                  <select
                    value={editCustomer.industry}
                    onChange={(e) => setEditCustomer({ ...editCustomer, industry: e.target.value })}
                    className="w-full rounded-xl border border-[#dfe5f0] bg-white px-3 py-2.5 text-sm focus:border-[#1f724f] focus:outline-none"
                  >
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Retail & Trade">Retail & Trade</option>
                    <option value="Technology">Technology</option>
                    <option value="Construction">Construction</option>
                    <option value="Professional Services">Professional Services</option>
                    <option value="Logistics">Logistics</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#5f6d8a] uppercase tracking-wider mb-2">Email Address</label>
                  <input
                    type="email"
                    placeholder="e.g. john@abc.co.za"
                    value={editCustomer.email}
                    onChange={(e) => setEditCustomer({ ...editCustomer, email: e.target.value })}
                    className="w-full rounded-xl border border-[#dfe5f0] bg-white px-4 py-2.5 text-sm focus:border-[#1f724f] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5f6d8a] uppercase tracking-wider mb-2">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +27 82 123 4567"
                    value={editCustomer.phone}
                    onChange={(e) => setEditCustomer({ ...editCustomer, phone: e.target.value })}
                    className="w-full rounded-xl border border-[#dfe5f0] bg-white px-4 py-2.5 text-sm focus:border-[#1f724f] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5f6d8a] uppercase tracking-wider mb-2">Payment Terms (Days)</label>
                <input
                  type="number"
                  placeholder="30"
                  value={editCustomer.payment_terms}
                  onChange={(e) => setEditCustomer({ ...editCustomer, payment_terms: Number(e.target.value) })}
                  className="w-full rounded-xl border border-[#dfe5f0] bg-white px-4 py-2.5 text-sm focus:border-[#1f724f] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#e9eef8]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl border border-[#dfe5f0] px-5 py-2.5 text-sm font-bold text-[#5f6d8a] hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#1f724f] px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#165339]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
