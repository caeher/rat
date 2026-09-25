import React, { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tag } from '@/components/ui/Tag';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import { EditableRelationTable } from '@/components/sandbox/EditableRelationTable';
import { PresetPanel } from '@/components/sandbox/PresetPanel';
import { CsvImportDialog } from '@/components/sandbox/CsvImportDialog';
import { ClientOnly } from '@/components/common/ClientOnly';
import {
  SANDBOX_LIMITS,
  SUPPORTED_ATTRIBUTE_TYPES,
  previewChangeAttributeType,
  previewDeleteRelation,
  previewRemoveAttribute,
  validateAttributeName,
  validateRelationName,
  validateSchemaSetName,
  type SandboxAction,
} from '@/lib/sandbox';
import type { DestructivePreview, SandboxRelation, SandboxSchemaSet, SandboxState } from '@/lib/sandbox/types';
import type { SandboxAttributeType } from '@/lib/sandbox/constants';
import {
  Copy,
  Database,
  MoreHorizontal,
  Plus,
  Trash2,
} from 'lucide-react';

export interface SchemaDesignerProps {
  state: SandboxState;
  dispatch: (action: SandboxAction) => void;
  activeSchemaSet: SandboxSchemaSet | undefined;
  dataVersion: number;
}

type PendingDestructive =
  | {
      kind: 'attribute';
      relationId: string;
      attributeName: string;
      patch: { name: string; type: SandboxAttributeType; nullable: boolean };
      preview: DestructivePreview;
    }
  | {
      kind: 'remove_attribute';
      relationId: string;
      attributeName: string;
      preview: DestructivePreview;
    }
  | {
      kind: 'delete_relation';
      relationId: string;
      preview: DestructivePreview;
    };

export function SchemaDesigner({ state, dispatch, activeSchemaSet, dataVersion }: SchemaDesignerProps) {
  const [selectedRelationId, setSelectedRelationId] = useState<string | null>(
    activeSchemaSet?.relations[0]?.id ?? null
  );
  const [schemaNameDraft, setSchemaNameDraft] = useState('');
  const [schemaNameError, setSchemaNameError] = useState<string | null>(null);
  const [relationNameDraft, setRelationNameDraft] = useState<Record<string, string>>({});
  const [relationNameError, setRelationNameError] = useState<Record<string, string>>({});
  const [attributeDrafts, setAttributeDrafts] = useState<
    Record<string, { name: string; type: SandboxAttributeType; nullable: boolean }>
  >({});
  const [attributeErrors, setAttributeErrors] = useState<Record<string, string>>({});
  const [pendingDestructive, setPendingDestructive] = useState<PendingDestructive | null>(null);

  const selectedRelation = useMemo(() => {
    if (!activeSchemaSet) return undefined;
    const id = selectedRelationId ?? activeSchemaSet.relations[0]?.id;
    return activeSchemaSet.relations.find((r) => r.id === id);
  }, [activeSchemaSet, selectedRelationId]);

  React.useEffect(() => {
    if (activeSchemaSet && !activeSchemaSet.relations.some((r) => r.id === selectedRelationId)) {
      setSelectedRelationId(activeSchemaSet.relations[0]?.id ?? null);
    }
  }, [activeSchemaSet, selectedRelationId, dataVersion]);

  const commitSchemaRename = useCallback(() => {
    if (!activeSchemaSet) return;
    const name = schemaNameDraft.trim() || activeSchemaSet.name;
    const err = validateSchemaSetName(name, state, activeSchemaSet.id);
    if (err) {
      setSchemaNameError(err.message);
      return;
    }
    dispatch({ type: 'RENAME_SCHEMA_SET', id: activeSchemaSet.id, name });
    setSchemaNameError(null);
  }, [activeSchemaSet, dispatch, schemaNameDraft, state]);

  const commitRelationRename = useCallback(
    (relation: SandboxRelation) => {
      if (!activeSchemaSet) return;
      const draft = relationNameDraft[relation.id] ?? relation.name;
      const err = validateRelationName(draft, activeSchemaSet, relation.id);
      if (err) {
        setRelationNameError((prev) => ({ ...prev, [relation.id]: err.message }));
        return;
      }
      dispatch({ type: 'RENAME_RELATION', relationId: relation.id, name: draft.trim() });
      setRelationNameError((prev) => ({ ...prev, [relation.id]: '' }));
    },
    [activeSchemaSet, dispatch, relationNameDraft]
  );

  const getAttributeDraft = useCallback(
    (relation: SandboxRelation, attrName: string) => {
      const key = `${relation.id}:${attrName}`;
      const existing = relation.attributes.find((a) => a.name === attrName);
      return (
        attributeDrafts[key] ?? {
          name: existing?.name ?? attrName,
          type: existing?.type ?? 'string',
          nullable: existing?.nullable ?? true,
        }
      );
    },
    [attributeDrafts]
  );

  const tryCommitAttribute = useCallback(
    (relation: SandboxRelation, attributeName: string) => {
      const key = `${relation.id}:${attributeName}`;
      const draft = getAttributeDraft(relation, attributeName);
      const err = validateAttributeName(draft.name, relation, attributeName);
      if (err) {
        setAttributeErrors((prev) => ({ ...prev, [key]: err.message }));
        return;
      }

      const preview = previewChangeAttributeType(
        relation,
        attributeName,
        draft.type,
        draft.nullable
      );

      const patch = { name: draft.name.trim(), type: draft.type, nullable: draft.nullable };
      if (preview.requiresConfirmation) {
        setPendingDestructive({
          kind: 'attribute',
          relationId: relation.id,
          attributeName,
          patch,
          preview,
        });
        return;
      }

      dispatch({
        type: 'CONFIRM_UPDATE_ATTRIBUTE',
        relationId: relation.id,
        attributeName,
        patch,
      });
      setAttributeErrors((prev) => ({ ...prev, [key]: '' }));
    },
    [dispatch, getAttributeDraft]
  );

  const confirmDestructive = useCallback(() => {
    if (!pendingDestructive) return;
    if (pendingDestructive.kind === 'attribute') {
      dispatch({
        type: 'CONFIRM_UPDATE_ATTRIBUTE',
        relationId: pendingDestructive.relationId,
        attributeName: pendingDestructive.attributeName,
        patch: pendingDestructive.patch,
      });
    } else if (pendingDestructive.kind === 'remove_attribute') {
      dispatch({
        type: 'CONFIRM_REMOVE_ATTRIBUTE',
        relationId: pendingDestructive.relationId,
        attributeName: pendingDestructive.attributeName,
      });
    } else if (pendingDestructive.kind === 'delete_relation') {
      dispatch({ type: 'DELETE_RELATION', relationId: pendingDestructive.relationId });
    }
    setPendingDestructive(null);
  }, [dispatch, pendingDestructive]);

  if (!activeSchemaSet) {
    return (
      <EmptyState
        title="No schema selected"
        description="Create a schema collection to define relations and data."
        action={
          <Button variant="primary" size="sm" onClick={() => dispatch({ type: 'CREATE_SCHEMA_SET' })}>
            Create schema
          </Button>
        }
      />
    );
  }

  return (
    <ClientOnly
      fallback={<div className="h-48 bg-[var(--color-card)] animate-pulse rounded-[4px]" />}
    >
      <Card className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-[var(--color-outline)]/50 pb-3">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Database className="w-4 h-4 text-[var(--color-ash)] shrink-0" />
              <span className="text-[13px] font-medium text-[var(--color-text)]">Schema designer</span>
              <Tag variant="default">v{dataVersion}</Tag>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-[11px] text-[var(--color-ash)] mb-1 block" htmlFor="active-schema-select">
                  Active schema for querying
                </label>
                <Select
                  value={activeSchemaSet.id}
                  onValueChange={(id) => dispatch({ type: 'SET_ACTIVE_SCHEMA_SET', id })}
                >
                  <SelectTrigger id="active-schema-select" selectSize="sm" className="max-w-md">
                    <SelectValue placeholder="Select schema" />
                  </SelectTrigger>
                  <SelectContent>
                    {state.schemaSets.map((set) => (
                      <SelectItem key={set.id} value={set.id}>
                        {set.name} ({set.relations.length} relations)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => dispatch({ type: 'CREATE_SCHEMA_SET' })}
                  disabled={state.schemaSets.length >= SANDBOX_LIMITS.maxSchemaSets}
                >
                  New schema
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1"
                  onClick={() => dispatch({ type: 'DUPLICATE_SCHEMA_SET', id: activeSchemaSet.id })}
                  disabled={state.schemaSets.length >= SANDBOX_LIMITS.maxSchemaSets}
                >
                  <Copy className="w-3.5 h-3.5" />
                  Duplicate
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1 text-[var(--color-ember)]"
                  onClick={() => dispatch({ type: 'DELETE_SCHEMA_SET', id: activeSchemaSet.id })}
                  disabled={state.schemaSets.length <= 1}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </Button>
              </div>
            </div>
            <Input
              label="Schema name"
              inputSize="sm"
              value={schemaNameDraft || activeSchemaSet.name}
              onChange={(e) => {
                setSchemaNameDraft(e.target.value);
                setSchemaNameError(null);
              }}
              onBlur={commitSchemaRename}
              onKeyDown={(e) => e.key === 'Enter' && commitSchemaRename()}
              error={schemaNameError ?? undefined}
              helperText={`Up to ${SANDBOX_LIMITS.maxRelationsPerSet} relations · see docs/SANDBOX_LIMITS.md`}
            />
          </div>
        </div>

        <PresetPanel state={state} activeSchemaSet={activeSchemaSet} dispatch={dispatch} />

        <Tabs
          value={selectedRelation?.id ?? activeSchemaSet.relations[0]?.id}
          onValueChange={setSelectedRelationId}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList className="flex-wrap h-auto">
              {activeSchemaSet.relations.map((rel) => (
                <TabsTrigger key={rel.id} value={rel.id} className="font-mono text-[12px]">
                  {rel.name}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button
              variant="secondary"
              size="sm"
              className="gap-1"
              onClick={() => dispatch({ type: 'CREATE_RELATION' })}
              disabled={activeSchemaSet.relations.length >= SANDBOX_LIMITS.maxRelationsPerSet}
            >
              <Plus className="w-3.5 h-3.5" />
              Relation
            </Button>
            <CsvImportDialog
              activeSchemaSet={activeSchemaSet}
              selectedRelation={selectedRelation}
              dispatch={dispatch}
            />
          </div>

          {activeSchemaSet.relations.map((relation) => (
            <TabsContent key={relation.id} value={relation.id} className="space-y-4 mt-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:items-end justify-between">
                <Input
                  label="Relation name"
                  inputSize="sm"
                  mono
                  className="max-w-xs"
                  value={relationNameDraft[relation.id] ?? relation.name}
                  onChange={(e) =>
                    setRelationNameDraft((prev) => ({ ...prev, [relation.id]: e.target.value }))
                  }
                  onBlur={() => commitRelationRename(relation)}
                  onKeyDown={(e) => e.key === 'Enter' && commitRelationRename(relation)}
                  error={relationNameError[relation.id] || undefined}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="sm" className="gap-1" aria-label="Relation actions">
                      <MoreHorizontal className="w-4 h-4" />
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => dispatch({ type: 'DUPLICATE_RELATION', relationId: relation.id })}
                    >
                      Duplicate relation
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-[var(--color-ember)]"
                      onSelect={() => {
                        setPendingDestructive({
                          kind: 'delete_relation',
                          relationId: relation.id,
                          preview: previewDeleteRelation(relation),
                        });
                      }}
                      disabled={activeSchemaSet.relations.length <= 1}
                    >
                      Delete relation
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[12px] font-medium text-[var(--color-text)] uppercase tracking-wide">
                    Attributes
                  </h3>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => dispatch({ type: 'ADD_ATTRIBUTE', relationId: relation.id })}
                    disabled={relation.attributes.length >= SANDBOX_LIMITS.maxAttributesPerRelation}
                  >
                    Add column
                  </Button>
                </div>
                <div className="space-y-2">
                  {relation.attributes.map((attr) => {
                    const key = `${relation.id}:${attr.name}`;
                    const draft = getAttributeDraft(relation, attr.name);
                    return (
                      <div
                        key={attr.name}
                        className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-2 rounded-[4px] border border-[var(--color-outline)]/50 bg-[var(--color-canvas)]"
                      >
                        <Input
                          className="sm:col-span-4"
                          inputSize="sm"
                          mono
                          label="Name"
                          value={draft.name}
                          onChange={(e) =>
                            setAttributeDrafts((prev) => ({
                              ...prev,
                              [key]: { ...draft, name: e.target.value },
                            }))
                          }
                          onBlur={() => tryCommitAttribute(relation, attr.name)}
                          error={attributeErrors[key]}
                        />
                        <div className="sm:col-span-3">
                          <label className="text-[11px] text-[var(--color-ash)] mb-1 block">Type</label>
                          <Select
                            value={draft.type}
                            onValueChange={(v) => {
                              const next = { ...draft, type: v as SandboxAttributeType };
                              setAttributeDrafts((prev) => ({ ...prev, [key]: next }));
                              window.setTimeout(() => tryCommitAttribute(relation, attr.name), 0);
                            }}
                          >
                            <SelectTrigger selectSize="sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SUPPORTED_ATTRIBUTE_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="sm:col-span-3 flex items-end pb-1">
                          <label className="flex items-center gap-2 text-[12px] text-[var(--color-driftwood)] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={draft.nullable}
                              onChange={(e) => {
                                const next = { ...draft, nullable: e.target.checked };
                                setAttributeDrafts((prev) => ({ ...prev, [key]: next }));
                                tryCommitAttribute(relation, attr.name);
                              }}
                              className="rounded border-[var(--color-outline)]"
                            />
                            Nullable
                          </label>
                        </div>
                        <div className="sm:col-span-2 flex items-end justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[var(--color-ember)]"
                            disabled={relation.attributes.length <= 1}
                            onClick={() => {
                              const preview = previewRemoveAttribute(relation, attr.name);
                              setPendingDestructive({
                                kind: 'remove_attribute',
                                relationId: relation.id,
                                attributeName: attr.name,
                                preview,
                              });
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <EditableRelationTable
                relation={relation}
                onAddRow={() => dispatch({ type: 'ADD_ROW', relationId: relation.id })}
                onUpdateRow={(rowIndex, row) =>
                  dispatch({ type: 'UPDATE_ROW', relationId: relation.id, rowIndex, row })
                }
                onDeleteRow={(rowIndex) =>
                  dispatch({ type: 'DELETE_ROW', relationId: relation.id, rowIndex })
                }
              />
            </TabsContent>
          ))}
        </Tabs>

        <AlertDialog open={pendingDestructive !== null} onOpenChange={(open) => !open && setPendingDestructive(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm schema change</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-[13px] text-[var(--color-driftwood)]">
                  <p>This change may alter or remove existing data:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    {pendingDestructive?.preview.effects.map((effect, i) => (
                      <li key={i}>{effect.detail}</li>
                    ))}
                  </ul>
                  <p>Cancel to keep your current data unchanged.</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDestructive}>Apply change</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </ClientOnly>
  );
}
