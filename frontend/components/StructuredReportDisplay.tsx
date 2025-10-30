'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ReportSection {
  title: string;
  content: string;
  items?: string[];
}

interface StructuredReportDisplayProps {
  reportText: string;
}

// マークダウンテキストをパースして構造化データに変換
function parseMarkdownReport(markdown: string): ReportSection[] {
  const sections: ReportSection[] = [];
  const lines = markdown.split('\n');

  let currentSection: ReportSection | null = null;
  let currentContent: string[] = [];
  let inList = false;
  let listItems: string[] = [];

  lines.forEach((line, index) => {
    // 見出し検出 (## または ###)
    if (line.match(/^##\s+(.+)/)) {
      // 前のセクションを保存
      if (currentSection !== null) {
        currentSection.content = currentContent.join('\n').trim();
        if (listItems.length > 0) {
          currentSection.items = listItems;
        }
        sections.push(currentSection);
      }

      // 新しいセクション開始
      const title = line.replace(/^##\s+/, '').replace(/^###\s+/, '').trim();
      currentSection = { title, content: '' };
      currentContent = [];
      listItems = [];
      inList = false;
    }
    // リスト項目検出
    else if (line.match(/^[\-\*]\s+(.+)/) || line.match(/^\d+\.\s+(.+)/)) {
      const itemText = line.replace(/^[\-\*]\s+/, '').replace(/^\d+\.\s+/, '').trim();
      listItems.push(itemText);
      inList = true;
    }
    // 通常のテキスト
    else if (line.trim() && currentSection) {
      if (inList && listItems.length > 0) {
        // リスト終了、コンテンツに追加
        inList = false;
      }
      currentContent.push(line);
    }
  });

  // 最後のセクションを保存
  if (currentSection !== null) {
    currentSection.content = currentContent.join('\n').trim();
    if (listItems.length > 0) {
      currentSection.items = listItems;
    }
    sections.push(currentSection);
  }

  return sections;
}

// テーブル形式で表示するコンポーネント
const SectionTable: React.FC<{ section: ReportSection }> = ({ section }) => {
  if (!section.items || section.items.length === 0) {
    return (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-lg">{section.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm md:text-base whitespace-pre-wrap">{section.content}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base md:text-lg">{section.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {section.content && (
          <p className="text-sm md:text-base mb-3 whitespace-pre-wrap">{section.content}</p>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-xs md:text-sm">No.</TableHead>
                <TableHead className="text-xs md:text-sm">内容</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {section.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium text-xs md:text-sm">{index + 1}</TableCell>
                  <TableCell className="text-xs md:text-sm whitespace-pre-wrap">{item}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

// メインコンポーネント
export const StructuredReportDisplay: React.FC<StructuredReportDisplayProps> = ({ reportText }) => {
  const sections = parseMarkdownReport(reportText);

  return (
    <div className="space-y-4 w-full">
      {sections.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm md:text-base whitespace-pre-wrap">{reportText}</p>
          </CardContent>
        </Card>
      ) : (
        sections.map((section, index) => (
          <SectionTable key={index} section={section} />
        ))
      )}
    </div>
  );
};

// 検索クエリ表示コンポーネント
export const SearchQueriesList: React.FC<{ queries: string[] }> = ({ queries }) => {
  return (
    <div className="flex flex-wrap gap-2">
      {queries.map((query, index) => (
        <Badge key={index} variant="secondary" className="text-xs md:text-sm py-1 px-3">
          {query}
        </Badge>
      ))}
    </div>
  );
};

// ソース表示コンポーネント
export const SourcesList: React.FC<{
  sources: Array<{ url: string; title?: string; snippet?: string }>
}> = ({ sources }) => {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-xs md:text-sm">No.</TableHead>
            <TableHead className="text-xs md:text-sm">タイトル</TableHead>
            <TableHead className="text-xs md:text-sm hidden md:table-cell">概要</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sources.map((source, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium text-xs md:text-sm">{index + 1}</TableCell>
              <TableCell className="text-xs md:text-sm">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline break-all"
                >
                  {source.title || source.url}
                </a>
                {source.snippet && (
                  <p className="text-xs text-gray-600 mt-1 md:hidden line-clamp-2">
                    {source.snippet}
                  </p>
                )}
              </TableCell>
              <TableCell className="text-xs md:text-sm text-gray-600 hidden md:table-cell max-w-md">
                <p className="line-clamp-3">{source.snippet || '-'}</p>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
