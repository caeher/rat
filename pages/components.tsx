import React, { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { DataTable } from '@/components/ui/Table';
import { Tag } from '@/components/ui/Tag';
import { TerminalSnippet } from '@/components/ui/TerminalSnippet';
import { WindowFrame } from '@/components/ui/WindowFrame';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/Dialog';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/AlertDialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from '@/components/ui/DropdownMenu';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectGroup,
} from '@/components/ui/Select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/Tooltip';
import { ChevronDown, Info, Sparkles, Download } from 'lucide-react';

export default function ComponentsShowcasePage() {
  const [selectedRelation, setSelectedRelation] = useState('employees');
  const [buttonLoading, setButtonLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState('');

  const sampleColumns = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Name', mono: false },
    { key: 'department', header: 'Department', mono: false },
    { key: 'salary', header: 'Salary' },
  ];

  const sampleData = [
    { id: '101', name: 'Alice Chen', department: 'Systems', salary: '$112,000' },
    { id: '102', name: 'Marcus Bell', department: 'Databases', salary: '$98,500' },
    { id: '103', name: 'Sofia Rodriguez', department: 'Theory', salary: '$104,000' },
  ];

  return (
    <Layout
      title="RAT Design System & Reusable Components"
      description="Design tokens, Radix UI accessible interaction primitives, and state matrices for the Relational Algebra Translator."
    >
      <div className="space-y-12">
        {/* Page Header */}
        <div className="pb-6 border-b border-[var(--color-outline)]/60">
          <div className="flex items-center gap-2 mb-2">
            <Tag variant="ember">Design System</Tag>
            <Tag variant="forest">WCAG AA Compliant</Tag>
            <Tag variant="default">4px Geometry / 8px Modals</Tag>
          </div>
          <h1 className="text-[32px] sm:text-[36px] font-normal tracking-[-0.02em] text-[var(--color-text)]">
            RAT Component Library & Tokens
          </h1>
          <p className="text-[15px] text-[var(--color-driftwood)] max-w-3xl mt-1 leading-relaxed">
            Accessible educational primitives built with Next.js 16, Radix UI, semantic HTML, and
            neutral semantic tokens based on the Parchment Atelier specification.
          </p>
        </div>

        {/* Section 1: Color Tokens & Contrast Documentation */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-normal tracking-[-0.005em] text-[var(--color-text)]">
              1. Semantic Tokens & Contrast Ratios
            </h2>
            <span className="text-[12px] font-mono text-[var(--color-ash)]">
              Normalized 6-digit Hex
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            <div className="p-3 bg-[var(--color-canvas)] border border-[var(--color-outline)]/80 rounded-[4px]">
              <div className="h-10 rounded-[2px] bg-[#f7f7f4] border border-[#cdcdc9] mb-2" />
              <div className="text-[12px] font-mono font-medium text-[var(--color-text)]">Canvas</div>
              <div className="text-[11px] font-mono text-[var(--color-ash)]">#f7f7f4</div>
              <div className="text-[10px] text-[var(--color-forest)] mt-1 font-mono">13.9:1 vs Ink</div>
            </div>

            <div className="p-3 bg-[var(--color-card)] border border-[var(--color-outline)]/80 rounded-[4px]">
              <div className="h-10 rounded-[2px] bg-[#f2f1ed] border border-[#cdcdc9] mb-2" />
              <div className="text-[12px] font-mono font-medium text-[var(--color-text)]">Card</div>
              <div className="text-[11px] font-mono text-[var(--color-ash)]">#f2f1ed</div>
              <div className="text-[10px] text-[var(--color-forest)] mt-1 font-mono">13.2:1 vs Ink</div>
            </div>

            <div className="p-3 bg-[var(--color-card)] border border-[var(--color-outline)]/80 rounded-[4px]">
              <div className="h-10 rounded-[2px] bg-[#e6e5e0] border border-[#cdcdc9] mb-2" />
              <div className="text-[12px] font-mono font-medium text-[var(--color-text)]">Elevated</div>
              <div className="text-[11px] font-mono text-[var(--color-ash)]">#e6e5e0</div>
              <div className="text-[10px] text-[var(--color-forest)] mt-1 font-mono">11.8:1 vs Ink</div>
            </div>

            <div className="p-3 bg-[var(--color-card)] border border-[var(--color-outline)]/80 rounded-[4px]">
              <div className="h-10 rounded-[2px] bg-[#26251e] mb-2" />
              <div className="text-[12px] font-mono font-medium text-[var(--color-text)]">Ink (Text/CTA)</div>
              <div className="text-[11px] font-mono text-[var(--color-ash)]">#26251e</div>
              <div className="text-[10px] text-[var(--color-forest)] mt-1 font-mono">AAA 13.9:1</div>
            </div>

            <div className="p-3 bg-[var(--color-card)] border border-[var(--color-outline)]/80 rounded-[4px]">
              <div className="h-10 rounded-[2px] bg-[#f54e00] mb-2" />
              <div className="text-[12px] font-mono font-medium text-[var(--color-text)]">Ember (Accent)</div>
              <div className="text-[11px] font-mono text-[var(--color-ash)]">#f54e00</div>
              <div className="text-[10px] text-[var(--color-forest)] mt-1 font-mono">AA 4.7:1 (Text)</div>
            </div>

            <div className="p-3 bg-[var(--color-card)] border border-[var(--color-outline)]/80 rounded-[4px]">
              <div className="h-10 rounded-[2px] bg-[#34785c] mb-2" />
              <div className="text-[12px] font-mono font-medium text-[var(--color-text)]">Forest (Success)</div>
              <div className="text-[11px] font-mono text-[var(--color-ash)]">#34785c</div>
              <div className="text-[10px] text-[var(--color-forest)] mt-1 font-mono">AA 4.8:1</div>
            </div>
          </div>
        </section>

        {/* Section 2: Buttons & Interaction States */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-normal tracking-[-0.005em] text-[var(--color-text)]">
              2. Button Component & States
            </h2>
            <span className="text-[12px] font-mono text-[var(--color-ash)]">
              Primary (#26251e on #f7f7f4) / Secondary (#e6e5e0)
            </span>
          </div>

          <Card className="space-y-6">
            <div>
              <div className="text-[13px] font-mono text-[var(--color-ash)] mb-3">
                Variants & Actions
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary Action</Button>
                <Button variant="secondary">Secondary Action</Button>
                <Button variant="ghost">Ghost Action</Button>
                <Button variant="amber">Amber Action (Build)</Button>
                <Button variant="forest">Forest Action (Verify)</Button>
                <Button variant="crimson">Crimson (Destructive)</Button>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--color-outline)]/40">
              <div className="text-[13px] font-mono text-[var(--color-ash)] mb-3">
                Interaction States (Loading, Disabled, Sizes)
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  loading={buttonLoading}
                  loadingText="Evaluating..."
                  onClick={() => {
                    setButtonLoading(true);
                    setTimeout(() => setButtonLoading(false), 2000);
                  }}
                >
                  Click to Toggle Loading State
                </Button>
                <Button variant="secondary" disabled>
                  Disabled Secondary
                </Button>
                <Button size="sm" variant="primary">
                  Small (28px)
                </Button>
                <Button size="md" variant="primary">
                  Medium (36px)
                </Button>
                <Button size="lg" variant="primary">
                  Large (44px)
                </Button>
              </div>
            </div>
          </Card>
        </section>

        {/* Section 3: Radix Dialog, Alert Dialog & Modals */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-normal tracking-[-0.005em] text-[var(--color-text)]">
              3. Modals & Dialogs (Radix UI)
            </h2>
            <span className="text-[12px] font-mono text-[var(--color-ash)]">
              8px Corners / Focus Trapping & Restoration
            </span>
          </div>

          <Card className="flex flex-wrap items-center gap-4">
            {/* Standard Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="primary">Open Query Export Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Export Relational Expression</DialogTitle>
                  <DialogDescription>
                    Choose an export format or copy the optimized SQL translation for your database.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-2">
                  <TerminalSnippet
                    command="SELECT * FROM Employees WHERE salary > 80000;"
                    prompt="SQL >"
                  />
                  <p className="text-[12px] text-[var(--color-driftwood)]">
                    This query was compiled statically in your browser runtime.
                  </p>
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="secondary">Cancel</Button>
                  </DialogClose>
                  <Button variant="primary" onClick={() => alert('Query copied!')}>
                    Copy to Clipboard
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Alert Dialog */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="crimson">Clear Workspace (Alert Dialog)</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Workspace State?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will discard all custom relations, temporary query definitions, and expression
                    history from browser memory.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => alert('Workspace reset!')}>
                    Confirm Reset
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="secondary" className="gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[var(--color-ash)]" />
                  <span>Operator Info (Popover)</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[14px] font-bold text-[var(--color-ember)]">σ</span>
                    <span className="font-medium text-[13px] text-[var(--color-text)]">
                      Selection Operator
                    </span>
                  </div>
                  <p className="text-[12px] text-[var(--color-driftwood)] leading-relaxed">
                    Filters tuples that satisfy a given predicate. Corresponds to the SQL{' '}
                    <code className="font-mono text-[11px] bg-[var(--color-elevated)] px-1 py-0.5 rounded-[2px]">
                      WHERE
                    </code>{' '}
                    clause.
                  </p>
                </div>
              </PopoverContent>
            </Popover>

            {/* Tooltip */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" className="gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--color-amber)]" />
                  <span>Hover for Tooltip</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <span>200ms delay accessible tooltip</span>
              </TooltipContent>
            </Tooltip>
          </Card>
        </section>

        {/* Section 4: Menus, Selects & Tabs */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-normal tracking-[-0.005em] text-[var(--color-text)]">
              4. Menus, Selects & Tabs (Radix UI)
            </h2>
            <span className="text-[12px] font-mono text-[var(--color-ash)]">
              Keyboard Arrow Navigation
            </span>
          </div>

          <Card className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Select */}
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-[var(--color-text)]">
                  Relation Dataset (Radix Select)
                </label>
                <Select value={selectedRelation} onValueChange={setSelectedRelation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select dataset..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Standard Datasets</SelectLabel>
                      <SelectItem value="employees">Employees (4 tuples)</SelectItem>
                      <SelectItem value="departments">Departments (3 tuples)</SelectItem>
                      <SelectItem value="projects">Projects (5 tuples)</SelectItem>
                      <SelectItem value="empty">Empty Test Relation</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {/* Dropdown Menu */}
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-[var(--color-text)]">
                  Action Menu (Radix Dropdown)
                </label>
                <div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" className="gap-2">
                        <span>Workspace Actions</span>
                        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Query Commands</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => alert('Query Formatted')}>
                        <span>Format Expression</span>
                        <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => alert('Tree Generated')}>
                        <span>Generate Plan Tree</span>
                        <DropdownMenuShortcut>⌘P</DropdownMenuShortcut>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => alert('Exported SQL')}>
                        <Download className="w-3.5 h-3.5 mr-2 opacity-60" />
                        <span>Export SQL File</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="pt-4 border-t border-[var(--color-outline)]/40">
              <div className="text-[13px] font-mono text-[var(--color-ash)] mb-3">
                Accessible Tabs
              </div>
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="algebra">Relational Algebra</TabsTrigger>
                  <TabsTrigger value="sql">Compiled SQL</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="p-4 bg-[var(--color-card)] rounded-[4px] border border-[var(--color-outline)]/50 mt-2">
                  <p className="text-[13px] text-[var(--color-driftwood)]">
                    Overview panel presenting query statistics and relation card summaries.
                  </p>
                </TabsContent>
                <TabsContent value="algebra" className="p-4 bg-[var(--color-card)] rounded-[4px] border border-[var(--color-outline)]/50 mt-2">
                  <p className="font-mono text-[13px] text-[var(--color-text)]">
                    π name, salary ( σ salary &gt; 80000 ( Employees ) )
                  </p>
                </TabsContent>
                <TabsContent value="sql" className="p-4 bg-[var(--color-card)] rounded-[4px] border border-[var(--color-outline)]/50 mt-2">
                  <p className="font-mono text-[13px] text-[var(--color-text)]">
                    SELECT name, salary FROM Employees WHERE salary &gt; 80000;
                  </p>
                </TabsContent>
              </Tabs>
            </div>
          </Card>
        </section>

        {/* Section 5: Form Inputs, Textareas & Invalid States */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-normal tracking-[-0.005em] text-[var(--color-text)]">
              5. Form Controls & Validation States
            </h2>
            <span className="text-[12px] font-mono text-[var(--color-ash)]">
              aria-invalid / aria-describedby
            </span>
          </div>

          <Card className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input
                label="Relation Name"
                placeholder="e.g. Students"
                helperText="Identifier for the in-memory relation table."
                mono
              />

              <Input
                label="Algebraic Predicate (Invalid State Demo)"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  if (e.target.value.includes('=')) {
                    setInputError('');
                  } else {
                    setInputError('Invalid predicate: relational comparisons require a comparison operator (e.g. salary > 50000).');
                  }
                }}
                placeholder="e.g. age > 21"
                error={inputError || 'Syntax Error: Missing closing parenthesis in selection predicate.'}
                mono
              />
            </div>

            <Textarea
              label="Relational Algebra Expression Editor"
              defaultValue="π employee_id, name ( σ department_id = 10 ( Employees ) )"
              helperText="Press Shift+Enter to evaluate the query."
              rows={3}
              mono
            />
          </Card>
        </section>

        {/* Section 6: Semantic Tables & Empty / Loading States */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-normal tracking-[-0.005em] text-[var(--color-text)]">
              6. Semantic HTML Tables & Tuples
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setTableLoading(!tableLoading)}
              >
                Toggle Loading Skeleton
              </Button>
            </div>
          </div>

          <Card className="space-y-6">
            <DataTable
              columns={sampleColumns}
              data={tableLoading ? [] : sampleData}
              loading={tableLoading}
              caption="Employees evaluation result set (3 tuples matched)."
            />

            <div className="pt-4 border-t border-[var(--color-outline)]/40">
              <div className="text-[13px] font-mono text-[var(--color-ash)] mb-3">
                Accessible Empty State
              </div>
              <EmptyState
                title="No Tuples Matched the Selection Predicate"
                description="The predicate 'salary > 200000' evaluated to false for all records in the target relation."
                action={
                  <Button variant="secondary" size="sm">
                    Reset Filter Condition
                  </Button>
                }
              />
            </div>
          </Card>
        </section>

        {/* Section 7: Tags, Snippets & Sandbox Containers */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[22px] font-normal tracking-[-0.005em] text-[var(--color-text)]">
              7. Metadata Tags, Code Snippets & Sandbox Frame
            </h2>
            <span className="text-[12px] font-mono text-[var(--color-ash)]">
              4px Corner Geometry
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="space-y-4">
              <div className="text-[13px] font-mono text-[var(--color-ash)]">
                Metadata Tags (Mono)
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Tag variant="default">schema: v1.0</Tag>
                <Tag variant="ember">emphasis: ember-only</Tag>
                <Tag variant="forest">status: validated</Tag>
                <Tag variant="amber">optimizer: running</Tag>
                <Tag variant="crimson">syntax: unclosed</Tag>
              </div>

              <div className="text-[13px] font-mono text-[var(--color-ash)] pt-2">
                Terminal Code Block
              </div>
              <TerminalSnippet
                command="rat compile --expression 'σ dept_id=1(Employees)' --target sql"
                prompt="$"
              />
            </Card>

            <WindowFrame
              title="RAT Expression Sandbox"
              tabs={[
                { id: '1', label: 'eval.ra', active: true },
                { id: '2', label: 'schema.sql' },
              ]}
            >
              <div className="p-3 bg-[var(--color-card)] rounded-[4px] border border-[var(--color-outline)]/60 font-mono text-[12px] text-[var(--color-text)]">
                <span className="text-[var(--color-ember)] font-semibold">π</span> name, dept (
                Employees )
              </div>
            </WindowFrame>
          </div>
        </section>
      </div>
    </Layout>
  );
}
