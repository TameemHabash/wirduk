/**
 * Test-only stand-ins for React Native's FlatList and SectionList (jest.setup.ui.ts): every row
 * at once, in a ScrollView. The real lists draw more rows on a 50 ms timer, which sometimes
 * fired after a test had ended ("An update to VirtualizedList … not wrapped in act(...)").
 */
import { Fragment, type ComponentType, type ReactNode, createElement, isValidElement } from 'react';
import { ScrollView } from 'react-native';

type Part = ComponentType | ReactNode;

const part = (c: Part | undefined): ReactNode =>
  c == null ? null : isValidElement(c) ? c : createElement(c as ComponentType);

interface FlatListProps {
  data?: readonly unknown[] | null;
  renderItem: (info: { item: unknown; index: number }) => ReactNode;
  keyExtractor?: (item: unknown, index: number) => string;
  ListHeaderComponent?: Part;
  ListFooterComponent?: Part;
  ListEmptyComponent?: Part;
  ItemSeparatorComponent?: Part;
  [prop: string]: unknown;
}

export function FlatList({
  data,
  renderItem,
  keyExtractor,
  ListHeaderComponent,
  ListFooterComponent,
  ListEmptyComponent,
  ItemSeparatorComponent,
  ...rest
}: FlatListProps) {
  const items = data ?? [];
  return (
    <ScrollView {...rest}>
      {part(ListHeaderComponent)}
      {items.length === 0
        ? part(ListEmptyComponent)
        : items.map((item, index) => (
            <Fragment key={keyExtractor ? keyExtractor(item, index) : String(index)}>
              {index > 0 ? part(ItemSeparatorComponent) : null}
              {renderItem({ item, index })}
            </Fragment>
          ))}
      {part(ListFooterComponent)}
    </ScrollView>
  );
}

interface Section {
  data: readonly unknown[];
  key?: string;
  [field: string]: unknown;
}

interface SectionListProps {
  sections: readonly Section[];
  renderItem: (info: { item: unknown; index: number; section: Section }) => ReactNode;
  renderSectionHeader?: (info: { section: Section }) => ReactNode;
  keyExtractor?: (item: unknown, index: number) => string;
  ListHeaderComponent?: Part;
  ListEmptyComponent?: Part;
  [prop: string]: unknown;
}

export function SectionList({
  sections,
  renderItem,
  renderSectionHeader,
  keyExtractor,
  ListHeaderComponent,
  ListEmptyComponent,
  ...rest
}: SectionListProps) {
  const empty = sections.every((s) => s.data.length === 0);
  return (
    <ScrollView {...rest}>
      {part(ListHeaderComponent)}
      {empty
        ? part(ListEmptyComponent)
        : sections.map((section, s) => (
            <Fragment key={section.key ?? String(s)}>
              {renderSectionHeader?.({ section }) ?? null}
              {section.data.map((item, index) => (
                <Fragment key={keyExtractor ? keyExtractor(item, index) : String(index)}>
                  {renderItem({ item, index, section })}
                </Fragment>
              ))}
            </Fragment>
          ))}
    </ScrollView>
  );
}
