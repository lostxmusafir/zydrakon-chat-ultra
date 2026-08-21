"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Plus,
  UserPlus,
  Shield,
  Loader2,
  ChevronRight,
  TrendingUp,
  Activity,
  ArrowLeft,
  Mail,
  Lock,
  User
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import Link from "next/link";

interface UserAccount {
  id: string;
  email: string;
  name: string;
  role: string;
  tier: string;
  created_at?: string;
}

interface SearchLog {
  user_name: string;
  user_email: string;
  query: string;
  timestamp: string;
  session_id: string;
  model_used?: string;
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"users" | "logs">("users");
  const [usersList, setUsersList] = useState<UserAccount[]>([]);
  const [logsList, setLogsList] = useState<SearchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Authentication check
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminUser, setAdminUser] = useState<any>(null);
  const [showLoginForm, setShowLoginForm] = useState(false);

  // Admin Login States
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // New User Form States
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");
  const [newUserTier, setNewUserTier] = useState("free");
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check local credentials
    const token = localStorage.getItem("zydrakon_token");
    const storedUser = localStorage.getItem("zydrakon_user");
    
    if (!token || !storedUser) {
      setIsAdmin(false);
      setShowLoginForm(true);
      setLoading(false);
      return;
    }

    try {
      const user = JSON.parse(storedUser);
      setAdminUser(user);
      if (user.email === "admin@zydrakon.ai" || user.role === "admin") {
        setIsAdmin(true);
        setShowLoginForm(false);
      } else {
        setIsAdmin(false);
        setShowLoginForm(false);
      }
    } catch {
      setIsAdmin(false);
      setShowLoginForm(true);
    }
    setLoading(false);
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError(null);
    try {
      const res = await api.login({ email: loginEmail, password: loginPassword });
      
      // Check if logged in user is actually an admin
      if (res.user.email === "admin@zydrakon.ai" || res.user.role === "admin") {
        setAdminUser(res.user);
        setIsAdmin(true);
        setShowLoginForm(false);
      } else {
        setAdminUser(res.user);
        setIsAdmin(false);
        setShowLoginForm(false);
      }
    } catch (err: any) {
      setLoginError(err?.message || "Invalid admin credentials. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin === true) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [users, logs] = await Promise.all([
        api.getAdminUsers(),
        api.getAdminLogs()
      ]);
      setUsersList(users);
      setLogsList(logs);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch admin data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setFormSuccess(null);
    setFormError(null);

    try {
      await api.createAdminUser({
        email: newUserEmail,
        name: newUserName,
        password: newUserPassword,
        role: newUserRole,
        tier: newUserTier
      });
      
      setFormSuccess(`User ${newUserName} successfully created!`);
      // Reset form
      setNewUserEmail("");
      setNewUserName("");
      setNewUserPassword("");
      setNewUserRole("user");
      setNewUserTier("free");

      // Reload users list
      const updatedUsers = await api.getAdminUsers();
      setUsersList(updatedUsers);
    } catch (err: any) {
      setFormError(err?.message || "Failed to create user");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] text-gray-200 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-zinc-500 font-mono text-sm animate-pulse">Initializing Zydrakon Admin Panel...</p>
      </div>
    );
  }

  // 1. Show Admin Login Page if requested/not logged in
  if (showLoginForm) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center p-6 relative overflow-hidden select-none">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-600/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 p-8 rounded-3xl backdrop-blur-md relative z-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-orange-950/20 border border-orange-500/30 text-orange-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-orange-950/30">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-4">Admin Control Center</h1>
            <p className="text-xs text-zinc-500">
              Sign in with authorized administrator credentials.
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded-xl font-medium">
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider pl-1">Email or Username</label>
              <div className="relative flex items-center bg-[#000000]/40 border border-zinc-800 rounded-2xl p-3 focus-within:border-orange-500/60 focus-within:ring-1 focus-within:ring-orange-500/20 transition-all">
                <Mail className="w-4 h-4 text-zinc-500 shrink-0 mr-2.5" />
                <input
                  type="email"
                  required
                  placeholder="admin@zydrakon.ai"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-transparent text-xs md:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider pl-1">Password</label>
              <div className="relative flex items-center bg-[#000000]/40 border border-zinc-800 rounded-2xl p-3 focus-within:border-orange-500/60 focus-within:ring-1 focus-within:ring-orange-500/20 transition-all">
                <Lock className="w-4 h-4 text-zinc-500 shrink-0 mr-2.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-transparent text-xs md:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-bold text-sm tracking-wide shadow-lg shadow-orange-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loginLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Sign In as Admin</span>}
            </button>
          </form>

          <div className="pt-2 text-center border-t border-zinc-900">
            <Link
              href="/"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Back to Zydrakon AI
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. Show Access Denied if logged in but NOT admin
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center p-6 relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-950/10 blur-[130px] rounded-full pointer-events-none" />

        <div className="max-w-md w-full text-center space-y-6 bg-zinc-950 border border-zinc-800 p-8 rounded-3xl backdrop-blur-md relative z-10">
          <div className="w-16 h-16 bg-red-950/20 border border-red-500/30 text-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-red-950/30">
            <Shield className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Access Denied</h1>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Logged in as <span className="text-zinc-300 font-semibold">{adminUser?.email}</span>.<br />
              You do not have administrator permissions to access this control panel.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                localStorage.removeItem("zydrakon_token");
                localStorage.removeItem("zydrakon_refresh_token");
                localStorage.removeItem("zydrakon_user");
                setAdminUser(null);
                setIsAdmin(null);
                setShowLoginForm(true);
              }}
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-semibold transition-all cursor-pointer text-xs md:text-sm"
            >
              Sign In with Another Account
            </button>
            
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-semibold transition-all shadow-lg shadow-orange-950/40 text-xs md:text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Zydrakon AI
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-gray-200 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Link href="/" className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                <Shield className="text-orange-500 w-8 h-8" /> Zydrakon Control Center
              </h1>
            </div>
            <p className="text-zinc-500 text-sm pl-11">
              Logged in as <span className="text-zinc-300 font-medium">{adminUser?.email}</span>
            </p>
          </div>

          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 text-xs md:text-sm font-semibold rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 transition-all flex items-center gap-2 cursor-pointer text-zinc-300"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
            Sync Dashboard
          </button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900/30 border border-zinc-800/80 p-6 rounded-3xl backdrop-blur-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-950/20 border border-orange-500/20 text-orange-500 rounded-2xl flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-mono">TOTAL USERS</p>
              <p className="text-2xl font-black text-white">{usersList.length}</p>
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-zinc-800/80 p-6 rounded-3xl backdrop-blur-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-950/20 border border-purple-500/20 text-purple-500 rounded-2xl flex items-center justify-center shrink-0">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-mono">SEARCH LOGS</p>
              <p className="text-2xl font-black text-white">{logsList.length}</p>
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-zinc-800/80 p-6 rounded-3xl backdrop-blur-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-950/20 border border-emerald-500/20 text-emerald-500 rounded-2xl flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-mono">STATUS</p>
              <p className="text-2xl font-black text-emerald-400">HEALTHY</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800/60 p-1 bg-zinc-900/20 rounded-2xl max-w-sm">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "users" ? "bg-orange-600 text-white shadow-md shadow-orange-950/20" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Users className="w-4 h-4" />
            Users
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`flex-1 py-2.5 rounded-xl font-semibold text-xs md:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "logs" ? "bg-orange-600 text-white shadow-md shadow-orange-950/20" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Search className="w-4 h-4" />
            Search Logs
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-2xl text-red-400 text-xs md:text-sm font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === "users" ? (
          <div className="flex flex-col gap-6">
            
            {/* Users Table - Full Width, First */}
            <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-3xl backdrop-blur-sm overflow-hidden">
              <div className="p-6 border-b border-zinc-800/60 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white">Registered Users</h2>
                  <p className="text-zinc-500 text-xs mt-1">Manage all {usersList.length} accounts. Change tier from dropdown below.</p>
                </div>
                {loading && <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs md:text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800/60 text-zinc-500 font-mono uppercase tracking-wider text-[11px] bg-zinc-900/10">
                      <th className="py-4 px-6">Name</th>
                      <th className="py-4 px-6">Email</th>
                      <th className="py-4 px-6">Role</th>
                      <th className="py-4 px-6">Tier</th>
                      <th className="py-4 px-6">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/40 text-zinc-300">
                    {usersList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-zinc-500 font-mono">No users found.</td>
                      </tr>
                    ) : (
                      usersList.map((user) => (
                        <tr key={user.id} className="hover:bg-zinc-800/10 transition-colors">
                          <td className="py-4 px-6 font-semibold text-white">{user.name}</td>
                          <td className="py-4 px-6 font-mono text-zinc-400">{user.email}</td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              user.role === "admin" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-zinc-800 text-zinc-400 border border-zinc-700/40"
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <select
                              value={user.tier}
                              disabled={actionLoading}
                              onChange={async (e) => {
                                const newTier = e.target.value;
                                try {
                                  setActionLoading(true);
                                  await api.updateUserTier(user.id, newTier);
                                  const updatedUsers = await api.getAdminUsers();
                                  setUsersList(updatedUsers);
                                } catch (err: any) {
                                  alert(err?.message || "Failed to update tier");
                                } finally {
                                  setActionLoading(false);
                                }
                              }}
                              className={`px-2 py-0.5 rounded-xl text-[10px] font-bold uppercase tracking-wider bg-[#09090b] border focus:outline-none cursor-pointer ${
                                user.tier === "premium" ? "text-purple-400 border-purple-500/20 bg-purple-500/10 focus:border-purple-500" :
                                user.tier === "gold" ? "text-amber-400 border-amber-500/20 bg-amber-500/10 focus:border-amber-500" :
                                "text-blue-400 border-blue-500/20 bg-blue-500/10 focus:border-blue-500"
                              }`}
                            >
                              <option value="free" className="bg-zinc-950 text-blue-400">Free</option>
                              <option value="gold" className="bg-zinc-950 text-amber-400">Gold</option>
                              <option value="premium" className="bg-zinc-950 text-purple-400">Premium</option>
                            </select>
                          </td>
                          <td className="py-4 px-6 text-zinc-500 font-mono">
                            {user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Create User Form - Collapsible Section Below */}
            <div className="bg-zinc-900/30 border border-zinc-800/80 p-6 rounded-3xl backdrop-blur-sm space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <UserPlus className="text-orange-500 w-5 h-5" /> Create New User
                </h2>
                <p className="text-zinc-500 text-xs mt-1">Add an authorized client credential to Zydrakon AI.</p>
              </div>

              {formSuccess && (
                <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl font-medium">
                  {formSuccess}
                </div>
              )}

              {formError && (
                <div className="p-3 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded-xl font-medium">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1">Full Name</label>
                  <div className="relative flex items-center bg-[#09090b] border border-zinc-850 rounded-2xl p-3 focus-within:border-orange-500/60 focus-within:ring-1 focus-within:ring-orange-500/20 transition-all">
                    <User className="w-4 h-4 text-zinc-500 shrink-0 mr-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. John Doe"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1">Email Address</label>
                  <div className="relative flex items-center bg-[#09090b] border border-zinc-850 rounded-2xl p-3 focus-within:border-orange-500/60 focus-within:ring-1 focus-within:ring-orange-500/20 transition-all">
                    <Mail className="w-4 h-4 text-zinc-500 shrink-0 mr-2.5" />
                    <input
                      type="email"
                      required
                      placeholder="user@zydrakon.ai"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1">Password</label>
                  <div className="relative flex items-center bg-[#09090b] border border-zinc-850 rounded-2xl p-3 focus-within:border-orange-500/60 focus-within:ring-1 focus-within:ring-orange-500/20 transition-all">
                    <Lock className="w-4 h-4 text-zinc-500 shrink-0 mr-2.5" />
                    <input
                      type="password"
                      required
                      placeholder="Minimum 6 characters"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1">Role</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="w-full bg-[#09090b] border border-zinc-850 rounded-2xl p-3 text-sm text-zinc-300 focus:outline-none focus:border-orange-500/60"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pl-1">Tier</label>
                    <select
                      value={newUserTier}
                      onChange={(e) => setNewUserTier(e.target.value)}
                      className="w-full bg-[#09090b] border border-zinc-850 rounded-2xl p-3 text-sm text-zinc-300 focus:outline-none focus:border-orange-500/60"
                    >
                      <option value="free">Free</option>
                      <option value="gold">Gold</option>
                      <option value="premium">Premium</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-3 px-4 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Register User
                </button>
              </form>
            </div>

          </div>

        ) : (
          /* Logs Panel */
          <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-3xl backdrop-blur-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-zinc-800/60">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Search className="text-orange-500 w-5 h-5" /> Recent Search / Chat Logs
              </h2>
              <p className="text-zinc-500 text-xs mt-1">Real-time log of query inputs entered by clients (Expires hourly).</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm">
                <thead>
                  <tr className="border-b border-zinc-800/60 text-zinc-500 font-mono uppercase tracking-wider text-[11px] bg-zinc-900/10">
                    <th className="py-4 px-6">User</th>
                    <th className="py-4 px-6">Email</th>
                    <th className="py-4 px-6">Search Query</th>
                    <th className="py-4 px-6">Model</th>
                    <th className="py-4 px-6">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40 text-zinc-300">
                  {logsList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-zinc-500 font-mono">
                        No activity logs recorded. Perform a chat search to generate log history.
                      </td>
                    </tr>
                  ) : (
                    logsList.map((log, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/10 transition-colors">
                        <td className="py-4 px-6 font-semibold text-white shrink-0">{log.user_name}</td>
                        <td className="py-4 px-6 font-mono text-zinc-400">{log.user_email}</td>
                        <td className="py-4 px-6 max-w-md break-all pr-8">
                          <code className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-850/80 font-mono text-xs text-orange-400 block w-full truncate hover:text-clip hover:whitespace-normal">
                            {log.query}
                          </code>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                            {log.model_used || "unknown"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-zinc-500 font-mono shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
