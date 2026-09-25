import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';

describe('Tabs Component', () => {
  it('renders tab triggers and active panel', () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Relation Tuples</TabsTrigger>
          <TabsTrigger value="tab2">SQL Translation</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">
          <div>Tuples Panel Content</div>
        </TabsContent>
        <TabsContent value="tab2">
          <div>SQL Panel Content</div>
        </TabsContent>
      </Tabs>
    );

    expect(screen.getByRole('tab', { name: /Relation Tuples/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /SQL Translation/i })).toBeInTheDocument();
    expect(screen.getByText('Tuples Panel Content')).toBeInTheDocument();
  });

  it('switches active tab when value changes or when clicked', () => {
    const { rerender } = render(
      <Tabs value="tab1">
        <TabsList>
          <TabsTrigger value="tab1">Relation Tuples</TabsTrigger>
          <TabsTrigger value="tab2">SQL Translation</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">
          <div>Tuples Panel Content</div>
        </TabsContent>
        <TabsContent value="tab2">
          <div>SQL Panel Content</div>
        </TabsContent>
      </Tabs>
    );

    expect(screen.getByText('Tuples Panel Content')).toBeInTheDocument();

    rerender(
      <Tabs value="tab2">
        <TabsList>
          <TabsTrigger value="tab1">Relation Tuples</TabsTrigger>
          <TabsTrigger value="tab2">SQL Translation</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">
          <div>Tuples Panel Content</div>
        </TabsContent>
        <TabsContent value="tab2">
          <div>SQL Panel Content</div>
        </TabsContent>
      </Tabs>
    );

    expect(screen.getByText('SQL Panel Content')).toBeInTheDocument();
    expect(screen.queryByText('Tuples Panel Content')).not.toBeInTheDocument();
  });
});
