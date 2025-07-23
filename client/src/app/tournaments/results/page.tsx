// Server component that can handle revalidate
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import ResultsEnhanced from './results-enhanced';

export default function ResultsPage() {
  return <ResultsEnhanced />;
}