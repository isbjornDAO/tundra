import { Routes, Route } from 'react-router-dom';

import './globals.css';
import RootLayout from '@/_root/RootLayout';
import { Home, NotFound, Page1, Page2 } from '@/_root/pages';
import { Toaster } from "@/components/ui/sonner";
import { ScrollToTop } from './components/shared';

function App() {

  return (
    <main className="flex h-screen">
      <ScrollToTop />
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<Home />} />
          <Route path="/1" element={<Page1 />} />
          <Route path="/2" element={<Page2 />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster />
    </main>
  )
}

export default App
