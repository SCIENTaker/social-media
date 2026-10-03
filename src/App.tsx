import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { PersonPage } from './pages/PersonPage';
import { PairPage } from './pages/PairPage';
import { OrgPage } from './pages/OrgPage';
import { EventPage } from './pages/EventPage';
import { PathPage } from './pages/PathPage';
import { SubmitPage } from './pages/SubmitPage';
import { PolicyPage } from './pages/PolicyPage';
import { ChangesPage } from './pages/ChangesPage';
import { NotFoundPage } from './pages/NotFoundPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="p/:id" element={<PersonPage />} />
        <Route path="pair" element={<PairPage />} />
        <Route path="pair/:a/:b" element={<PairPage />} />
        <Route path="org/:id" element={<OrgPage />} />
        <Route path="event/:id" element={<EventPage />} />
        <Route path="path" element={<PathPage />} />
        <Route path="submit" element={<SubmitPage />} />
        <Route path="policy" element={<PolicyPage />} />
        <Route path="changes" element={<ChangesPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
