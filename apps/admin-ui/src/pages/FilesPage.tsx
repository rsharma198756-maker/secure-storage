import "./FilesPage.css";

type FilesPageProps = Record<string, any>;

export default function FilesPage(props: FilesPageProps) {
  const {
    viewerItem,
    closeViewer,
    ArrowLeftIcon,
    onDownload,
    DownloadIcon,
    viewerUrl,
    canWrite,
    onOpenEdit,
    EditIcon,
    canDelete,
    setDeleteTarget,
    TrashIcon,
    viewerLoading,
    viewerError,
    isCurrentViewerPdf,
    setViewerPdfPage,
    selectedPdfPage,
    viewerPdfPages,
    pdfScalePercent,
    pdfCanvasWrapRef,
    pdfCanvasRef,
    pdfRendering,
    pdfRenderError,
    viewerContentType,
    formatBytes,
    formatDate,
    users,
    viewerTextPreview,
    viewerPreviewNote,
    canEmbedCurrentViewer,
    path,
    goToRoot,
    HomeIcon,
    goToBreadcrumb,
    ChevronIcon,
    setFolderName,
    setShowFolderModal,
    isBusy,
    PlusIcon,
    UploadIcon,
    queueFileUploadConfirmation,
    FolderIcon,
    onDropFolder,
    onFolderInputChange,

    KeyIcon,
    items,
    openFolder,
    onOpenFile,
    FileIcon,
    EyeIcon,
    showFolderModal,
    folderName,
    onCreateFolder,
    pendingUpload,
    setPendingUpload,
    onConfirmPendingUpload,
    deleteTarget,
    onConfirmDelete,
    editTarget,
    setEditTarget,
    editName,
    setEditName,
    onConfirmEdit,
  } = props as any;

  return (
    <section className="files-page">
      <>
        {viewerItem ? (
          <div className="file-viewer-shell">
            <div className="file-viewer-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button className="btn btn-secondary btn-sm" onClick={closeViewer}>
                  <ArrowLeftIcon /> Back to Files
                </button>
                <span className="file-viewer-title">{viewerItem.name}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => onDownload(viewerItem)}>
                  <DownloadIcon /> Download
                </button>
                {viewerUrl && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => window.open(viewerUrl, "_blank", "noopener,noreferrer")}
                  >
                    Open Raw
                  </button>
                )}
                {canWrite && (
                  <button className="btn btn-secondary btn-sm" onClick={() => onOpenEdit(viewerItem)}>
                    <EditIcon /> Edit name
                  </button>
                )}
                {canDelete && (
                  <button className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(viewerItem)}>
                    <TrashIcon /> Delete
                  </button>
                )}
              </div>
            </div>

            {viewerLoading ? (
              <div className="file-viewer-loading">Loading file preview...</div>
            ) : viewerError ? (
              <div className="file-viewer-error">{viewerError}</div>
            ) : !viewerUrl ? (
              <div className="file-viewer-error">Preview unavailable.</div>
            ) : isCurrentViewerPdf ? (
              <div className="pdf-editor-layout">
                <div className="pdf-preview-pane">
                  <div className="pdf-preview-toolbar">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setViewerPdfPage((prev: any) => Math.max(1, prev - 1))}
                      disabled={selectedPdfPage <= 1}
                    >
                      Previous
                    </button>
                    <div className="pdf-page-indicator">
                      Page {selectedPdfPage} of {viewerPdfPages}
                    </div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setViewerPdfPage((prev: any) => Math.min(viewerPdfPages, prev + 1))}
                      disabled={selectedPdfPage >= viewerPdfPages}
                    >
                      Next
                    </button>
                  </div>
                  <div className="pdf-preview-meta">
                    <span>Fit to width</span>
                    <strong>{pdfScalePercent}%</strong>
                  </div>
                  <div className="pdf-canvas-wrap" ref={pdfCanvasWrapRef}>
                    <canvas ref={pdfCanvasRef} className="pdf-preview-canvas" />
                    {pdfRendering && (
                      <div className="pdf-render-overlay">Rendering page…</div>
                    )}
                    {pdfRenderError && (
                      <div className="pdf-render-overlay pdf-render-overlay-error">{pdfRenderError}</div>
                    )}
                  </div>
                </div>

                <div className="file-details-pane">
                  <h3>PDF Details</h3>
                  <div className="file-detail-row"><span>Name</span><strong>{viewerItem.name}</strong></div>
                  <div className="file-detail-row"><span>Type</span><strong>{viewerContentType || viewerItem.content_type || "application/pdf"}</strong></div>
                  <div className="file-detail-row"><span>Size</span><strong>{formatBytes(viewerItem.size_bytes)}</strong></div>
                  <div className="file-detail-row"><span>Total pages</span><strong>{viewerPdfPages}</strong></div>
                  {viewerItem.updated_at && (
                    <div className="file-detail-row"><span>Updated</span><strong>{formatDate(viewerItem.updated_at)}</strong></div>
                  )}
                  {viewerItem.owner_user_id && (() => {
                    const owner = users.find((u: any) => u.id === viewerItem.owner_user_id);
                    const display = owner?.email ?? viewerItem.owner_user_id.slice(0, 8);
                    return (
                      <div className="file-detail-row">
                        <span>Uploaded by</span>
                        <strong style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ width: 20, height: 20, borderRadius: 10, background: "var(--accent-light)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                            {display[0]?.toUpperCase()}
                          </span>
                          {display}
                        </strong>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : viewerTextPreview !== null ? (
              <div className="file-viewer-generic">
                <div className="file-text-preview">
                  <pre>{viewerTextPreview || "(No preview available.)"}</pre>
                </div>
                <div className="file-details-pane">
                  <h3>File Details</h3>
                  <div className="file-detail-row"><span>Name</span><strong>{viewerItem.name}</strong></div>
                  <div className="file-detail-row"><span>Type</span><strong>{viewerContentType || viewerItem.content_type || "Unknown"}</strong></div>
                  <div className="file-detail-row"><span>Size</span><strong>{formatBytes(viewerItem.size_bytes)}</strong></div>
                  {viewerItem.updated_at && (
                    <div className="file-detail-row"><span>Updated</span><strong>{formatDate(viewerItem.updated_at)}</strong></div>
                  )}
                  {viewerItem.owner_user_id && (() => {
                    const owner = users.find((u: any) => u.id === viewerItem.owner_user_id);
                    const display = owner?.email ?? viewerItem.owner_user_id.slice(0, 8);
                    return (
                      <div className="file-detail-row">
                        <span>Uploaded by</span>
                        <strong style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ width: 20, height: 20, borderRadius: 10, background: "var(--accent-light)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                            {display[0]?.toUpperCase()}
                          </span>
                          {display}
                        </strong>
                      </div>
                    );
                  })()}
                  {viewerPreviewNote && <div className="file-preview-note">{viewerPreviewNote}</div>}
                </div>
              </div>
            ) : (
              <div className="file-viewer-generic">
                <div className="file-generic-preview">
                  {viewerContentType.startsWith("image/") ? (
                    <img src={viewerUrl} alt={viewerItem.name} className="file-image-preview" />
                  ) : canEmbedCurrentViewer ? (
                    <object
                      data={viewerUrl}
                      type={viewerContentType || "application/octet-stream"}
                      className="file-generic-frame"
                    >
                      <iframe title={viewerItem.name} src={viewerUrl} className="file-generic-frame" />
                    </object>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "100%",
                        padding: "24px",
                        color: "var(--ink-3)",
                        textAlign: "center",
                        lineHeight: 1.6
                      }}
                    >
                      This file type cannot be previewed in the browser.
                      Use Download to view it in the native app.
                    </div>
                  )}
                </div>
                <div className="file-details-pane">
                  <h3>File Details</h3>
                  <div className="file-detail-row"><span>Name</span><strong>{viewerItem.name}</strong></div>
                  <div className="file-detail-row"><span>Type</span><strong>{viewerContentType || viewerItem.content_type || "Unknown"}</strong></div>
                  <div className="file-detail-row"><span>Size</span><strong>{formatBytes(viewerItem.size_bytes)}</strong></div>
                  {viewerItem.updated_at && (
                    <div className="file-detail-row"><span>Updated</span><strong>{formatDate(viewerItem.updated_at)}</strong></div>
                  )}
                  {viewerItem.owner_user_id && (() => {
                    const owner = users.find((u: any) => u.id === viewerItem.owner_user_id);
                    const display = owner?.email ?? viewerItem.owner_user_id.slice(0, 8);
                    return (
                      <div className="file-detail-row">
                        <span>Uploaded by</span>
                        <strong style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ width: 20, height: 20, borderRadius: 10, background: "var(--accent-light)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                            {display[0]?.toUpperCase()}
                          </span>
                          {display}
                        </strong>
                      </div>
                    );
                  })()}
                  {viewerPreviewNote && <div className="file-preview-note">{viewerPreviewNote}</div>}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="breadcrumb">
              <button
                className={`breadcrumb-item ${path.length === 0 ? "current" : ""}`}
                onClick={goToRoot}
              >
                <HomeIcon /> Root
              </button>
              {path.map((crumb: any, index: any) => (
                <span key={crumb.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span className="breadcrumb-sep"><ChevronIcon /></span>
                  <button
                    className={`breadcrumb-item ${index === path.length - 1 ? "current" : ""}`}
                    onClick={() => goToBreadcrumb(index)}
                  >
                    {crumb.name}
                  </button>
                </span>
              ))}
            </div>

            {canWrite ? (
              <div className="file-toolbar">
                <button className="btn btn-primary btn-sm" onClick={() => { setFolderName(""); setShowFolderModal(true); }} disabled={isBusy}>
                  <PlusIcon /> New Folder
                </button>
                <label className="upload-label">
                  <UploadIcon /> Upload Files
                  <input
                    type="file"
                    multiple
                    disabled={isBusy}
                    onChange={(e: any) => {
                      const files = e.target.files;
                      if (files?.length) queueFileUploadConfirmation(files);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                <label className="upload-label">
                  <FolderIcon /> Upload Folder
                  <input
                    type="file"
                    multiple
                    disabled={isBusy}
                    {...({ webkitdirectory: "", directory: "" } as any)}
                    onChange={(e: any) => {
                      const files = e.target.files;
                      if (files?.length) void onFolderInputChange(files);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>

              </div>
            ) : (
              <div style={{ padding: "8px 16px", fontSize: 13, color: "var(--ink-4)", display: "flex", alignItems: "center", gap: 6 }}>
                <KeyIcon /> Read-only access — you can view and download files.
              </div>
            )}

            <div
              className="panel"
              onDragOver={(e: any) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
              onDrop={(e: any) => { void onDropFolder(e); }}
            >

              {items.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0", color: "var(--ink-3)" }}>
                  <FolderIcon size={40} />
                  <p style={{ marginTop: 12, fontSize: 15 }}>This folder is empty</p>
                  <p style={{ fontSize: 13, color: "var(--ink-4)" }}>
                    Create a folder or upload a file to get started.
                  </p>
                </div>
              ) : (
                <div className="file-grid">
                  {items.map((item: any) => (
                    <div key={item.id} className="file-row">
                      <div className={`file-icon-box ${item.type === "folder" ? "file-icon-folder" : "file-icon-file"}`}>
                        {item.type === "folder" ? <FolderIcon /> : <FileIcon />}
                      </div>
                      <div>
                        <div
                          className="file-name clickable"
                          onClick={() => (item.type === "folder" ? openFolder(item) : onOpenFile(item))}
                        >
                          {item.name}
                        </div>
                        <div className="file-type">
                          {item.type} {item.type === "file" ? `· ${formatBytes(item.size_bytes)}` : ""}
                        </div>
                      </div>
                      <div className="file-actions">
                        {item.type === "file" && (
                          <button className="btn btn-ghost btn-sm" onClick={() => onOpenFile(item)} title="Open">
                            <EyeIcon size={16} />
                          </button>
                        )}
                        <button className="btn btn-ghost btn-sm" onClick={() => onDownload(item)} title="Download">
                          <DownloadIcon />
                        </button>
                        {canWrite && (
                          <button className="btn btn-ghost btn-sm" onClick={() => onOpenEdit(item)} title="Edit">
                            <EditIcon />
                          </button>
                        )}
                        {canDelete && (
                          <button className="btn btn-ghost btn-sm" onClick={() => setDeleteTarget(item)} title="Delete" style={{ color: "var(--red)" }}>
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Create Folder Modal */}
        {showFolderModal && (
          <div className="modal-overlay" onClick={() => setShowFolderModal(false)}>
            <div className="modal" onClick={(e: any) => e.stopPropagation()}>
              <div className="modal-icon modal-icon-folder">
                <FolderIcon size={24} />
              </div>
              <div className="modal-title">Create new folder</div>
              <div className="modal-desc">Enter a name for your new folder.</div>
              <form onSubmit={(e: any) => { e.preventDefault(); onCreateFolder(); }}>
                <input
                  className="modal-input"
                  placeholder="Folder name"
                  value={folderName}
                  onChange={(e: any) => setFolderName(e.target.value)}
                  autoFocus
                  required
                />
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowFolderModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={!folderName.trim() || isBusy}>Create</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {pendingUpload && (
          <div className="modal-overlay" onClick={() => (!isBusy ? setPendingUpload(null) : undefined)}>
            <div className="modal" onClick={(e: any) => e.stopPropagation()} style={{ maxWidth: 460 }}>
              <div className="modal-icon modal-icon-folder">
                <UploadIcon size={22} />
              </div>
              <div className="modal-title">
                {pendingUpload.kind === "folder" ? "Confirm Folder Upload" : "Confirm File Upload"}
              </div>
              <div className="modal-desc" style={{ lineHeight: 1.7 }}>
                {pendingUpload.kind === "folder" ? (
                  <>
                    Upload <strong>{pendingUpload.files.length}</strong>{" "}
                    file{pendingUpload.files.length === 1 ? "" : "s"} from{" "}
                    <strong>{pendingUpload.folderName ?? "Selected Folder"}</strong>? The folder hierarchy will be preserved exactly.
                  </>
                ) : (
                  <>
                    Upload <strong>{pendingUpload.files.length}</strong>{" "}
                    file{pendingUpload.files.length === 1 ? "" : "s"} to the current folder?
                  </>
                )}
              </div>
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--ink-4)",
                  fontSize: 12
                }}
              >
                Your browser may still show its own security confirmation before upload starts.
              </div>
              <div className="modal-actions" style={{ marginTop: 18 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setPendingUpload(null)}
                  disabled={isBusy}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    void onConfirmPendingUpload();
                  }}
                  disabled={isBusy}
                >
                  {isBusy ? "Uploading..." : "Upload"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteTarget && (
          <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
            <div className="modal" onClick={(e: any) => e.stopPropagation()}>
              <div className="modal-icon modal-icon-danger">
                <TrashIcon />
              </div>
              <div className="modal-title">Delete {deleteTarget.type}</div>
              <div className="modal-desc">
                Are you sure you want to delete <strong>&ldquo;{deleteTarget.name}&rdquo;</strong>? This action cannot be undone.
              </div>
              <div className="modal-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button className="btn btn-danger btn-sm" onClick={onConfirmDelete} disabled={isBusy}>Delete</button>
              </div>
            </div>
          </div>
        )}

        {/* Rename/Edit Modal */}
        {editTarget && (
          <div className="modal-overlay" onClick={() => setEditTarget(null)}>
            <div className="modal" onClick={(e: any) => e.stopPropagation()}>
              <div className="modal-icon modal-icon-folder">
                <EditIcon size={22} />
              </div>
              <div className="modal-title">Edit {editTarget.type} name</div>
              <div className="modal-desc">Update the display name for this {editTarget.type}.</div>
              <form onSubmit={(e: any) => { e.preventDefault(); onConfirmEdit(); }}>
                <input
                  className="modal-input"
                  placeholder="Enter new name"
                  value={editName}
                  onChange={(e: any) => setEditName(e.target.value)}
                  autoFocus
                  required
                />
                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditTarget(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={!editName.trim() || isBusy}>Save</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </>
    </section>
  );
}
