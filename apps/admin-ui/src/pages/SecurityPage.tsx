type SecurityPageProps = Record<string, any>;

export default function SecurityPage(props: SecurityPageProps) {
    const {
        tab,
        canControlSecurity,
        refreshSecurityControlState,
        securityLoading,
        isBusy,
        RefreshCwIcon,
        isSecurityTokenValid,
        securityTokenRemainingSeconds,
        openSecurityStepUpModal,
        stepUpBusy,
        securityError,
        securityState,
        formatDate,
        securityReason,
        setSecurityReason,
        securityTargetUserId,
        setSecurityTargetUserId,
        users,
        session,
        onForceLogoutSelectedUser,
        onForceLogoutEveryone,
        onTapOff,
        onTapOn,
        // Step-Up Modal
        showSecurityStepUpModal,
        setShowSecurityStepUpModal,
        stepUpPassword,
        setStepUpPassword,
        stepUpOtpRequested,
        onRequestSecurityStepUpOtp,
        stepUpOtp,
        setStepUpOtp,
        onVerifySecurityStepUpOtp,
        LockIcon,
        MailIcon,
    } = props as any;

    return (
        <>
            {/* ---- SECURITY TAB ---- */}
            {tab === "Security" && (
                <div className="panel" style={{ padding: 20 }}>
                    {!canControlSecurity ? (
                        <div style={{ color: "var(--ink-3)", padding: "8px 0" }}>
                            You do not have permission to use security controls.
                        </div>
                    ) : (
                        <>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: 20, color: "var(--ink-1)" }}>Security Control Center</h2>
                                    <p style={{ margin: "6px 0 0", color: "var(--ink-3)", fontSize: 14 }}>
                                        Targeted/global logout and emergency tap-off controls.
                                    </p>
                                </div>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => void refreshSecurityControlState()}
                                    disabled={securityLoading || isBusy}
                                >
                                    <RefreshCwIcon size={14} style={{ marginRight: 4 }} />
                                    {securityLoading ? "Refreshing..." : "Refresh State"}
                                </button>
                            </div>

                            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
                                <span className={`badge ${isSecurityTokenValid ? "badge-active" : "badge-disabled"}`}>
                                    {isSecurityTokenValid ? "Security controls unlocked" : "Verification required"}
                                </span>
                                {isSecurityTokenValid && (
                                    <span style={{ color: "var(--ink-4)", fontSize: 12 }}>
                                        Token expires in {securityTokenRemainingSeconds}s
                                    </span>
                                )}
                                <button className="btn btn-primary btn-sm" onClick={openSecurityStepUpModal} disabled={stepUpBusy}>
                                    {isSecurityTokenValid ? "Re-verify identity" : "Verify identity"}
                                </button>
                            </div>

                            {securityError && (
                                <div style={{ marginBottom: 12, color: "var(--red)", fontSize: 13 }}>
                                    {securityError}
                                </div>
                            )}

                            <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginBottom: 18 }}>
                                <div className="panel" style={{ margin: 0 }}>
                                    <div style={{ fontSize: 12, color: "var(--ink-4)", marginBottom: 6 }}>Tap-off status</div>
                                    <div style={{ fontSize: 18, fontWeight: 700, color: securityState?.tapOffActive ? "var(--red)" : "var(--green)" }}>
                                        {securityState?.tapOffActive ? "ACTIVE" : "INACTIVE"}
                                    </div>
                                    <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-4)" }}>
                                        Started: {securityState?.tapOffStartedAt ? formatDate(securityState.tapOffStartedAt) : "-"}
                                    </div>
                                </div>
                                <div className="panel" style={{ margin: 0 }}>
                                    <div style={{ fontSize: 12, color: "var(--ink-4)", marginBottom: 6 }}>Global logout cutoff</div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>
                                        {securityState?.globalLogoutAfter ? formatDate(securityState.globalLogoutAfter) : "Not set"}
                                    </div>
                                    <div style={{ marginTop: 6, fontSize: 12, color: "var(--ink-4)" }}>
                                        Last tap-off by: {securityState?.tapOffBy ?? "-"}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
                                <label style={{ fontSize: 12, color: "var(--ink-4)", fontWeight: 600 }}>Reason for security action</label>
                                <textarea
                                    value={securityReason}
                                    onChange={(event: any) => setSecurityReason(event.target.value)}
                                    placeholder="Reason for audit trail..."
                                    style={{
                                        minHeight: 80,
                                        resize: "vertical",
                                        borderRadius: 10,
                                        border: "1px solid var(--border)",
                                        background: "var(--surface)",
                                        color: "var(--ink-1)",
                                        padding: "10px 12px"
                                    }}
                                />
                            </div>

                            <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
                                <label style={{ fontSize: 12, color: "var(--ink-4)", fontWeight: 600 }}>
                                    Target user for single-account logout
                                </label>
                                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                    <select
                                        value={securityTargetUserId}
                                        onChange={(event: any) => setSecurityTargetUserId(event.target.value)}
                                        style={{
                                            minWidth: 260,
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
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => void onForceLogoutSelectedUser()}
                                        disabled={isBusy || !securityTargetUserId}
                                    >
                                        Logout Selected User
                                    </button>
                                </div>
                            </div>

                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => void onForceLogoutEveryone()}
                                    disabled={isBusy}
                                >
                                    Logout Everyone
                                </button>
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={() => void onTapOff()}
                                    disabled={isBusy || Boolean(securityState?.tapOffActive)}
                                >
                                    Activate Tap-Off
                                </button>
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => void onTapOn()}
                                    disabled={isBusy || !securityState?.tapOffActive}
                                >
                                    Restore Service
                                </button>
                            </div>

                            <div style={{ marginTop: 16, fontSize: 12, color: "var(--ink-4)" }}>
                                Tip: Use the <strong>Logout user</strong> action in the Users tab for targeted session revocation.
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Security Step-Up Verification Modal */}
            {showSecurityStepUpModal && (
                <div className="modal-overlay" onClick={() => (!stepUpBusy ? setShowSecurityStepUpModal(false) : undefined)}>
                    <div className="modal" onClick={(event: any) => event.stopPropagation()} style={{ maxWidth: 420 }}>
                        <div className="modal-title">Verify identity</div>
                        <div className="modal-desc">
                            Confirm your password and OTP to unlock security controls.
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
                                    <span className="input-icon"><MailIcon /></span>
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
                                    {stepUpBusy ? "Verifying..." : "Verify & Unlock"}
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
