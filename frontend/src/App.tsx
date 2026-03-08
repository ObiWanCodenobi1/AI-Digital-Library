import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Search from './pages/Search';
import Browse from './pages/Browse';
import BookReader from './pages/BookReader';

// Placeholder pages
const Home = () => <div className="p-8"><h1 className="text-2xl font-bold">Home</h1></div>;
const Library = () => <div className="p-8"><h1 className="text-2xl font-bold">My Library</h1></div>;

export default function App() {
  return (
    <Routes>
      {/* Auth routes - no layout */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      
      {/* Main app routes - with layout and protection */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="search" element={<Search />} />
        <Route path="browse" element={<Browse />} />
        <Route 
          path="library" 
          element={
            <ProtectedRoute>
              <Library />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="book/:id" 
          element={
            <ProtectedRoute>
              <BookReader />
            </ProtectedRoute>
          } 
        />
      </Route>
    </Routes>
  );
}
