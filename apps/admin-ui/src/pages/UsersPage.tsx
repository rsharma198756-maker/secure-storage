import "./UsersPage.css";

type UsersPageProps = Record<string, any>;

export default function UsersPage(props: UsersPageProps) {
  const {
    setShowCreateUser,
    PlusIcon,
    users,
    DEFAULT_PAGE_SIZE,
    usersPage,
    setUsersPage,
    onSelectUser,
    selectedUser,
    getInitials,
    ShieldIcon,
    isBusy,
    session,
    formatDate,
    setSelectedUser,
    editUserFirstName,
    setEditUserFirstName,
    editUserLastName,
    setEditUserLastName,
    editUserEmail,
    setEditUserEmail,
    editUserPhoneNumber,
    setEditUserPhoneNumber,
    selectedRoleIds,
    onRequestUserAccessRoleChange,
    roles,
    ChevronIcon,
    onResetPassword,
    setDeleteUserId,
    onDoneUserDetails,
    isUserProfileDirty,
    resetUserId,
    setResetUserId,
    showResetPassword,
    setShowResetPassword,
    resetNewPassword,
    setResetNewPassword,
    LockIcon,
    EyeOffIcon,
    EyeIcon,
    onConfirmResetPassword,
    resetPasswordError,
    pendingRoleChange,
    setPendingRoleChange,
    onConfirmUserAccessRoleChange,
    deleteUserId,
    deleteUserTarget,
    onConfirmRemoveUser,
  } = props as any;

  return (
    <section className="users-page">
      <div className="panel">
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateUser(true)}>
            <PlusIcon /> Create User
          </button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>User / Name</th>
              <th>Roles</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const adminUsers = users.filter((u: any) => !u.roles || u.roles.length === 0);
              const regularUsers = users.filter((u: any) => u.roles && u.roles.length > 0);
              const orderedUsers = [...adminUsers, ...regularUsers];
              const totalPages = Math.max(1, Math.ceil(orderedUsers.length / DEFAULT_PAGE_SIZE));
              const currentPage = Math.min(usersPage, totalPages);
              const startIndex = (currentPage - 1) * DEFAULT_PAGE_SIZE;
              const pagedUsers = orderedUsers.slice(startIndex, startIndex + DEFAULT_PAGE_SIZE);
              const pagedAdminUsers = pagedUsers.filter((u: any) => !u.roles || u.roles.length === 0);
              const pagedRegularUsers = pagedUsers.filter((u: any) => u.roles && u.roles.length > 0);

              const renderRow = (user: typeof users[0]) => {
                const isAdminUser = !user.roles || user.roles.length === 0;
                return (
                  <tr
                    key={user.id}
                    onClick={() => !isAdminUser && onSelectUser(user)}
                    style={{
                      background: selectedUser?.id === user.id ? "var(--accent-light)" : undefined,
                      cursor: isAdminUser ? "default" : "pointer",
                      opacity: isAdminUser ? 0.7 : 1
                    }}
                  >
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div className="sidebar-avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                          {getInitials({ firstName: user.first_name, lastName: user.last_name, email: user.email })}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span className="cell-email" style={{ marginBottom: 2 }}>
                            {user.first_name ? `${user.first_name} ${user.last_name}` : "-"}
                          </span>
                          <span style={{ fontSize: 12, color: "var(--ink-4)" }}>{user.email}</span>
                          {user.phone_number && (
                            <span style={{ fontSize: 12, color: "var(--ink-4)" }}>{user.phone_number}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      {isAdminUser ? (
                        <span className="badge badge-accent" style={{ fontSize: 11 }}>
                          <ShieldIcon size={11} style={{ marginRight: 3 }} /> admin
                        </span>
                      ) : (() => {
                        const visibleRoles = (user.roles ?? []).filter((r: any) => ["viewer", "editor"].includes(r));
                        if (visibleRoles.length === 0) return <span className="cell-muted">-</span>;
                        return visibleRoles.map((role: any) => (
                          <span key={role} className={`badge ${role === "editor" ? "badge-active" : "badge-disabled"}`} style={{ marginRight: 4 }}>
                            {role}
                          </span>
                        ));
                      })()}
                    </td>
                    <td>
                      <span className={`badge ${user.status === "active" ? "badge-active" : "badge-disabled"}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="cell-muted">{formatDate(user.created_at)}</td>
                  </tr>
                );
              };

              const sectionLabel = (label: string) => (
                <tr key={`section-${label}`} style={{ pointerEvents: "none" }}>
                  <td colSpan={5} style={{ padding: "8px 16px 4px", background: "var(--bg)" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-4)", letterSpacing: "0.6px", textTransform: "uppercase" }}>
                      {label}
                    </span>
                  </td>
                </tr>
              );

              return (
                <>
                  {pagedAdminUsers.length > 0 && sectionLabel("Administrators")}
                  {pagedAdminUsers.map((u: any) => renderRow(u))}
                  {pagedRegularUsers.length > 0 && sectionLabel("Users")}
                  {pagedRegularUsers.map((u: any) => renderRow(u))}
                </>
              );
            })()}
          </tbody>
        </table>
        {(() => {
          const totalUsers = users.length;
          const totalPages = Math.max(1, Math.ceil(totalUsers / DEFAULT_PAGE_SIZE));
          const currentPage = Math.min(usersPage, totalPages);
          const startIndex = (currentPage - 1) * DEFAULT_PAGE_SIZE;
          const start = totalUsers === 0 ? 0 : startIndex + 1;
          const end = Math.min(startIndex + DEFAULT_PAGE_SIZE, totalUsers);
          return (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 16px 0", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "var(--ink-4)" }}>
                Showing {start}-{end} of {totalUsers}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setUsersPage((prev: any) => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                >
                  Previous
                </button>
                <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setUsersPage((prev: any) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          );
        })()}

        {selectedUser && (
          <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
            <div className="modal" onClick={(e: any) => e.stopPropagation()} style={{ maxWidth: 480, padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>

              {/* ── HEADER ── */}
              <header style={{ padding: "24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: "50%",
                    background: "linear-gradient(135deg, #4f46e5, #818cf8)",
                    color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, fontWeight: 700, flexShrink: 0,
                    boxShadow: "0 4px 10px rgba(99,102,241,0.3)"
                  }}>
                    {getInitials({ firstName: selectedUser.first_name, lastName: selectedUser.last_name, email: selectedUser.email })}
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: "var(--ink-1)", display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      {selectedUser.first_name ? `${selectedUser.first_name} ${selectedUser.last_name}` : "System User"}
                      <span className={`badge ${selectedUser.status === "active" ? "badge-active" : "badge-disabled"}`} style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {selectedUser.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, color: "var(--ink-3)" }}>{selectedUser.email}</div>
                    {selectedUser.phone_number && (
                      <div style={{ fontSize: 13, color: "var(--ink-4)", marginTop: 4 }}>{selectedUser.phone_number}</div>
                    )}
                  </div>
                </div>
                <button onClick={() => setSelectedUser(null)} style={{ background: "transparent", border: "none", color: "var(--ink-3)", cursor: "pointer", padding: 4, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "var(--surface)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-1)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-3)"; }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </header>

              {/* ── BODY ── */}
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: 24, overflowY: "auto", maxHeight: "65vh" }}>

                {/* Edit Details */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Edit User Details</div>
                  <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}>First Name</label>
                      <input
                        className="modal-input"
                        type="text"
                        placeholder="First Name"
                        value={editUserFirstName}
                        onChange={(e: any) => setEditUserFirstName(e.target.value)}
                        style={{ margin: 0 }}
                      />
                    </div>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                      <label style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}>Last Name</label>
                      <input
                        className="modal-input"
                        type="text"
                        placeholder="Last Name"
                        value={editUserLastName}
                        onChange={(e: any) => setEditUserLastName(e.target.value)}
                        style={{ margin: 0 }}
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}>Email Address</label>
                    <input
                      className="modal-input"
                      type="email"
                      placeholder="Email address"
                      value={editUserEmail}
                      onChange={(e: any) => setEditUserEmail(e.target.value)}
                      style={{ margin: 0 }}
                    />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 16 }}>
                    <label style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}>Mobile Number</label>
                    <input
                      className="modal-input"
                      type="tel"
                      placeholder="Mobile number"
                      value={editUserPhoneNumber}
                      onChange={(e: any) => setEditUserPhoneNumber(e.target.value)}
                      style={{ margin: 0 }}
                    />
                  </div>
                </div>

                {/* Role Dropdown */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Manage Access Role</div>
                  <div className="shad-select-wrapper" style={{ width: "100%" }}>
                    <select
                      className="shad-select modal-input"
                      style={{ width: "100%", margin: 0 }}
                      value={(Array.from(selectedRoleIds)[0] as any) || ""}
                      onChange={(e: any) => onRequestUserAccessRoleChange(e.target.value)}
                      disabled={isBusy}
                    >
                      <option value="" disabled>Select a role...</option>
                      {roles.filter((r: any) => ["viewer", "editor"].includes(r.name)).map((role: any) => (
                        <option key={role.id} value={role.id}>
                          {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                        </option>
                      ))}
                    </select>
                    <ChevronIcon size={16} className="shad-select-caret" />
                  </div>
                </div>

                {/* Account Management Dropdown */}
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-4)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 12 }}>Account Management</div>
                  <div className="shad-select-wrapper" style={{ width: "100%" }}>
                    <select
                      className="shad-select modal-input"
                      style={{ width: "100%", margin: 0 }}
                      value=""
                      onChange={(e: any) => {
                        const val = e.target.value;
                        if (val === "reset") onResetPassword(selectedUser.id);
                        else if (val === "remove") setDeleteUserId(selectedUser.id);
                        e.target.value = "";
                      }}
                      disabled={isBusy}
                    >
                      <option value="" disabled>Select an action...</option>
                      <option value="reset">Reset Password</option>

                      {(() => {
                        const isAdminUser = !selectedUser.roles || selectedUser.roles.length === 0;
                        const isSelf = selectedUser.id === session?.user?.id;
                        if (!isAdminUser) {
                          return <option key="remove" value="remove" disabled={isSelf}>Remove User</option>;
                        }
                        return null;
                      })()}
                    </select>
                    <ChevronIcon size={16} className="shad-select-caret" />
                  </div>

                  {(() => {
                    const isAdminUser = !selectedUser.roles || selectedUser.roles.length === 0;
                    if (isAdminUser) {
                      return (
                        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "rgba(129,140,248,0.08)", border: "1px solid rgba(129,140,248,0.2)", fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>
                          <ShieldIcon size={14} /> Admin account — cannot be removed
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* ── FOOTER ── */}
              <footer style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", background: "var(--panel-bg)", display: "flex", justifyContent: "flex-end", gap: 12 }}>
                <button className="btn btn-ghost" onClick={() => setSelectedUser(null)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={() => { void onDoneUserDetails(); }}
                  disabled={isBusy || !editUserEmail.trim()}
                >
                  {isBusy ? "Saving..." : isUserProfileDirty ? "Save Changes" : "Save"}
                </button>
              </footer>

            </div>
          </div>
        )}

        {resetUserId && (
          <div className="modal-overlay" onClick={() => setResetUserId(null)}>
            <div className="modal" onClick={(e: any) => e.stopPropagation()} style={{ maxWidth: 400 }}>
              <div className="modal-title">Reset Password</div>
              <div className="modal-desc">
                Enter a new password for this user.
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-4)", marginBottom: 14, padding: "10px 14px", background: "var(--surface)", borderRadius: 10, lineHeight: 1.6 }}>
                🔒 Must be <strong>8+ characters</strong> with uppercase, lowercase, number and special character (e.g. <code>Secure@123</code>).
              </div>

              <div className="input-group" style={{ marginBottom: 20 }}>
                <span className="input-icon"><LockIcon /></span>
                <input
                  type={showResetPassword ? "text" : "password"}
                  placeholder="New password"
                  value={resetNewPassword}
                  onChange={(e: any) => setResetNewPassword(e.target.value)}
                  required
                  autoFocus
                />
                <button type="button" className="input-action-btn" onClick={() => setShowResetPassword(!showResetPassword)}>
                  {showResetPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn btn-secondary" onClick={() => setResetUserId(null)} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button className="btn btn-primary" onClick={onConfirmResetPassword} disabled={isBusy || Boolean(resetPasswordError)} style={{ flex: 1 }}>
                  {isBusy ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </div>
          </div>
        )}

        {pendingRoleChange && selectedUser && (
          <div className="modal-overlay" onClick={() => (!isBusy ? setPendingRoleChange(null) : undefined)}>
            <div className="modal" onClick={(e: any) => e.stopPropagation()} style={{ maxWidth: 420 }}>
              <div className="modal-title">Confirm role change</div>
              <div className="modal-desc" style={{ lineHeight: 1.6 }}>
                Change <strong>{selectedUser.email}</strong> from{" "}
                <strong>{pendingRoleChange.currentRoleName ?? "no role"}</strong> to{" "}
                <strong>{pendingRoleChange.roleName}</strong>?
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPendingRoleChange(null)}
                  disabled={isBusy}
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    void onConfirmUserAccessRoleChange();
                  }}
                  disabled={isBusy}
                  style={{ flex: 1 }}
                >
                  {isBusy ? "Updating..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}

        {deleteUserId && (
          <div className="modal-overlay" onClick={() => (!isBusy ? setDeleteUserId(null) : undefined)}>
            <div className="modal" onClick={(e: any) => e.stopPropagation()} style={{ maxWidth: 420 }}>
              <div className="modal-title">Remove user</div>
              <div className="modal-desc" style={{ lineHeight: 1.6 }}>
                This will permanently remove <strong>{deleteUserTarget?.email ?? "this user"}</strong> and all owned data.
                This action cannot be undone.
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setDeleteUserId(null)} disabled={isBusy} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button className="btn btn-danger btn-sm" onClick={onConfirmRemoveUser} disabled={isBusy} style={{ flex: 1 }}>
                  {isBusy ? "Removing..." : "Remove User"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section >
  );
}
