import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { usersApi } from '../api/client';
import { Plus, Edit2, Trash2, Shield, ShoppingCart, Users as UsersIcon, Loader2, X } from 'lucide-react';
import { Avatar, toast, Sheet } from '../components/ui';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const ROLES = [
  { id: 'MANAGER', label: 'Manager', icon: Shield, description: 'Can manage inventory and view reports' },
  { id: 'CASHIER', label: 'Cashier', icon: ShoppingCart, description: 'Can make sales and view own transactions' },
];

const ROLE_COLORS = { OWNER: 'bg-brand/10 text-brand-light', MANAGER: 'bg-success/10 text-success', CASHIER: 'bg-surface-muted text-zinc-400' };

function UserSheet({ editingUser, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: editingUser?.name || '',
    email: editingUser?.email || '',
    password: '',
    role: editingUser?.role || 'CASHIER'
  });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingUser) {
        const data = { name: form.name, role: form.role };
        if (form.password) data.password = form.password;
        await usersApi.update(editingUser.id, data);
      } else {
        await usersApi.create(form);
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-3.5 py-2.5 bg-surface-muted border border-surface-overlay/50 rounded-lg text-zinc-100 text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand/50 transition-all disabled:opacity-50";
  const labelClass = "block text-xs font-medium text-zinc-400 mb-1.5";

  return (
    <div className="flex flex-col h-full bg-surface-subtle">
      <div className="px-5 py-4 border-b border-surface-muted/50 flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-semibold text-zinc-100">{editingUser ? 'Edit Team Member' : 'Add Team Member'}</h2>
        <button onClick={onClose} className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors rounded-lg hover:bg-surface-muted">
          <X className="w-4 h-4" />
        </button>
      </div>
      <form id="user-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
        <div>
          <label className={labelClass}>Full name *</label>
          <input type="text" required value={form.name} onChange={set('name')} placeholder="Jane Doe" className={inputClass} autoFocus />
        </div>
        <div>
          <label className={labelClass}>Email address *</label>
          <input type="email" required value={form.email} onChange={set('email')} placeholder="jane@example.com" className={inputClass} disabled={!!editingUser} />
          {editingUser && <p className="text-xs text-zinc-600 mt-1">Email cannot be changed</p>}
        </div>
        <div>
          <label className={labelClass}>{editingUser ? 'New password (leave blank to keep)' : 'Password *'}</label>
          <input type="password" required={!editingUser} minLength={8} value={form.password} onChange={set('password')} placeholder={editingUser ? 'Enter to change' : 'Min 8 characters'} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Role *</label>
          <div className="space-y-2 mt-1">
            {ROLES.map(role => {
              const Icon = role.icon;
              return (
                <motion.label key={role.id} whileTap={{ scale: 0.98 }}
                  className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                    form.role === role.id ? 'border-brand/40 bg-brand/5' : 'border-surface-overlay/40 hover:border-surface-overlay'
                  }`}>
                  <input type="radio" name="role" value={role.id} checked={form.role === role.id} onChange={set('role')} className="sr-only" />
                  <Icon className={`w-4 h-4 flex-shrink-0 ${form.role === role.id ? 'text-brand-light' : 'text-zinc-500'}`} />
                  <div>
                    <p className={`text-sm font-medium ${form.role === role.id ? 'text-brand-light' : 'text-zinc-200'}`}>{role.label}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{role.description}</p>
                  </div>
                </motion.label>
              );
            })}
          </div>
        </div>
      </form>
      <div className="px-5 py-4 border-t border-surface-muted/50 flex gap-3 flex-shrink-0">
        <motion.button type="button" onClick={onClose} whileTap={{ scale: 0.97 }}
          className="flex-1 py-2.5 bg-surface-muted hover:bg-surface-overlay text-zinc-300 text-sm font-medium rounded-xl transition-colors">
          Cancel
        </motion.button>
        <motion.button type="submit" form="user-form" disabled={saving} whileTap={{ scale: 0.97 }}
          className="flex-1 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : (editingUser ? 'Update' : 'Add Member')}
        </motion.button>
      </div>
    </div>
  );
}

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const r = await usersApi.getAll();
      setUsers(r.data.data);
    } catch {}
    setLoading(false);
  };

  const openSheet = (user = null) => { setEditingUser(user); setSheetOpen(true); };

  const handleToggleActive = async (user) => {
    try {
      await usersApi.update(user.id, { active: !user.active });
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, active: !u.active } : u));
      toast.success(user.active ? `${user.name} deactivated` : `${user.name} reactivated`);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update user'); }
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Team</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{users.length} member{users.length !== 1 ? 's' : ''}</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => openSheet()}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-brand/20"
        >
          <Plus className="w-4 h-4" /> Add Member
        </motion.button>
      </motion.div>

      {/* Cards grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0,1,2,3].map(i => (
            <div key={i} className="bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-surface-muted animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-surface-muted rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-surface-muted rounded animate-pulse w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-24 text-zinc-600">
          <UsersIcon className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-base font-medium text-zinc-500">You're flying solo</p>
          <p className="text-sm mt-1">Add your first team member to get started</p>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => openSheet()}
            className="mt-5 flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-xl transition-colors">
            <Plus className="w-4 h-4" /> Add Member
          </motion.button>
        </motion.div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        >
          {users.map((user) => {
            const isMe = user.id === currentUser?.id;
            const canEdit = !isMe && user.role !== 'OWNER';
            return (
              <motion.div
                key={user.id}
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } } }}
                className={`bg-surface-subtle border border-surface-muted/50 rounded-2xl p-5 group transition-opacity ${!user.active ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar name={user.name} size="lg" />
                      {user.active && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-surface-subtle" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                        {user.name}
                        {isMe && <span className="text-xs text-zinc-600 font-normal">(You)</span>}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">{user.email}</p>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => openSheet(user)}
                        className="p-1.5 text-zinc-500 hover:text-brand-light hover:bg-brand/10 rounded-lg transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleToggleActive(user)}
                        className="p-1.5 text-zinc-500 hover:text-danger-light hover:bg-danger/10 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ROLE_COLORS[user.role] || ROLE_COLORS.CASHIER}`}>
                    {user.role}
                  </span>
                  <span className="text-xs text-zinc-600">{user._count?.sales || 0} sales</span>
                </div>

                {!user.active && (
                  <div className="mt-3 pt-3 border-t border-surface-muted/40 flex items-center justify-between">
                    <span className="text-xs text-danger-light">Deactivated</span>
                    <button onClick={() => handleToggleActive(user)} className="text-xs text-brand-light hover:text-brand transition-colors">Reactivate</button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <UserSheet
          editingUser={editingUser}
          onClose={() => setSheetOpen(false)}
          onSaved={async () => {
            setSheetOpen(false);
            await fetchUsers();
            toast.success(editingUser ? 'User updated' : 'Team member added');
          }}
        />
      </Sheet>
    </div>
  );
}
