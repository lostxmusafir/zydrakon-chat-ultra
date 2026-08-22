"use client";

import React, { useState, useEffect } from "react";
import { Users, Plus, X, UserPlus, Shield, User, Trash2, CheckCircle, AlertCircle, Sparkles } from "lucide-react";
import { Workspace, WorkspaceMember } from "@/lib/types";
import { api, ApiError } from "@/lib/api";

interface WorkspacesModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeWorkspaceId: string | null;
  onSelectWorkspace: (ws: Workspace | null) => void;
  currentUser: any;
}

export function WorkspacesModal({
  isOpen,
  onClose,
  activeWorkspaceId,
  onSelectWorkspace,
  currentUser
}: WorkspacesModalProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Workspace state
  const [showCreate, setShowCreate] = useState(false);
  const [newWsName, setNewWsName] = useState("");
  const [newWsDesc, setNewWsDesc] = useState("");

  // Add Member state
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadWorkspaces();
    }
  }, [isOpen]);

  const loadWorkspaces = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listWorkspaces();
      setWorkspaces(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    setError(null);
    setSuccessMsg(null);
    try {
      const created = await api.createWorkspace(newWsName.trim(), newWsDesc.trim());
      setWorkspaces([created, ...workspaces]);
      onSelectWorkspace(created);
      setNewWsName("");
      setNewWsDesc("");
      setShowCreate(false);
      setSuccessMsg(`Workspace "${created.name}" created successfully!`);
    } catch (err: any) {
      setError(err?.message || "Failed to create workspace");
    }
  };

  const handleAddMember = async (workspaceId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;
    setError(null);
    setSuccessMsg(null);
    setAddingMember(true);
    try {
      const updated = await api.addWorkspaceMember(workspaceId, newMemberEmail.trim());
      setWorkspaces(workspaces.map((w) => (w.id === workspaceId ? updated : w)));
      if (activeWorkspaceId === workspaceId) {
        onSelectWorkspace(updated);
      }
      setNewMemberEmail("");
      setSuccessMsg(`User '${newMemberEmail}' added to workspace!`);
    } catch (err: any) {
      setError(err?.message || "Failed to add user to workspace");
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (workspaceId: string, memberId: string, memberEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${memberEmail} from this workspace?`)) return;
    setError(null);
    setSuccessMsg(null);
    try {
      await api.removeWorkspaceMember(workspaceId, memberId);
      const updatedWs = await api.getWorkspace(workspaceId);
      setWorkspaces(workspaces.map((w) => (w.id === workspaceId ? updatedWs : w)));
      if (activeWorkspaceId === workspaceId) {
        onSelectWorkspace(updatedWs);
      }
      setSuccessMsg(`Removed ${memberEmail} from workspace.`);
    } catch (err: any) {
      setError(err?.message || "Failed to remove member");
    }
  };

  if (!isOpen) return null;

  const currentWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0] || null;
  const isOwner = currentWorkspace && currentUser && (currentWorkspace.owner_id === currentUser.id || currentWorkspace.members.some(m => m.id === currentUser.id && m.role === "owner"));

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0b0b0e] border border-zinc-800/80 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between bg-[#111116]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">Team Workspaces</h2>
              <p className="text-xs text-zinc-400">Collaborate & chat together with registered app users</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alert Notifications */}
        {error && (
          <div className="m-4 mb-0 p-3.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="m-4 mb-0 p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Header Actions */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">Your Workspaces</h3>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="px-3.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-semibold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-orange-500/10"
            >
              <Plus className="w-4 h-4" />
              <span>Create Workspace</span>
            </button>
          </div>

          {/* Create Workspace Form */}
          {showCreate && (
            <form onSubmit={handleCreateWorkspace} className="p-4 rounded-xl bg-[#13131a] border border-orange-500/30 space-y-3">
              <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider">New Workspace Details</h4>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Workspace Name *</label>
                <input
                  type="text"
                  placeholder="e.g. AI Engineering Team"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Shared workspace for project development and research"
                  value={newWsDesc}
                  onChange={(e) => setNewWsDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-sm text-white focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-orange-500 text-black font-semibold text-xs hover:bg-orange-600"
                >
                  Save Workspace
                </button>
              </div>
            </form>
          )}

          {/* Workspaces List Grid */}
          {loading ? (
            <div className="py-8 text-center text-zinc-500 text-xs">Loading workspaces...</div>
          ) : workspaces.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-950">
              <Users className="w-10 h-10 mx-auto text-zinc-600 mb-3" />
              <p className="text-sm font-medium text-zinc-300">No Workspaces Found</p>
              <p className="text-xs text-zinc-500 mt-1">Create your first workspace to invite team members and chat together!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {workspaces.map((ws) => {
                const isSelected = activeWorkspaceId === ws.id;
                return (
                  <div
                    key={ws.id}
                    onClick={() => onSelectWorkspace(ws)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-zinc-900 border-orange-500/70 shadow-lg shadow-orange-500/5"
                        : "bg-[#101015] border-zinc-800/80 hover:border-zinc-700"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <h4 className="text-sm font-bold text-white truncate">{ws.name}</h4>
                        {isSelected && (
                          <span className="text-[10px] bg-orange-500/20 text-orange-400 font-semibold px-2 py-0.5 rounded-md border border-orange-500/30">
                            Active
                          </span>
                        )}
                      </div>
                      {ws.description && (
                        <p className="text-xs text-zinc-400 line-clamp-2 mb-3">{ws.description}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-zinc-400" />
                        {ws.members.length} {ws.members.length === 1 ? "Member" : "Members"}
                      </span>
                      <span>Created {new Date(ws.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Active Workspace Member Management */}
          {currentWorkspace && (
            <div className="mt-6 pt-6 border-t border-zinc-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Members of '{currentWorkspace.name}'</span>
                    <span className="text-xs font-mono text-zinc-500">({currentWorkspace.members.length})</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Add registered app users by email to collaborate in this workspace
                  </p>
                </div>
              </div>

              {/* Add Member Input */}
              <form onSubmit={(e) => handleAddMember(currentWorkspace.id, e)} className="flex gap-2">
                <input
                  type="email"
                  placeholder="Enter registered user email (e.g. user@zydrakon.ai)"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                  required
                />
                <button
                  type="submit"
                  disabled={addingMember}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-orange-400" />
                  <span>{addingMember ? "Adding..." : "Add Member"}</span>
                </button>
              </form>

              {/* Members List */}
              <div className="space-y-2">
                {currentWorkspace.members.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-[#111117] border border-zinc-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-orange-400">
                        {m.name ? m.name[0].toUpperCase() : "U"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{m.name}</span>
                          {m.role === "owner" ? (
                            <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-md font-semibold border border-orange-500/30 flex items-center gap-1">
                              <Shield className="w-3 h-3" /> Owner
                            </span>
                          ) : (
                            <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md font-medium">
                              Member
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-500">{m.email}</span>
                      </div>
                    </div>

                    {isOwner && m.role !== "owner" && (
                      <button
                        onClick={() => handleRemoveMember(currentWorkspace.id, m.id, m.email)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800/80 bg-[#111116] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
