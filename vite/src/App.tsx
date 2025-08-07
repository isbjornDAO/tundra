import { Routes, Route } from 'react-router-dom';

import './globals.css';
import RootLayout from '@/_root/RootLayout';
import { Bracket, Clan, Home, NotFound, Profile, Register, Results, Tournaments } from '@/_root/pages';
import { Toaster } from "@/components/ui/sonner";
import { ScrollToTop } from './components/shared';

function App() {

  return (
    <main className="flex h-screen">
      <ScrollToTop />
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<Home />} />

          <Route path="/clan" element={<Clan />} />
          <Route path="/clan/:walletAddress" element={<Clan />} />

          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/:walletAddress" element={<Profile />} />

          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/tournaments/bracket" element={<Bracket />} />
          <Route path="/tournaments/bracket/:id" element={<Bracket />} />
          <Route path="/tournaments/register" element={<Register />} />
          <Route path="/tournaments/register/:id" element={<Register />} />
          <Route path="/tournaments/results" element={<Results />} />
          <Route path="/tournaments/results/:id" element={<Results />} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
      <Toaster />
    </main>
  )
}

export default App