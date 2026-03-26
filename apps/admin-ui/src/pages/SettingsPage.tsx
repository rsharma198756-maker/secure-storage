type SettingsPageProps = Record<string, any>;

export default function SettingsPage(props: SettingsPageProps) {
  const {
    canControlSecurity,
    currentIpAddress,
    ipAccessRules,
    ipAccessLoading,
    ipAccessError,
    refreshIpAccessSettings,
    settingsIpAddress,
    setSettingsIpAddress,
    settingsIpEnabled,
    setSettingsIpEnabled,
    onSaveIpAccessRule,
    isIpAccessSubmitting,
    ipRuleActionId,
    onToggleIpAccessRule,
    onDeleteIpAccessRule,
    RefreshCwIcon,
    TrashIcon,
    isSecurityTokenValid,
    securityTokenRemainingSeconds,
    openSecurityStepUpModal,
    stepUpBusy,
    securityTargetUserId,
    setSecurityTargetUserId,
    users,
    session,
    onForceLogoutSelectedUser,
    isBusy,
    showSecurityStepUpModal,
    setShowSecurityStepUpModal,
    stepUpPassword,
    setStepUpPassword,
    stepUpOtpRequested,
    onRequestSecurityStepUpOtp,
    stepUpOtp,
    setStepUpOtp,
    onVerifySecurityStepUpOtp,
    PhoneIcon,
    LockIcon
  } = props as any;

  if (!canControlSecurity) {
    return (
      <div className="panel" style={{ padding: 24 }}>
        <div style={{ color: "var(--ink-3)" }}>
          You do not have permission to use admin settings.
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "grid", gap: 18 }}>
        <div className="panel" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, color: "var(--ink-1)" }}>Admin settings</h2>
              <p style={{ margin: "6px 0 0", color: "var(--ink-3)", fontSize: 14 }}>
                Keep it simple: control IP access and sign out a selected user.
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={openSecurityStepUpModal} disabled={stepUpBusy}>
              {isSecurityTokenValid ? "Re-verify" : "Verify identity"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 14 }}>
            <span className={`badge ${isSecurityTokenValid ? "badge-active" : "badge-disabled"}`}>
              {isSecurityTokenValid ? "Privileged actions unlocked" : "Verification required"}
            </span>
            {isSecurityTokenValid && (
              <span style={{ color: "var(--ink-4)", fontSize: 12 }}>
                Token expires in {securityTokenRemainingSeconds}s
              </span>
            )}
          </div>
        </div>

        <div className="panel" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, color: "var(--ink-1)" }}>IP access</h2>
              <p style={{ margin: "6px 0 0", color: "var(--ink-3)", fontSize: 14 }}>
                Enable or disable a specific IP address from using the app.
              </p>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => void refreshIpAccessSettings()}
              disabled={ipAccessLoading || isIpAccessSubmitting || Boolean(ipRuleActionId)}
            >
              <RefreshCwIcon size={14} style={{ marginRight: 4 }} />
              {ipAccessLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
            <span className="badge badge-active">Current IP</span>
            <span style={{ fontSize: 13, color: "var(--ink-2)", fontWeight: 600 }}>
              {currentIpAddress ?? "Unavailable"}
            </span>
          </div>

          {ipAccessError && (
            <div style={{ marginBottom: 14, color: "var(--red)", fontSize: 13 }}>
              {ipAccessError}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
              alignItems: "end",
              marginBottom: 18
            }}
          >
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--ink-4)", fontWeight: 600, marginBottom: 6 }}>
                IP address
              </label>
              <input
                className="modal-input"
                type="text"
                value={settingsIpAddress}
                onChange={(event: any) => setSettingsIpAddress(event.target.value)}
                placeholder="203.110.90.15"
                style={{ margin: 0 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--ink-4)", fontWeight: 600, marginBottom: 6 }}>
                Access
              </label>
              <select
                value={settingsIpEnabled ? "enabled" : "disabled"}
                onChange={(event: any) => setSettingsIpEnabled(event.target.value === "enabled")}
                style={{
                  width: "100%",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--ink-1)",
                  padding: "12px 14px",
                  minHeight: 46
                }}
              >
                <option value="disabled">Disabled</option>
                <option value="enabled">Enabled</option>
              </select>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => void onSaveIpAccessRule()}
              disabled={isIpAccessSubmitting || Boolean(ipRuleActionId)}
              style={{ minHeight: 46 }}
            >
              {isIpAccessSubmitting ? "Saving..." : "Save"}
            </button>
          </div>

          {ipAccessRules.length === 0 ? (
            <div
              style={{
                border: "1px dashed var(--border)",
                borderRadius: 12,
                padding: 18,
                color: "var(--ink-4)",
                fontSize: 13
              }}
            >
              No IP rules yet.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {ipAccessRules.map((rule: any) => {
                const isCurrentIp = Boolean(currentIpAddress && currentIpAddress === rule.ipAddress);
                const rowBusy = ipRuleActionId === rule.id;
                return (
                  <div
                    key={rule.id}
                    style={{
                      border: "1px solid var(--border)",
                      borderRadius: 14,
                      padding: 16,
                      background: "var(--surface)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      flexWrap: "wrap"
                    }}
                  >
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink-1)" }}>
                          {rule.ipAddress}
                        </span>
                        <span className={`badge ${rule.enabled ? "badge-active" : "badge-disabled"}`}>
                          {rule.enabled ? "Enabled" : "Disabled"}
                        </span>
                        {isCurrentIp && (
                          <span className="badge" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
                            Current IP
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--ink-4)" }}>
                        Updated by {rule.updatedByEmail ?? "system"}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        className={`btn ${rule.enabled ? "btn-danger" : "btn-primary"} btn-sm`}
                        onClick={() => void onToggleIpAccessRule(rule)}
                        disabled={rowBusy || isIpAccessSubmitting}
                      >
                        {rowBusy ? "Saving..." : rule.enabled ? "Disable" : "Enable"}
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => void onDeleteIpAccessRule(rule)}
                        disabled={rowBusy || isIpAccessSubmitting}
                      >
                        <TrashIcon size={14} style={{ marginRight: 4 }} />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="panel" style={{ padding: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20, color: "var(--ink-1)" }}>Sign out a user</h2>
          <p style={{ margin: "6px 0 16px", color: "var(--ink-3)", fontSize: 14 }}>
            Pick a user and end their active session. They will be taken back to login automatically.
          </p>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={securityTargetUserId}
              onChange={(event: any) => setSecurityTargetUserId(event.target.value)}
              style={{
                minWidth: 280,
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--ink-1)",
                padding: "10px 12px"
              }}
            >
              <option value="">Select a user...</option>
              {users
                .filter((user: any) => user.id !== session?.user?.id)
                .map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.email}
                  </option>
                ))}
            </select>

            <button
              className="btn btn-primary btn-sm"
              onClick={() => void onForceLogoutSelectedUser()}
              disabled={isBusy || !securityTargetUserId}
            >
              Sign out user
            </button>
          </div>
        </div>
      </div>

      {showSecurityStepUpModal && (
        <div className="modal-overlay" onClick={() => (!stepUpBusy ? setShowSecurityStepUpModal(false) : undefined)}>
          <div className="modal" onClick={(event: any) => event.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-title">Verify identity</div>
            <div className="modal-desc">
              Confirm your password and SMS OTP to unlock these admin actions.
            </div>

            <div className="input-group" style={{ marginBottom: 12 }}>
              <span className="input-icon"><LockIcon /></span>
              <input
                type="password"
                placeholder="Current password"
                value={stepUpPassword}
                onChange={(event: any) => setStepUpPassword(event.target.value)}
                disabled={stepUpBusy}
              />
            </div>

            {!stepUpOtpRequested ? (
              <button
                className="btn btn-primary"
                onClick={() => void onRequestSecurityStepUpOtp()}
                disabled={stepUpBusy || !stepUpPassword}
                style={{ width: "100%", marginBottom: 12 }}
              >
                {stepUpBusy ? "Requesting..." : "Send OTP"}
              </button>
            ) : (
              <>
                <div className="input-group" style={{ marginBottom: 12 }}>
                  <span className="input-icon"><PhoneIcon /></span>
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={stepUpOtp}
                    onChange={(event: any) => setStepUpOtp(event.target.value)}
                    disabled={stepUpBusy}
                    maxLength={6}
                  />
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => void onVerifySecurityStepUpOtp()}
                  disabled={stepUpBusy || !stepUpOtp}
                  style={{ width: "100%", marginBottom: 10 }}
                >
                  {stepUpBusy ? "Verifying..." : "Verify & unlock"}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => void onRequestSecurityStepUpOtp()}
                  disabled={stepUpBusy}
                  style={{ width: "100%" }}
                >
                  Resend OTP
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
