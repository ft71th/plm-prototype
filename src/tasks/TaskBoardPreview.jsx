import { useState, useCallback, useMemo, useRef, useEffect, createContext, useContext } from "react";

// ─── Types & Constants ───────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  low: { label: "Low", color: "#6b7280", icon: "▽" },
  medium: { label: "Medium", color: "#3b82f6", icon: "▷" },
  high: { label: "High", color: "#f59e0b", icon: "△" },
  critical: { label: "Critical", color: "#ef4444", icon: "⬆" },
};

const COLUMN_COLORS = [
  "#6b7280","#ef4444","#f59e0b","#10b981",
  "#3b82f6","#8b5cf6","#ec4899","#06b6d4",
];

const DEFAULT_LABELS = [
  { id: "l1", name: "Bug", color: "#ef4444" },
  { id: "l2", name: "Feature", color: "#3b82f6" },
  { id: "l3", name: "Electrical", color: "#f59e0b" },
  { id: "l4", name: "Software", color: "#10b981" },
  { id: "l5", name: "Documentation", color: "#6366f1" },
];

let _id = 0;
const uid = () => `id-${++_id}-${Math.random().toString(36).slice(2,6)}`;

// ─── In-memory Store ─────────────────────────────────────────────────────────

function createInitialBoard() {
  const cols = [
    { id: uid(), name: "Backlog", order: 0, color: "#6b7280" },
    { id: uid(), name: "To Do", order: 1, color: "#3b82f6" },
    { id: uid(), name: "In Progress", order: 2, color: "#f59e0b" },
    { id: uid(), name: "Review", order: 3, color: "#8b5cf6" },
    { id: uid(), name: "Done", order: 4, color: "#10b981", isComplete: true },
  ];
  return {
    id: uid(), name: "MIAS/PMS Development", columns: cols, labels: [...DEFAULT_LABELS],
  };
}

function createDemoTasks(board) {
  const col = (i) => board.columns[i].id;
  return [
    { id: uid(), boardId: board.id, columnId: col(0), order: 0, title: "Review generator protection relay settings", priority: "medium", labels: ["l3"], assignee: "JN", linkedItems: [{ itemId: "sys-1", itemType: "system", title: "Generator G1" }], checklist: [], dueDate: "" },
    { id: uid(), boardId: board.id, columnId: col(0), order: 1, title: "Document bus tie breaker logic", priority: "low", labels: ["l5"], assignee: "", linkedItems: [], checklist: [], dueDate: "" },
    { id: uid(), boardId: board.id, columnId: col(1), order: 0, title: "Implement PMS load sharing algorithm", priority: "high", labels: ["l4"], assignee: "FK", linkedItems: [{ itemId: "req-1", itemType: "requirement", title: "REQ-042: Load sharing" }], checklist: [{ id: uid(), text: "Design algorithm", done: true }, { id: uid(), text: "Implement in TypeScript", done: false }, { id: uid(), text: "Unit tests", done: false }], dueDate: "2026-02-20" },
    { id: uid(), boardId: board.id, columnId: col(1), order: 1, title: "Fix WAGO I/O module addressing issue", priority: "critical", labels: ["l1", "l3"], assignee: "FK", linkedItems: [{ itemId: "hw-1", itemType: "hardware", title: "WAGO 750-530" }], checklist: [], dueDate: "2026-02-13" },
    { id: uid(), boardId: board.id, columnId: col(2), order: 0, title: "Integrate alarm handler with PLM", priority: "high", labels: ["l4", "l2"], assignee: "FK", linkedItems: [], checklist: [{ id: uid(), text: "Define alarm schema", done: true }, { id: uid(), text: "Build alarm list view", done: true }, { id: uid(), text: "Connect to PLM nodes", done: false }], dueDate: "2026-02-18" },
    { id: uid(), boardId: board.id, columnId: col(3), order: 0, title: "Verify shore connection interlock sequence", priority: "medium", labels: ["l3"], assignee: "JN", linkedItems: [{ itemId: "req-2", itemType: "requirement", title: "REQ-018: Shore connection" }], checklist: [], dueDate: "" },
    { id: uid(), boardId: board.id, columnId: col(4), order: 0, title: "Set up Modbus TCP communication layer", priority: "medium", labels: ["l4"], assignee: "FK", linkedItems: [], checklist: [{ id: uid(), text: "Configure TCP settings", done: true }, { id: uid(), text: "Test with simulator", done: true }], dueDate: "" },
  ];
}

// ─── Context ─────────────────────────────────────────────────────────────────

const Ctx = createContext(null);
const useCtx = () => useContext(Ctx);

function StoreProvider({ children }) {
  const [boards, setBoards] = useState(() => {
    const b = createInitialBoard();
    return [b];
  });
  const [activeIdx, setActiveIdx] = useState(0);
  const [tasks, setTasks] = useState(() => createDemoTasks(boards[0]));

  const board = boards[activeIdx] || null;

  const boardTasks = useMemo(
    () => (board ? tasks.filter((t) => t.boardId === board.id) : []),
    [tasks, board?.id]
  );

  const api = useMemo(() => ({
    boards, board, tasks: boardTasks, activeIdx,
    setActiveBoard: (i) => setActiveIdx(i),
    createBoard: (name) => {
      const b = { id: uid(), name, columns: [
        { id: uid(), name: "To Do", order: 0, color: "#3b82f6" },
        { id: uid(), name: "In Progress", order: 1, color: "#f59e0b" },
        { id: uid(), name: "Done", order: 2, color: "#10b981", isComplete: true },
      ], labels: [...DEFAULT_LABELS] };
      setBoards((prev) => [...prev, b]);
      setActiveIdx(boards.length);
    },
    renameBoard: (name) => setBoards((prev) => prev.map((b, i) => i === activeIdx ? { ...b, name } : b)),
    deleteBoard: (id) => {
      setBoards((prev) => prev.filter((b) => b.id !== id));
      setTasks((prev) => prev.filter((t) => t.boardId !== id));
      setActiveIdx(0);
    },
    addColumn: (name, color = "#6b7280") => {
      setBoards((prev) => prev.map((b, i) => {
        if (i !== activeIdx) return b;
        const order = Math.max(...b.columns.map((c) => c.order), -1) + 1;
        return { ...b, columns: [...b.columns, { id: uid(), name, order, color }] };
      }));
    },
    updateColumn: (col) => {
      setBoards((prev) => prev.map((b, i) => {
        if (i !== activeIdx) return b;
        return { ...b, columns: b.columns.map((c) => c.id === col.id ? col : c) };
      }));
    },
    deleteColumn: (colId, moveToId) => {
      if (moveToId) {
        setTasks((prev) => prev.map((t) => t.columnId === colId ? { ...t, columnId: moveToId } : t));
      } else {
        setTasks((prev) => prev.filter((t) => t.columnId !== colId));
      }
      setBoards((prev) => prev.map((b, i) => {
        if (i !== activeIdx) return b;
        const cols = b.columns.filter((c) => c.id !== colId);
        cols.sort((a, b2) => a.order - b2.order).forEach((c, idx) => (c.order = idx));
        return { ...b, columns: cols };
      }));
    },
    createTask: (columnId, title) => {
      if (!board) return;
      const t = { id: uid(), boardId: board.id, columnId, order: 999, title, priority: "medium", labels: [], assignee: "", linkedItems: [], checklist: [], dueDate: "", description: "" };
      setTasks((prev) => [...prev, t]);
      return t;
    },
    updateTask: (task) => setTasks((prev) => prev.map((t) => t.id === task.id ? { ...task } : t)),
    deleteTask: (id) => setTasks((prev) => prev.filter((t) => t.id !== id)),
    moveTask: (taskId, toColId) => setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, columnId: toColId } : t)),
  }), [boards, activeIdx, boardTasks, tasks]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

// ─── Task Card ───────────────────────────────────────────────────────────────

function TaskCard({ task, onOpen }) {
  const { board } = useCtx();
  const p = PRIORITY_CONFIG[task.priority];
  const labels = task.labels.map((id) => board?.labels.find((l) => l.id === id)).filter(Boolean);
  const checkDone = task.checklist?.filter((i) => i.done).length ?? 0;
  const checkTotal = task.checklist?.length ?? 0;
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

  return (
    <div style={styles.card} onClick={() => onOpen(task)}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#383e4a"; e.currentTarget.style.background = "#2e3440"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2e3440"; e.currentTarget.style.background = "#282c34"; }}
    >
      {labels.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
          {labels.map((l) => (
            <span key={l.id} style={{ ...styles.labelBadge, backgroundColor: l.color }}>{l.name}</span>
          ))}
        </div>
      )}
      <div style={styles.cardTitle}>{task.title}</div>
      <div style={styles.cardMeta}>
        <span style={{ color: p.color, fontSize: 12 }} title={p.label}>{p.icon}</span>
        {task.dueDate && (
          <span style={{ color: isOverdue ? "#ef4444" : "#6b7280", fontWeight: isOverdue ? 600 : 400 }}>
            📅 {task.dueDate}
          </span>
        )}
        {checkTotal > 0 && <span>☑ {checkDone}/{checkTotal}</span>}
        {task.linkedItems.length > 0 && <span>🔗 {task.linkedItems.length}</span>}
        {task.assignee && (
          <span style={styles.avatar}>{task.assignee.slice(0, 2).toUpperCase()}</span>
        )}
      </div>
    </div>
  );
}

// ─── Column ──────────────────────────────────────────────────────────────────

function Column({ column, tasks, onOpenTask, dragState }) {
  const { createTask } = useCtx();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef(null);
  const isOver = dragState.overColId === column.id;
  const sorted = [...tasks].sort((a, b) => a.order - b.order);

  const handleAdd = () => {
    if (title.trim()) createTask(column.id, title.trim());
    setTitle("");
    setAdding(false);
  };

  return (
    <div
      style={{ ...styles.column, borderColor: isOver ? "#3b82f6" : "#383e4a", boxShadow: isOver ? "0 0 0 1px #3b82f6, inset 0 0 20px rgba(59,130,246,0.05)" : "none" }}
      onDragOver={(e) => { e.preventDefault(); dragState.setOverColId(column.id); }}
      onDragLeave={() => { if (dragState.overColId === column.id) dragState.setOverColId(null); }}
      onDrop={(e) => { e.preventDefault(); dragState.handleDrop(column.id); }}
    >
      <div style={styles.colHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ ...styles.dot, backgroundColor: column.color }} />
          <span style={styles.colName}>{column.name}</span>
          <span style={styles.colCount}>{tasks.length}</span>
        </div>
        <div style={{ position: "relative" }}>
          <button style={styles.menuBtn} onClick={() => setShowMenu(!showMenu)}>⋯</button>
          {showMenu && <ColumnMenu column={column} onClose={() => setShowMenu(false)} />}
        </div>
      </div>
      <div style={styles.colTasks}>
        {sorted.map((t) => (
          <div key={t.id} draggable
            onDragStart={() => dragState.setDragId(t.id)}
            onDragEnd={() => { dragState.setDragId(null); dragState.setOverColId(null); }}
            style={{ opacity: dragState.dragId === t.id ? 0.4 : 1, transition: "opacity 150ms" }}
          >
            <TaskCard task={t} onOpen={onOpenTask} />
          </div>
        ))}
        {isOver && dragState.dragId && <div style={styles.dropIndicator} />}
      </div>
      {adding ? (
        <div style={{ padding: "4px 8px 8px" }}>
          <input ref={inputRef} style={styles.addInput} value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setTitle(""); } }}
            onBlur={handleAdd} placeholder="Task title..." autoFocus />
        </div>
      ) : (
        <button style={styles.addBtn}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.color = "#3b82f6"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#383e4a"; e.currentTarget.style.color = "#6b7280"; }}
          onClick={() => setAdding(true)}>+ Add task</button>
      )}
    </div>
  );
}

// ─── Column Menu ─────────────────────────────────────────────────────────────

function ColumnMenu({ column, onClose }) {
  const { board, updateColumn, deleteColumn } = useCtx();
  const [view, setView] = useState("main");
  const [name, setName] = useState(column.name);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  const others = board?.columns.filter((c) => c.id !== column.id) || [];

  return (
    <div ref={ref} style={styles.contextMenu}>
      {view === "main" && <>
        <button style={styles.cmItem} onClick={() => setView("rename")}>✏️ Rename</button>
        <button style={styles.cmItem} onClick={() => setView("color")}>🎨 Change color</button>
        <button style={styles.cmItem} onClick={() => { updateColumn({ ...column, isComplete: !column.isComplete }); onClose(); }}>
          {column.isComplete ? "☐ Unmark Done" : "☑ Mark as Done"}
        </button>
        <div style={styles.cmDivider} />
        <button style={{ ...styles.cmItem, color: "#ef4444" }} onClick={() => setView("delete")}>🗑️ Delete</button>
      </>}
      {view === "rename" && <div style={{ padding: 10 }}>
        <input style={styles.cmInput} value={name} onChange={(e) => setName(e.target.value)} autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") { updateColumn({ ...column, name: name.trim() || column.name }); onClose(); } if (e.key === "Escape") onClose(); }} />
        <button style={styles.cmSave} onClick={() => { updateColumn({ ...column, name: name.trim() || column.name }); onClose(); }}>Save</button>
      </div>}
      {view === "color" && <div style={{ padding: 10 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {COLUMN_COLORS.map((c) => (
            <button key={c} onClick={() => { updateColumn({ ...column, color: c }); onClose(); }}
              style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: column.color === c ? "2px solid white" : "2px solid transparent", cursor: "pointer" }} />
          ))}
        </div>
      </div>}
      {view === "delete" && <div style={{ padding: 10 }}>
        <div style={{ fontSize: 12, color: "#9ca3b0", marginBottom: 8 }}>Move tasks to:</div>
        {others.map((c) => (
          <button key={c.id} style={styles.cmItem} onClick={() => { deleteColumn(column.id, c.id); onClose(); }}>
            → {c.name}
          </button>
        ))}
        <div style={styles.cmDivider} />
        <button style={{ ...styles.cmItem, color: "#ef4444" }} onClick={() => { deleteColumn(column.id); onClose(); }}>
          Delete with tasks
        </button>
        <button style={styles.cmItem} onClick={() => setView("main")}>← Back</button>
      </div>}
    </div>
  );
}

// ─── Task Detail Dialog ──────────────────────────────────────────────────────

function TaskDialog({ task, onClose }) {
  const { board, updateTask, deleteTask } = useCtx();
  const [t, setT] = useState(null);
  const [newCheck, setNewCheck] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    if (task) { setT({ ...task }); setConfirmDel(false); }
    else setT(null);
  }, [task]);

  if (!t || !board) return null;
  const col = board.columns.find((c) => c.id === t.columnId);
  const checkDone = t.checklist?.filter((i) => i.done).length ?? 0;
  const checkTotal = t.checklist?.length ?? 0;
  const pct = checkTotal > 0 ? Math.round((checkDone / checkTotal) * 100) : 0;

  const save = () => { updateTask(t); onClose(); };
  const set = (f, v) => setT((p) => ({ ...p, [f]: v }));

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.dlgHeader}>
          {col && <span style={{ ...styles.statusBadge, background: col.color }}>{col.name}</span>}
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div style={styles.dlgBody}>
          {/* Main */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <input style={styles.dlgTitle} value={t.title} onChange={(e) => set("title", e.target.value)} placeholder="Task title" />
            <textarea style={styles.dlgDesc} value={t.description || ""} onChange={(e) => set("description", e.target.value)} placeholder="Add a description..." rows={3} />

            {/* Checklist */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#9ca3b0", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                Checklist {checkTotal > 0 && `(${pct}%)`}
              </div>
              {checkTotal > 0 && (
                <div style={{ height: 4, background: "#2a2f38", borderRadius: 2, marginBottom: 8, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: "#10b981", borderRadius: 2, transition: "width 300ms" }} />
                </div>
              )}
              {t.checklist?.map((item) => (
                <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 13, color: "#e4e8ef", cursor: "pointer" }}>
                  <input type="checkbox" checked={item.done} onChange={() => set("checklist", t.checklist.map((i) => i.id === item.id ? { ...i, done: !i.done } : i))} style={{ accentColor: "#3b82f6" }} />
                  <span style={item.done ? { textDecoration: "line-through", color: "#6b7280" } : {}}>{item.text}</span>
                </label>
              ))}
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <input style={styles.cmInput} value={newCheck} onChange={(e) => setNewCheck(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && newCheck.trim()) { set("checklist", [...(t.checklist || []), { id: uid(), text: newCheck.trim(), done: false }]); setNewCheck(""); } }}
                  placeholder="Add checklist item..." />
              </div>
            </div>

            {/* Linked items */}
            {t.linkedItems.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#9ca3b0", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>Linked Items</div>
                {t.linkedItems.map((li) => (
                  <div key={li.itemId} style={styles.linkedItem}>
                    <span style={styles.linkedType}>{li.itemType}</span>
                    <span style={{ flex: 1, fontSize: 13, color: "#e4e8ef", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{li.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div style={{ width: 200, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Status">
              <select style={styles.select} value={t.columnId} onChange={(e) => set("columnId", e.target.value)}>
                {board.columns.sort((a, b) => a.order - b.order).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select style={styles.select} value={t.priority} onChange={(e) => set("priority", e.target.value)}>
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </Field>
            <Field label="Assignee">
              <input style={styles.fieldInput} value={t.assignee || ""} onChange={(e) => set("assignee", e.target.value)} placeholder="Assign..." />
            </Field>
            <Field label="Due date">
              <input type="date" style={styles.fieldInput} value={t.dueDate || ""} onChange={(e) => set("dueDate", e.target.value)} />
            </Field>
            <Field label="Labels">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {board.labels.map((l) => {
                  const active = t.labels.includes(l.id);
                  return (
                    <button key={l.id} onClick={() => set("labels", active ? t.labels.filter((x) => x !== l.id) : [...t.labels, l.id])}
                      style={{ padding: "3px 8px", border: `1.5px solid ${l.color}`, borderRadius: 4, fontSize: 11, cursor: "pointer", color: active ? "white" : "#9ca3b0", background: active ? l.color : "transparent" }}>
                      {l.name}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.dlgFooter}>
          <div>
            {confirmDel ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#9ca3b0" }}>
                Delete?
                <button style={{ ...styles.btn, background: "#ef4444" }} onClick={() => { deleteTask(t.id); onClose(); }}>Yes</button>
                <button style={{ ...styles.btn, background: "transparent", border: "1px solid #383e4a", color: "#9ca3b0" }} onClick={() => setConfirmDel(false)}>No</button>
              </div>
            ) : (
              <button style={{ ...styles.btn, background: "transparent", border: "1px solid #383e4a", color: "#ef4444" }} onClick={() => setConfirmDel(true)}>Delete task</button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...styles.btn, background: "transparent", border: "1px solid #383e4a", color: "#9ca3b0" }} onClick={onClose}>Cancel</button>
            <button style={{ ...styles.btn, background: "#3b82f6", color: "white" }} onClick={save}>Save changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "#6b7280", marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

// ─── Board Header ────────────────────────────────────────────────────────────

function BoardHeader() {
  const { boards, board, activeIdx, setActiveBoard, createBoard, renameBoard, deleteBoard, addColumn } = useCtx();
  const [showPicker, setShowPicker] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [rn, setRn] = useState("");
  const [addingCol, setAddingCol] = useState(false);
  const [colName, setColName] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowPicker(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div style={styles.header}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div ref={ref} style={{ position: "relative" }}>
          {renaming ? (
            <input style={{ ...styles.cmInput, width: 200, fontWeight: 600 }} value={rn} onChange={(e) => setRn(e.target.value)} autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") { renameBoard(rn.trim() || board.name); setRenaming(false); } if (e.key === "Escape") setRenaming(false); }}
              onBlur={() => { renameBoard(rn.trim() || board.name); setRenaming(false); }} />
          ) : (
            <button style={styles.boardBtn} onClick={() => setShowPicker(!showPicker)}>
              <span style={{ fontSize: 16, opacity: 0.7 }}>▦</span>
              <span style={{ fontWeight: 600 }}>{board?.name || "Select board"}</span>
              <span style={{ fontSize: 10, opacity: 0.5 }}>▾</span>
            </button>
          )}
          {showPicker && (
            <div style={styles.dropdown}>
              <div style={{ padding: "8px 12px 4px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "#6b7280", letterSpacing: "0.05em" }}>Boards</div>
              {boards.map((b, i) => (
                <button key={b.id} style={{ ...styles.ddItem, ...(i === activeIdx ? { background: "rgba(59,130,246,0.15)", color: "#3b82f6" } : {}) }}
                  onClick={() => { setActiveBoard(i); setShowPicker(false); }}>{b.name}</button>
              ))}
              <div style={styles.cmDivider} />
              {creating ? (
                <div style={{ padding: "6px 8px" }}>
                  <input style={styles.cmInput} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Board name..." autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter" && newName.trim()) { createBoard(newName.trim()); setNewName(""); setCreating(false); setShowPicker(false); } if (e.key === "Escape") setCreating(false); }} />
                </div>
              ) : (
                <button style={{ ...styles.ddItem, color: "#3b82f6" }} onClick={() => setCreating(true)}>+ New board</button>
              )}
            </div>
          )}
        </div>
        {board && !renaming && (
          <button style={styles.iconBtn} onClick={() => { setRn(board.name); setRenaming(true); }} title="Rename">✏️</button>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {board && (addingCol ? (
          <div style={{ display: "flex", gap: 6 }}>
            <input style={{ ...styles.cmInput, width: 140 }} value={colName} onChange={(e) => setColName(e.target.value)} placeholder="Column name..." autoFocus
              onKeyDown={(e) => { if (e.key === "Enter" && colName.trim()) { addColumn(colName.trim()); setColName(""); setAddingCol(false); } if (e.key === "Escape") { setAddingCol(false); setColName(""); } }} />
            <button style={{ ...styles.btn, background: "#3b82f6", color: "white" }} onClick={() => { if (colName.trim()) { addColumn(colName.trim()); setColName(""); } setAddingCol(false); }}>Add</button>
          </div>
        ) : (
          <button style={styles.outlineBtn} onClick={() => setAddingCol(true)}>+ Column</button>
        ))}
        {board && boards.length > 1 && (
          <button style={{ ...styles.iconBtn, color: "#ef4444" }} onClick={() => { if (confirm(`Delete "${board.name}"?`)) deleteBoard(board.id); }} title="Delete board">🗑️</button>
        )}
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <StoreProvider>
      <Board />
    </StoreProvider>
  );
}

function Board() {
  const { board, tasks, moveTask } = useCtx();
  const [selectedTask, setSelectedTask] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [overColId, setOverColId] = useState(null);

  const tasksByCol = useMemo(() => {
    const m = new Map();
    board?.columns.forEach((c) => m.set(c.id, []));
    tasks.forEach((t) => { const a = m.get(t.columnId); if (a) a.push(t); });
    return m;
  }, [tasks, board]);

  const handleDrop = useCallback((colId) => {
    if (dragId) moveTask(dragId, colId);
    setDragId(null);
    setOverColId(null);
  }, [dragId, moveTask]);

  const dragState = { dragId, overColId, setDragId, setOverColId, handleDrop };

  if (!board) return <div style={{ ...styles.root, display: "flex", alignItems: "center", justifyContent: "center", color: "#6b7280" }}>No board</div>;
  const sorted = [...board.columns].sort((a, b) => a.order - b.order);

  return (
    <div style={styles.root}>
      <BoardHeader />
      <div style={styles.columns}>
        {sorted.map((col) => (
          <Column key={col.id} column={col} tasks={tasksByCol.get(col.id) || []} onOpenTask={setSelectedTask} dragState={dragState} />
        ))}
      </div>
      <TaskDialog task={selectedTask} onClose={() => setSelectedTask(null)} />
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  root: { display: "flex", flexDirection: "column", height: "100vh", background: "#1a1d23", color: "#e4e8ef", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", overflow: "hidden" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "#22262e", borderBottom: "1px solid #383e4a", flexShrink: 0 },
  columns: { display: "flex", flex: 1, overflowX: "auto", padding: 16, gap: 12, alignItems: "flex-start" },
  column: { display: "flex", flexDirection: "column", minWidth: 280, maxWidth: 320, width: 280, background: "#22262e", border: "1px solid #383e4a", borderRadius: 10, maxHeight: "calc(100vh - 100px)", transition: "border-color 150ms, box-shadow 150ms" },
  colHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 12px 8px" },
  dot: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  colName: { fontSize: 13, fontWeight: 600, color: "#e4e8ef" },
  colCount: { fontSize: 11, color: "#6b7280", background: "#2a2f38", padding: "1px 6px", borderRadius: 10 },
  colTasks: { display: "flex", flexDirection: "column", gap: 6, padding: "0 8px 8px", overflowY: "auto", flex: 1, minHeight: 40 },
  card: { background: "#282c34", border: "1px solid #2e3440", borderRadius: 6, padding: "10px 12px", cursor: "pointer", transition: "all 150ms", userSelect: "none" },
  cardTitle: { fontSize: 13, fontWeight: 500, color: "#e4e8ef", lineHeight: 1.4, marginBottom: 6, wordBreak: "break-word" },
  cardMeta: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, fontSize: 11, color: "#6b7280" },
  labelBadge: { display: "inline-block", padding: "1px 8px", borderRadius: 3, fontSize: 10, fontWeight: 600, color: "white" },
  avatar: { display: "flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, borderRadius: "50%", background: "#2a2f38", border: "1px solid #383e4a", fontSize: 9, fontWeight: 700, color: "#9ca3b0", marginLeft: "auto" },
  menuBtn: { background: "none", border: "none", color: "#6b7280", cursor: "pointer", padding: "2px 6px", borderRadius: 4, fontSize: 16, lineHeight: 1 },
  addBtn: { display: "block", width: "calc(100% - 16px)", margin: "0 8px 8px", padding: 6, background: "none", border: "1px dashed #383e4a", borderRadius: 6, color: "#6b7280", fontSize: 13, cursor: "pointer", transition: "all 150ms" },
  addInput: { width: "100%", padding: "8px 10px", background: "#1a1d23", border: "1px solid #3b82f6", borderRadius: 6, color: "#e4e8ef", fontSize: 13, outline: "none", boxSizing: "border-box" },
  dropIndicator: { height: 3, background: "#3b82f6", borderRadius: 2, margin: "2px 4px" },
  boardBtn: { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "#2a2f38", border: "1px solid #383e4a", borderRadius: 6, color: "#e4e8ef", cursor: "pointer", fontSize: 14 },
  iconBtn: { display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, background: "none", border: "1px solid transparent", borderRadius: 6, color: "#9ca3b0", cursor: "pointer", fontSize: 14 },
  outlineBtn: { padding: "6px 14px", background: "transparent", border: "1px solid #383e4a", borderRadius: 6, fontSize: 13, fontWeight: 500, color: "#9ca3b0", cursor: "pointer" },
  btn: { padding: "6px 14px", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer" },
  dropdown: { position: "absolute", top: "100%", left: 0, marginTop: 4, minWidth: 220, background: "#2a2f38", border: "1px solid #383e4a", borderRadius: 6, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", zIndex: 100, overflow: "hidden" },
  ddItem: { display: "block", width: "100%", padding: "8px 12px", background: "none", border: "none", color: "#e4e8ef", fontSize: 13, textAlign: "left", cursor: "pointer" },
  contextMenu: { position: "absolute", top: "100%", right: 0, marginTop: 4, minWidth: 180, background: "#2a2f38", border: "1px solid #383e4a", borderRadius: 6, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", zIndex: 200, overflow: "hidden", padding: "4px 0" },
  cmItem: { display: "block", width: "100%", padding: "8px 12px", background: "none", border: "none", color: "#e4e8ef", fontSize: 13, textAlign: "left", cursor: "pointer" },
  cmDivider: { height: 1, background: "#383e4a", margin: "4px 0" },
  cmInput: { width: "100%", padding: "6px 10px", background: "#1a1d23", border: "1px solid #383e4a", borderRadius: 4, color: "#e4e8ef", fontSize: 13, outline: "none", boxSizing: "border-box" },
  cmSave: { marginTop: 6, padding: "5px 12px", background: "#3b82f6", border: "none", borderRadius: 4, color: "white", fontSize: 12, cursor: "pointer" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  dialog: { background: "#22262e", border: "1px solid #383e4a", borderRadius: 10, width: "90%", maxWidth: 780, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", overflow: "hidden" },
  dlgHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 12px", borderBottom: "1px solid #383e4a" },
  statusBadge: { padding: "3px 10px", borderRadius: 4, fontSize: 11, fontWeight: 600, color: "white" },
  closeBtn: { background: "none", border: "none", color: "#6b7280", fontSize: 18, cursor: "pointer", padding: "4px 8px", borderRadius: 4 },
  dlgBody: { display: "flex", flex: 1, overflowY: "auto", padding: 20, gap: 24 },
  dlgTitle: { width: "100%", padding: "8px 0", background: "none", border: "none", borderBottom: "2px solid transparent", color: "#e4e8ef", fontSize: 20, fontWeight: 700, outline: "none", boxSizing: "border-box" },
  dlgDesc: { width: "100%", padding: 10, marginTop: 12, background: "#1a1d23", border: "1px solid #383e4a", borderRadius: 6, color: "#e4e8ef", fontSize: 13, lineHeight: 1.5, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" },
  dlgFooter: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderTop: "1px solid #383e4a" },
  select: { padding: "6px 10px", background: "#1a1d23", border: "1px solid #383e4a", borderRadius: 4, color: "#e4e8ef", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" },
  fieldInput: { padding: "6px 10px", background: "#1a1d23", border: "1px solid #383e4a", borderRadius: 4, color: "#e4e8ef", fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" },
  linkedItem: { display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", background: "#1a1d23", border: "1px solid #383e4a", borderRadius: 4, marginBottom: 4 },
  linkedType: { fontSize: 10, fontWeight: 600, textTransform: "uppercase", padding: "2px 6px", borderRadius: 3, background: "#2a2f38", color: "#6b7280" },
};
