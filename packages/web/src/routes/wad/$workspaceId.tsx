import {useEffect, useMemo, useState} from "react";
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";
import {createFileRoute, redirect, useNavigate} from "@tanstack/react-router";
import {DetailedError, parseResponse} from "hono/client";
import {Download, FileArchive, Trash2, Upload} from "lucide-react";
import {WorkspaceHeader} from "../../components/common/SystemShell";
import {Button} from "../../components/ui/button";
import {Input} from "../../components/ui/input";
import {appToast} from "../../lib/toast";
import {rpcClient} from "../../lib/rpc.client";

const workspaceQuery = (workspaceId: string) => ({
  queryKey: ["wad-workspace", workspaceId] as const,
  queryFn: async () => {
    try {
      return await parseResponse(
        rpcClient.api.wad.workspaces[":workspaceId"].$get({
          param: {workspaceId},
        }),
      );
    } catch (error) {
      if (error instanceof DetailedError && error.statusCode === 404) {
        throw redirect({to: "/wad"});
      }
      throw error;
    }
  },
});

export const Route = createFileRoute("/wad/$workspaceId")({
  loader: ({context, params}) =>
    context.queryClient.ensureQueryData(workspaceQuery(params.workspaceId)),
  component: WadWorkspacePage,
});

type SelectedEntry = {
  kind: "root" | "content" | "map" | "namespace";
  name: string;
  path: string;
  sizeBytes?: number;
};

type TreeNode = {
  entry: SelectedEntry;
  children: TreeNode[];
};

function TreeEntry({
  node,
  selectedPath,
  onSelect,
  depth = 0,
}: {
  node: TreeNode;
  selectedPath?: string;
  onSelect: (entry: SelectedEntry) => void;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const directory = node.entry.kind !== "content";

  return (
    <div>
      <button
        type="button"
        className={`flex w-full items-center gap-2 border-l-2 px-2 py-1.5 text-left hover:bg-muted ${
          selectedPath === node.entry.path
            ? "border-amber-400 bg-amber-400/10 text-foreground"
            : "border-transparent text-muted-foreground"
        }`}
        style={{paddingLeft: `${depth * 14 + 8}px`}}
        onClick={() => {
          onSelect(node.entry);
          if (directory) setExpanded((value) => !value);
        }}
      >
        <span className="w-3 text-muted-foreground">
          {directory ? (expanded ? "−" : "+") : "·"}
        </span>
        <span>{node.entry.name}</span>
        <span className="ml-auto text-[9px] uppercase text-muted-foreground">
          {node.entry.kind}
        </span>
      </button>
      {directory && expanded
        ? node.children.map((child) => (
            <TreeEntry
              key={`${child.entry.path}-${child.entry.name}`}
              node={child}
              selectedPath={selectedPath}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))
        : null}
    </div>
  );
}

const isPng = (bytes: Uint8Array) =>
  bytes.length >= 8 &&
  [137, 80, 78, 71, 13, 10, 26, 10].every(
    (value, index) => bytes[index] === value,
  );

const isJpeg = (bytes: Uint8Array) =>
  bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;

const decodeText = (bytes: Uint8Array) => {
  try {
    const value = new TextDecoder("utf-8", {fatal: true}).decode(bytes);
    const controls = [...value].filter(
      (character) => character < " " && !"\n\r\t".includes(character),
    ).length;
    return value.length === 0 || controls / value.length < 0.02 ? value : null;
  } catch {
    return null;
  }
};

const formatHex = (bytes: Uint8Array) =>
  Array.from({length: Math.ceil(bytes.length / 16)}, (_, row) => {
    const offset = row * 16;
    const chunk = bytes.slice(offset, offset + 16);
    const hex = [...chunk]
      .map((value) => value.toString(16).padStart(2, "0"))
      .join(" ")
      .padEnd(47, " ");
    const ascii = [...chunk]
      .map((value) => (value >= 32 && value <= 126 ? String.fromCharCode(value) : "."))
      .join("");
    return `${offset.toString(16).padStart(8, "0")}  ${hex}  |${ascii}|`;
  }).join("\n");

function ContentPreview({
  workspaceId,
  wadId,
  entry,
}: {
  workspaceId: string;
  wadId: string;
  entry: SelectedEntry;
}) {
  const [raw, setRaw] = useState(false);
  const content = useQuery({
    queryKey: ["wad-content", workspaceId, wadId, entry.path],
    queryFn: async () => {
      const response = await rpcClient.api.wad.workspaces[":workspaceId"].wads[
        ":wadId"
      ].content.$get({
        param: {workspaceId, wadId},
        query: {path: entry.path},
      });
      if (!response.ok) throw new Error("Unable to read WAD item");
      return new Uint8Array(await response.arrayBuffer());
    },
  });
  const bytes = content.data;
  const text = bytes ? decodeText(bytes) : null;
  const imageType = bytes
    ? isPng(bytes)
      ? "image/png"
      : isJpeg(bytes)
        ? "image/jpeg"
        : null
    : null;
  const imageUrl = useMemo(
    () =>
      bytes && imageType
        ? URL.createObjectURL(new Blob([bytes], {type: imageType}))
        : null,
    [bytes, imageType],
  );
  useEffect(
    () => () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    },
    [imageUrl],
  );

  if (content.isPending) {
    return <div className="text-muted-foreground">Reading bytes…</div>;
  }
  if (content.isError) {
    return <div className="text-danger">{content.error.message}</div>;
  }
  if (!bytes) return null;

  let formattedText = text;
  if (text !== null) {
    try {
      formattedText = JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      // Plain text remains plain text.
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {imageType ?? (text !== null ? "UTF-8 text" : "binary")}
        </span>
        <Button size="sm" variant="ghost" onClick={() => setRaw((value) => !value)}>
          {raw ? "Preview" : "Hex"}
        </Button>
      </div>
      {raw || (!imageType && text === null) ? (
        <pre className="max-h-[460px] overflow-auto whitespace-pre font-mono text-xs leading-5 text-foreground/70">
          {formatHex(bytes)}
        </pre>
      ) : imageType && imageUrl ? (
        <div className="flex min-h-64 items-center justify-center border border-border bg-background p-4">
          <img src={imageUrl} alt={entry.name} className="max-h-[420px] max-w-full object-contain" />
        </div>
      ) : (
        <pre className="max-h-[460px] overflow-auto whitespace-pre-wrap text-sm text-foreground/80">
          {formattedText}
        </pre>
      )}
    </div>
  );
}

function WadWorkspacePage() {
  const {workspaceId} = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const workspace = useQuery(workspaceQuery(workspaceId));
  const [selectedWadId, setSelectedWadId] = useState<string>();
  const [selectedEntry, setSelectedEntry] = useState<SelectedEntry>();
  const [namespaceName, setNamespaceName] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemMode, setItemMode] = useState<"text" | "file" | "empty">("text");
  const [itemText, setItemText] = useState("");
  const [itemFile, setItemFile] = useState<File>();

  useEffect(() => {
    if (!selectedWadId && workspace.data?.wads[0]) {
      setSelectedWadId(workspace.data.wads[0].id);
    }
  }, [selectedWadId, workspace.data?.wads]);

  const tree = useQuery({
    queryKey: ["wad-tree", workspaceId, selectedWadId],
    queryFn: () =>
      parseResponse(
        rpcClient.api.wad.workspaces[":workspaceId"].wads[":wadId"].tree.$get({
          param: {workspaceId, wadId: selectedWadId!},
        }),
      ),
    enabled: Boolean(selectedWadId),
  });

  useEffect(() => {
    if (tree.data && !selectedEntry) setSelectedEntry(tree.data.entry);
  }, [selectedEntry, tree.data]);

  const selectedWad = workspace.data?.wads.find((wad) => wad.id === selectedWadId);
  const writableParent =
    selectedEntry?.kind === "namespace" || selectedEntry?.kind === "root"
      ? selectedEntry.path
      : "/";
  const childPath = (name: string) =>
    writableParent === "/" ? `/${name}` : `${writableParent}/${name}`;

  const refreshWad = async () => {
    await Promise.all([
      queryClient.invalidateQueries({queryKey: ["wad-workspace", workspaceId]}),
      queryClient.invalidateQueries({queryKey: ["wad-tree", workspaceId, selectedWadId]}),
    ]);
  };

  const upload = useMutation({
    mutationFn: (file: File) =>
      parseResponse(
        rpcClient.api.wad.workspaces[":workspaceId"].wads.$post({
          param: {workspaceId},
          form: {file},
        }),
      ),
    onError: (error) => appToast.error(error.message),
    onSuccess: async (wad) => {
      setSelectedWadId(wad.id);
      setSelectedEntry(undefined);
      await refreshWad();
    },
  });

  const createNamespace = useMutation({
    mutationFn: (path: string) =>
      parseResponse(
        rpcClient.api.wad.workspaces[":workspaceId"].wads[":wadId"].namespaces.$post({
          param: {workspaceId, wadId: selectedWadId!},
          json: {path},
        }),
      ),
    onError: (error) => appToast.error(error.message),
    onSuccess: async (_, path) => {
      setNamespaceName("");
      setSelectedEntry({kind: "namespace", name: path.split("/").at(-1)!, path});
      await refreshWad();
    },
  });

  const createItem = useMutation({
    mutationFn: ({path, file}: {path: string; file?: File}) =>
      parseResponse(
        rpcClient.api.wad.workspaces[":workspaceId"].wads[":wadId"].items.$post({
          param: {workspaceId, wadId: selectedWadId!},
          form: {path, ...(file ? {file} : {})},
        }),
      ),
    onError: (error) => appToast.error(error.message),
    onSuccess: async (_, {path}) => {
      setItemName("");
      setItemText("");
      setItemFile(undefined);
      setSelectedEntry({kind: "content", name: path.split("/").at(-1)!, path});
      await refreshWad();
    },
  });

  const reset = useMutation({
    mutationFn: () =>
      parseResponse(
        rpcClient.api.wad.workspaces[":workspaceId"].wads[":wadId"].reset.$post({
          param: {workspaceId, wadId: selectedWadId!},
        }),
      ),
    onError: (error) => appToast.error(error.message),
    onSuccess: async () => {
      setSelectedEntry(undefined);
      await queryClient.removeQueries({queryKey: ["wad-content", workspaceId, selectedWadId]});
      await refreshWad();
    },
  });

  const close = useMutation({
    mutationFn: () =>
      parseResponse(
        rpcClient.api.wad.workspaces[":workspaceId"].$delete({param: {workspaceId}}),
      ),
    onSuccess: () => navigate({to: "/wad"}),
  });

  const download = async (kind: "wad" | "item") => {
    if (!selectedWadId || (kind === "item" && !selectedEntry)) return;
    const response =
      kind === "wad"
        ? await rpcClient.api.wad.workspaces[":workspaceId"].wads[":wadId"].download.$get({
            param: {workspaceId, wadId: selectedWadId},
          })
        : await rpcClient.api.wad.workspaces[":workspaceId"].wads[":wadId"].content.$get({
            param: {workspaceId, wadId: selectedWadId},
            query: {path: selectedEntry!.path},
          });
    if (!response.ok) return appToast.error("Download failed");
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = kind === "wad" ? selectedWad?.originalName ?? "working.wad" : selectedEntry!.name;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="system-interface flex h-dvh min-h-[36rem] flex-col overflow-hidden bg-background">
      <WorkspaceHeader
        system="WAD Filesystem"
        workspaceId={workspaceId}
        status={selectedWad ? (selectedWad.modified ? "modified" : "ready") : "waiting"}
        backTo="/wad"
        icon={<FileArchive className="size-4 text-amber-400" />}
        meta={`${workspace.data?.wads.length ?? 0} archives · protected working copies`}
        actions={<><Button variant="outline" size="sm" onClick={() => void download("wad")} disabled={!selectedWadId}><Download className="size-3.5" /> Download</Button><Button variant="danger" size="sm" onClick={() => close.mutate()} disabled={close.isPending}><Trash2 className="size-3.5" /> Close</Button></>}
      />
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <label
          className="flex shrink-0 cursor-pointer flex-wrap items-center justify-between gap-4 border border-dashed border-border bg-surface px-4 py-3 hover:border-amber-400/50"
          aria-busy={upload.isPending}
        >
          <span className="flex items-center gap-3"><span className="flex size-8 items-center justify-center border border-amber-400/30 bg-amber-400/10 text-amber-400"><Upload className="size-4" /></span><span><span className="block text-sm font-medium">{workspace.data?.wads.length ? "Add WAD archive" : "Upload a WAD archive"}</span><span className="block text-xs text-muted-foreground">The original stays protected while you edit its working copy.</span></span></span>
          <input
            type="file"
            accept=".wad"
            className="max-w-72 text-xs text-muted-foreground file:mr-3 file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
            disabled={upload.isPending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload.mutate(file);
            }}
          />
        </label>
        {upload.isError ? (
          <div
            role="alert"
            className="shrink-0 border-x border-b border-danger/30 bg-danger/10 px-4 py-2 text-xs text-danger"
          >
            The archive could not be loaded. {upload.error.message}
          </div>
        ) : null}

        {workspace.data?.wads.length ? (
          <div className="mt-3 grid min-h-0 flex-1 grid-cols-1 overflow-hidden border border-border bg-surface lg:grid-cols-[250px_minmax(0,1fr)_310px]">
            <aside className="min-h-0 overflow-auto border-b border-border lg:border-b-0 lg:border-r">
              <div className="border-b border-border px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Archives</div>
              {workspace.data.wads.map((wad) => (
                <button
                  key={wad.id}
                  type="button"
                  className={`block w-full border-b border-border p-3 text-left ${
                    selectedWadId === wad.id ? "border-l-2 border-l-amber-400 bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60"
                  }`}
                  onClick={() => {
                    setSelectedWadId(wad.id);
                    setSelectedEntry(undefined);
                  }}
                >
                  <div className="break-all">{wad.originalName}</div>
                  <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                    {wad.magic} · {wad.descriptorCount} descriptors · {wad.sizeBytes} bytes
                  </div>
                  {wad.modified ? <div className="mt-1 text-[10px] text-warning">modified</div> : null}
                </button>
              ))}

              <div className="border-y border-border px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Filesystem</div>
              {tree.isPending ? <div className="p-3 text-muted-foreground">Loading tree…</div> : null}
              {tree.isError ? <div className="p-3 text-danger">{tree.error.message}</div> : null}
              {tree.data ? (
                <TreeEntry
                  node={tree.data}
                  selectedPath={selectedEntry?.path}
                  onSelect={setSelectedEntry}
                />
              ) : null}
            </aside>

            <main className="terminal-surface min-h-0 min-w-0 overflow-auto border-b border-border p-4 font-mono lg:border-b-0 lg:border-r">
              {selectedEntry ? (
                <>
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
                    <div>
                      <div className="break-all text-lg text-foreground">{selectedEntry.path}</div>
                      <div className="mt-1 text-xs uppercase text-muted-foreground">
                        {selectedEntry.kind}
                        {selectedEntry.sizeBytes !== undefined ? ` · ${selectedEntry.sizeBytes} bytes` : ""}
                      </div>
                    </div>
                    {selectedEntry.kind === "content" ? (
                      <Button size="sm" variant="outline" onClick={() => void download("item")}>
                        Download item
                      </Button>
                    ) : null}
                  </div>
                  {selectedEntry.kind === "content" && selectedWadId ? (
                    <ContentPreview workspaceId={workspaceId} wadId={selectedWadId} entry={selectedEntry} />
                  ) : (
                    <div className="text-muted-foreground">Select an item to inspect its contents.</div>
                  )}
                </>
              ) : (
                <div className="text-muted-foreground">Select an entry from the WAD tree.</div>
              )}
            </main>

            <aside className="min-h-0 space-y-5 overflow-auto bg-surface p-4">
              <div>
                <div className="mb-2 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">New namespace in {writableParent}</div>
                <form
                  className="flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (namespaceName) createNamespace.mutate(childPath(namespaceName.toUpperCase()));
                  }}
                >
                  <Input
                    value={namespaceName}
                    maxLength={2}
                    pattern="[A-Za-z0-9_]{1,2}"
                    placeholder="TX"
                    onChange={(event) => setNamespaceName(event.target.value)}
                  />
                  <Button type="submit" disabled={!selectedWadId || createNamespace.isPending}>Create</Button>
                </form>
                <p className="mt-1 text-[10px] text-muted-foreground">1–2 letters, numbers, or underscores.</p>
              </div>

              <form
                className="space-y-2 border-t border-border pt-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!itemName) return;
                  const file =
                    itemMode === "text"
                      ? new File([itemText], itemName, {type: "text/plain"})
                      : itemMode === "file"
                        ? itemFile
                        : undefined;
                  if (itemMode === "file" && !file) return;
                  createItem.mutate({path: childPath(itemName.toUpperCase()), file});
                }}
              >
                <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">New item in {writableParent}</div>
                <Input
                  value={itemName}
                  maxLength={8}
                  pattern="[A-Za-z0-9_]{1,8}"
                  placeholder="README"
                  onChange={(event) => setItemName(event.target.value)}
                />
                <select
                  className="h-8 w-full border border-border bg-background px-2 text-xs text-foreground outline-none focus:border-primary"
                  value={itemMode}
                  onChange={(event) => setItemMode(event.target.value as typeof itemMode)}
                >
                  <option value="text">Text</option>
                  <option value="file">Upload file</option>
                  <option value="empty">Empty</option>
                </select>
                {itemMode === "text" ? (
                  <textarea
                    className="min-h-32 w-full resize-y border border-border bg-background p-2 text-sm text-foreground outline-none focus:border-primary"
                    value={itemText}
                    placeholder="Item contents"
                    onChange={(event) => setItemText(event.target.value)}
                  />
                ) : null}
                {itemMode === "file" ? (
                  <input type="file" className="block w-full text-xs" onChange={(event) => setItemFile(event.target.files?.[0])} />
                ) : null}
                <Button className="w-full" type="submit" disabled={!selectedWadId || createItem.isPending}>
                  Create item
                </Button>
              </form>

              <div className="border-t border-border pt-4">
                <Button
                  className="w-full"
                  variant="danger"
                  disabled={!selectedWad?.modified || reset.isPending}
                  onClick={() => {
                    if (window.confirm("Discard every change to this working WAD?")) reset.mutate();
                  }}
                >
                  Reset to original
                </Button>
              </div>
            </aside>
          </div>
        ) : (
          <div className="mt-3 grid min-h-0 flex-1 place-items-center border border-border bg-surface p-12 text-center">
            <div>
              <FileArchive className="mx-auto size-7 text-amber-400" />
              <h2 className="mt-4 text-sm font-semibold text-foreground">
                No archive loaded
              </h2>
              <p className="mt-2 text-xs text-muted-foreground">
                Upload a WAD above to inspect its filesystem.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
