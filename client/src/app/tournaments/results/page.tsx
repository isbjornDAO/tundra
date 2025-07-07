// Server component that can handle revalidate
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import ResultsClient from './results-client';

export default function ResultsPage() {
  return <ResultsClient />;
}